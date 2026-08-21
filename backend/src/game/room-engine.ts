import { GAME_CONFIG, type GameMode } from "@shared/game/config";
import {
  computeModeLeaderboard,
  finalizeModeIncompleteAttempts,
  modePersistsQuizAnswers,
  normalizeCreatePayload,
  toPublicGamePayload,
} from "@shared/game/mode-registry";
import { createId, createReconnectToken } from "@shared/game/id";
import { createEntityId, hashToken } from "@shared/game/room-crypto";
import {
  ensureAttempt,
  beginRoomGame,
  findParticipantByReconnectToken,
  loadByCode,
  loadById,
  loadByReconnectToken,
  listCodes,
  persist,
  reserveParticipantJoin,
  resetRoomRecords,
  verifyAuthorToken,
  copyJigsawAssetBetweenRooms,
  copyVisualPointAssetsBetweenRooms,
  type StoredRoom,
} from "./room-persistence.ts";
import {
  validateConnectDotsPaths,
  type PathMap,
} from "@shared/game/connect-dots";
import {
  generateRoomCode,
  isValidRoomCodeFormat,
  normalizeRoomCode,
} from "@shared/game/room-code";
import type { RoomStatus } from "@shared/game/state-machine";
import {
  gameInstruction,
  resolvePayloadTimeLimit,
  resolvePayloadTimerMode,
} from "@shared/game/timer";
import { questionCountFromConfig } from "@shared/game/session-summary";
import { incrementJigsawLibraryUsage } from "./jigsaw-library.ts";
import { computeLiveParticipantProgress } from "@shared/game/live-dashboard";
import { sanitizeConnectDotsMatches } from "@shared/game/connect-dots-content";
import {
  buildPollResults,
  readPollResponses,
  sanitizePollQuestionResponse,
  sanitizePollResponses,
} from "@shared/game/polls";
import {
  isRouteCellInGrid,
  routingGridSize,
  validateConnectDotsMatchRoutes,
  type RouteCell,
} from "@shared/game/connect-dots-path-geometry";
import {
  initialJigsawMissionPayload,
  isJigsawMissionRetryRound,
  mergeJigsawMissionPayload,
  nextRetryQuestionId,
  readJigsawMissionPayload,
  resolveJigsawMissionQuestionId,
  retryPoolQuestionIds,
} from "@shared/game/jigsaw-mission-flow";
import {
  jigsawAssemblyValidationMessage,
  validateJigsawAssembly,
} from "@shared/game/jigsaw-assembly";
import {
  allQuestionsAnsweredCorrectly,
  allTilesEarned,
  ensureTileRotationsForEarned,
  ensureTileLayoutsForEarned,
  isTileCardRotation,
  mergeEarnedTileIds,
  readEarnedTileIds,
  readTileRotations,
  readTileLayouts,
  resolvePieceUnlockAt,
} from "@shared/game/jigsaw-tile-rewards";
import type {
  GamePayload,
  JigsawConfig,
  LeaderboardRow,
  Participant,
  PollResponseValue,
  QuizOptionId,
  Room,
  RoomEvent,
} from "@shared/game/types";
import {
  sanitizeDisplayName,
  sanitizeRoomText,
  validateGamePayload,
} from "@shared/game/validation";

function pushEvent(stored: StoredRoom, event: RoomEvent) {
  stored.events.push(event);
  if (stored.events.length > 200)
    stored.events.splice(0, stored.events.length - 200);
}

function publicRoom(stored: StoredRoom, opts?: { includeSecrets?: boolean }) {
  const { room, participants } = stored;
  const payload = toPublicGamePayload(room.mode, room.payload, opts);

  return {
    id: room.id,
    code: room.code,
    name: room.name,
    subject: room.subject,
    authorName: room.authorName,
    status: room.status,
    mode: room.mode,
    maxParticipants: room.maxParticipants,
    createdAt: room.createdAt,
    expiresAt: room.expiresAt,
    startedAt: room.startedAt,
    endsAt: room.endsAt,
    finishedAt: room.finishedAt,
    showLeaderboardToStudents: room.showLeaderboardToStudents,
    roundHistory: room.roundHistory ?? [],
    ...(opts?.includeSecrets && room.duplicatedFromName
      ? { duplicatedFromName: room.duplicatedFromName }
      : {}),
    participantCount: participants.size,
    participants: [...participants.values()].map((p) => ({
      id: p.id,
      displayName: p.displayName,
      status: p.status,
      joinedAt: p.joinedAt,
    })),
    payload,
    instruction: gameInstruction(
      room.mode,
      resolvePayloadTimeLimit(room.payload),
      room.mode === "quiz" && room.payload.mode === "quiz"
        ? room.payload.questions.length
        : undefined,
      resolvePayloadTimerMode(room.payload),
    ),
  };
}

function computeLeaderboard(stored: StoredRoom): LeaderboardRow[] {
  return computeModeLeaderboard(stored);
}

function computePollResults(stored: StoredRoom) {
  if (stored.room.mode !== "polls" || stored.room.payload.mode !== "polls")
    return undefined;
  return buildPollResults(
    stored.room.payload,
    [...stored.participants.values()].map((participant) => {
      const attempt = stored.attempts.get(participant.id);
      return {
        participantId: participant.id,
        displayName: participant.displayName,
        payload: attempt?.payload ?? {},
        completed: Boolean(attempt?.completed),
        completedAt: attempt?.completedAt ?? null,
      };
    }),
  );
}

function isTimedOut(stored: StoredRoom): boolean {
  return stored.room.endsAt != null && Date.now() >= stored.room.endsAt;
}

function isRoomExpired(stored: StoredRoom): boolean {
  return stored.room.expiresAt != null && Date.now() >= stored.room.expiresAt;
}

function rejectIfNotAcceptingInput(
  stored: StoredRoom,
): { ok: false; error: string } | null {
  if (stored.room.status !== "LIVE") {
    return { ok: false, error: "Game is not accepting answers." };
  }
  if (isTimedOut(stored)) {
    return { ok: false, error: "Time is up." };
  }
  return null;
}

async function rejectIfNotAcceptingInputAsync(
  stored: StoredRoom,
): Promise<{ ok: false; error: string } | null> {
  if (stored.room.status !== "LIVE" && stored.room.status !== "COUNTDOWN") {
    return { ok: false, error: "Game is not accepting answers." };
  }
  if (isTimedOut(stored)) {
    if (stored.room.status === "LIVE" || stored.room.status === "COUNTDOWN") {
      await finalizeGame(stored);
    }
    return { ok: false, error: "Time is up." };
  }
  if (stored.room.status !== "LIVE") {
    return { ok: false, error: "Game is not accepting answers." };
  }
  return null;
}

function ensureAttemptRecord(stored: StoredRoom, participantId: string) {
  return ensureAttempt(stored, participantId);
}

function incrementWrongCount(
  stored: StoredRoom,
  participantId: string,
  by = 1,
) {
  const attempt = ensureAttemptRecord(stored, participantId);
  attempt.wrongCount += by;
}

type QuestionTimerState = {
  stepId: string;
  endsAt: number;
  durationSeconds: number;
};

function readStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function timedOutQuestionIds(
  stored: StoredRoom,
  participantId: string,
): Set<string> {
  return new Set(
    readStringList(
      ensureAttemptRecord(stored, participantId).payload.timedOutQuestionIds,
    ),
  );
}

function readQuestionTimer(
  payload: Record<string, unknown>,
): QuestionTimerState | null {
  const raw = payload.questionTimer;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const timer = raw as Record<string, unknown>;
  return typeof timer.stepId === "string" &&
    typeof timer.endsAt === "number" &&
    Number.isFinite(timer.endsAt) &&
    typeof timer.durationSeconds === "number" &&
    Number.isFinite(timer.durationSeconds)
    ? {
        stepId: timer.stepId,
        endsAt: timer.endsAt,
        durationSeconds: timer.durationSeconds,
      }
    : null;
}

function currentTimedStepId(
  stored: StoredRoom,
  participantId: string,
): string | null {
  const attempt = ensureAttemptRecord(stored, participantId);
  if (attempt.completed) return null;
  const payload = stored.room.payload;

  if (payload.mode === "quiz") {
    const answered = stored.quizAnswers.get(participantId) ?? new Map();
    const timedOut = timedOutQuestionIds(stored, participantId);
    const question = payload.questions.find(
      (candidate) => !answered.has(candidate.id) && !timedOut.has(candidate.id),
    );
    return question ? `question:${question.id}` : null;
  }

  if (payload.mode === "visual_point") {
    const answered = stored.visualPointAnswers.get(participantId) ?? new Map();
    const timedOut = timedOutQuestionIds(stored, participantId);
    const question = payload.questions.find(
      (candidate) => !answered.has(candidate.id) && !timedOut.has(candidate.id),
    );
    return question ? `question:${question.id}` : null;
  }

  if (payload.mode === "quiz_jigsaw") {
    const answers = stored.quizAnswers.get(participantId) ?? new Map();
    const correctIds = new Set(
      [...answers.values()]
        .filter((answer) => answer.isCorrect)
        .map((answer) => answer.questionId),
    );
    const question = payload.questions.find(
      (candidate) => !correctIds.has(candidate.id),
    );
    return question ? `question:${question.id}` : null;
  }

  if (payload.mode === "jigsaw") {
    const answers = stored.quizAnswers.get(participantId) ?? new Map();
    const correctIds = new Set(
      [...answers.values()]
        .filter((answer) => answer.isCorrect)
        .map((answer) => answer.questionId),
    );
    const mission = readJigsawMissionPayload(attempt.payload);
    if (mission.phase === "assemble") return null;
    const questionId = resolveJigsawMissionQuestionId(
      payload.questions,
      correctIds,
      mission,
    );
    return questionId ? `question:${questionId}` : null;
  }

  if (payload.mode === "polls") {
    const index =
      typeof attempt.payload.pollQuestionIndex === "number"
        ? Math.max(0, Math.trunc(attempt.payload.pollQuestionIndex))
        : 0;
    const question = payload.questions[index];
    return question ? `question:${question.id}` : null;
  }

  const totalPairs = payload.connectDots.pairCount;
  const connected = Math.max(
    0,
    Math.min(totalPairs, attempt.correctCount ?? 0),
  );
  return connected < totalPairs ? `pair:${connected + 1}` : null;
}

