import { GAME_CONFIG } from "@/lib/game/config";
import { resolveJigsawGrid } from "@/lib/game/jigsaw-grid";
import { normalizePieceUnlockAt } from "@/lib/game/jigsaw-tile-rewards";
import { modeNeedsJigsawUpload, modePersistsQuizAnswers } from "@/lib/game/mode-registry";
import { DEFAULT_POLL_SETTINGS, normalizePollPayload } from "@/lib/game/polls";
import type {
  ConnectDotsBoardConfig,
  GamePayload,
  Participant,
  PollQuestionDraft,
  PollSettings,
  QuizQuestionDraft,
  Room,
  RoomEvent,
} from "@/lib/game/types";
import { createEntityId, hashToken, isUuid } from "@/lib/game/room-crypto";
import { isValidRoomCodeFormat, normalizeRoomCode } from "@/lib/game/room-code";
import { clampTimer, defaultTimerSeconds } from "@/lib/game/timer";
import { supabaseGame as supabase } from "@/lib/supabase/client";

const SHOULD_MIRROR_LEGACY_ROOMS =
  ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_GAMIBAR_MIRROR_LEGACY_ROOMS ??
    (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } })
      .process?.env?.VITE_GAMIBAR_MIRROR_LEGACY_ROOMS) === "true";

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
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

function attemptPayloadWithWrongCount(attempt: Attempt): Record<string, unknown> {
  return { ...attempt.payload, wrongCount: attempt.wrongCount };
}

export type StoredRoom = {
  room: Room;
  participants: Map<string, Participant>;
  quizAnswers: Map<string, Map<string, QuizAnswer>>;
  attempts: Map<string, Attempt>;
  events: RoomEvent[];
  authorToken: string;
  authorTokenHash: string;
};

function ms(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const value = Date.parse(iso);
  return Number.isNaN(value) ? null : value;
}

function iso(msValue: number | null | undefined): string | null {
  if (msValue == null) return null;
  return new Date(msValue).toISOString();
}

function readTimeLimit(mode: Room["mode"], raw: Record<string, unknown>): number | null {
  if (!("timeLimitSeconds" in raw)) return null;
  const value = raw["timeLimitSeconds"];
  if (value === null) return null;
  if (typeof value === "number") return clampTimer(mode, value);
  return defaultTimerSeconds(mode);
}

function parseConnectDotsConfig(raw: Record<string, unknown>): ConnectDotsBoardConfig {
  const cd = (raw["connectDots"] ?? {}) as Record<string, unknown>;
  const difficulty =
    cd["difficulty"] === "easy" || cd["difficulty"] === "hard" ? cd["difficulty"] : "medium";
  const defaults = GAME_CONFIG.connect_dots.difficulties[difficulty];
  const board: ConnectDotsBoardConfig = {
    difficulty,
    gridSize: typeof cd["gridSize"] === "number" ? cd["gridSize"] : defaults.gridSize,
    pairCount: typeof cd["pairCount"] === "number" ? cd["pairCount"] : defaults.pairCount,
    seed: typeof cd["seed"] === "string" ? cd["seed"] : "",
    pairs: Array.isArray(cd["pairs"]) ? (cd["pairs"] as ConnectDotsBoardConfig["pairs"]) : [],
    contentPairs: Array.isArray(cd["contentPairs"])
      ? (cd["contentPairs"] as ConnectDotsBoardConfig["contentPairs"])
      : [],
  };
  if (cd["solution"] && typeof cd["solution"] === "object") {
    board.solution = cd["solution"] as NonNullable<ConnectDotsBoardConfig["solution"]>;
  }
  return board;
}

function readPieceUnlockAt(raw: unknown): number[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const values = raw.filter(
    (value): value is number => typeof value === "number" && Number.isInteger(value) && value > 0,
  );
  return values.length > 0 ? values : undefined;
}

