import { GAME_CONFIG } from "@shared/game/config";
import { resolveJigsawGrid } from "@shared/game/jigsaw-grid";
import { defaultPieceUnlockAt } from "@shared/game/jigsaw-tile-rewards";
import {
  modeNeedsJigsawUpload,
  modePersistsQuizAnswers,
} from "@shared/game/mode-registry";
import {
  DEFAULT_POLL_SETTINGS,
  normalizePollPayload,
} from "@shared/game/polls";
import type {
  ConnectDotsBoardConfig,
  GamePayload,
  Participant,
  PollQuestionDraft,
  PollSettings,
  QuizQuestionDraft,
  Room,
  RoomEvent,
  RoomRoundRecord,
  TimerMode,
  VisualPointAnswerRecord,
  VisualPointQuestionDraft,
} from "@shared/game/types";
import { createEntityId, hashToken, isUuid } from "@shared/game/room-crypto";
import {
  isValidRoomCodeFormat,
  normalizeRoomCode,
} from "@shared/game/room-code";
import { clampTimer, defaultTimerSeconds } from "@shared/game/timer";
import { createAdminClient } from "../supabase-admin.js";

const supabase = createAdminClient();

type QuizAnswer = {
  questionId: string;
  selectedOption: "A" | "B" | "C" | "D";
  isCorrect: boolean;
  submittedAt: number;
};

export type Attempt = {
  id: string;
  participantId: string;
  progress: number;
  correctCount: number;
  /** Wrong quiz answers (jigsaw) or failed connection attempts (connect dots). */
  wrongCount: number;
  durationMs: number | null;
  completed: boolean;
  completedAt: number | null;
  score: number | null;
  payload: Record<string, unknown>;
};

function readWrongCount(payload: Record<string, unknown>): number {
  const value = payload.wrongCount;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    return 0;
  return Math.floor(value);
}

function attemptPayloadWithWrongCount(
  attempt: Attempt,
): Record<string, unknown> {
  return { ...attempt.payload, wrongCount: attempt.wrongCount };
}

export type StoredRoom = {
  room: Room;
  participants: Map<string, Participant>;
  quizAnswers: Map<string, Map<string, QuizAnswer>>;
  visualPointAnswers: Map<
    string,
    Map<string, VisualPointAnswerRecord & { isCorrect: boolean }>
  >;
  attempts: Map<string, Attempt>;
  events: RoomEvent[];
  authorToken: string;
  authorTokenHash: string;
};

type PersistenceBaseline = {
  room: string;
  authorTokenHash: string;
  payload: string;
  participants: Map<string, string>;
  attempts: Map<string, string>;
  quizAnswers: Map<string, string>;
  visualPointAnswers: Map<string, string>;
  eventCount: number;
};

const persistenceBaselines = new WeakMap<StoredRoom, PersistenceBaseline>();
const participantTokenHashes = new WeakMap<StoredRoom, Map<string, string>>();

function stableValue(value: unknown): string {
  return JSON.stringify(value);
}

function roomBaseline(room: Room): string {
  return stableValue(room);
}

function mapBaseline<T>(values: Map<string, T>): Map<string, string> {
  return new Map([...values].map(([key, value]) => [key, stableValue(value)]));
}

function nestedMapBaseline<T>(
  values: Map<string, Map<string, T>>,
): Map<string, string> {
  const result = new Map<string, string>();
  for (const [ownerId, nested] of values) {
    for (const [itemId, value] of nested)
      result.set(`${ownerId}:${itemId}`, stableValue(value));
  }
  return result;
}

function rememberBaseline(stored: StoredRoom) {
  persistenceBaselines.set(stored, {
    room: roomBaseline(stored.room),
    authorTokenHash: stored.authorTokenHash,
    payload: stableValue(stored.room.payload),
    participants: mapBaseline(stored.participants),
    attempts: mapBaseline(stored.attempts),
    quizAnswers: nestedMapBaseline(stored.quizAnswers),
    visualPointAnswers: nestedMapBaseline(stored.visualPointAnswers),
    eventCount: stored.events.length,
  });
}

function ms(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const value = Date.parse(iso);
  return Number.isNaN(value) ? null : value;
}

function iso(msValue: number | null | undefined): string | null {
  if (msValue == null) return null;
  return new Date(msValue).toISOString();
}

function readTimerMode(raw: Record<string, unknown>): TimerMode {
  return raw["timerMode"] === "per_question" ? "per_question" : "overall";
}

function readTimeLimit(
  mode: Room["mode"],
  raw: Record<string, unknown>,
  timerMode: TimerMode,
): number | null {
  if (!("timeLimitSeconds" in raw)) return null;
  const value = raw["timeLimitSeconds"];
  if (value === null) return null;
  if (typeof value === "number") return clampTimer(mode, value, timerMode);
  return defaultTimerSeconds(mode, timerMode);
}