function syncQuestionTimer(
  stored: StoredRoom,
  participantId: string,
  options?: { reset?: boolean; now?: number },
): { timer: QuestionTimerState | null; changed: boolean } {
  const attempt = ensureAttemptRecord(stored, participantId);
  const previous = readQuestionTimer(attempt.payload);
  const timerMode = resolvePayloadTimerMode(stored.room.payload);
  const durationSeconds = resolvePayloadTimeLimit(stored.room.payload);
  const stepId = currentTimedStepId(stored, participantId);

  if (
    stored.room.status !== "LIVE" ||
    timerMode !== "per_question" ||
    durationSeconds == null ||
    !stepId
  ) {
    if (!previous) return { timer: null, changed: false };
    const { questionTimer: _removed, ...rest } = attempt.payload;
    attempt.payload = rest;
    return { timer: null, changed: true };
  }

  if (!options?.reset && previous?.stepId === stepId) {
    return { timer: previous, changed: false };
  }

  const timer: QuestionTimerState = {
    stepId,
    endsAt: (options?.now ?? Date.now()) + durationSeconds * 1000,
    durationSeconds,
  };
  attempt.payload = { ...attempt.payload, questionTimer: timer };
  return { timer, changed: true };
}

function rejectExpiredQuestionTimer(
  stored: StoredRoom,
  participantId: string,
  expectedStepId: string,
): {
  ok: false;
  error: string;
  timedOut?: true;
  questionTimer?: QuestionTimerState | null;
} | null {
  if (resolvePayloadTimerMode(stored.room.payload) !== "per_question")
    return null;
  const synced = syncQuestionTimer(stored, participantId);
  if (!synced.timer) return null;
  if (synced.timer.stepId !== expectedStepId) {
    return { ok: false, error: "Continue with the current question first." };
  }
  if (Date.now() >= synced.timer.endsAt) {
    return {
      ok: false,
      error: "Time is up for this question.",
      timedOut: true,
      questionTimer: synced.timer,
    };
  }
  return null;
}

function markAttemptCompleted(
  stored: StoredRoom,
  participant: Participant,
  completedAt = Date.now(),
) {
  const attempt = ensureAttemptRecord(stored, participant.id);
  if (attempt.completed) return;
  attempt.completed = true;
  attempt.completedAt = completedAt;
  attempt.durationMs = stored.room.startedAt
    ? completedAt - stored.room.startedAt
    : null;
  participant.status = "COMPLETED";
  pushEvent(stored, {
    type: "player_completed",
    participantId: participant.id,
    displayName: participant.displayName,
    completedAt,
    durationMs: attempt.durationMs ?? 0,
  });
}

function advanceJigsawMissionAfterMiss(
  stored: StoredRoom,
  participantId: string,
) {
  if (stored.room.payload.mode !== "jigsaw") return;
  const attempt = ensureAttemptRecord(stored, participantId);
  const questions = stored.room.payload.questions;
  const answers = stored.quizAnswers.get(participantId) ?? new Map();
  const correctIds = new Set(
    [...answers.values()]
      .filter((answer) => answer.isCorrect)
      .map((answer) => answer.questionId),
  );
  let mission = readJigsawMissionPayload(attempt.payload);
  if (mission.phase === undefined) mission = initialJigsawMissionPayload();
  const currentQuestionId = resolveJigsawMissionQuestionId(
    questions,
    correctIds,
    mission,
  );
  if (!currentQuestionId) return;

  let firstRoundComplete = mission.firstRoundComplete === true;
  let firstRoundIndex = mission.firstRoundIndex ?? 0;
  let retryQuestionId = mission.retryQuestionId ?? null;
  if (!firstRoundComplete) {
    firstRoundIndex += 1;
    if (firstRoundIndex >= questions.length) {
      firstRoundComplete = true;
      retryQuestionId = retryPoolQuestionIds(questions, correctIds)[0] ?? null;
    }
  } else {
    const pool = retryPoolQuestionIds(questions, correctIds);
    retryQuestionId = nextRetryQuestionId(pool, currentQuestionId);
  }
  attempt.payload = mergeJigsawMissionPayload(attempt.payload, {
    phase: "quiz",
    firstRoundIndex,
    firstRoundComplete,
    retryQuestionId,
  });
}

function jigsawUnlockSchedule(
  jigsaw: JigsawConfig,
  questionCount: number,
): number[] {
  const tileCount = Math.max(1, jigsaw.cols * jigsaw.rows);
  return resolvePieceUnlockAt(questionCount, tileCount, jigsaw.pieceUnlockAt);
}

/** Finalize a live game and compute standings (author stop or timer expiry). */
async function finalizeGame(stored: StoredRoom) {
  if (stored.room.status !== "LIVE" && stored.room.status !== "COUNTDOWN") {
    return computeLeaderboard(stored);
  }

  const finishedAt = Date.now();
  stored.room.status = "FINISHED";
  stored.room.finishedAt = finishedAt;
  stored.room.endsAt = finishedAt;

  finalizeModeIncompleteAttempts(stored, finishedAt);

  const rows = computeLeaderboard(stored);
  const currentRoundNumber = (stored.room.roundHistory?.length ?? 0) + 1;
  const roundRecord = {
    roundNumber: currentRoundNumber,
    startedAt: stored.room.startedAt ?? finishedAt,
    finishedAt,
    participantCount: stored.participants.size,
    leaderboard: rows,
  };
  stored.room.roundHistory = [...(stored.room.roundHistory ?? []), roundRecord];

  pushEvent(stored, { type: "game_stopped", finishedAt });
  pushEvent(stored, { type: "game_finished", finishedAt, rows });
  await persist(stored);
  return rows;
}

export async function createRoom(input: {
  name: string;
  subject?: string;
  authorId: string;
  authorName: string;
  mode: GameMode;
  payload: GamePayload;
  maxParticipants?: number;
  roomLifespanDays?: number | null;
  duplicatedFromName?: string | null;
}) {
  const name = sanitizeRoomText(input.name, 80);
  const subject = sanitizeRoomText(input.subject || input.name || "General", 60);
  if (!name) return { ok: false as const, error: "Room name is required." };

  const validated = validateGamePayload(input.mode, input.payload);
  if (!validated.ok) return validated;

  const payload = normalizeCreatePayload(input.mode, input.payload);

  const createdAt = Date.now();
  const roomLifespanDays =
    Number.isInteger(input.roomLifespanDays) &&
    Number(input.roomLifespanDays) > 0
      ? Math.min(3650, Number(input.roomLifespanDays))
      : null;

  let stored: StoredRoom | null = null;
  let authorToken = "";

  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await listCodes();
    const code = generateRoomCode(existing);
    const id = createEntityId();
    authorToken = createId("author");
    const authorTokenHash = await hashToken(authorToken);

    const room: Room = {
      id,
      code,
      name,
      subject,
      authorId: input.authorId,
      authorName: input.authorName,
      status: "LOBBY",
      mode: input.mode,
      payload,
      maxParticipants:
        Number.isInteger(input.maxParticipants) &&
        Number(input.maxParticipants) > 0
          ? Math.min(200, Number(input.maxParticipants))
          : 100,
      createdAt,
      expiresAt:
        roomLifespanDays == null
          ? null
          : createdAt + roomLifespanDays * 24 * 60 * 60 * 1000,
      startedAt: null,
      endsAt: null,
      finishedAt: null,
      showLeaderboardToStudents: false,
      duplicatedFromName: input.duplicatedFromName ?? null,
    };

    const candidate: StoredRoom = {
      room,
      participants: new Map(),
      quizAnswers: new Map(),
      visualPointAnswers: new Map(),
      attempts: new Map(),
      events: [],
      authorToken,
      authorTokenHash,
    };
    pushEvent(candidate, { type: "room_updated", status: "LOBBY" });

    try {
      await persist(candidate);
      stored = candidate;
      break;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("gamibar_rooms_code_unique") || msg.includes("23505")) {
        continue;
      }
      throw err;
    }
  }

  if (!stored) {
    return {
      ok: false as const,
      error: "Could not allocate a unique room code. Please try again.",
    };
  }

  const libraryImageId =
    payload.mode === "jigsaw" || payload.mode === "quiz_jigsaw"
      ? payload.jigsaw.libraryImageId
      : null;
  if (libraryImageId) {
    await incrementJigsawLibraryUsage(libraryImageId);
  }

  return {
    ok: true as const,
    authorToken,
    room: publicRoom(stored, { includeSecrets: true }),
  };
}