function parsePayload(mode: Room["mode"] | string, config: unknown): GamePayload {
  const raw = (config ?? {}) as Record<string, unknown>;
  // Legacy maze rooms are unsupported after Connect Dots replacement.
  const normalizedMode = mode === "maze" ? "connect_dots" : (mode as Room["mode"]);
  const timeLimitSeconds = readTimeLimit(normalizedMode, raw);
  if (normalizedMode === "quiz") {
    const questions = Array.isArray(raw["questions"])
      ? (raw["questions"] as QuizQuestionDraft[])
      : [];
    return { mode: "quiz", questions, timeLimitSeconds };
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
        imageUrl: typeof jigsaw["imageUrl"] === "string" ? jigsaw["imageUrl"] : null,
        imageMime: typeof jigsaw["imageMime"] === "string" ? jigsaw["imageMime"] : null,
        cols: GAME_CONFIG.quiz_jigsaw.cols,
        rows: GAME_CONFIG.quiz_jigsaw.rows,
      },
      rewardCode: typeof raw["rewardCode"] === "string" ? raw["rewardCode"] : "",
      timeLimitSeconds,
    };
  }
  if (normalizedMode === "jigsaw") {
    const questions = Array.isArray(raw["questions"])
      ? (raw["questions"] as QuizQuestionDraft[])
      : [];
    const jigsaw = (raw["jigsaw"] ?? {}) as Record<string, unknown>;
    const cols = typeof jigsaw["cols"] === "number" ? jigsaw["cols"] : undefined;
    const rows = typeof jigsaw["rows"] === "number" ? jigsaw["rows"] : undefined;
    const grid = resolveJigsawGrid(cols, rows, questions.length);
    const tileCount = grid.cols * grid.rows;
    const pieceUnlockAtRaw = readPieceUnlockAt(jigsaw["pieceUnlockAt"]);
    const pieceUnlockAt = pieceUnlockAtRaw
      ? normalizePieceUnlockAt(pieceUnlockAtRaw, questions.length, tileCount)
      : undefined;
    return {
      mode: "jigsaw",
      questions,
      jigsaw: {
        imageUrl: typeof jigsaw["imageUrl"] === "string" ? jigsaw["imageUrl"] : null,
        imageMime: typeof jigsaw["imageMime"] === "string" ? jigsaw["imageMime"] : null,
        cols: grid.cols,
        rows: grid.rows,
        ...(pieceUnlockAt ? { pieceUnlockAt } : {}),
      },
      timeLimitSeconds,
    };
  }
  if (normalizedMode === "polls") {
    const questions = Array.isArray(raw["questions"])
      ? (raw["questions"] as PollQuestionDraft[])
      : [];
    const settingsRaw =
      raw["settings"] && typeof raw["settings"] === "object" && !Array.isArray(raw["settings"])
        ? (raw["settings"] as Partial<PollSettings>)
        : {};
    const settings = { ...DEFAULT_POLL_SETTINGS, ...settingsRaw };
    return normalizePollPayload({
      mode: "polls",
      questions,
      settings,
      timeLimitSeconds,
    });
  }
  const connectDots = parseConnectDotsConfig(raw);
  return {
    mode: "connect_dots",
    connectDots,
    timeLimitSeconds,
  };
}

function configFromPayload(
  payload: GamePayload,
  settings?: Pick<Room, "showLeaderboardToStudents" | "duplicatedFromName">,
): Record<string, unknown> {
  let base: Record<string, unknown>;
  if (payload.mode === "quiz") {
    base = { questions: payload.questions, timeLimitSeconds: payload.timeLimitSeconds };
  } else if (payload.mode === "quiz_jigsaw") {
    base = {
      questions: payload.questions,
      jigsaw: payload.jigsaw,
      rewardCode: payload.rewardCode,
      timeLimitSeconds: payload.timeLimitSeconds,
    };
  } else if (payload.mode === "jigsaw") {
    base = {
      questions: payload.questions,
      jigsaw: payload.jigsaw,
      timeLimitSeconds: payload.timeLimitSeconds,
    };
  } else if (payload.mode === "polls") {
    base = {
      questions: payload.questions,
      settings: payload.settings,
      timeLimitSeconds: payload.timeLimitSeconds,
    };
  } else {
    base = {
      connectDots: payload.connectDots,
      timeLimitSeconds: payload.timeLimitSeconds,
    };
  }
  if (settings?.showLeaderboardToStudents) {
    base.showLeaderboardToStudents = true;
  }
  if (settings?.duplicatedFromName) {
    base.duplicatedFromName = settings.duplicatedFromName;
  }
  return base;
}

function readDuplicatedFromName(config: unknown): string | null {
  const raw = (config ?? {}) as Record<string, unknown>;
  return typeof raw.duplicatedFromName === "string" && raw.duplicatedFromName.trim()
    ? raw.duplicatedFromName.trim()
    : null;
}

function readShowLeaderboardToStudents(config: unknown): boolean {
  const raw = (config ?? {}) as Record<string, unknown>;
  return raw.showLeaderboardToStudents === true;
}

async function jigsawPublicUrl(storagePath: string): Promise<string> {
  const { data } = supabase.storage.from("gamibar-jigsaw").getPublicUrl(storagePath);
  return data.publicUrl;
}

