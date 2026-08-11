import { GAME_CONFIG, isRoomFull, type GameMode } from "@/lib/game/config";
import {
  computeModeLeaderboard,
  finalizeModeIncompleteAttempts,
  modePersistsQuizAnswers,
  normalizeCreatePayload,
  toPublicGamePayload,
} from "@/lib/game/mode-registry";
import { createId, createReconnectToken } from "@/lib/game/id";
import { createEntityId, hashToken } from "@/lib/game/room-crypto";
import {
  ensureAttempt,
  findParticipantByReconnectToken,
  loadByCode,
  loadById,
  loadByReconnectToken,
  listCodes,
  persist,
  verifyAuthorToken,
  type StoredRoom,
} from "@/lib/game/room-persistence";
import { validateConnectDotsPaths, type PathMap } from "@/lib/connect-dots";
import { generateRoomCode, isValidRoomCodeFormat, normalizeRoomCode } from "@/lib/game/room-code";
import { assertTransition, canStudentsJoin, type RoomStatus } from "@/lib/game/state-machine";
import { gameInstruction, resolvePayloadTimeLimit } from "@/lib/game/timer";
import {
  initialJigsawMissionPayload,
  isJigsawMissionRetryRound,
  mergeJigsawMissionPayload,
  nextRetryQuestionId,
  readJigsawMissionPayload,
  resolveJigsawMissionQuestionId,
  retryPoolQuestionIds,
} from "@/lib/game/jigsaw-mission-flow";
import { validateJigsawLayout } from "@/lib/game/jigsaw-assembly";
import type { RouteCell } from "@/lib/game/connect-dots-path-geometry";
import type {
  GamePayload,
  LeaderboardRow,
  Participant,
  QuizOptionId,
  QuizQuestionDraft,
  Room,
  RoomEvent,
} from "@/lib/game/types";
import {
  sanitizeDisplayName,
  sanitizeRoomText,
  validateGamePayload,
} from "@/lib/game/validation";

function pushEvent(stored: StoredRoom, event: RoomEvent) {
  stored.events.push(event);
  if (stored.events.length > 200) stored.events.splice(0, stored.events.length - 200);
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
    startedAt: room.startedAt,
    endsAt: room.endsAt,
    finishedAt: room.finishedAt,
    showLeaderboardToStudents: room.showLeaderboardToStudents,
    participantCount: participants.size,
    participants: [...participants.values()].map((p) => ({
      id: p.id,
      displayName: p.displayName,
      status: p.status,
      joinedAt: p.joinedAt,
    })),
    payload,
    instruction: gameInstruction(room.mode, resolvePayloadTimeLimit(room.payload)),
  };
}

function computeLeaderboard(stored: StoredRoom): LeaderboardRow[] {
  return computeModeLeaderboard(stored);
}

function ensureAttemptRecord(stored: StoredRoom, participantId: string) {
  return ensureAttempt(stored, participantId);
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
  pushEvent(stored, { type: "game_stopped", finishedAt });
  pushEvent(stored, { type: "game_finished", finishedAt, rows });
  await persist(stored);
  return rows;
}

export async function createRoom(input: {
  name: string;
  subject: string;
  authorId: string;
  authorName: string;
  mode: GameMode;
  payload: GamePayload;
}) {
  const name = sanitizeRoomText(input.name, 80);
  const subject = sanitizeRoomText(input.subject || "General", 60);
  if (!name) return { ok: false as const, error: "Room name is required." };

  const validated = validateGamePayload(input.mode, input.payload);
  if (!validated.ok) return validated;

  const payload = normalizeCreatePayload(input.mode, input.payload);

  const existing = await listCodes();
  const code = generateRoomCode(existing);
  const id = createEntityId();
  const authorToken = createId("author");
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
    maxParticipants: GAME_CONFIG.room.unlimitedParticipants,
    createdAt: Date.now(),
    startedAt: null,
    endsAt: null,
    finishedAt: null,
    showLeaderboardToStudents: false,
  };

  const stored: StoredRoom = {
    room,
    participants: new Map(),
    quizAnswers: new Map(),
    attempts: new Map(),
    events: [],
    authorToken,
    authorTokenHash,
  };
  pushEvent(stored, { type: "room_updated", status: "LOBBY" });
  await persist(stored);

  return {
    ok: true as const,
    authorToken,
    room: publicRoom(stored, { includeSecrets: true }),
  };
}