export async function joinRoom(input: {
  code: string;
  displayName: string;
  userId?: string | null;
}) {
  const code = normalizeRoomCode(input.code);
  if (!isValidRoomCodeFormat(code)) {
    return { ok: false as const, error: "Enter a valid 6-digit room code." };
  }

  const displayName = sanitizeDisplayName(input.displayName);
  if (!displayName)
    return { ok: false as const, error: "Enter a display name." };

  const participantId = createEntityId();
  const reconnectToken = createReconnectToken();
  const reservation = await reserveParticipantJoin({
    code,
    participantId,
    attemptId: createEntityId(),
    displayName,
    reconnectToken,
    userId: input.userId,
  });
  if (!reservation.ok) {
    return { ok: false as const, error: reservation.error };
  }

  const stored = await loadById(reservation.roomId);
  const participant = stored?.participants.get(participantId);
  if (!stored || !participant) {
    throw new Error("The joined player session could not be loaded.");
  }
  participant.reconnectToken = reconnectToken;

  return {
    ok: true as const,
    rejoined: false as const,
    participantId,
    reconnectToken,
    room: publicRoom(stored),
  };
}

export async function reconnectParticipant(input: { reconnectToken: string }) {
  const stored = await loadByReconnectToken(input.reconnectToken);
  if (!stored)
    return {
      ok: false as const,
      error: "Session expired. Join the room again.",
    };
  if (isRoomExpired(stored)) {
    return {
      ok: false as const,
      error: "This room has expired. Ask the host to create a new room.",
    };
  }

  const participant = await findParticipantByReconnectToken(
    stored,
    input.reconnectToken,
  );
  if (!participant) {
    return {
      ok: false as const,
      error: "Session expired. Join the room again.",
    };
  }

  if (stored.room.status === "FINISHED" || stored.room.status === "CANCELLED") {
    return {
      ok: true as const,
      participantId: participant.id,
      reconnectToken: participant.reconnectToken,
      room: publicRoom(stored),
    };
  }

  if (stored.room.status === "LIVE" || stored.room.status === "COUNTDOWN") {
    if (participant.status !== "COMPLETED") {
      participant.status = "PLAYING";
    }
  } else if (participant.status === "DISCONNECTED") {
    participant.status = "ONLINE";
  }

  pushEvent(stored, {
    type: "participant_status",
    participantId: participant.id,
    status: participant.status,
  });
  await persist(stored);

  return {
    ok: true as const,
    participantId: participant.id,
    reconnectToken: participant.reconnectToken,
    room: publicRoom(stored),
  };
}

function backfillJigsawMissionTilePresentation(
  stored: StoredRoom,
  participantId: string,
): boolean {
  if (stored.room.mode !== "jigsaw" || stored.room.payload.mode !== "jigsaw")
    return false;

  const attempt = stored.attempts.get(participantId);
  if (!attempt) return false;

  const { questions, jigsaw } = stored.room.payload;
  const total = questions.length;
  const pieceUnlockAt = jigsawUnlockSchedule(jigsaw, total);
  const earnedTileIds = readEarnedTileIds(
    attempt.payload,
    jigsaw.cols,
    jigsaw.rows,
    attempt.correctCount ?? 0,
    total,
    pieceUnlockAt,
  );

  const storedEarned = attempt.payload?.earnedTileIds;
  const storedList = Array.isArray(storedEarned)
    ? storedEarned.filter((id): id is string => typeof id === "string")
    : [];
  const earnedChanged =
    earnedTileIds.length !== storedList.length ||
    earnedTileIds.some((id) => !storedList.includes(id));

  if (earnedTileIds.length === 0 && !earnedChanged) return false;

  const { tileRotations, changed: rotationsChanged } =
    ensureTileRotationsForEarned(
      earnedTileIds,
      readTileRotations(attempt.payload),
    );
  const { tileLayouts, changed: layoutsChanged } = ensureTileLayoutsForEarned(
    earnedTileIds,
    readTileLayouts(attempt.payload),
  );
  if (!earnedChanged && !rotationsChanged && !layoutsChanged) return false;

  attempt.payload = {
    ...attempt.payload,
    earnedTileIds,
    tileRotations,
    tileLayouts,
  };
  return true;
}

export async function getRoomSnapshot(input: {
  roomId?: string;
  code?: string;
  authorToken?: string;
  authorId?: string;
  reconnectToken?: string;
}) {
  const code = input.code ? normalizeRoomCode(input.code) : undefined;
  const stored = input.roomId
    ? await loadById(input.roomId)
    : code && isValidRoomCodeFormat(code)
      ? await loadByCode(code)
      : null;
  if (!stored) return { ok: false as const, error: "Room not found." };

  const isAuthor = Boolean(
    (input.authorId && stored.room.authorId === input.authorId) ||
    (input.authorToken && (await verifyAuthorToken(stored, input.authorToken, input.authorId))),
  );
  if (isRoomExpired(stored) && !isAuthor) {
    return {
      ok: false as const,
      error: "This room has expired. Ask the host to create a new room.",
    };
  }

  if (
    stored.room.status === "LIVE" &&
    stored.room.endsAt != null &&
    Date.now() >= stored.room.endsAt
  ) {
    await finalizeGame(stored);
  }

  let participantId: string | null = null;
  if (input.reconnectToken) {
    const participant = await findParticipantByReconnectToken(
      stored,
      input.reconnectToken,
    );
    participantId = participant?.id ?? null;
  }

  let questionTimer: QuestionTimerState | null = null;
  if (participantId) {
    const synced = syncQuestionTimer(stored, participantId);
    questionTimer = synced.timer;
    if (synced.changed) await persist(stored);
  }

  const leaderboard = computeLeaderboard(stored);
  const gameFinished =
    stored.room.status === "FINISHED" || stored.room.status === "CANCELLED";
  const myRank =
    participantId != null
      ? (leaderboard.find((row) => row.participantId === participantId)?.rank ??
        null)
      : null;
  const hideQuizLiveLeaderboard =
    !isAuthor &&
    !gameFinished &&
    stored.room.mode === "quiz" &&
    stored.room.status === "LIVE" &&
    !stored.room.showLeaderboardToStudents;
  const visibleLeaderboard = hideQuizLiveLeaderboard
    ? participantId
      ? leaderboard.filter((row) => row.participantId === participantId)
      : []
    : leaderboard;
  const pollResults =
    stored.room.mode === "polls" &&
    stored.room.payload.mode === "polls" &&
    (isAuthor || gameFinished || stored.room.payload.settings.showLiveResults)
      ? computePollResults(stored)
      : undefined;
  const revealOwnAnswerCorrectness =
    stored.room.status === "FINISHED" || stored.room.status === "CANCELLED";
  const myAnswers =
    participantId && modePersistsQuizAnswers(stored.room.mode)
      ? [...(stored.quizAnswers.get(participantId)?.values() ?? [])].map(
          (a) => ({
            questionId: a.questionId,
            selectedOption: a.selectedOption,
            submittedAt: a.submittedAt,
            isCorrect: revealOwnAnswerCorrectness ? a.isCorrect : undefined,
          }),
        )
      : participantId && stored.room.mode === "visual_point"
        ? [
            ...(stored.visualPointAnswers.get(participantId)?.values() ?? []),
          ].map((a) => ({
            questionId: a.questionId,
            selectedPointId: a.selectedPointId,
            submittedAt: a.submittedAt,
            isCorrect: revealOwnAnswerCorrectness ? a.isCorrect : undefined,
          }))
        : [];

  if (
    participantId &&
    stored.room.mode === "jigsaw" &&
    stored.room.payload.mode === "jigsaw"
  ) {
    if (backfillJigsawMissionTilePresentation(stored, participantId)) {
      await persist(stored);
    }
  }

  return {
    ok: true as const,
    room: publicRoom(stored, { includeSecrets: isAuthor }),
    isAuthor,
    participantId,
    myRank,
    leaderboard: visibleLeaderboard,
    liveProgress:
      isAuthor && stored.room.status === "LIVE"
        ? computeLiveParticipantProgress(stored)
        : undefined,
    pollResults,
    myAnswers,
    myTimedOutQuestionIds: participantId
      ? [...timedOutQuestionIds(stored, participantId)]
      : [],
    questionTimer,
    myAttempt: participantId
      ? (stored.attempts.get(participantId) ?? null)
      : null,
    recentEvents: stored.events.slice(-40),
  };
}

/** Author-only results view — verifies ownership by author id (no browser token required). */
export async function getAuthorRoomResults(input: {
  roomId: string;
  authorId: string;
}) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  if (stored.room.authorId !== input.authorId) {
    return {
      ok: false as const,
      error: "You do not have access to this game.",
    };
  }

  const leaderboard = computeLeaderboard(stored);
  const completions = stored.events
    .filter(
      (e): e is Extract<RoomEvent, { type: "player_completed" }> =>
        e.type === "player_completed",
    )
    .map((e) => ({
      key: `${e.participantId}-${e.completedAt}`,
      displayName: e.displayName,
      durationMs: e.durationMs,
    }))
    .reverse();

  return {
    ok: true as const,
    room: publicRoom(stored, { includeSecrets: true }),
    leaderboard,
    completions,
    participantCount: stored.participants.size,
    questionCount: questionCountFromConfig(
      stored.room.mode,
      stored.room.payload,
    ),
  };
}