async function uploadJigsawAsset(roomId: string, payload: GamePayload): Promise<GamePayload> {
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
  const ext = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
  const storagePath = `${roomId}/source.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("gamibar-jigsaw")
    .upload(storagePath, blob, { upsert: true, contentType: mime });
  if (uploadError) {
    throw new Error(uploadError.message || "Could not upload jigsaw image.");
  }

  const cols = payload.mode === "quiz_jigsaw" ? GAME_CONFIG.quiz_jigsaw.cols : payload.jigsaw.cols;
  const rows = payload.mode === "quiz_jigsaw" ? GAME_CONFIG.quiz_jigsaw.rows : payload.jigsaw.rows;

  const { error: assetError } = await supabase.from("gamibar_jigsaw_assets").upsert(
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
    throw new Error(assetError.message || "Could not save jigsaw asset metadata.");
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
  };
}

async function hydrateJigsawPayload(roomId: string, payload: GamePayload): Promise<GamePayload> {
  if (payload.mode !== "jigsaw" && payload.mode !== "quiz_jigsaw") return payload;

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
    ...(storedJigsaw?.pieceUnlockAt ? { pieceUnlockAt: storedJigsaw.pieceUnlockAt } : {}),
  };
  if (payload.mode === "quiz_jigsaw") {
    return { ...payload, jigsaw };
  }
  return {
    mode: "jigsaw",
    questions: payload.questions,
    jigsaw,
    timeLimitSeconds: payload.timeLimitSeconds,
  };
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
    .upload(storagePath, blob, { upsert: true, contentType: asset.mime_type });
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

function buildStoredRoom(
  row: {
    id: string;
    code: string;
    name: string;
    subject: string;
    author_id: string | null;
    author_name: string;
    author_token_hash: string;
    status: Room["status"];
    mode: Room["mode"];
    config: unknown;
    max_participants: number;
    created_at: string;
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
  duplicatedFromName = null,
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

  const attemptMap = new Map<string, Attempt>();
  for (const attempt of attempts) {
    attemptMap.set(attempt.participant_id, {
      id: attempt.id,
      participantId: attempt.participant_id,
      progress: Number(attempt.progress),
      correctCount: attempt.correct_count,
      wrongCount: readWrongCount((attempt.payload ?? {}) as Record<string, unknown>),
      durationMs: attempt.duration_ms,
      completed: attempt.completed,
      completedAt: ms(attempt.completed_at),
      score: attempt.score == null ? null : Number(attempt.score),
      payload: (attempt.payload ?? {}) as Record<string, unknown>,
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

  return {
    room: {
      id: row.id,
      code: row.code,
      name: row.name,
      subject: row.subject,
      authorId: row.author_id ?? "",
      authorName: row.author_name,
      status: row.status,
      mode: row.mode,
      payload,
      maxParticipants: row.max_participants,
      createdAt: ms(row.created_at) ?? Date.now(),
      startedAt: ms(row.started_at),
      endsAt: ms(row.ends_at),
      finishedAt: ms(row.finished_at),
      showLeaderboardToStudents,
      duplicatedFromName,
    },
    participants: participantMap,
    quizAnswers,
    attempts: attemptMap,
    events: Array.isArray(row.events) ? (row.events as RoomEvent[]) : [],
    authorToken,
    authorTokenHash: row.author_token_hash,
  };
}

type LegacySerializedRoom = {
  room: Room;
  participants: Record<string, Participant>;
  quizAnswers: Record<string, Record<string, QuizAnswer>>;
  attempts: Record<string, Omit<Attempt, "id"> & { id?: string }>;
  events: RoomEvent[];
  authorToken: string;
};

function deserializeLegacyState(state: unknown, authorToken = ""): StoredRoom | null {
  if (!state || typeof state !== "object") return null;
  const raw = state as LegacySerializedRoom;
  if (!raw.room?.id) return null;

  const quizAnswers = new Map<string, Map<string, QuizAnswer>>();
  for (const [participantId, answers] of Object.entries(raw.quizAnswers ?? {})) {
    quizAnswers.set(participantId, new Map(Object.entries(answers)));
  }

  const attempts = new Map<string, Attempt>();
  for (const [participantId, attempt] of Object.entries(raw.attempts ?? {})) {
    attempts.set(participantId, {
      id: attempt.id ?? createEntityId(),
      participantId: attempt.participantId ?? participantId,
      progress: attempt.progress,
      correctCount: attempt.correctCount,
      wrongCount: attempt.wrongCount ?? readWrongCount(attempt.payload ?? {}),
      durationMs: attempt.durationMs,
      completed: attempt.completed,
      completedAt: attempt.completedAt,
      score: attempt.score,
      payload: attempt.payload ?? {},
    });
  }

  const participants = new Map<string, Participant>(
    Object.entries(raw.participants ?? {}).map(([id, participant]) => [
      id,
      { ...participant, reconnectToken: participant.reconnectToken ?? "" },
    ]),
  );

  const token = authorToken || raw.authorToken || "";
  return {
    room: {
      ...raw.room,
      showLeaderboardToStudents: raw.room.showLeaderboardToStudents ?? false,
    },
    participants,
    quizAnswers,
    attempts,
    events: raw.events ?? [],
    authorToken: token,
    authorTokenHash: "",
  };
}

function serializeLegacyState(stored: StoredRoom): LegacySerializedRoom {
  const quizAnswers: LegacySerializedRoom["quizAnswers"] = {};
  for (const [participantId, answers] of stored.quizAnswers) {
    quizAnswers[participantId] = Object.fromEntries(answers);
  }

  const attempts: LegacySerializedRoom["attempts"] = {};
  for (const [participantId, attempt] of stored.attempts) {
    attempts[participantId] = attempt;
  }

  return {
    room: stored.room,
    participants: Object.fromEntries(stored.participants),
    quizAnswers,
    attempts,
    events: stored.events,
    authorToken: stored.authorToken,
  };
}

async function loadLegacyByCode(code: string): Promise<StoredRoom | null> {
  const { data, error } = await supabase
    .from("gamibar_live_rooms")
    .select("state, author_token")
    .eq("code", code)
    .maybeSingle();
  if (error || !data?.state) return null;
  return deserializeLegacyState(data.state, data.author_token);
}

async function loadLegacyById(roomId: string): Promise<StoredRoom | null> {
  const { data, error } = await supabase
    .from("gamibar_live_rooms")
    .select("state, author_token")
    .eq("id", roomId)
    .maybeSingle();
  if (error || !data?.state) return null;
  return deserializeLegacyState(data.state, data.author_token);
}

async function loadLegacyByReconnectToken(token: string): Promise<StoredRoom | null> {
  const { data, error } = await supabase
    .from("gamibar_live_rooms")
    .select("state, author_token")
    .order("updated_at", { ascending: false })
    .limit(80);
  if (error || !data) return null;

  for (const row of data) {
    const stored = deserializeLegacyState(row.state, row.author_token);
    if (!stored) continue;
    for (const participant of stored.participants.values()) {
      if (participant.reconnectToken === token) return stored;
    }
  }
  return null;
}

async function mirrorLegacyRoom(stored: StoredRoom) {
  if (!SHOULD_MIRROR_LEGACY_ROOMS) return;

  const { error } = await supabase.from("gamibar_live_rooms").upsert(
    {
      id: stored.room.id,
      code: stored.room.code,
      author_token: stored.authorToken,
      state: serializeLegacyState(stored),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) {
    console.warn("[GamiBAR] Could not mirror room to legacy table:", error.message);
  }
}

async function loadRoomBundle(roomId: string, authorToken = ""): Promise<StoredRoom | null> {
  const { data: row, error } = await supabase
    .from("gamibar_rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();
  if (error || !row) return null;

  const [participantsRes, answersRes, attemptsRes] = await Promise.all([
    supabase.from("gamibar_participants").select("*").eq("room_id", roomId),
    supabase.from("gamibar_quiz_answers").select("*").eq("room_id", roomId),
    supabase.from("gamibar_attempts").select("*").eq("room_id", roomId),
  ]);

  const normalizedMode = (row.mode === "maze" ? "connect_dots" : row.mode) as Room["mode"];
  let payload = parsePayload(normalizedMode, row.config);
  payload = await hydrateJigsawPayload(roomId, payload);

  return buildStoredRoom(
    { ...row, mode: normalizedMode },
    participantsRes.data ?? [],
    answersRes.data ?? [],
    attemptsRes.data ?? [],
    payload,
    authorToken,
    readShowLeaderboardToStudents(row.config),
    readDuplicatedFromName(row.config),
  );
}

export async function loadById(roomId: string): Promise<StoredRoom | null> {
  const stored = await loadRoomBundle(roomId);
  if (stored) {
    void mirrorLegacyRoom(stored);
    return stored;
  }
  return loadLegacyById(roomId);
}

export async function loadByCode(code: string): Promise<StoredRoom | null> {
  const clean = normalizeRoomCode(code);
  if (!isValidRoomCodeFormat(clean)) return null;

  const { data: row, error } = await supabase
    .from("gamibar_rooms")
    .select("id")
    .eq("code", clean)
    .maybeSingle();
  if (error) {
    console.warn("[GamiBAR] Room lookup failed:", error.message);
  }
  if (row?.id) {
    const stored = await loadRoomBundle(row.id);
    if (stored) {
      void mirrorLegacyRoom(stored);
      return stored;
    }
  }

  return loadLegacyByCode(clean);
}

export async function loadByReconnectToken(token: string): Promise<StoredRoom | null> {
  const tokenHash = await hashToken(token);
  const { data: participant } = await supabase
    .from("gamibar_participants")
    .select("room_id, id")
    .eq("reconnect_token_hash", tokenHash)
    .maybeSingle();
  if (participant?.room_id) {
    const stored = await loadById(participant.room_id);
    if (stored) {
      const match = stored.participants.get(participant.id);
      if (match) match.reconnectToken = token;
      return stored;
    }
  }

  return loadLegacyByReconnectToken(token);
}

export async function listCodes(): Promise<Set<string>> {
  const [roomsRes, legacyRes] = await Promise.all([
    supabase.from("gamibar_rooms").select("code"),
    supabase.from("gamibar_live_rooms").select("code"),
  ]);
  return new Set([
    ...(roomsRes.data ?? []).map((row) => row.code),
    ...(legacyRes.data ?? []).map((row) => row.code),
  ]);
}

export async function verifyAuthorToken(stored: StoredRoom, token: string): Promise<boolean> {
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
  const { data } = await supabase
    .from("gamibar_participants")
    .select("id")
    .eq("room_id", stored.room.id)
    .eq("reconnect_token_hash", tokenHash)
    .maybeSingle();
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
  const authorTokenHash = stored.authorTokenHash || (await hashToken(stored.authorToken));
  stored.authorTokenHash = authorTokenHash;

  let payload = room.payload;

  const roomRow = {
    id: room.id,
    code: room.code,
    name: room.name,
    subject: room.subject,
    author_id: isUuid(room.authorId) ? room.authorId : null,
    author_name: room.authorName,
    author_token_hash: authorTokenHash,
    status: room.status,
    mode: room.mode,
    config: configFromPayload(payload, {
      showLeaderboardToStudents: room.showLeaderboardToStudents,
      duplicatedFromName: room.duplicatedFromName,
    }),
    max_participants: room.maxParticipants,
    started_at: iso(room.startedAt),
    ends_at: iso(room.endsAt),
    finished_at: iso(room.finishedAt),
    events: stored.events.slice(-200),
  };

  const { error: roomError } = await supabase.from("gamibar_rooms").upsert(roomRow);
  if (roomError) throw new Error(roomError.message || "Could not save room.");

  if (modeNeedsJigsawUpload(room.mode)) {
    payload = await uploadJigsawAsset(room.id, payload);
    room.payload = payload;

    const { error: configError } = await supabase
      .from("gamibar_rooms")
      .update({
        config: configFromPayload(payload, {
          showLeaderboardToStudents: room.showLeaderboardToStudents,
          duplicatedFromName: room.duplicatedFromName,
        }),
      })
      .eq("id", room.id);
    if (configError) throw new Error(configError.message || "Could not save jigsaw config.");
  }

  for (const participant of stored.participants.values()) {
    if (!participant.reconnectToken) continue;
    const { error } = await supabase.from("gamibar_participants").upsert({
      id: participant.id,
      room_id: room.id,
      display_name: participant.displayName,
      status: participant.status,
      reconnect_token_hash: await hashToken(participant.reconnectToken),
      joined_at: iso(participant.joinedAt) ?? new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      user_id: participant.userId ?? null,
    });
    if (error) throw new Error(error.message || "Could not save participant.");
  }

  for (const [participantId, attempt] of stored.attempts) {
    const { error } = await supabase.from("gamibar_attempts").upsert({
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
    if (error) throw new Error(error.message || "Could not save attempt.");
  }

  if (modePersistsQuizAnswers(room.mode)) {
    for (const [participantId, answers] of stored.quizAnswers) {
      for (const answer of answers.values()) {
        const { error } = await supabase.from("gamibar_quiz_answers").upsert(
          {
            room_id: room.id,
            participant_id: participantId,
            question_id: answer.questionId,
            selected_option: answer.selectedOption,
            is_correct: answer.isCorrect,
            submitted_at: iso(answer.submittedAt) ?? new Date().toISOString(),
          },
          { onConflict: "participant_id,question_id" },
        );
        if (error) throw new Error(error.message || "Could not save quiz answer.");
      }
    }
  }

  await mirrorLegacyRoom(stored);
}

export function ensureAttempt(stored: StoredRoom, participantId: string): Attempt {
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