export async function joinRoom(input: { code: string; displayName: string }) {
  const code = normalizeRoomCode(input.code);
  if (!isValidRoomCodeFormat(code)) {
    return { ok: false as const, error: "Enter a valid 6-digit room code." };
  }
  const stored = await loadByCode(code);
  if (!stored) return { ok: false as const, error: "Room code not found." };
  if (!canStudentsJoin(stored.room.status)) {
    return { ok: false as const, error: "This room is closed or already in progress." };
  }
  if (isRoomFull(stored.participants.size, stored.room.maxParticipants)) {
    return {
      ok: false as const,
      error: `This room is full (${stored.room.maxParticipants.toLocaleString()} players max).`,
    };
  }

  const displayName = sanitizeDisplayName(input.displayName);
  if (!displayName) return { ok: false as const, error: "Enter a display name." };

  const participant: Participant = {
    id: createEntityId(),
    roomId: stored.room.id,
    displayName,
    status: "ONLINE",
    joinedAt: Date.now(),
    reconnectToken: createReconnectToken(),
    connectionId: null,
  };
  stored.participants.set(participant.id, participant);
  ensureAttemptRecord(stored, participant.id);
  pushEvent(stored, {
    type: "participant_joined",
    participant: {
      id: participant.id,
      displayName: participant.displayName,
      status: participant.status,
      joinedAt: participant.joinedAt,
    },
  });
  await persist(stored);

  return {
    ok: true as const,
    participantId: participant.id,
    reconnectToken: participant.reconnectToken,
    room: publicRoom(stored),
  };
}