/** Clone an existing game into a new lobby room (new code + author token). */
export async function duplicateRoom(input: {
  sourceRoomId: string;
  authorId: string;
  authorName: string;
  name: string;
  maxParticipants?: number;
  roomLifespanDays?: number | null;
}) {
  const stored = await loadById(input.sourceRoomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  if (stored.room.authorId !== input.authorId) {
    return {
      ok: false as const,
      error: "You can only duplicate your own games.",
    };
  }

  const name = sanitizeRoomText(input.name, 80);
  if (!name) return { ok: false as const, error: "Game name is required." };

  const created = await createRoom({
    name,
    subject: stored.room.subject,
    authorId: input.authorId,
    authorName: input.authorName,
    mode: stored.room.mode,
    payload: stored.room.payload,
    maxParticipants: input.maxParticipants,
    roomLifespanDays: input.roomLifespanDays,
    duplicatedFromName: stored.room.name.trim(),
  });

  if (!created.ok) return created;

  await copyJigsawAssetBetweenRooms(input.sourceRoomId, created.room.id);
  await copyVisualPointAssetsBetweenRooms(input.sourceRoomId, created.room.id);
  return created;
}

/** Issue a fresh host token for a game the signed-in author owns (My Games → live control). */
export async function claimAuthorSession(input: {
  roomId: string;
  authorId: string;
}) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  if (stored.room.authorId !== input.authorId) {
    return {
      ok: false as const,
      error: "You do not have access to this game.",
    };
  }

  const authorToken = stored.authorToken || createId("author");
  stored.authorToken = authorToken;
  stored.authorTokenHash = await hashToken(authorToken);
  await persist(stored);

  return {
    ok: true as const,
    authorToken,
    room: publicRoom(stored, { includeSecrets: true }),
  };
}

export async function startGame(input: {
  roomId: string;
  authorToken?: string;
  authorId?: string;
}) {
  const initial = await loadById(input.roomId);
  if (!initial) return { ok: false as const, error: "Room not found." };

  const isVerifiedAuthor =
    (input.authorId && initial.room.authorId && initial.room.authorId === input.authorId) ||
    (input.authorToken && (await verifyAuthorToken(initial, input.authorToken, input.authorId)));

  if (!isVerifiedAuthor) {
    return { ok: false as const, error: "Only the host can start the game." };
  }

  const countdownSeconds = 3;
  const limit = resolvePayloadTimeLimit(initial.room.payload);
  const timerMode = resolvePayloadTimerMode(initial.room.payload);
  const tokenToUse = input.authorToken || initial.authorToken || createId("author");
  const tokenHash = await hashToken(tokenToUse);

  if (initial.authorTokenHash !== tokenHash || !initial.authorToken) {
    initial.authorToken = tokenToUse;
    initial.authorTokenHash = tokenHash;
    await persist(initial);
  }

  const reservation = await beginRoomGame({
    roomId: input.roomId,
    authorToken: tokenToUse,
    overallLimitSeconds:
      timerMode === "overall" && limit != null ? limit : null,
    countdownSeconds,
  });
  if (!reservation.ok) {
    return { ok: false as const, error: reservation.error };
  }

  const stored = await loadById(input.roomId);
  if (!stored) throw new Error("The started room could not be loaded.");

  for (const p of stored.participants.values()) {
    syncQuestionTimer(stored, p.id, { now: reservation.startedAt });
  }
  await persist(stored);

  return { ok: true as const, room: publicRoom(stored), countdownSeconds };
}

export async function stopGame(input: {
  roomId: string;
  authorToken?: string;
  authorId?: string;
}) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  if (!(await verifyAuthorToken(stored, input.authorToken, input.authorId))) {
    return { ok: false as const, error: "Only the host can stop the game." };
  }
  if (stored.room.status !== "LIVE" && stored.room.status !== "COUNTDOWN") {
    return { ok: false as const, error: "Game is not live." };
  }

  await finalizeGame(stored);

  return {
    ok: true as const,
    room: publicRoom(stored),
    leaderboard: computeLeaderboard(stored),
  };
}

export async function restartGame(input: {
  roomId: string;
  authorToken?: string;
  authorId?: string;
}) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  if (!(await verifyAuthorToken(stored, input.authorToken, input.authorId))) {
    return { ok: false as const, error: "Only the host can restart the game." };
  }

  stored.room.status = "LOBBY";
  stored.room.startedAt = null;
  stored.room.finishedAt = null;
  stored.room.endsAt = null;
  stored.events = [];

  stored.participants.clear();
  stored.attempts.clear();
  stored.quizAnswers.clear();
  stored.visualPointAnswers.clear();

  await resetRoomRecords(input.roomId, stored.room.roundHistory ?? []);
  await persist(stored);

  return {
    ok: true as const,
    room: publicRoom(stored),
  };
}

export async function setShowLeaderboardToStudents(input: {
  roomId: string;
  authorToken?: string;
  authorId?: string;
  enabled: boolean;
}) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  if (!(await verifyAuthorToken(stored, input.authorToken, input.authorId))) {
    return {
      ok: false as const,
      error: "Only the host can change this setting.",
    };
  }
  if (stored.room.mode !== "quiz") {
    return {
      ok: false as const,
      error: "Live leaderboard visibility applies to Quiz Challenge only.",
    };
  }
  if (stored.room.status !== "LIVE") {
    return { ok: false as const, error: "Enable this while the quiz is live." };
  }

  stored.room.showLeaderboardToStudents = input.enabled;
  await persist(stored);

  return {
    ok: true as const,
    room: publicRoom(stored),
    leaderboard: computeLeaderboard(stored),
  };
}

export async function expireQuestionTimer(input: {
  roomId: string;
  reconnectToken: string;
  stepId: string;
}) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  const reject = await rejectIfNotAcceptingInputAsync(stored);
  if (reject) return reject;
  if (resolvePayloadTimerMode(stored.room.payload) !== "per_question") {
    return {
      ok: false as const,
      error: "This game does not use per-question timing.",
    };
  }

  const participant = await findParticipantByReconnectToken(
    stored,
    input.reconnectToken,
  );
  if (!participant)
    return { ok: false as const, error: "Participant not found." };
  const synced = syncQuestionTimer(stored, participant.id);
  if (!synced.timer) {
    return {
      ok: true as const,
      completed: ensureAttemptRecord(stored, participant.id).completed,
    };
  }
  if (synced.timer.stepId !== input.stepId) {
    return {
      ok: true as const,
      stale: true,
      questionTimer: synced.timer,
      completed: ensureAttemptRecord(stored, participant.id).completed,
    };
  }
  if (Date.now() < synced.timer.endsAt) {
    return {
      ok: false as const,
      error: "This question still has time remaining.",
    };
  }

  const attempt = ensureAttemptRecord(stored, participant.id);
  const payload = stored.room.payload;
  const timedOutId = input.stepId.startsWith("question:")
    ? input.stepId.slice("question:".length)
    : null;

  if (payload.mode === "quiz" || payload.mode === "visual_point") {
    if (!timedOutId)
      return { ok: false as const, error: "Invalid question timer." };
    const ids = timedOutQuestionIds(stored, participant.id);
    ids.add(timedOutId);
    attempt.payload = { ...attempt.payload, timedOutQuestionIds: [...ids] };
    incrementWrongCount(stored, participant.id);
    const answeredCount =
      payload.mode === "quiz"
        ? (stored.quizAnswers.get(participant.id)?.size ?? 0)
        : (stored.visualPointAnswers.get(participant.id)?.size ?? 0);
    const resolvedCount = answeredCount + ids.size;
    attempt.progress = payload.questions.length
      ? resolvedCount / payload.questions.length
      : 1;
    attempt.score = attempt.correctCount * 100;
    pushEvent(stored, {
      type: "player_progress",
      participantId: participant.id,
      displayName: participant.displayName,
      progress: attempt.progress,
      detail: `${resolvedCount}/${payload.questions.length}`,
    });
    if (resolvedCount >= payload.questions.length)
      markAttemptCompleted(stored, participant);
  } else if (payload.mode === "quiz_jigsaw") {
    incrementWrongCount(stored, participant.id);
  } else if (payload.mode === "jigsaw") {
    incrementWrongCount(stored, participant.id);
    advanceJigsawMissionAfterMiss(stored, participant.id);
  } else if (payload.mode === "polls") {
    const currentIndex =
      typeof attempt.payload.pollQuestionIndex === "number"
        ? Math.max(0, Math.trunc(attempt.payload.pollQuestionIndex))
        : 0;
    const nextIndex = Math.min(payload.questions.length, currentIndex + 1);
    const ids = timedOutQuestionIds(stored, participant.id);
    if (timedOutId) ids.add(timedOutId);
    const responses = readPollResponses(attempt.payload);
    attempt.correctCount = Object.keys(responses).length;
    attempt.progress = payload.questions.length
      ? nextIndex / payload.questions.length
      : 1;
    attempt.payload = {
      ...attempt.payload,
      pollQuestionIndex: nextIndex,
      timedOutQuestionIds: [...ids],
    };
    pushEvent(stored, {
      type: "player_progress",
      participantId: participant.id,
      displayName: participant.displayName,
      progress: attempt.progress,
      detail: `${nextIndex}/${payload.questions.length}`,
    });
    if (nextIndex >= payload.questions.length)
      markAttemptCompleted(stored, participant);
  } else {
    incrementWrongCount(stored, participant.id);
  }

  const nextTimer = syncQuestionTimer(stored, participant.id, { reset: true });
  const pollResults =
    payload.mode === "polls" ? computePollResults(stored) : undefined;
  if (pollResults) {
    pushEvent(stored, {
      type: "poll_results_updated",
      submittedCount: pollResults.submittedCount,
      totalParticipants: pollResults.totalParticipants,
    });
  }
  await persist(stored);

  return {
    ok: true as const,
    timedOutStepId: input.stepId,
    questionTimer: nextTimer.timer,
    completed: attempt.completed,
    pollResults,
  };
}