function parseConnectDotsConfig(
  raw: Record<string, unknown>,
): ConnectDotsBoardConfig {
  const cd = (raw["connectDots"] ?? {}) as Record<string, unknown>;
  const difficulty =
    cd["difficulty"] === "easy" || cd["difficulty"] === "hard"
      ? cd["difficulty"]
      : "medium";
  const defaults = GAME_CONFIG.connect_dots.difficulties[difficulty];
  const board: ConnectDotsBoardConfig = {
    difficulty,
    gridSize:
      typeof cd["gridSize"] === "number" ? cd["gridSize"] : defaults.gridSize,
    pairCount:
      typeof cd["pairCount"] === "number"
        ? cd["pairCount"]
        : defaults.pairCount,
    seed: typeof cd["seed"] === "string" ? cd["seed"] : "",
    pairs: Array.isArray(cd["pairs"])
      ? (cd["pairs"] as ConnectDotsBoardConfig["pairs"])
      : [],
    contentPairs: Array.isArray(cd["contentPairs"])
      ? (cd["contentPairs"] as ConnectDotsBoardConfig["contentPairs"])
      : [],
  };
  if (cd["solution"] && typeof cd["solution"] === "object") {
    board.solution = cd["solution"] as NonNullable<
      ConnectDotsBoardConfig["solution"]
    >;
  }
  return board;
}

function parsePayload(
  mode: Room["mode"] | string,
  config: unknown,
): GamePayload {
  const raw = (config ?? {}) as Record<string, unknown>;
  // Legacy maze rooms are unsupported after Connect Dots replacement.
  const normalizedMode =
    mode === "maze" ? "connect_dots" : (mode as Room["mode"]);
  const timerMode = readTimerMode(raw);
  const timeLimitSeconds = readTimeLimit(normalizedMode, raw, timerMode);
  if (normalizedMode === "quiz") {
    const questions = Array.isArray(raw["questions"])
      ? (raw["questions"] as QuizQuestionDraft[])
      : [];
    return { mode: "quiz", questions, timeLimitSeconds, timerMode };
  }
  if (normalizedMode === "quiz_jigsaw") {
    const questions = Array.isArray(raw["questions"])
      ? (raw["questions"] as QuizQuestionDraft[])
      : [];
    const jigsaw = (raw["jigsaw"] ?? {}) as Record<string, unknown>;
    return {
      mode: "quiz_jigsaw",
      questions,
      jigsaw: {
        imageUrl:
          typeof jigsaw["imageUrl"] === "string" ? jigsaw["imageUrl"] : null,
        imageMime:
          typeof jigsaw["imageMime"] === "string" ? jigsaw["imageMime"] : null,
        cols: GAME_CONFIG.quiz_jigsaw.cols,
        rows: GAME_CONFIG.quiz_jigsaw.rows,
      },
      rewardCode:
        typeof raw["rewardCode"] === "string" ? raw["rewardCode"] : "",
      timeLimitSeconds,
      timerMode,
    };
  }
  if (normalizedMode === "jigsaw") {
    const questions = Array.isArray(raw["questions"])
      ? (raw["questions"] as QuizQuestionDraft[])
      : [];
    const jigsaw = (raw["jigsaw"] ?? {}) as Record<string, unknown>;
    const cols =
      typeof jigsaw["cols"] === "number" ? jigsaw["cols"] : undefined;
    const rows =
      typeof jigsaw["rows"] === "number" ? jigsaw["rows"] : undefined;
    const grid = resolveJigsawGrid(cols, rows, questions.length);
    const tileCount = grid.cols * grid.rows;
    const pieceUnlockAt = defaultPieceUnlockAt(questions.length, tileCount);
    return {
      mode: "jigsaw",
      questions,
      jigsaw: {
        imageUrl:
          typeof jigsaw["imageUrl"] === "string" ? jigsaw["imageUrl"] : null,
        imageMime:
          typeof jigsaw["imageMime"] === "string" ? jigsaw["imageMime"] : null,
        cols: grid.cols,
        rows: grid.rows,
        pieceUnlockAt,
      },
      timeLimitSeconds,
      timerMode,
    };
  }
  if (normalizedMode === "polls") {
    const questions = Array.isArray(raw["questions"])
      ? (raw["questions"] as PollQuestionDraft[])
      : [];
    const settingsRaw =
      raw["settings"] &&
      typeof raw["settings"] === "object" &&
      !Array.isArray(raw["settings"])
        ? (raw["settings"] as Partial<PollSettings>)
        : {};
    const settings = { ...DEFAULT_POLL_SETTINGS, ...settingsRaw };
    return normalizePollPayload({
      mode: "polls",
      questions,
      settings,
      timeLimitSeconds,
      timerMode,
    });
  }
  if (normalizedMode === "visual_point") {
    const questions = Array.isArray(raw["questions"])
      ? (raw["questions"] as VisualPointQuestionDraft[])
      : [];
    return {
      mode: "visual_point",
      questions,
      timeLimitSeconds,
      timerMode,
    };
  }
  const connectDots = parseConnectDotsConfig(raw);
  return {
    mode: "connect_dots",
    connectDots,
    timeLimitSeconds,
    timerMode,
  };
}