export async function reconnectParticipant(input: { reconnectToken: string }) {
  const stored = await loadByReconnectToken(input.reconnectToken);
  if (!stored) return { ok: false as const, error: "Session expired. Join the room again." };

  const participant = await findParticipantByReconnectToken(stored, input.reconnectToken);
  if (participant) {
    participant.status = stored.room.status === "LIVE" ? "PLAYING" : "ONLINE";
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
  return { ok: false as const, error: "Session expired. Join the room again." };
}

export async function getRoomSnapshot(input: {
  roomId?: string;
  code?: string;
  authorToken?: string;
  reconnectToken?: string;
}) {
  const code = input.code ? normalizeRoomCode(input.code) : undefined;
  const stored = input.roomId
    ? await loadById(input.roomId)
    : code && isValidRoomCodeFormat(code)
      ? await loadByCode(code)
      : null;
  if (!stored) return { ok: false as const, error: "Room not found." };

  if (
    stored.room.status === "LIVE" &&
    stored.room.endsAt != null &&
    Date.now() >= stored.room.endsAt
  ) {
    await finalizeGame(stored);
  }

  const isAuthor = Boolean(
    input.authorToken && (await verifyAuthorToken(stored, input.authorToken)),
  );
  let participantId: string | null = null;
  if (input.reconnectToken) {
    const participant = await findParticipantByReconnectToken(stored, input.reconnectToken);
    participantId = participant?.id ?? null;
  }

  const leaderboard = computeLeaderboard(stored);
  const gameFinished =
    stored.room.status === "FINISHED" || stored.room.status === "CANCELLED";
  const hideQuizLiveLeaderboard =
    !isAuthor &&
    !gameFinished &&
    stored.room.mode === "quiz" &&
    stored.room.status === "LIVE" &&
    !stored.room.showLeaderboardToStudents;
  const visibleLeaderboard = hideQuizLiveLeaderboard ? [] : leaderboard;
  const revealOwnAnswerCorrectness =
    stored.room.mode === "jigsaw" ||
    stored.room.mode === "quiz_jigsaw" ||
    stored.room.status === "FINISHED" ||
    stored.room.status === "CANCELLED";
  const myAnswers =
    participantId && modePersistsQuizAnswers(stored.room.mode)
      ? [...(stored.quizAnswers.get(participantId)?.values() ?? [])].map((a) => ({
          questionId: a.questionId,
          selectedOption: a.selectedOption,
          submittedAt: a.submittedAt,
          isCorrect: revealOwnAnswerCorrectness ? a.isCorrect : undefined,
        }))
      : [];

  return {
    ok: true as const,
    room: publicRoom(stored, { includeSecrets: isAuthor }),
    isAuthor,
    participantId,
    leaderboard: visibleLeaderboard,
    myAnswers,
    myAttempt: participantId ? (stored.attempts.get(participantId) ?? null) : null,
    recentEvents: stored.events.slice(-40),
  };
}

export async function startGame(input: { roomId: string; authorToken: string }) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  if (!(await verifyAuthorToken(stored, input.authorToken))) {
    return { ok: false as const, error: "Only the author can start the game." };
  }
  if (stored.participants.size < 1) {
    return { ok: false as const, error: "Wait for at least one student to join." };
  }

  try {
    assertTransition(stored.room.status, "COUNTDOWN");
  } catch {
    return { ok: false as const, error: `Cannot start from status ${stored.room.status}.` };
  }

  const now = Date.now();
  const countdownSeconds = 3;
  stored.room.status = "COUNTDOWN";
  pushEvent(stored, {
    type: "game_starting",
    startsAt: now + countdownSeconds * 1000,
    countdownSeconds,
  });

  stored.room.status = "LIVE";
  stored.room.startedAt = now;
  const limit = resolvePayloadTimeLimit(stored.room.payload);
  stored.room.endsAt = limit != null ? now + limit * 1000 : null;

  for (const p of stored.participants.values()) {
    if (p.status !== "DISCONNECTED") p.status = "PLAYING";
  }

  pushEvent(stored, {
    type: "game_started",
    startedAt: stored.room.startedAt,
    endsAt: stored.room.endsAt,
  });
  await persist(stored);

  return { ok: true as const, room: publicRoom(stored), countdownSeconds };
}