export async function submitPollQuestionResponse(input: {
  roomId: string;
  reconnectToken: string;
  questionId: string;
  value?: PollResponseValue;
}) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  const reject = await rejectIfNotAcceptingInputAsync(stored);
  if (reject) return reject;
  if (stored.room.mode !== "polls" || stored.room.payload.mode !== "polls") {
    return { ok: false as const, error: "This room is not a poll or survey." };
  }
  if (resolvePayloadTimerMode(stored.room.payload) !== "per_question") {
    return {
      ok: false as const,
      error: "This survey uses one whole-game timer.",
    };
  }

  const participant = await findParticipantByReconnectToken(
    stored,
    input.reconnectToken,
  );
  if (!participant)
    return { ok: false as const, error: "Participant not found." };
  const attempt = ensureAttemptRecord(stored, participant.id);
  if (attempt.completed) return { ok: true as const, completed: true };

  const currentIndex =
    typeof attempt.payload.pollQuestionIndex === "number"
      ? Math.max(0, Math.trunc(attempt.payload.pollQuestionIndex))
      : 0;
  const question = stored.room.payload.questions[currentIndex];
  if (!question || question.id !== input.questionId) {
    return {
      ok: false as const,
      error: "Continue with the current question first.",
    };
  }
  const timerReject = rejectExpiredQuestionTimer(
    stored,
    participant.id,
    `question:${question.id}`,
  );
  if (timerReject) return timerReject;

  const parsed = sanitizePollQuestionResponse(question, input.value);
  if (!parsed.ok) return parsed;
  const responses = readPollResponses(attempt.payload);
  if (parsed.value === undefined) delete responses[question.id];
  else responses[question.id] = parsed.value;

  const nextIndex = currentIndex + 1;
  const answeredCount = Object.keys(responses).length;
  attempt.correctCount = answeredCount;
  attempt.progress = stored.room.payload.questions.length
    ? nextIndex / stored.room.payload.questions.length
    : 1;
  attempt.payload = {
    ...attempt.payload,
    responses,
    pollQuestionIndex: nextIndex,
    updatedAt: Date.now(),
  };

  pushEvent(stored, {
    type: "player_progress",
    participantId: participant.id,
    displayName: participant.displayName,
    progress: attempt.progress,
    detail: `${nextIndex}/${stored.room.payload.questions.length}`,
  });
  if (nextIndex >= stored.room.payload.questions.length) {
    attempt.payload = { ...attempt.payload, submittedAt: Date.now() };
    markAttemptCompleted(stored, participant);
  }

  const nextTimer = syncQuestionTimer(stored, participant.id);
  const pollResults = computePollResults(stored);
  if (pollResults) {
    pushEvent(stored, {
      type: "poll_results_updated",
      submittedCount: pollResults.submittedCount,
      totalParticipants: pollResults.totalParticipants,
    });
  }
  await persist(stored);
  return {
    ok: true as const,
    completed: attempt.completed,
    answeredCount,
    nextQuestionId: stored.room.payload.questions[nextIndex]?.id ?? null,
    questionTimer: nextTimer.timer,
    pollResults,
  };
}

export async function submitPollResponses(input: {
  roomId: string;
  reconnectToken: string;
  responses: Record<string, unknown>;
}) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  const reject = await rejectIfNotAcceptingInputAsync(stored);
  if (reject) return reject;
  if (stored.room.mode !== "polls" || stored.room.payload.mode !== "polls") {
    return { ok: false as const, error: "This room is not a poll or survey." };
  }
  if (resolvePayloadTimerMode(stored.room.payload) === "per_question") {
    return {
      ok: false as const,
      error: "Submit this survey one question at a time.",
    };
  }

  const participant = await findParticipantByReconnectToken(
    stored,
    input.reconnectToken,
  );
  if (!participant)
    return { ok: false as const, error: "Participant not found." };

  const attempt = ensureAttemptRecord(stored, participant.id);
  if (attempt.completed && !stored.room.payload.settings.allowResubmission) {
    return {
      ok: true as const,
      completed: true,
      alreadySubmitted: true,
      pollResults: computePollResults(stored),
    };
  }

  const parsed = sanitizePollResponses(
    stored.room.payload,
    input.responses ?? {},
  );
  if (!parsed.ok) return parsed;

  const now = Date.now();
  const wasCompleted = attempt.completed;
  const previousSubmittedAt =
    typeof attempt.payload.submittedAt === "number"
      ? attempt.payload.submittedAt
      : now;

  attempt.correctCount = parsed.answeredCount;
  attempt.progress = stored.room.payload.questions.length
    ? parsed.answeredCount / stored.room.payload.questions.length
    : 1;
  attempt.score = null;
  attempt.completed = true;
  attempt.completedAt = wasCompleted ? attempt.completedAt : now;
  attempt.durationMs = stored.room.startedAt
    ? now - stored.room.startedAt
    : null;
  attempt.payload = {
    ...attempt.payload,
    responses: parsed.responses,
    requiredAnswered: parsed.requiredAnswered,
    requiredTotal: parsed.requiredTotal,
    submittedAt: previousSubmittedAt,
    updatedAt: now,
  };
  participant.status = "COMPLETED";

  pushEvent(stored, {
    type: "player_progress",
    participantId: participant.id,
    displayName: participant.displayName,
    progress: attempt.progress,
    detail: `${parsed.answeredCount}/${stored.room.payload.questions.length}`,
  });

  if (!wasCompleted) {
    pushEvent(stored, {
      type: "player_completed",
      participantId: participant.id,
      displayName: participant.displayName,
      completedAt: now,
      durationMs: attempt.durationMs ?? 0,
    });
  }

  const pollResults = computePollResults(stored);
  if (pollResults) {
    pushEvent(stored, {
      type: "poll_results_updated",
      submittedCount: pollResults.submittedCount,
      totalParticipants: pollResults.totalParticipants,
    });
  }

  await persist(stored);
  return {
    ok: true as const,
    completed: true,
    answeredCount: parsed.answeredCount,
    pollResults,
  };
}

export async function submitQuizAnswer(input: {
  roomId: string;
  reconnectToken: string;
  questionId: string;
  selectedOption: QuizOptionId;
}) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  const reject = await rejectIfNotAcceptingInputAsync(stored);
  if (reject) return reject;
  if (stored.room.mode !== "quiz" || stored.room.payload.mode !== "quiz") {
    return { ok: false as const, error: "This room is not a quiz." };
  }

  const participant = await findParticipantByReconnectToken(
    stored,
    input.reconnectToken,
  );
  if (!participant)
    return { ok: false as const, error: "Participant not found." };

  const question =
    stored.room.payload.mode === "quiz"
      ? stored.room.payload.questions.find((q) => q.id === input.questionId)
      : undefined;
  if (!question) return { ok: false as const, error: "Invalid question." };

  const timerReject = rejectExpiredQuestionTimer(
    stored,
    participant.id,
    `question:${input.questionId}`,
  );
  if (timerReject) return timerReject;

  let map = stored.quizAnswers.get(participant.id);
  if (!map) {
    map = new Map();
    stored.quizAnswers.set(participant.id, map);
  }
  if (map.has(input.questionId)) {
    return { ok: false as const, error: "This question was already answered." };
  }
  const timedOut = timedOutQuestionIds(stored, participant.id);
  if (timedOut.has(input.questionId)) {
    return {
      ok: false as const,
      error: "Time already expired for this question.",
    };
  }

  const selected = input.selectedOption;
  if (!["A", "B", "C", "D"].includes(selected)) {
    return { ok: false as const, error: "Invalid option." };
  }

  const isCorrect = question.correctOption === selected;
  map.set(input.questionId, {
    questionId: input.questionId,
    selectedOption: selected,
    isCorrect,
    submittedAt: Date.now(),
  });

  const questionTotal =
    stored.room.mode === "quiz" && stored.room.payload.mode === "quiz"
      ? stored.room.payload.questions.length
      : GAME_CONFIG.quiz.defaultQuestionCount;

  const attempt = ensureAttemptRecord(stored, participant.id);
  const resolvedCount = map.size + timedOut.size;
  attempt.progress = resolvedCount / questionTotal;
  attempt.correctCount = [...map.values()].filter((a) => a.isCorrect).length;
  attempt.score = attempt.correctCount * 100;

  pushEvent(stored, {
    type: "player_progress",
    participantId: participant.id,
    displayName: participant.displayName,
    progress: attempt.progress,
    detail: `${resolvedCount}/${questionTotal}`,
  });

  if (resolvedCount >= questionTotal) markAttemptCompleted(stored, participant);

  const nextUnanswered = stored.room.payload.questions.find(
    (q) => !map!.has(q.id) && !timedOut.has(q.id),
  );
  const nextTimer = syncQuestionTimer(stored, participant.id);
  await persist(stored);

  return {
    ok: true as const,
    locked: true,
    answeredCount: resolvedCount,
    total: questionTotal,
    completed: attempt.completed,
    nextQuestionId: nextUnanswered?.id ?? null,
    questionTimer: nextTimer.timer,
  };
}