function configFromPayload(
  payload: GamePayload,
  settings?: Pick<
    Room,
    "showLeaderboardToStudents" | "duplicatedFromName" | "roundHistory"
  >,
): Record<string, unknown> {
  let base: Record<string, unknown>;
  if (payload.mode === "quiz") {
    base = {
      questions: payload.questions,
      timeLimitSeconds: payload.timeLimitSeconds,
      timerMode: payload.timerMode ?? "overall",
    };
  } else if (payload.mode === "quiz_jigsaw") {
    base = {
      questions: payload.questions,
      jigsaw: payload.jigsaw,
      rewardCode: payload.rewardCode,
      timeLimitSeconds: payload.timeLimitSeconds,
      timerMode: payload.timerMode ?? "overall",
    };
  } else if (payload.mode === "jigsaw") {
    base = {
      questions: payload.questions,
      jigsaw: payload.jigsaw,
      timeLimitSeconds: payload.timeLimitSeconds,
      timerMode: payload.timerMode ?? "overall",
    };
  } else if (payload.mode === "polls") {
    base = {
      questions: payload.questions,
      settings: payload.settings,
      timeLimitSeconds: payload.timeLimitSeconds,
      timerMode: payload.timerMode ?? "overall",
    };
  } else if (payload.mode === "visual_point") {
    base = {
      questions: payload.questions,
      timeLimitSeconds: payload.timeLimitSeconds,
      timerMode: payload.timerMode ?? "overall",
    };
  } else {
    base = {
      connectDots: payload.connectDots,
      timeLimitSeconds: payload.timeLimitSeconds,
      timerMode: payload.timerMode ?? "overall",
    };
  }
  if (settings?.showLeaderboardToStudents) {
    base.showLeaderboardToStudents = true;
  }
  if (settings?.duplicatedFromName) {
    base.duplicatedFromName = settings.duplicatedFromName;
  }
  if (settings?.roundHistory && settings.roundHistory.length > 0) {
    base.roundHistory = settings.roundHistory;
  }
  return base;
}

function stripVisualPointDataUrls(payload: GamePayload): GamePayload {
  if (payload.mode !== "visual_point") return payload;
  return {
    ...payload,
    questions: payload.questions.map((question) =>
      question.imageUrl?.startsWith("data:")
        ? {
            ...question,
            imageUrl: null,
          }
        : question,
    ),
  };
}

function readDuplicatedFromName(config: unknown): string | null {
  const raw = (config ?? {}) as Record<string, unknown>;
  return typeof raw.duplicatedFromName === "string" &&
    raw.duplicatedFromName.trim()
    ? raw.duplicatedFromName.trim()
    : null;
}

function readShowLeaderboardToStudents(config: unknown): boolean {
  const raw = (config ?? {}) as Record<string, unknown>;
  return raw.showLeaderboardToStudents === true;
}

function readRoundHistory(config: unknown): RoomRoundRecord[] {
  const raw = (config ?? {}) as Record<string, unknown>;
  return Array.isArray(raw.roundHistory)
    ? (raw.roundHistory as RoomRoundRecord[])
    : [];
}

async function jigsawPublicUrl(storagePath: string): Promise<string> {
  const { data } = supabase.storage
    .from("gamibar-jigsaw")
    .getPublicUrl(storagePath);
  return data.publicUrl;
}