export async function stopGame(input: { roomId: string; authorToken: string }) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  if (!(await verifyAuthorToken(stored, input.authorToken))) {
    return { ok: false as const, error: "Only the author can stop the game." };
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

export async function setShowLeaderboardToStudents(input: {
  roomId: string;
  authorToken: string;
  enabled: boolean;
}) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  if (!(await verifyAuthorToken(stored, input.authorToken))) {
    return { ok: false as const, error: "Only the author can change this setting." };
  }
  if (stored.room.mode !== "quiz") {
    return { ok: false as const, error: "Live leaderboard visibility applies to Quiz Challenge only." };
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

export async function submitQuizAnswer(input: {
  roomId: string;
  reconnectToken: string;
  questionId: string;
  selectedOption: QuizOptionId;
}) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  if (stored.room.status !== "LIVE") {
    return { ok: false as const, error: "Game is not accepting answers." };
  }
  if (stored.room.mode !== "quiz" || stored.room.payload.mode !== "quiz") {
    return { ok: false as const, error: "This room is not a quiz." };
  }

  const participant = await findParticipantByReconnectToken(stored, input.reconnectToken);
  if (!participant) return { ok: false as const, error: "Participant not found." };

  const question = stored.room.payload.mode === "quiz"
    ? stored.room.payload.questions.find((q) => q.id === input.questionId)
    : undefined;
  if (!question) return { ok: false as const, error: "Invalid question." };

  let map = stored.quizAnswers.get(participant.id);
  if (!map) {
    map = new Map();
    stored.quizAnswers.set(participant.id, map);
  }
  if (map.has(input.questionId)) {
    return { ok: false as const, error: "This question was already answered." };
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

  const attempt = ensureAttemptRecord(stored, participant.id);
  attempt.progress = map.size / GAME_CONFIG.quiz.questionCount;
  attempt.correctCount = [...map.values()].filter((a) => a.isCorrect).length;

  pushEvent(stored, {
    type: "player_progress",
    participantId: participant.id,
    displayName: participant.displayName,
    progress: attempt.progress,
    detail: `${map.size}/${GAME_CONFIG.quiz.questionCount}`,
  });

  if (map.size >= GAME_CONFIG.quiz.questionCount) {
    const completedAt = Date.now();
    attempt.completed = true;
    attempt.completedAt = completedAt;
    attempt.durationMs = stored.room.startedAt ? completedAt - stored.room.startedAt : null;
    attempt.score = attempt.correctCount * 100;
    participant.status = "COMPLETED";
    pushEvent(stored, {
      type: "player_completed",
      participantId: participant.id,
      displayName: participant.displayName,
      completedAt,
      durationMs: attempt.durationMs ?? 0,
    });
  }

  const nextUnanswered = stored.room.payload.questions.find((q) => !map!.has(q.id));
  await persist(stored);

  return {
    ok: true as const,
    locked: true,
    answeredCount: map.size,
    total: GAME_CONFIG.quiz.questionCount,
    completed: attempt.completed,
    nextQuestionId: nextUnanswered?.id ?? null,
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
  if (stored.room.status !== "LIVE") {
    return { ok: false as const, error: "Game is not accepting answers." };
  }
  if (stored.room.mode !== "quiz_jigsaw" || stored.room.payload.mode !== "quiz_jigsaw") {
    return { ok: false as const, error: "This room is not a Puzzle Quest session." };
  }

  const participant = await findParticipantByReconnectToken(stored, input.reconnectToken);
  if (!participant) return { ok: false as const, error: "Participant not found." };

  const attempt = ensureAttemptRecord(stored, participant.id);
  if (attempt.completed) {
    return { ok: false as const, error: "You already completed this puzzle." };
  }

  const question = stored.room.payload.questions.find((q) => q.id === input.questionId);
  if (!question) return { ok: false as const, error: "Invalid question." };

  let map = stored.quizAnswers.get(participant.id);
  if (!map) {
    map = new Map();
    stored.quizAnswers.set(participant.id, map);
  }

  const total = GAME_CONFIG.quiz_jigsaw.questionCount;
  const correctIds = new Set([...map.values()].filter((a) => a.isCorrect).map((a) => a.questionId));
  const currentQuestion = stored.room.payload.questions.find((q) => !correctIds.has(q.id));
  if (!currentQuestion || currentQuestion.id !== input.questionId) {
    return { ok: false as const, error: "Answer the current question first." };
  }

  const selected = input.selectedOption;
  if (!["A", "B", "C", "D"].includes(selected)) {
    return { ok: false as const, error: "Invalid option." };
  }

  const isCorrect = question.correctOption === selected;
  if (!isCorrect) {
    return {
      ok: true as const,
      correct: false,
      piecesUnlocked: correctIds.size,
      total,
      completed: false,
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
    attempt.durationMs = stored.room.startedAt ? completedAt - stored.room.startedAt : null;
    attempt.score = piecesUnlocked * 100;
    participant.status = "COMPLETED";
    completed = true;
    rewardCode = stored.room.payload.rewardCode;
    pushEvent(stored, {
      type: "player_completed",
      participantId: participant.id,
      displayName: participant.displayName,
      completedAt,
      durationMs: attempt.durationMs ?? 0,
    });
  }

  await persist(stored);

  const nextQuestion = stored.room.payload.questions.find((q) => !map!.has(q.id));

  return {
    ok: true as const,
    correct: true,
    piecesUnlocked,
    total,
    completed,
    rewardCode,
    nextQuestionId: nextQuestion?.id ?? null,
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
  if (stored.room.status !== "LIVE") {
    return { ok: false as const, error: "Game is not accepting answers." };
  }
  if (stored.room.mode !== "jigsaw" || stored.room.payload.mode !== "jigsaw") {
    return { ok: false as const, error: "This room is not a Jigsaw Mission session." };
  }

  const questions = stored.room.payload.questions;
  if (questions.length < 1) {
    return { ok: false as const, error: "This jigsaw has no quiz questions configured." };
  }

  const participant = await findParticipantByReconnectToken(stored, input.reconnectToken);
  if (!participant) return { ok: false as const, error: "Participant not found." };

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
  let mission = readJigsawMissionPayload(attempt.payload);
  if (mission.phase === undefined) {
    mission = initialJigsawMissionPayload();
  }

  const correctIds = new Set(
    [...map.values()].filter((a) => a.isCorrect).map((a) => a.questionId),
  );

  const expectedQuestionId = resolveJigsawMissionQuestionId(questions, correctIds, mission);
  if (!expectedQuestionId || expectedQuestionId !== input.questionId) {
    return { ok: false as const, error: "Answer the current question first." };
  }

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
    await persist(stored);

    return {
      ok: true as const,
      correct: false,
      piecesUnlocked: correctIds.size,
      total,
      allPiecesUnlocked: false,
      isRetryRound: firstRoundComplete,
      retryRemaining: retryPoolQuestionIds(questions, correctIds).length,
      firstRoundComplete,
      completed: false,
    };
  }

  if (correctIds.has(input.questionId)) {
    return { ok: false as const, error: "You already unlocked this puzzle piece." };
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

  if (!firstRoundComplete) {
    firstRoundIndex += 1;
    if (firstRoundIndex >= total) {
      firstRoundComplete = true;
    }
  }

  const poolAfter = retryPoolQuestionIds(questions, new Set([...correctIds, input.questionId]));
  retryQuestionId = firstRoundComplete ? (poolAfter[0] ?? null) : null;

  const allPiecesUnlocked = piecesUnlocked >= total;

  pushEvent(stored, {
    type: "player_progress",
    participantId: participant.id,
    displayName: participant.displayName,
    progress: attempt.progress,
    detail: `${piecesUnlocked}/${total} pieces`,
  });

  if (allPiecesUnlocked) {
    attempt.payload = mergeJigsawMissionPayload(attempt.payload, {
      phase: "assemble",
      firstRoundIndex,
      firstRoundComplete: true,
      retryQuestionId: null,
    });
  } else {
    attempt.payload = mergeJigsawMissionPayload(attempt.payload, {
      phase: "quiz",
      firstRoundIndex,
      firstRoundComplete,
      retryQuestionId,
    });
  }

  await persist(stored);

  return {
    ok: true as const,
    correct: true,
    piecesUnlocked,
    total,
    allPiecesUnlocked,
    isRetryRound: inRetryRound || (firstRoundComplete && !allPiecesUnlocked),
    retryRemaining: poolAfter.length,
    firstRoundComplete,
    completed: false,
    nextQuestionId: resolveJigsawMissionQuestionId(questions, new Set([...correctIds, input.questionId]), {
      phase: allPiecesUnlocked ? "assemble" : "quiz",
      firstRoundIndex,
      firstRoundComplete,
      retryQuestionId,
    }),
  };
}

export async function submitJigsawProgress(input: {
  roomId: string;
  reconnectToken: string;
  lockedCount: number;
  totalPieces: number;
  completed: boolean;
}) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  if (stored.room.status !== "LIVE") {
    return { ok: false as const, error: "Game is not live." };
  }
  if (stored.room.mode !== "jigsaw") {
    return { ok: false as const, error: "This room is not a jigsaw." };
  }
  if (stored.room.endsAt && Date.now() > stored.room.endsAt) {
    return { ok: false as const, error: "Time is up." };
  }

  const participant = await findParticipantByReconnectToken(stored, input.reconnectToken);
  if (!participant) return { ok: false as const, error: "Participant not found." };

  const payload = stored.room.payload;
  const quizGated =
    stored.room.mode === "jigsaw" && payload.mode === "jigsaw" && payload.questions.length > 0;

  const total = Math.max(1, input.totalPieces);
  const locked = Math.min(total, Math.max(0, input.lockedCount));
  const attempt = ensureAttemptRecord(stored, participant.id);
  if (attempt.completed) return { ok: true as const, completed: true };

  if (quizGated && (attempt.correctCount ?? 0) < payload.questions.length) {
    return {
      ok: false as const,
      error: "Answer all questions correctly to unlock every puzzle piece first.",
    };
  }

  attempt.progress = locked / total;
  attempt.payload = { ...attempt.payload, lockedCount: locked, totalPieces: total, phase: "assemble" };

  if (input.completed && locked >= total) {
    const completedAt = Date.now();
    attempt.completed = true;
    attempt.completedAt = completedAt;
    attempt.progress = 1;
    attempt.durationMs = stored.room.startedAt ? completedAt - stored.room.startedAt : null;
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
  return { ok: true as const, completed: attempt.completed, progress: attempt.progress };
}

/** Jigsaw Mission assembly: validate layout on submit (no auto-reveal while playing). */
export async function submitJigsawMissionAssembly(input: {
  roomId: string;
  reconnectToken: string;
  layout: number[];
  totalPieces: number;
}) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  if (stored.room.status !== "LIVE") {
    return { ok: false as const, error: "Game is not live." };
  }
  if (stored.room.mode !== "jigsaw" || stored.room.payload.mode !== "jigsaw") {
    return { ok: false as const, error: "This room is not a Jigsaw Mission session." };
  }
  if (stored.room.endsAt && Date.now() > stored.room.endsAt) {
    return { ok: false as const, error: "Time is up." };
  }

  const participant = await findParticipantByReconnectToken(stored, input.reconnectToken);
  if (!participant) return { ok: false as const, error: "Participant not found." };

  const { questions } = stored.room.payload;
  const questionTotal = questions.length;
  const gridTotal = Math.max(1, input.totalPieces);
  const attempt = ensureAttemptRecord(stored, participant.id);

  if (attempt.completed) {
    return { ok: true as const, solved: true, completed: true };
  }

  if (questionTotal > 0 && (attempt.correctCount ?? 0) < questionTotal) {
    return {
      ok: false as const,
      error: "Answer all questions correctly to unlock every puzzle piece first.",
    };
  }

  const layout = input.layout.slice(0, gridTotal);

  if (layout.some((p) => p < 0)) {
    return {
      ok: true as const,
      solved: false,
      message: "Place every puzzle piece on the board before submitting.",
    };
  }

  if (!validateJigsawLayout(layout, gridTotal)) {
    return {
      ok: true as const,
      solved: false,
      message: "Not quite — the image is not complete yet. Keep rearranging the pieces.",
    };
  }

  const completedAt = Date.now();
  attempt.completed = true;
  attempt.completedAt = completedAt;
  attempt.progress = 1;
  attempt.durationMs = stored.room.startedAt ? completedAt - stored.room.startedAt : null;
  attempt.payload = mergeJigsawMissionPayload(attempt.payload, { phase: "assemble" });
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
  if (stored.room.status !== "LIVE") {
    return { ok: false as const, error: "Game is not live." };
  }
  if (stored.room.mode !== "connect_dots" || stored.room.payload.mode !== "connect_dots") {
    return { ok: false as const, error: "This room is not Connect Dots." };
  }
  if (stored.room.endsAt && Date.now() > stored.room.endsAt) {
    return { ok: false as const, error: "Time is up." };
  }

  const participant = await findParticipantByReconnectToken(stored, input.reconnectToken);
  if (!participant) return { ok: false as const, error: "Participant not found." };

  const attempt = ensureAttemptRecord(stored, participant.id);
  if (attempt.completed) {
    return { ok: true as const, completed: true, connectedPairs: attempt.correctCount };
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
  attempt.payload = { paths: input.paths };

  const fullyValid = validation.ok && connected === totalPairs;

  if (fullyValid) {
    const completedAt = Date.now();
    attempt.completed = true;
    attempt.completedAt = completedAt;
    attempt.durationMs = stored.room.startedAt ? completedAt - stored.room.startedAt : null;
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

  await persist(stored);
  return {
    ok: true as const,
    completed: attempt.completed,
    connectedPairs: connected,
    error: fullyValid ? undefined : validation.ok ? undefined : validation.error,
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
  if (stored.room.status !== "LIVE") {
    return { ok: false as const, error: "Game is not live." };
  }
  if (stored.room.mode !== "connect_dots" || stored.room.payload.mode !== "connect_dots") {
    return { ok: false as const, error: "This room is not Connect Dots." };
  }
  if (stored.room.endsAt && Date.now() > stored.room.endsAt) {
    return { ok: false as const, error: "Time is up." };
  }

  const participant = await findParticipantByReconnectToken(stored, input.reconnectToken);
  if (!participant) return { ok: false as const, error: "Participant not found." };

  const attempt = ensureAttemptRecord(stored, participant.id);
  if (attempt.completed) {
    return { ok: true as const, completed: true, connectedPairs: attempt.correctCount };
  }

  const contentPairs = stored.room.payload.connectDots.contentPairs ?? [];
  const validIds = new Set(contentPairs.map((p) => p.id));
  const totalPairs = contentPairs.length || stored.room.payload.connectDots.pairCount;

  const sanitized: Record<string, string> = {};
  for (const [questionId, answerId] of Object.entries(input.matches)) {
    if (questionId === answerId && validIds.has(questionId)) {
      sanitized[questionId] = answerId;
    }
  }

  const connected = Object.keys(sanitized).length;
  attempt.correctCount = connected;
  attempt.progress = totalPairs ? connected / totalPairs : 0;
  attempt.payload = {
    matches: sanitized,
    ...(input.routes ? { routes: input.routes } : {}),
  };

  const fullyComplete = connected === totalPairs && totalPairs > 0;

  if (fullyComplete) {
    const completedAt = Date.now();
    attempt.completed = true;
    attempt.completedAt = completedAt;
    attempt.durationMs = stored.room.startedAt ? completedAt - stored.room.startedAt : null;
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

  await persist(stored);
  return {
    ok: true as const,
    completed: attempt.completed,
    connectedPairs: connected,
    durationMs: attempt.durationMs ?? null,
  };
}

/** Seed demo room for local testing (code 845721) if empty. */
export async function ensureDemoRoom() {
  if (await loadByCode("845721")) return;
  const questions: QuizQuestionDraft[] = Array.from({ length: 10 }, (_, i) => ({
    id: `demo-q-${i + 1}`,
    prompt: `Demo question ${i + 1}: What is ${i + 1} + ${i + 1}?`,
    options: {
      A: String(i + 1),
      B: String((i + 1) * 2),
      C: String((i + 1) * 3),
      D: String(i),
    },
    correctOption: "B" as const,
  }));

  const created = await createRoom({
    name: "Biology Battle",
    subject: "Biology",
    authorId: "demo-author",
    authorName: "Demo Author",
    mode: "quiz",
    payload: { mode: "quiz", questions, timeLimitSeconds: null },
  });
  if (!created.ok) return;

  const stored = await loadById(created.room.id);
  if (!stored) return;
  stored.room.code = "845721";
  await persist(stored);
}