export async function submitVisualPointAnswer(input: {
  roomId: string;
  reconnectToken: string;
  questionId: string;
  selectedPointId: string;
}) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  const reject = await rejectIfNotAcceptingInputAsync(stored);
  if (reject) return reject;
  if (
    stored.room.mode !== "visual_point" ||
    stored.room.payload.mode !== "visual_point"
  ) {
    return {
      ok: false as const,
      error: "This room is not a Target Hunt session.",
    };
  }

  const participant = await findParticipantByReconnectToken(
    stored,
    input.reconnectToken,
  );
  if (!participant)
    return { ok: false as const, error: "Participant not found." };

  const question = stored.room.payload.questions.find(
    (q) => q.id === input.questionId,
  );
  if (!question) return { ok: false as const, error: "Invalid question." };

  const timerReject = rejectExpiredQuestionTimer(
    stored,
    participant.id,
    `question:${input.questionId}`,
  );
  if (timerReject) return timerReject;

  const selectedPoint = question.points.find(
    (point) => point.id === input.selectedPointId,
  );
  if (!selectedPoint)
    return { ok: false as const, error: "Invalid target selection." };

  let map = stored.visualPointAnswers.get(participant.id);
  if (!map) {
    map = new Map();
    stored.visualPointAnswers.set(participant.id, map);
  }
  if (map.has(input.questionId)) {
    return { ok: false as const, error: "This question was already answered." };
  }
  const timedOut = timedOutQuestionIds(stored, participant.id);
  if (timedOut.has(input.questionId)) {
    return {
      ok: false as const,
      error: "Time already expired for this question.",
    };
  }

  const isCorrect = selectedPoint.isCorrect === true;
  map.set(input.questionId, {
    questionId: input.questionId,
    selectedPointId: selectedPoint.id,
    isCorrect,
    submittedAt: Date.now(),
  });

  const questionTotal = stored.room.payload.questions.length;
  const attempt = ensureAttemptRecord(stored, participant.id);
  const resolvedCount = map.size + timedOut.size;
  attempt.progress = questionTotal ? resolvedCount / questionTotal : 0;
  attempt.correctCount = [...map.values()].filter(
    (answer) => answer.isCorrect,
  ).length;
  attempt.score = attempt.correctCount * 100;

  pushEvent(stored, {
    type: "player_progress",
    participantId: participant.id,
    displayName: participant.displayName,
    progress: attempt.progress,
    detail: `${resolvedCount}/${questionTotal}`,
  });

  if (resolvedCount >= questionTotal) markAttemptCompleted(stored, participant);

  const nextUnanswered = stored.room.payload.questions.find(
    (q) => !map!.has(q.id) && !timedOut.has(q.id),
  );
  const nextTimer = syncQuestionTimer(stored, participant.id);
  await persist(stored);

  return {
    ok: true as const,
    locked: true,
    answeredCount: resolvedCount,
    total: questionTotal,
    completed: attempt.completed,
    nextQuestionId: nextUnanswered?.id ?? null,
    questionTimer: nextTimer.timer,
  };
}

/** Puzzle Quest: retry until correct; only correct answers unlock a piece. */
export async function submitQuizJigsawAnswer(input: {
  roomId: string;
  reconnectToken: string;
  questionId: string;
  selectedOption: QuizOptionId;
}) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  const reject = await rejectIfNotAcceptingInputAsync(stored);
  if (reject) return reject;
  if (
    stored.room.mode !== "quiz_jigsaw" ||
    stored.room.payload.mode !== "quiz_jigsaw"
  ) {
    return {
      ok: false as const,
      error: "This room is not a Puzzle Quest session.",
    };
  }

  const participant = await findParticipantByReconnectToken(
    stored,
    input.reconnectToken,
  );
  if (!participant)
    return { ok: false as const, error: "Participant not found." };

  const attempt = ensureAttemptRecord(stored, participant.id);
  if (attempt.completed) {
    return { ok: false as const, error: "You already completed this puzzle." };
  }

  const question = stored.room.payload.questions.find(
    (q) => q.id === input.questionId,
  );
  if (!question) return { ok: false as const, error: "Invalid question." };

  let map = stored.quizAnswers.get(participant.id);
  if (!map) {
    map = new Map();
    stored.quizAnswers.set(participant.id, map);
  }

  const total = GAME_CONFIG.quiz_jigsaw.questionCount;
  const correctIds = new Set(
    [...map.values()].filter((a) => a.isCorrect).map((a) => a.questionId),
  );
  const currentQuestion = stored.room.payload.questions.find(
    (q) => !correctIds.has(q.id),
  );
  if (!currentQuestion || currentQuestion.id !== input.questionId) {
    return { ok: false as const, error: "Answer the current question first." };
  }

  const timerReject = rejectExpiredQuestionTimer(
    stored,
    participant.id,
    `question:${input.questionId}`,
  );
  if (timerReject) return timerReject;

  const selected = input.selectedOption;
  if (!["A", "B", "C", "D"].includes(selected)) {
    return { ok: false as const, error: "Invalid option." };
  }

  const isCorrect = question.correctOption === selected;
  if (!isCorrect) {
    incrementWrongCount(stored, participant.id);
    const nextTimer = syncQuestionTimer(stored, participant.id, {
      reset: true,
    });
    await persist(stored);
    return {
      ok: true as const,
      correct: false,
      piecesUnlocked: correctIds.size,
      total,
      completed: false,
      questionTimer: nextTimer.timer,
    };
  }

  map.set(input.questionId, {
    questionId: input.questionId,
    selectedOption: selected,
    isCorrect: true,
    submittedAt: Date.now(),
  });

  const piecesUnlocked = correctIds.size + 1;
  attempt.correctCount = piecesUnlocked;
  attempt.progress = piecesUnlocked / total;

  pushEvent(stored, {
    type: "player_progress",
    participantId: participant.id,
    displayName: participant.displayName,
    progress: attempt.progress,
    detail: `${piecesUnlocked}/${total} pieces`,
  });

  let completed = false;
  let rewardCode: string | undefined;
  if (piecesUnlocked >= total) {
    const completedAt = Date.now();
    attempt.completed = true;
    attempt.completedAt = completedAt;
    attempt.durationMs = stored.room.startedAt
      ? completedAt - stored.room.startedAt
      : null;
    attempt.score = piecesUnlocked * 100;
    participant.status = "COMPLETED";
    completed = true;
    rewardCode = stored.room.payload.rewardCode;
    attempt.payload = { ...attempt.payload, rewardCode };
    pushEvent(stored, {
      type: "player_completed",
      participantId: participant.id,
      displayName: participant.displayName,
      completedAt,
      durationMs: attempt.durationMs ?? 0,
    });
  }

  const nextQuestion = stored.room.payload.questions.find(
    (q) => !map!.has(q.id),
  );
  const nextTimer = syncQuestionTimer(stored, participant.id);
  await persist(stored);

  return {
    ok: true as const,
    correct: true,
    piecesUnlocked,
    total,
    completed,
    rewardCode,
    nextQuestionId: nextQuestion?.id ?? null,
    questionTimer: nextTimer.timer,
  };
}