async function uploadJigsawAsset(
  roomId: string,
  payload: GamePayload,
): Promise<GamePayload> {
  const hasDataUrl =
    (payload.mode === "jigsaw" || payload.mode === "quiz_jigsaw") &&
    payload.jigsaw.imageUrl?.startsWith("data:");
  if (!hasDataUrl) return payload;

  const mime = payload.jigsaw.imageMime ?? "image/png";
  const response = await fetch(payload.jigsaw.imageUrl!);
  if (!response.ok) {
    throw new Error("Could not read jigsaw image data.");
  }
  const blob = await response.blob();
  const ext =
    mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
  const storagePath = `${roomId}/source.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("gamibar-jigsaw")
    .upload(storagePath, blob, {
      upsert: true,
      contentType: mime,
      cacheControl: "31536000",
    });
  if (uploadError) {
    throw new Error(uploadError.message || "Could not upload jigsaw image.");
  }

  const cols =
    payload.mode === "quiz_jigsaw"
      ? GAME_CONFIG.quiz_jigsaw.cols
      : payload.jigsaw.cols;
  const rows =
    payload.mode === "quiz_jigsaw"
      ? GAME_CONFIG.quiz_jigsaw.rows
      : payload.jigsaw.rows;

  const { error: assetError } = await supabase
    .from("gamibar_jigsaw_assets")
    .upsert(
      {
        room_id: roomId,
        storage_path: storagePath,
        mime_type: mime,
        cols,
        rows,
        byte_size: blob.size,
      },
      { onConflict: "room_id" },
    );
  if (assetError) {
    throw new Error(
      assetError.message || "Could not save jigsaw asset metadata.",
    );
  }

  const imageUrl = await jigsawPublicUrl(storagePath);
  if (payload.mode === "quiz_jigsaw") {
    return {
      ...payload,
      jigsaw: { ...payload.jigsaw, imageUrl, cols, rows },
    };
  }
  return {
    mode: "jigsaw",
    questions: payload.questions,
    jigsaw: {
      ...payload.jigsaw,
      imageUrl,
      cols,
      rows,
    },
    timeLimitSeconds: payload.timeLimitSeconds,
    timerMode: payload.timerMode,
  };
}

async function hydrateJigsawPayload(
  roomId: string,
  payload: GamePayload,
): Promise<GamePayload> {
  if (payload.mode !== "jigsaw" && payload.mode !== "quiz_jigsaw")
    return payload;

  const { data: asset } = await supabase
    .from("gamibar_jigsaw_assets")
    .select("storage_path, mime_type, cols, rows")
    .eq("room_id", roomId)
    .maybeSingle();

  if (!asset) return payload;

  const imageUrl = await jigsawPublicUrl(asset.storage_path);
  const storedJigsaw = payload.mode === "jigsaw" ? payload.jigsaw : null;
  const jigsaw = {
    imageUrl,
    imageMime: asset.mime_type,
    cols: asset.cols,
    rows: asset.rows,
    ...(storedJigsaw?.pieceUnlockAt
      ? { pieceUnlockAt: storedJigsaw.pieceUnlockAt }
      : {}),
  };
  if (payload.mode === "quiz_jigsaw") {
    return { ...payload, jigsaw };
  }
  return {
    mode: "jigsaw",
    questions: payload.questions,
    jigsaw,
    timeLimitSeconds: payload.timeLimitSeconds,
    timerMode: payload.timerMode,
  };
}

async function visualPointPublicUrl(storagePath: string): Promise<string> {
  const { data } = supabase.storage
    .from("gamibar-visual-point")
    .getPublicUrl(storagePath);
  return data.publicUrl;
}

function visualPointExt(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "png";
}

async function uploadVisualPointAssets(
  roomId: string,
  payload: GamePayload,
): Promise<GamePayload> {
  if (payload.mode !== "visual_point") return payload;

  const questions: VisualPointQuestionDraft[] = [];
  let changed = false;
  for (const question of payload.questions) {
    const hasDataUrl = question.imageUrl?.startsWith("data:");
    if (!hasDataUrl) {
      questions.push(question);
      continue;
    }

    const mime = question.imageMime ?? "image/png";
    const response = await fetch(question.imageUrl!);
    if (!response.ok) {
      throw new Error("Could not read Target Hunt image data.");
    }
    const blob = await response.blob();
    const storagePath = `${roomId}/${question.id}.${visualPointExt(mime)}`;

    const { error: uploadError } = await supabase.storage
      .from("gamibar-visual-point")
      .upload(storagePath, blob, {
        upsert: true,
        contentType: mime,
        cacheControl: "31536000",
      });
    if (uploadError) {
      throw new Error(
        uploadError.message || "Could not upload Target Hunt image.",
      );
    }

    const { error: assetError } = await supabase
      .from("gamibar_visual_point_assets")
      .upsert(
        {
          room_id: roomId,
          question_id: question.id,
          storage_path: storagePath,
          mime_type: mime,
          width: question.imageWidth ?? null,
          height: question.imageHeight ?? null,
          byte_size: blob.size,
        },
        { onConflict: "room_id,question_id" },
      );
    if (assetError) {
      throw new Error(
        assetError.message || "Could not save Target Hunt asset metadata.",
      );
    }

    questions.push({
      ...question,
      imageUrl: await visualPointPublicUrl(storagePath),
      imageMime: mime,
    });
    changed = true;
  }

  return changed ? { ...payload, questions } : payload;
}

async function hydrateVisualPointPayload(
  roomId: string,
  payload: GamePayload,
): Promise<GamePayload> {
  if (payload.mode !== "visual_point") return payload;

  const { data: assets } = await supabase
    .from("gamibar_visual_point_assets")
    .select("question_id, storage_path, mime_type, width, height")
    .eq("room_id", roomId);

  if (!assets?.length) return payload;

  type VisualAssetRow = {
    question_id: string;
    storage_path: string;
    mime_type: string;
    width: number | null;
    height: number | null;
  };
  const byQuestion = new Map(
    (assets as VisualAssetRow[]).map((asset) => [asset.question_id, asset]),
  );
  const questions = await Promise.all(
    payload.questions.map(async (question) => {
      const asset = byQuestion.get(question.id);
      if (!asset) return question;
      return {
        ...question,
        imageUrl: await visualPointPublicUrl(asset.storage_path),
        imageMime: asset.mime_type,
        imageWidth: asset.width ?? question.imageWidth ?? null,
        imageHeight: asset.height ?? question.imageHeight ?? null,
      };
    }),
  );

  return { ...payload, questions };
}

/** Copy jigsaw image metadata + storage blob when duplicating a room. */
export async function copyJigsawAssetBetweenRooms(
  fromRoomId: string,
  toRoomId: string,
): Promise<void> {
  const { data: asset } = await supabase
    .from("gamibar_jigsaw_assets")
    .select("storage_path, mime_type, cols, rows, byte_size")
    .eq("room_id", fromRoomId)
    .maybeSingle();

  if (!asset) return;

  const { data: blob, error: downloadError } = await supabase.storage
    .from("gamibar-jigsaw")
    .download(asset.storage_path);
  if (downloadError || !blob) return;

  const ext = asset.storage_path.split(".").pop() ?? "png";
  const storagePath = `${toRoomId}/source.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("gamibar-jigsaw")
    .upload(storagePath, blob, {
      upsert: true,
      contentType: asset.mime_type,
      cacheControl: "31536000",
    });
  if (uploadError) return;

  await supabase.from("gamibar_jigsaw_assets").upsert(
    {
      room_id: toRoomId,
      storage_path: storagePath,
      mime_type: asset.mime_type,
      cols: asset.cols,
      rows: asset.rows,
      byte_size: asset.byte_size ?? blob.size,
    },
    { onConflict: "room_id" },
  );
}

export async function copyVisualPointAssetsBetweenRooms(
  fromRoomId: string,
  toRoomId: string,
): Promise<void> {
  const { data: assets } = await supabase
    .from("gamibar_visual_point_assets")
    .select("question_id, storage_path, mime_type, width, height, byte_size")
    .eq("room_id", fromRoomId);

  for (const asset of assets ?? []) {
    const { data: blob, error: downloadError } = await supabase.storage
      .from("gamibar-visual-point")
      .download(asset.storage_path);
    if (downloadError || !blob) continue;

    const ext =
      asset.storage_path.split(".").pop() ?? visualPointExt(asset.mime_type);
    const storagePath = `${toRoomId}/${asset.question_id}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("gamibar-visual-point")
      .upload(storagePath, blob, {
        upsert: true,
        contentType: asset.mime_type,
        cacheControl: "31536000",
      });
    if (uploadError) continue;

    await supabase.from("gamibar_visual_point_assets").upsert(
      {
        room_id: toRoomId,
        question_id: asset.question_id,
        storage_path: storagePath,
        mime_type: asset.mime_type,
        width: asset.width,
        height: asset.height,
        byte_size: asset.byte_size ?? blob.size,
      },
      { onConflict: "room_id,question_id" },
    );
  }
}

function buildStoredRoom(
  row: {
    id: string;
    code: string;
    name: string;
    subject?: string;
    author_id: string | null;
    author_name: string;
    author_token_hash: string;
    status: Room["status"];
    mode: Room["mode"];
    config: unknown;
    max_participants: number;
    created_at: string;
    expires_at: string | null;
    started_at: string | null;
    ends_at: string | null;
    finished_at: string | null;
    events: unknown;
  },
  participants: Array<{
    id: string;
    room_id: string;
    display_name: string;
    status: Participant["status"];
    reconnect_token_hash: string;
    joined_at: string;
    user_id: string | null;
  }>,
  answers: Array<{
    participant_id: string;
    question_id: string;
    selected_option: string;
    is_correct: boolean;
    submitted_at: string;
  }>,
  visualAnswers: Array<{
    participant_id: string;
    question_id: string;
    selected_point_id: string;
    is_correct: boolean;
    submitted_at: string;
  }>,
  attempts: Array<{
    id: string;
    participant_id: string;
    progress: number;
    correct_count: number;
    duration_ms: number | null;
    completed: boolean;
    completed_at: string | null;
    score: number | null;
    payload: unknown;
  }>,
  payload: GamePayload,
  authorToken = "",
  showLeaderboardToStudents = false,
  duplicatedFromName: string | null = null,
  roundHistory: RoomRoundRecord[] = [],
): StoredRoom {
  const quizAnswers = new Map<string, Map<string, QuizAnswer>>();
  for (const answer of answers) {
    let map = quizAnswers.get(answer.participant_id);
    if (!map) {
      map = new Map();
      quizAnswers.set(answer.participant_id, map);
    }
    map.set(answer.question_id, {
      questionId: answer.question_id,
      selectedOption: answer.selected_option as QuizAnswer["selectedOption"],
      isCorrect: answer.is_correct,
      submittedAt: ms(answer.submitted_at) ?? Date.now(),
    });
  }

  const visualPointAnswers = new Map<
    string,
    Map<string, VisualPointAnswerRecord & { isCorrect: boolean }>
  >();
  for (const answer of visualAnswers) {
    let map = visualPointAnswers.get(answer.participant_id);
    if (!map) {
      map = new Map();
      visualPointAnswers.set(answer.participant_id, map);
    }
    map.set(answer.question_id, {
      questionId: answer.question_id,
      selectedPointId: answer.selected_point_id,
      isCorrect: answer.is_correct,
      submittedAt: ms(answer.submitted_at) ?? Date.now(),
    });
  }

  const attemptMap = new Map<string, Attempt>();
  for (const attempt of attempts) {
    const rawPayload = (attempt.payload ?? {}) as Record<string, unknown>;
    const wrongCount =
      typeof rawPayload.wrongCount === "number" ? rawPayload.wrongCount : 0;
    attemptMap.set(attempt.participant_id, {
      id: attempt.id,
      participantId: attempt.participant_id,
      progress: attempt.progress,
      correctCount: attempt.correct_count,
      wrongCount,
      durationMs: attempt.duration_ms,
      completed: attempt.completed,
      completedAt: ms(attempt.completed_at),
      score: attempt.score,
      payload: rawPayload,
    });
  }

  const participantMap = new Map<string, Participant>();
  for (const p of participants) {
    participantMap.set(p.id, {
      id: p.id,
      roomId: p.room_id,
      displayName: p.display_name,
      status: p.status,
      joinedAt: ms(p.joined_at) ?? Date.now(),
      reconnectToken: "",
      connectionId: null,
      userId: p.user_id,
    });
  }

  const stored: StoredRoom = {
    room: {
      id: row.id,
      code: row.code,
      name: row.name,
      subject: row.subject ?? "",
      authorId: row.author_id ?? "",
      authorName: row.author_name,
      status: row.status,
      mode: row.mode,
      payload,
      maxParticipants: row.max_participants,
      createdAt: ms(row.created_at) ?? Date.now(),
      expiresAt: ms(row.expires_at),
      startedAt: ms(row.started_at),
      endsAt: ms(row.ends_at),
      finishedAt: ms(row.finished_at),
      showLeaderboardToStudents,
      duplicatedFromName,
      roundHistory,
    },
    participants: participantMap,
    quizAnswers,
    visualPointAnswers,
    attempts: attemptMap,
    events: Array.isArray(row.events) ? (row.events as RoomEvent[]) : [],
    authorToken,
    authorTokenHash: row.author_token_hash,
  };
  participantTokenHashes.set(
    stored,
    new Map(
      participants.map((participant) => [
        participant.id,
        participant.reconnect_token_hash,
      ]),
    ),
  );
  rememberBaseline(stored);
  return stored;
}

async function loadRoomBundle(
  roomId: string,
  authorToken = "",
): Promise<StoredRoom | null> {
  const { data, error } = await supabase.rpc("gamibar_get_room_bundle", {
    p_room_id: roomId,
  });
  if (error) {
    throw new Error(error.message || "Could not load the room snapshot.");
  }
  if (!data) return null;

  type StoredRoomRow = Parameters<typeof buildStoredRoom>[0];
  type RoomBundle = {
    room: Omit<StoredRoomRow, "mode"> & {
      mode: StoredRoomRow["mode"] | "maze";
    };
    participants: Parameters<typeof buildStoredRoom>[1];
    quiz_answers: Parameters<typeof buildStoredRoom>[2];
    visual_point_answers: Parameters<typeof buildStoredRoom>[3];
    attempts: Parameters<typeof buildStoredRoom>[4];
  };
  const bundle = data as unknown as RoomBundle;
  const row = bundle.room;
  if (!row || !Array.isArray(bundle.participants) || !Array.isArray(bundle.attempts)) {
    throw new Error("The room snapshot response is invalid.");
  }

  const normalizedMode = (
    row.mode === "maze" ? "connect_dots" : row.mode
  ) as Room["mode"];
  let payload = parsePayload(normalizedMode, row.config);
  payload = await hydrateJigsawPayload(roomId, payload);
  payload = await hydrateVisualPointPayload(roomId, payload);

  return buildStoredRoom(
    { ...row, mode: normalizedMode },
    bundle.participants,
    Array.isArray(bundle.quiz_answers) ? bundle.quiz_answers : [],
    Array.isArray(bundle.visual_point_answers)
      ? bundle.visual_point_answers
      : [],
    bundle.attempts,
    payload,
    authorToken,
    readShowLeaderboardToStudents(row.config),
    readDuplicatedFromName(row.config),
    readRoundHistory(row.config),
  );
}

export async function loadById(roomId: string): Promise<StoredRoom | null> {
  return loadRoomBundle(roomId);
}

export async function loadByCode(code: string): Promise<StoredRoom | null> {
  const clean = normalizeRoomCode(code);
  if (!isValidRoomCodeFormat(clean)) return null;

  const { data: row, error } = await supabase
    .from("gamibar_rooms")
    .select("id")
    .eq("code", clean)
    .maybeSingle();
  if (error) throw new Error(error.message || "Could not look up the room.");
  if (row?.id) {
    return loadRoomBundle(row.id);
  }
  return null;
}

export type ParticipantJoinReservation =
  | {
      ok: true;
      roomId: string;
      participantId: string;
      attemptId: string;
      displayName: string;
      joinedAt: number;
      mode: Room["mode"];
    }
  | { ok: false; code: string; error: string };

export async function reserveParticipantJoin(input: {
  code: string;
  participantId: string;
  attemptId: string;
  displayName: string;
  reconnectToken: string;
  userId?: string | null;
}): Promise<ParticipantJoinReservation> {
  const { data, error } = await supabase.rpc("gamibar_join_room", {
    p_room_code: input.code,
    p_participant_id: input.participantId,
    p_attempt_id: input.attemptId,
    p_display_name: input.displayName,
    p_reconnect_token_hash: await hashToken(input.reconnectToken),
    p_user_id: input.userId ?? null,
  });
  if (error) {
    throw new Error(error.message || "Could not create the player session.");
  }
  if (!data || typeof data !== "object" || typeof data.ok !== "boolean") {
    throw new Error("The participant join response is invalid.");
  }
  return data as ParticipantJoinReservation;
}

export type RoomStartReservation =
  | {
      ok: true;
      roomId: string;
      startedAt: number;
      endsAt: number | null;
      countdownSeconds: number;
    }
  | { ok: false; code: string; error: string };

export async function beginRoomGame(input: {
  roomId: string;
  authorToken: string;
  overallLimitSeconds: number | null;
  countdownSeconds: number;
}): Promise<RoomStartReservation> {
  const { data, error } = await supabase.rpc("gamibar_start_room", {
    p_room_id: input.roomId,
    p_author_token_hash: await hashToken(input.authorToken),
    p_overall_limit_seconds: input.overallLimitSeconds,
    p_countdown_seconds: input.countdownSeconds,
  });
  if (error) {
    throw new Error(error.message || "Could not start this room.");
  }
  if (!data || typeof data !== "object" || typeof data.ok !== "boolean") {
    throw new Error("The room start response is invalid.");
  }
  return data as RoomStartReservation;
}

export async function loadByReconnectToken(
  token: string,
): Promise<StoredRoom | null> {
  const tokenHash = await hashToken(token);
  const { data: participant, error } = await supabase
    .from("gamibar_participants")
    .select("room_id, id")
    .eq("reconnect_token_hash", tokenHash)
    .maybeSingle();
  if (error) throw new Error(error.message || "Could not reconnect to the room.");
  if (participant?.room_id) {
    const stored = await loadById(participant.room_id);
    if (stored) {
      const match = stored.participants.get(participant.id);
      if (match) match.reconnectToken = token;
      return stored;
    }
  }

  return null;
}

export async function listCodes(): Promise<Set<string>> {
  const { data, error } = await supabase.from("gamibar_rooms").select("code");
  if (error) throw new Error(error.message || "Could not load room codes.");
  return new Set((data ?? []).map((row: { code: string }) => row.code));
}

export async function verifyAuthorToken(
  stored: StoredRoom,
  token?: string,
  authorId?: string,
): Promise<boolean> {
  if (authorId && stored.room.authorId && stored.room.authorId === authorId) return true;
  if (!token) return false;
  if (stored.authorToken && stored.authorToken === token) return true;
  return (await hashToken(token)) === stored.authorTokenHash;
}

export async function findParticipantByReconnectToken(
  stored: StoredRoom,
  token: string,
): Promise<Participant | undefined> {
  for (const participant of stored.participants.values()) {
    if (participant.reconnectToken === token) return participant;
  }
  const tokenHash = await hashToken(token);
  const { data, error } = await supabase
    .from("gamibar_participants")
    .select("id")
    .eq("room_id", stored.room.id)
    .eq("reconnect_token_hash", tokenHash)
    .maybeSingle();
  if (error) throw new Error(error.message || "Could not verify the participant session.");
  if (!data?.id) return undefined;
  let participant = stored.participants.get(data.id);
  if (participant) {
    participant.reconnectToken = token;
    return participant;
  }

  const { data: row } = await supabase
    .from("gamibar_participants")
    .select("id, room_id, display_name, status, joined_at, user_id")
    .eq("id", data.id)
    .maybeSingle();
  if (!row) return undefined;

  participant = {
    id: row.id,
    roomId: row.room_id,
    displayName: row.display_name,
    status: row.status as Participant["status"],
    joinedAt: ms(row.joined_at) ?? Date.now(),
    reconnectToken: token,
    connectionId: null,
    userId: row.user_id,
  };
  stored.participants.set(participant.id, participant);
  return participant;
}

export async function persist(stored: StoredRoom) {
  const room = stored.room;
  const baseline = persistenceBaselines.get(stored);
  const isNewRoom = !baseline;
  const authorTokenHash =
    stored.authorTokenHash || (await hashToken(stored.authorToken));
  stored.authorTokenHash = authorTokenHash;
  const roomChanged =
    isNewRoom ||
    baseline.room !== roomBaseline(room) ||
    baseline.authorTokenHash !== authorTokenHash;
  const payloadChanged =
    isNewRoom || baseline.payload !== stableValue(room.payload);
  const newEvents = baseline
    ? stored.events.slice(baseline.eventCount)
    : stored.events;

  let payload = room.payload;
  const initialPayload = stripVisualPointDataUrls(payload);

  const roomRow: Record<string, unknown> = {
    id: room.id,
    code: room.code,
    name: room.name,
    author_id: isUuid(room.authorId) ? room.authorId : null,
    author_name: room.authorName,
    author_token_hash: authorTokenHash,
    status: room.status,
    mode: room.mode,
    config: configFromPayload(initialPayload, {
      showLeaderboardToStudents: room.showLeaderboardToStudents,
      duplicatedFromName: room.duplicatedFromName,
      roundHistory: room.roundHistory,
    }),
    max_participants: room.maxParticipants,
    expires_at: iso(room.expiresAt),
    started_at: iso(room.startedAt),
    ends_at: iso(room.endsAt),
    finished_at: iso(room.finishedAt),
  };
  if (isNewRoom) roomRow.events = stored.events.slice(-200);

  if (roomChanged) {
    const { error: roomError } = await supabase
      .from("gamibar_rooms")
      .upsert(roomRow);
    if (roomError) throw new Error(roomError.message || "Could not save room.");
  }

  if (payloadChanged && modeNeedsJigsawUpload(room.mode)) {
    payload = await uploadJigsawAsset(room.id, payload);
    room.payload = payload;

    const { error: configError } = await supabase
      .from("gamibar_rooms")
      .update({
        config: configFromPayload(payload, {
          showLeaderboardToStudents: room.showLeaderboardToStudents,
          duplicatedFromName: room.duplicatedFromName,
          roundHistory: room.roundHistory,
        }),
      })
      .eq("id", room.id);
    if (configError)
      throw new Error(configError.message || "Could not save jigsaw config.");
  }

  if (
    payloadChanged &&
    room.mode === "visual_point" &&
    payload.mode === "visual_point"
  ) {
    payload = await uploadVisualPointAssets(room.id, payload);
    room.payload = payload;

    const { error: configError } = await supabase
      .from("gamibar_rooms")
      .update({
        config: configFromPayload(payload, {
          showLeaderboardToStudents: room.showLeaderboardToStudents,
          duplicatedFromName: room.duplicatedFromName,
          roundHistory: room.roundHistory,
        }),
      })
      .eq("id", room.id);
    if (configError) {
      throw new Error(
        configError.message || "Could not save Target Hunt config.",
      );
    }
  }

  if (!isNewRoom && newEvents.length > 0) {
    await appendRoomEvents(room.id, newEvents);
  }

  const tokenHashes =
    participantTokenHashes.get(stored) ?? new Map<string, string>();
  const participantRows = [];
  for (const [participantId, participant] of stored.participants) {
    if (baseline?.participants.get(participantId) === stableValue(participant))
      continue;
    const tokenHash = participant.reconnectToken
      ? await hashToken(participant.reconnectToken)
      : tokenHashes.get(participantId);
    if (!tokenHash) continue;
    tokenHashes.set(participantId, tokenHash);
    participantRows.push({
      id: participant.id,
      room_id: room.id,
      display_name: participant.displayName,
      status: participant.status,
      reconnect_token_hash: tokenHash,
      joined_at: iso(participant.joinedAt) ?? new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      user_id: participant.userId ?? null,
    });
  }
  if (participantRows.length > 0) {
    const { error } = await supabase
      .from("gamibar_participants")
      .upsert(participantRows);
    if (error) throw new Error(error.message || "Could not save participant.");
  }
  participantTokenHashes.set(stored, tokenHashes);

  const attemptRows = [];
  for (const [participantId, attempt] of stored.attempts) {
    if (baseline?.attempts.get(participantId) === stableValue(attempt))
      continue;
    attemptRows.push({
      id: attempt.id,
      room_id: room.id,
      participant_id: participantId,
      mode: room.mode,
      progress: attempt.progress,
      correct_count: attempt.correctCount,
      score: attempt.score,
      duration_ms: attempt.durationMs,
      completed: attempt.completed,
      completed_at: iso(attempt.completedAt),
      payload: attemptPayloadWithWrongCount(attempt),
    });
  }
  if (attemptRows.length > 0) {
    const { error } = await supabase
      .from("gamibar_attempts")
      .upsert(attemptRows);
    if (error) throw new Error(error.message || "Could not save attempt.");
  }

  if (modePersistsQuizAnswers(room.mode)) {
    const answerRows = [];
    for (const [participantId, answers] of stored.quizAnswers) {
      for (const answer of answers.values()) {
        const key = `${participantId}:${answer.questionId}`;
        if (baseline?.quizAnswers.get(key) === stableValue(answer)) continue;
        answerRows.push({
          room_id: room.id,
          participant_id: participantId,
          question_id: answer.questionId,
          selected_option: answer.selectedOption,
          is_correct: answer.isCorrect,
          submitted_at: iso(answer.submittedAt) ?? new Date().toISOString(),
        });
      }
    }
    if (answerRows.length > 0) {
      const { error } = await supabase
        .from("gamibar_quiz_answers")
        .upsert(answerRows, { onConflict: "participant_id,question_id" });
      if (error)
        throw new Error(error.message || "Could not save quiz answer.");
    }
  }

  if (room.mode === "visual_point") {
    const visualAnswerRows = [];
    for (const [participantId, answers] of stored.visualPointAnswers) {
      for (const answer of answers.values()) {
        const key = `${participantId}:${answer.questionId}`;
        if (baseline?.visualPointAnswers.get(key) === stableValue(answer))
          continue;
        visualAnswerRows.push({
          room_id: room.id,
          participant_id: participantId,
          question_id: answer.questionId,
          selected_point_id: answer.selectedPointId,
          is_correct: answer.isCorrect,
          submitted_at: iso(answer.submittedAt) ?? new Date().toISOString(),
        });
      }
    }
    if (visualAnswerRows.length > 0) {
      const { error } = await supabase
        .from("gamibar_visual_point_answers")
        .upsert(visualAnswerRows, { onConflict: "participant_id,question_id" });
      if (error)
        throw new Error(error.message || "Could not save Target Hunt answer.");
    }
  }

  rememberBaseline(stored);
}

async function appendRoomEvents(roomId: string, events: RoomEvent[]) {
  const { error } = await supabase.rpc("gamibar_append_room_events", {
    p_room_id: roomId,
    p_events: events,
  });
  if (error) throw error;
}

export function ensureAttempt(
  stored: StoredRoom,
  participantId: string,
): Attempt {
  let attempt = stored.attempts.get(participantId);
  if (!attempt) {
    attempt = {
      id: createEntityId(),
      participantId,
      progress: 0,
      correctCount: 0,
      wrongCount: 0,
      durationMs: null,
      completed: false,
      completedAt: null,
      score: null,
      payload: {},
    };
    stored.attempts.set(participantId, attempt);
  }
  return attempt;
}

export async function resetRoomRecords(
  roomId: string,
  roundHistory: RoomRoundRecord[] = [],
): Promise<void> {
  const { data: roomRow } = await supabase
    .from("gamibar_rooms")
    .select("config")
    .eq("id", roomId)
    .maybeSingle();

  const currentConfig = (roomRow?.config ?? {}) as Record<string, unknown>;
  const newConfig = {
    ...currentConfig,
    roundHistory,
  };

  await supabase
    .from("gamibar_rooms")
    .update({
      status: "LOBBY",
      started_at: null,
      finished_at: null,
      ends_at: null,
      events: [],
      config: newConfig,
    })
    .eq("id", roomId);

  await supabase.from("gamibar_participants").delete().eq("room_id", roomId);
  await supabase.from("gamibar_attempts").delete().eq("room_id", roomId);
  await supabase.from("gamibar_quiz_answers").delete().eq("room_id", roomId);
  await supabase.from("gamibar_visual_point_answers").delete().eq("room_id", roomId);
}