/** Jigsaw Mission: first round through all questions, then retry rounds for missed ones. */
export async function submitJigsawMissionAnswer(input: {
  roomId: string;
  reconnectToken: string;
  questionId: string;
  selectedOption: QuizOptionId;
}) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  const reject = await rejectIfNotAcceptingInputAsync(stored);
  if (reject) return reject;
  if (stored.room.mode !== "jigsaw" || stored.room.payload.mode !== "jigsaw") {
    return {
      ok: false as const,
      error: "This room is not a Jigsaw Mission session.",
    };
  }

  const questions = stored.room.payload.questions;
  if (questions.length < 1) {
    return {
      ok: false as const,
      error: "This jigsaw has no quiz questions configured.",
    };
  }

  const participant = await findParticipantByReconnectToken(
    stored,
    input.reconnectToken,
  );
  if (!participant)
    return { ok: false as const, error: "Participant not found." };

  const attempt = ensureAttemptRecord(stored, participant.id);
  if (attempt.completed) {
    return { ok: false as const, error: "You already completed this puzzle." };
  }

  const question = questions.find((q) => q.id === input.questionId);
  if (!question) return { ok: false as const, error: "Invalid question." };

  let map = stored.quizAnswers.get(participant.id);
  if (!map) {
    map = new Map();
    stored.quizAnswers.set(participant.id, map);
  }

  const total = questions.length;
  const jigsaw = stored.room.payload.jigsaw;
  const { cols, rows } = jigsaw;
  const tileCount = Math.max(1, cols * rows);
  const pieceUnlockAt = jigsawUnlockSchedule(jigsaw, total);
  let mission = readJigsawMissionPayload(attempt.payload);
  if (mission.phase === undefined) {
    mission = initialJigsawMissionPayload();
  }

  const correctIds = new Set(
    [...map.values()].filter((a) => a.isCorrect).map((a) => a.questionId),
  );

  const expectedQuestionId = resolveJigsawMissionQuestionId(
    questions,
    correctIds,
    mission,
  );
  if (!expectedQuestionId || expectedQuestionId !== input.questionId) {
    return { ok: false as const, error: "Answer the current question first." };
  }

  const timerReject = rejectExpiredQuestionTimer(
    stored,
    participant.id,
    `question:${input.questionId}`,
  );
  if (timerReject) return timerReject;

  const selected = input.selectedOption;
  if (!["A", "B", "C", "D"].includes(selected)) {
    return { ok: false as const, error: "Invalid option." };
  }

  const isCorrect = question.correctOption === selected;
  const inRetryRound = isJigsawMissionRetryRound(mission);
  let firstRoundComplete = mission.firstRoundComplete === true;
  let firstRoundIndex = mission.firstRoundIndex ?? 0;
  let retryQuestionId = mission.retryQuestionId ?? null;

  if (!isCorrect) {
    incrementWrongCount(stored, participant.id);

    if (!firstRoundComplete) {
      firstRoundIndex += 1;
      if (firstRoundIndex >= total) {
        firstRoundComplete = true;
        const pool = retryPoolQuestionIds(questions, correctIds);
        retryQuestionId = pool[0] ?? null;
      }
    } else {
      const pool = retryPoolQuestionIds(questions, correctIds);
      retryQuestionId = nextRetryQuestionId(pool, input.questionId);
    }

    attempt.payload = mergeJigsawMissionPayload(attempt.payload, {
      phase: "quiz",
      firstRoundIndex,
      firstRoundComplete,
      retryQuestionId,
    });
    const nextTimer = syncQuestionTimer(stored, participant.id);
    await persist(stored);

    const earnedTileIds = readEarnedTileIds(
      attempt.payload,
      cols,
      rows,
      correctIds.size,
      total,
      pieceUnlockAt,
    );

    return {
      ok: true as const,
      correct: false,
      piecesUnlocked: earnedTileIds.length,
      totalTiles: tileCount,
      earnedTileIds,
      total,
      allPiecesUnlocked: false,
      isRetryRound: firstRoundComplete,
      retryRemaining: retryPoolQuestionIds(questions, correctIds).length,
      firstRoundComplete,
      completed: false,
      questionTimer: nextTimer.timer,
    };
  }

  if (correctIds.has(input.questionId)) {
    return {
      ok: false as const,
      error: "You already unlocked this puzzle piece.",
    };
  }

  map.set(input.questionId, {
    questionId: input.questionId,
    selectedOption: selected,
    isCorrect: true,
    submittedAt: Date.now(),
  });

  const correctQuestionCount = correctIds.size + 1;
  attempt.correctCount = correctQuestionCount;
  attempt.progress = correctQuestionCount / total;

  const existingEarned = readEarnedTileIds(
    attempt.payload,
    cols,
    rows,
    correctIds.size,
    total,
    pieceUnlockAt,
  );
  const earnedTileIds = mergeEarnedTileIds(
    existingEarned,
    correctQuestionCount,
    total,
    tileCount,
    cols,
    pieceUnlockAt,
  );

  if (!firstRoundComplete) {
    firstRoundIndex += 1;
    if (firstRoundIndex >= total) {
      firstRoundComplete = true;
    }
  }

  const poolAfter = retryPoolQuestionIds(
    questions,
    new Set([...correctIds, input.questionId]),
  );
  retryQuestionId = firstRoundComplete ? (poolAfter[0] ?? null) : null;

  const allQuestionsDone = allQuestionsAnsweredCorrectly(
    correctQuestionCount,
    total,
  );
  const allPiecesUnlocked =
    allQuestionsDone && allTilesEarned(earnedTileIds, tileCount);
  const { tileRotations } = ensureTileRotationsForEarned(
    earnedTileIds,
    readTileRotations(attempt.payload),
  );
  const { tileLayouts } = ensureTileLayoutsForEarned(
    earnedTileIds,
    readTileLayouts(attempt.payload),
  );

  pushEvent(stored, {
    type: "player_progress",
    participantId: participant.id,
    displayName: participant.displayName,
    progress: attempt.progress,
    detail: `${earnedTileIds.length}/${tileCount} tiles · ${correctQuestionCount}/${total} questions`,
  });

  if (allPiecesUnlocked) {
    attempt.payload = {
      ...mergeJigsawMissionPayload(attempt.payload, {
        phase: "assemble",
        firstRoundIndex,
        firstRoundComplete: true,
        retryQuestionId: null,
      }),
      earnedTileIds,
      tileRotations,
      tileLayouts,
    };
  } else {
    attempt.payload = {
      ...mergeJigsawMissionPayload(attempt.payload, {
        phase: "quiz",
        firstRoundIndex,
        firstRoundComplete,
        retryQuestionId,
      }),
      earnedTileIds,
      tileRotations,
      tileLayouts,
    };
  }

  const nextTimer = syncQuestionTimer(stored, participant.id);
  await persist(stored);

  return {
    ok: true as const,
    correct: true,
    piecesUnlocked: earnedTileIds.length,
    totalTiles: tileCount,
    earnedTileIds,
    tileRotations,
    tileLayouts,
    total,
    allPiecesUnlocked,
    isRetryRound: inRetryRound || (firstRoundComplete && !allPiecesUnlocked),
    retryRemaining: poolAfter.length,
    firstRoundComplete,
    completed: false,
    nextQuestionId: resolveJigsawMissionQuestionId(
      questions,
      new Set([...correctIds, input.questionId]),
      {
        phase: allPiecesUnlocked ? "assemble" : "quiz",
        firstRoundIndex,
        firstRoundComplete,
        retryQuestionId,
      },
    ),
    questionTimer: nextTimer.timer,
  };
}

export async function rotateJigsawMissionTile(input: {
  roomId: string;
  reconnectToken: string;
  tileId: string;
  rotation: number;
}) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  const reject = await rejectIfNotAcceptingInputAsync(stored);
  if (reject) return reject;
  if (stored.room.mode !== "jigsaw" || stored.room.payload.mode !== "jigsaw") {
    return {
      ok: false as const,
      error: "This room is not a Jigsaw Mission session.",
    };
  }

  if (!isTileCardRotation(input.rotation)) {
    return { ok: false as const, error: "Invalid rotation." };
  }

  const participant = await findParticipantByReconnectToken(
    stored,
    input.reconnectToken,
  );
  if (!participant)
    return { ok: false as const, error: "Participant not found." };

  const attempt = ensureAttemptRecord(stored, participant.id);
  if (attempt.completed) {
    return { ok: false as const, error: "You already completed this puzzle." };
  }

  const { questions, jigsaw } = stored.room.payload;
  const total = questions.length;
  const pieceUnlockAt = jigsawUnlockSchedule(jigsaw, total);
  const earnedTileIds = readEarnedTileIds(
    attempt.payload,
    jigsaw.cols,
    jigsaw.rows,
    attempt.correctCount ?? 0,
    total,
    pieceUnlockAt,
  );

  if (!earnedTileIds.includes(input.tileId)) {
    return {
      ok: false as const,
      error: "That puzzle piece has not been earned yet.",
    };
  }

  const tileRotations = {
    ...readTileRotations(attempt.payload),
    [input.tileId]: input.rotation,
  };

  attempt.payload = { ...attempt.payload, tileRotations };
  await persist(stored);

  return {
    ok: true as const,
    tileId: input.tileId,
    rotation: input.rotation,
    tileRotations,
  };
}

export async function submitJigsawProgress(input: {
  roomId: string;
  reconnectToken: string;
  lockedCount: number;
  totalPieces: number;
  completed: boolean;
  layout?: number[];
}) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  const reject = await rejectIfNotAcceptingInputAsync(stored);
  if (reject) return reject;
  if (stored.room.mode !== "jigsaw") {
    return { ok: false as const, error: "This room is not a jigsaw." };
  }

  const participant = await findParticipantByReconnectToken(
    stored,
    input.reconnectToken,
  );
  if (!participant)
    return { ok: false as const, error: "Participant not found." };

  const payload = stored.room.payload;
  const quizGated =
    stored.room.mode === "jigsaw" &&
    payload.mode === "jigsaw" &&
    payload.questions.length > 0;

  const attempt = ensureAttemptRecord(stored, participant.id);
  if (attempt.completed) return { ok: true as const, completed: true };

  if (quizGated && (attempt.correctCount ?? 0) < payload.questions.length) {
    return {
      ok: false as const,
      error:
        "Answer all questions correctly to unlock every puzzle piece first.",
    };
  }

  const total = Math.max(1, input.totalPieces);
  const prevLocked =
    typeof attempt.payload.lockedCount === "number"
      ? attempt.payload.lockedCount
      : 0;
  const locked = Math.min(
    total,
    Math.max(prevLocked, Math.min(total, Math.max(0, input.lockedCount))),
  );
  attempt.payload = {
    ...attempt.payload,
    lockedCount: locked,
    totalPieces: total,
    phase: "assemble",
    ...(input.layout && input.layout.length === total
      ? { slots: input.layout }
      : {}),
  };
  attempt.progress = locked / total;

  if (input.completed && locked >= total) {
    const completedAt = Date.now();
    attempt.completed = true;
    attempt.completedAt = completedAt;
    attempt.progress = 1;
    attempt.durationMs = stored.room.startedAt
      ? completedAt - stored.room.startedAt
      : null;
    participant.status = "COMPLETED";
    pushEvent(stored, {
      type: "player_completed",
      participantId: participant.id,
      displayName: participant.displayName,
      completedAt,
      durationMs: attempt.durationMs ?? 0,
    });
  } else {
    pushEvent(stored, {
      type: "player_progress",
      participantId: participant.id,
      displayName: participant.displayName,
      progress: attempt.progress,
      detail: `${locked}/${total}`,
    });
  }

  await persist(stored);
  return {
    ok: true as const,
    completed: attempt.completed,
    progress: attempt.progress,
  };
}

/** Jigsaw Mission assembly: validate layout on submit (no auto-reveal while playing). */
export async function submitJigsawMissionAssembly(input: {
  roomId: string;
  reconnectToken: string;
  layout: number[];
  totalPieces: number;
  tileRotations?: Record<string, number>;
}) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  const reject = await rejectIfNotAcceptingInputAsync(stored);
  if (reject) return reject;
  if (stored.room.mode !== "jigsaw" || stored.room.payload.mode !== "jigsaw") {
    return {
      ok: false as const,
      error: "This room is not a Jigsaw Mission session.",
    };
  }

  const participant = await findParticipantByReconnectToken(
    stored,
    input.reconnectToken,
  );
  if (!participant)
    return { ok: false as const, error: "Participant not found." };

  const { questions, jigsaw } = stored.room.payload;
  const questionTotal = questions.length;
  const gridTotal = Math.max(1, input.totalPieces);
  const attempt = ensureAttemptRecord(stored, participant.id);

  if (attempt.completed) {
    return { ok: true as const, solved: true, completed: true };
  }

  if (questionTotal > 0 && (attempt.correctCount ?? 0) < questionTotal) {
    return {
      ok: false as const,
      error:
        "Answer all questions correctly to unlock every puzzle piece first.",
    };
  }

  const earnedTileIds = readEarnedTileIds(
    attempt.payload,
    jigsaw.cols,
    jigsaw.rows,
    attempt.correctCount ?? 0,
    questionTotal,
    jigsawUnlockSchedule(jigsaw, questionTotal),
  );
  if (!allTilesEarned(earnedTileIds, gridTotal)) {
    return {
      ok: false as const,
      error: "Earn every puzzle tile before submitting the assembly.",
    };
  }

  const layout = input.layout.slice(0, gridTotal);
  if (input.tileRotations && typeof input.tileRotations === "object") {
    const merged: Record<string, number> = {
      ...readTileRotations(attempt.payload),
    };
    for (const [tileId, rotation] of Object.entries(input.tileRotations)) {
      if (isTileCardRotation(rotation)) {
        merged[tileId] = rotation;
      }
    }
    attempt.payload = { ...attempt.payload, tileRotations: merged };
  }
  const tileRotations = readTileRotations(attempt.payload);
  attempt.payload = {
    ...mergeJigsawMissionPayload(attempt.payload, { phase: "assemble" }),
    assemblyLayout: layout,
  };

  const validation = validateJigsawAssembly(
    layout,
    tileRotations,
    gridTotal,
    jigsaw.cols,
    jigsaw.rows,
    earnedTileIds,
  );
  if (!validation.ok) {
    await persist(stored);
    return {
      ok: true as const,
      solved: false,
      message: jigsawAssemblyValidationMessage(validation.reason),
    };
  }

  const completedAt = Date.now();
  attempt.completed = true;
  attempt.completedAt = completedAt;
  attempt.progress = 1;
  attempt.durationMs = stored.room.startedAt
    ? completedAt - stored.room.startedAt
    : null;
  participant.status = "COMPLETED";

  pushEvent(stored, {
    type: "player_completed",
    participantId: participant.id,
    displayName: participant.displayName,
    completedAt,
    durationMs: attempt.durationMs ?? 0,
  });

  await persist(stored);

  return {
    ok: true as const,
    solved: true,
    completed: true,
    durationMs: attempt.durationMs,
  };
}

export async function submitConnectDotsPaths(input: {
  roomId: string;
  reconnectToken: string;
  paths: PathMap;
  completed?: boolean;
}) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  const reject = await rejectIfNotAcceptingInputAsync(stored);
  if (reject) return reject;
  if (
    stored.room.mode !== "connect_dots" ||
    stored.room.payload.mode !== "connect_dots"
  ) {
    return { ok: false as const, error: "This room is not Connect Dots." };
  }

  const participant = await findParticipantByReconnectToken(
    stored,
    input.reconnectToken,
  );
  if (!participant)
    return { ok: false as const, error: "Participant not found." };

  const attempt = ensureAttemptRecord(stored, participant.id);
  if (attempt.completed) {
    return {
      ok: true as const,
      completed: true,
      connectedPairs: attempt.correctCount,
    };
  }
  const activeStep = currentTimedStepId(stored, participant.id);
  if (activeStep) {
    const timerReject = rejectExpiredQuestionTimer(
      stored,
      participant.id,
      activeStep,
    );
    if (timerReject) return timerReject;
  }

  const board = {
    gridSize: stored.room.payload.connectDots.gridSize,
    difficulty: stored.room.payload.connectDots.difficulty,
    pairs: stored.room.payload.connectDots.pairs,
    seed: stored.room.payload.connectDots.seed,
  };
  const totalPairs = board.pairs.length;
  const validation = validateConnectDotsPaths(
    board,
    input.paths,
    stored.room.payload.connectDots.solution,
  );

  const connected = validation.connectedPairs;
  attempt.correctCount = connected;
  attempt.progress = totalPairs ? connected / totalPairs : 0;
  attempt.payload = { ...attempt.payload, paths: input.paths };

  const fullyValid = validation.ok && connected === totalPairs;

  if (!fullyValid && input.completed) {
    incrementWrongCount(stored, participant.id);
  }

  if (fullyValid) {
    const completedAt = Date.now();
    attempt.completed = true;
    attempt.completedAt = completedAt;
    attempt.durationMs = stored.room.startedAt
      ? completedAt - stored.room.startedAt
      : null;
    participant.status = "COMPLETED";
    pushEvent(stored, {
      type: "player_completed",
      participantId: participant.id,
      displayName: participant.displayName,
      completedAt,
      durationMs: attempt.durationMs ?? 0,
    });
  } else {
    pushEvent(stored, {
      type: "player_progress",
      participantId: participant.id,
      displayName: participant.displayName,
      progress: attempt.progress,
      detail: `${connected}/${totalPairs}`,
    });
  }

  const nextTimer = syncQuestionTimer(stored, participant.id);
  await persist(stored);
  return {
    ok: true as const,
    completed: attempt.completed,
    connectedPairs: connected,
    error: fullyValid
      ? undefined
      : validation.ok
        ? undefined
        : validation.error,
    questionTimer: nextTimer.timer,
  };
}

export async function submitConnectDotsMatches(input: {
  roomId: string;
  reconnectToken: string;
  matches: Record<string, string>;
  routes?: Record<string, RouteCell[]>;
}) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  const reject = await rejectIfNotAcceptingInputAsync(stored);
  if (reject) return reject;
  if (
    stored.room.mode !== "connect_dots" ||
    stored.room.payload.mode !== "connect_dots"
  ) {
    return { ok: false as const, error: "This room is not Connect Dots." };
  }

  const participant = await findParticipantByReconnectToken(
    stored,
    input.reconnectToken,
  );
  if (!participant)
    return { ok: false as const, error: "Participant not found." };

  const attempt = ensureAttemptRecord(stored, participant.id);
  if (attempt.completed) {
    return {
      ok: true as const,
      completed: true,
      connectedPairs: attempt.correctCount,
    };
  }
  const activeStep = currentTimedStepId(stored, participant.id);
  if (activeStep) {
    const timerReject = rejectExpiredQuestionTimer(
      stored,
      participant.id,
      activeStep,
    );
    if (timerReject) return timerReject;
  }

  const contentPairs = stored.room.payload.connectDots.contentPairs ?? [];
  const totalPairs =
    contentPairs.length || stored.room.payload.connectDots.pairCount;
  const sanitized = sanitizeConnectDotsMatches(input.matches, contentPairs);
  const connected = Object.keys(sanitized).length;
  const { rows, cols } = routingGridSize(totalPairs);

  attempt.correctCount = connected;
  attempt.progress = totalPairs ? connected / totalPairs : 0;
  const existingPayload = attempt.payload ?? {};
  attempt.payload = {
    ...existingPayload,
    matches: sanitized,
    ...(input.routes ? { routes: input.routes } : {}),
  };

  const fullyComplete = connected === totalPairs && totalPairs > 0;

  if (fullyComplete) {
    const routes =
      (attempt.payload.routes as Record<string, RouteCell[]> | undefined) ?? {};
    const routeValidation = validateConnectDotsMatchRoutes(
      routes,
      Object.keys(sanitized),
      rows,
      cols,
    );
    if (!routeValidation.ok) {
      return { ok: false as const, error: routeValidation.error };
    }
  }

  if (fullyComplete) {
    const completedAt = Date.now();
    attempt.completed = true;
    attempt.completedAt = completedAt;
    attempt.durationMs = stored.room.startedAt
      ? completedAt - stored.room.startedAt
      : null;
    participant.status = "COMPLETED";
    pushEvent(stored, {
      type: "player_completed",
      participantId: participant.id,
      displayName: participant.displayName,
      completedAt,
      durationMs: attempt.durationMs ?? 0,
    });
  } else {
    pushEvent(stored, {
      type: "player_progress",
      participantId: participant.id,
      displayName: participant.displayName,
      progress: attempt.progress,
      detail: `${connected}/${totalPairs}`,
    });
  }

  const nextTimer = syncQuestionTimer(stored, participant.id);
  await persist(stored);
  return {
    ok: true as const,
    completed: attempt.completed,
    connectedPairs: connected,
    durationMs: attempt.durationMs ?? null,
    questionTimer: nextTimer.timer,
  };
}

/** Report a failed connection attempt (content-pair board rejects a path client-side). */
export async function recordConnectDotsIncorrectAttempt(input: {
  roomId: string;
  reconnectToken: string;
}) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  const reject = await rejectIfNotAcceptingInputAsync(stored);
  if (reject) return reject;
  if (
    stored.room.mode !== "connect_dots" ||
    stored.room.payload.mode !== "connect_dots"
  ) {
    return { ok: false as const, error: "This room is not Connect Dots." };
  }

  const participant = await findParticipantByReconnectToken(
    stored,
    input.reconnectToken,
  );
  if (!participant)
    return { ok: false as const, error: "Participant not found." };

  const attempt = ensureAttemptRecord(stored, participant.id);
  if (attempt.completed) {
    return { ok: true as const, incorrectAttempts: attempt.wrongCount };
  }

  incrementWrongCount(stored, participant.id);
  await persist(stored);

  return { ok: true as const, incorrectAttempts: attempt.wrongCount };
}
