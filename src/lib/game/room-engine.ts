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
  copyJigsawAssetBetweenRooms,
  type StoredRoom,
} from "@/lib/game/room-persistence";
import { validateConnectDotsPaths, type PathMap } from "@/lib/connect-dots";
import { generateRoomCode, isValidRoomCodeFormat, normalizeRoomCode } from "@/lib/game/room-code";
import { assertTransition, canStudentEnterRoom, canStudentsJoin, canStudentsRejoin, type RoomStatus } from "@/lib/game/state-machine";
import { gameInstruction, resolvePayloadTimeLimit } from "@/lib/game/timer";
import { questionCountFromConfig } from "@/lib/supabase/author-sessions";
import { incrementJigsawLibraryUsage } from "@/lib/supabase/jigsaw-library";
import { computeLiveParticipantProgress } from "@/lib/game/live-dashboard";
import {
  sanitizeConnectDotsMatches,
} from "@/lib/game/connect-dots-content";
import {
  isRouteCellInGrid,
  routingGridSize,
  validateConnectDotsMatchRoutes,
  type RouteCell,
} from "@/lib/game/connect-dots-path-geometry";
import {
  initialJigsawMissionPayload,
  isJigsawMissionRetryRound,
  mergeJigsawMissionPayload,
  nextRetryQuestionId,
  readJigsawMissionPayload,
  resolveJigsawMissionQuestionId,
  retryPoolQuestionIds,
} from "@/lib/game/jigsaw-mission-flow";
import {
  jigsawAssemblyValidationMessage,
  validateJigsawAssembly,
} from "@/lib/game/jigsaw-assembly";
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
} from "@/lib/game/jigsaw-tile-rewards";
import type {
  GamePayload,
  JigsawConfig,
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
    ),
  };
}

function computeLeaderboard(stored: StoredRoom): LeaderboardRow[] {
  return computeModeLeaderboard(stored);
}

function isTimedOut(stored: StoredRoom): boolean {
  return stored.room.endsAt != null && Date.now() >= stored.room.endsAt;
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

function incrementWrongCount(stored: StoredRoom, participantId: string, by = 1) {
  const attempt = ensureAttemptRecord(stored, participantId);
  attempt.wrongCount += by;
}

function jigsawUnlockSchedule(jigsaw: JigsawConfig, questionCount: number): number[] {
  const tileCount = Math.max(1, jigsaw.cols * jigsaw.rows);
  return resolvePieceUnlockAt(questionCount, tileCount, jigsaw.pieceUnlockAt);
}

function displayNameKey(displayName: string): string {
  return sanitizeDisplayName(displayName).toLowerCase();
}

function findParticipantByDisplayName(
  stored: StoredRoom,
  displayName: string,
): Participant | undefined {
  const key = displayNameKey(displayName);
  if (!key) return undefined;
  for (const participant of stored.participants.values()) {
    if (displayNameKey(participant.displayName) === key) return participant;
  }
  return undefined;
}

async function reattachParticipantSession(
  stored: StoredRoom,
  participant: Participant,
  userId?: string | null,
): Promise<{ participantId: string; reconnectToken: string }> {
  participant.reconnectToken = createReconnectToken();
  if (userId && !participant.userId) {
    participant.userId = userId;
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
  return { participantId: participant.id, reconnectToken: participant.reconnectToken };
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
  duplicatedFromName?: string | null;
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
    duplicatedFromName: input.duplicatedFromName ?? null,
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

export async function joinRoom(input: { code: string; displayName: string; userId?: string | null }) {
  const code = normalizeRoomCode(input.code);
  if (!isValidRoomCodeFormat(code)) {
    return { ok: false as const, error: "Enter a valid 6-digit room code." };
  }
  const stored = await loadByCode(code);
  if (!stored) return { ok: false as const, error: "Room code not found." };
  if (stored.room.status === "FINISHED" || stored.room.status === "CANCELLED") {
    return { ok: false as const, error: "This room is closed." };
  }

  const displayName = sanitizeDisplayName(input.displayName);
  if (!displayName) return { ok: false as const, error: "Enter a display name." };

  const existing = findParticipantByDisplayName(stored, displayName);
  if (existing) {
    if (!canStudentEnterRoom(stored.room.status)) {
      return { ok: false as const, error: "This room is closed." };
    }
    const session = await reattachParticipantSession(stored, existing, input.userId);
    return {
      ok: true as const,
      rejoined: true as const,
      participantId: session.participantId,
      reconnectToken: session.reconnectToken,
      room: publicRoom(stored),
    };
  }

  if (!canStudentsJoin(stored.room.status)) {
    if (canStudentsRejoin(stored.room.status)) {
      return {
        ok: false as const,
        error: "Game already started. Rejoin with the same name you used before.",
      };
    }
    return { ok: false as const, error: "This room is closed or already in progress." };
  }
  if (isRoomFull(stored.participants.size, stored.room.maxParticipants)) {
    return {
      ok: false as const,
      error: `This room is full (${stored.room.maxParticipants.toLocaleString()} players max).`,
    };
  }

  const participant: Participant = {
    id: createEntityId(),
    roomId: stored.room.id,
    displayName,
    status: "ONLINE",
    joinedAt: Date.now(),
    reconnectToken: createReconnectToken(),
    connectionId: null,
    userId: input.userId ?? null,
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
    rejoined: false as const,
    participantId: participant.id,
    reconnectToken: participant.reconnectToken,
    room: publicRoom(stored),
  };
}

export async function reconnectParticipant(input: { reconnectToken: string }) {
  const stored = await loadByReconnectToken(input.reconnectToken);
  if (!stored) return { ok: false as const, error: "Session expired. Join the room again." };

  const participant = await findParticipantByReconnectToken(stored, input.reconnectToken);
  if (!participant) {
    return { ok: false as const, error: "Session expired. Join the room again." };
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

function backfillJigsawMissionTilePresentation(stored: StoredRoom, participantId: string): boolean {
  if (stored.room.mode !== "jigsaw" || stored.room.payload.mode !== "jigsaw") return false;

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

  const { tileRotations, changed: rotationsChanged } = ensureTileRotationsForEarned(
    earnedTileIds,
    readTileRotations(attempt.payload),
  );
  const { tileLayouts, changed: layoutsChanged } = ensureTileLayoutsForEarned(
    earnedTileIds,
    readTileLayouts(attempt.payload),
  );
  if (!earnedChanged && !rotationsChanged && !layoutsChanged) return false;

  attempt.payload = { ...attempt.payload, earnedTileIds, tileRotations, tileLayouts };
  return true;
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
  const myRank =
    participantId != null
      ? (leaderboard.find((row) => row.participantId === participantId)?.rank ?? null)
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
  const revealOwnAnswerCorrectness =
    stored.room.status === "FINISHED" || stored.room.status === "CANCELLED";
  const myAnswers =
    participantId && modePersistsQuizAnswers(stored.room.mode)
      ? [...(stored.quizAnswers.get(participantId)?.values() ?? [])].map((a) => ({
          questionId: a.questionId,
          selectedOption: a.selectedOption,
          submittedAt: a.submittedAt,
          isCorrect: revealOwnAnswerCorrectness ? a.isCorrect : undefined,
        }))
      : [];

  if (participantId && stored.room.mode === "jigsaw" && stored.room.payload.mode === "jigsaw") {
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
    liveProgress: isAuthor && stored.room.status === "LIVE"
      ? computeLiveParticipantProgress(stored)
      : undefined,
    myAnswers,
    myAttempt: participantId ? (stored.attempts.get(participantId) ?? null) : null,
    recentEvents: stored.events.slice(-40),
  };
}

/** Author-only results view — verifies ownership by author id (no browser token required). */
export async function getAuthorRoomResults(input: { roomId: string; authorId: string }) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  if (stored.room.authorId !== input.authorId) {
    return { ok: false as const, error: "You do not have access to this game." };
  }

  const leaderboard = computeLeaderboard(stored);
  const completions = stored.events
    .filter((e): e is Extract<RoomEvent, { type: "player_completed" }> => e.type === "player_completed")
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
    questionCount: questionCountFromConfig(stored.room.mode, stored.room.payload),
  };
}

/** Clone an existing game into a new lobby room (new code + author token). */
export async function duplicateRoom(input: {
  sourceRoomId: string;
  authorId: string;
  authorName: string;
  name: string;
}) {
  const stored = await loadById(input.sourceRoomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  if (stored.room.authorId !== input.authorId) {
    return { ok: false as const, error: "You can only duplicate your own games." };
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
    duplicatedFromName: stored.room.name.trim(),
  });

  if (!created.ok) return created;

  await copyJigsawAssetBetweenRooms(input.sourceRoomId, created.room.id);
  return created;
}

/** Issue a fresh host token for a game the signed-in author owns (My Games → live control). */
export async function claimAuthorSession(input: { roomId: string; authorId: string }) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  if (stored.room.authorId !== input.authorId) {
    return { ok: false as const, error: "You do not have access to this game." };
  }

  const authorToken = createId("author");
  stored.authorToken = authorToken;
  stored.authorTokenHash = await hashToken(authorToken);
  await persist(stored);

  return {
    ok: true as const,
    authorToken,
    room: publicRoom(stored, { includeSecrets: true }),
  };
}

export async function startGame(input: { roomId: string; authorToken: string }) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  if (!(await verifyAuthorToken(stored, input.authorToken))) {
    return { ok: false as const, error: "Only the host can start the game." };
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

export async function setShowLeaderboardToStudents(input: {
  roomId: string;
  authorToken: string;
  enabled: boolean;
}) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  if (!(await verifyAuthorToken(stored, input.authorToken))) {
    return { ok: false as const, error: "Only the host can change this setting." };
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
  const reject = await rejectIfNotAcceptingInputAsync(stored);
  if (reject) return reject;
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

  const questionTotal =
    stored.room.mode === "quiz" && stored.room.payload.mode === "quiz"
      ? stored.room.payload.questions.length
      : GAME_CONFIG.quiz.defaultQuestionCount;

  const attempt = ensureAttemptRecord(stored, participant.id);
  attempt.progress = map.size / questionTotal;
  attempt.correctCount = [...map.values()].filter((a) => a.isCorrect).length;

  pushEvent(stored, {
    type: "player_progress",
    participantId: participant.id,
    displayName: participant.displayName,
    progress: attempt.progress,
    detail: `${map.size}/${questionTotal}`,
  });

  if (map.size >= questionTotal) {
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
    total: questionTotal,
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
  const reject = await rejectIfNotAcceptingInputAsync(stored);
  if (reject) return reject;
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
    attempt.payload = { ...attempt.payload, rewardCode };
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
  const reject = await rejectIfNotAcceptingInputAsync(stored);
  if (reject) return reject;
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

  const poolAfter = retryPoolQuestionIds(questions, new Set([...correctIds, input.questionId]));
  retryQuestionId = firstRoundComplete ? (poolAfter[0] ?? null) : null;

  const allQuestionsDone = allQuestionsAnsweredCorrectly(correctQuestionCount, total);
  const allPiecesUnlocked = allQuestionsDone && allTilesEarned(earnedTileIds, tileCount);
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
    nextQuestionId: resolveJigsawMissionQuestionId(questions, new Set([...correctIds, input.questionId]), {
      phase: allPiecesUnlocked ? "assemble" : "quiz",
      firstRoundIndex,
      firstRoundComplete,
      retryQuestionId,
    }),
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
    return { ok: false as const, error: "This room is not a Jigsaw Mission session." };
  }

  if (!isTileCardRotation(input.rotation)) {
    return { ok: false as const, error: "Invalid rotation." };
  }

  const participant = await findParticipantByReconnectToken(stored, input.reconnectToken);
  if (!participant) return { ok: false as const, error: "Participant not found." };

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
    return { ok: false as const, error: "That puzzle piece has not been earned yet." };
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

  const participant = await findParticipantByReconnectToken(stored, input.reconnectToken);
  if (!participant) return { ok: false as const, error: "Participant not found." };

  const payload = stored.room.payload;
  const quizGated =
    stored.room.mode === "jigsaw" && payload.mode === "jigsaw" && payload.questions.length > 0;

  const attempt = ensureAttemptRecord(stored, participant.id);
  if (attempt.completed) return { ok: true as const, completed: true };

  if (quizGated && (attempt.correctCount ?? 0) < payload.questions.length) {
    return {
      ok: false as const,
      error: "Answer all questions correctly to unlock every puzzle piece first.",
    };
  }

  const total = Math.max(1, input.totalPieces);
  const prevLocked =
    typeof attempt.payload.lockedCount === "number" ? attempt.payload.lockedCount : 0;
  const locked = Math.min(total, Math.max(prevLocked, Math.min(total, Math.max(0, input.lockedCount))));
  attempt.payload = {
    ...attempt.payload,
    lockedCount: locked,
    totalPieces: total,
    phase: "assemble",
    ...(input.layout && input.layout.length === total ? { slots: input.layout } : {}),
  };
  attempt.progress = locked / total;

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
  tileRotations?: Record<string, number>;
}) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  const reject = await rejectIfNotAcceptingInputAsync(stored);
  if (reject) return reject;
  if (stored.room.mode !== "jigsaw" || stored.room.payload.mode !== "jigsaw") {
    return { ok: false as const, error: "This room is not a Jigsaw Mission session." };
  }

  const participant = await findParticipantByReconnectToken(stored, input.reconnectToken);
  if (!participant) return { ok: false as const, error: "Participant not found." };

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
      error: "Answer all questions correctly to unlock every puzzle piece first.",
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
    const merged: Record<string, number> = { ...readTileRotations(attempt.payload) };
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
  attempt.durationMs = stored.room.startedAt ? completedAt - stored.room.startedAt : null;
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
  if (stored.room.mode !== "connect_dots" || stored.room.payload.mode !== "connect_dots") {
    return { ok: false as const, error: "This room is not Connect Dots." };
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

  if (!fullyValid && input.completed) {
    incrementWrongCount(stored, participant.id);
  }

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
  const reject = await rejectIfNotAcceptingInputAsync(stored);
  if (reject) return reject;
  if (stored.room.mode !== "connect_dots" || stored.room.payload.mode !== "connect_dots") {
    return { ok: false as const, error: "This room is not Connect Dots." };
  }

  const participant = await findParticipantByReconnectToken(stored, input.reconnectToken);
  if (!participant) return { ok: false as const, error: "Participant not found." };

  const attempt = ensureAttemptRecord(stored, participant.id);
  if (attempt.completed) {
    return { ok: true as const, completed: true, connectedPairs: attempt.correctCount };
  }

  const contentPairs = stored.room.payload.connectDots.contentPairs ?? [];
  const totalPairs = contentPairs.length || stored.room.payload.connectDots.pairCount;
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
    const routes = (attempt.payload.routes as Record<string, RouteCell[]> | undefined) ?? {};
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

/** Report a failed connection attempt (content-pair board rejects a path client-side). */
export async function recordConnectDotsIncorrectAttempt(input: {
  roomId: string;
  reconnectToken: string;
}) {
  const stored = await loadById(input.roomId);
  if (!stored) return { ok: false as const, error: "Room not found." };
  const reject = await rejectIfNotAcceptingInputAsync(stored);
  if (reject) return reject;
  if (stored.room.mode !== "connect_dots" || stored.room.payload.mode !== "connect_dots") {
    return { ok: false as const, error: "This room is not Connect Dots." };
  }

  const participant = await findParticipantByReconnectToken(stored, input.reconnectToken);
  if (!participant) return { ok: false as const, error: "Participant not found." };

  const attempt = ensureAttemptRecord(stored, participant.id);
  if (attempt.completed) {
    return { ok: true as const, incorrectAttempts: attempt.wrongCount };
  }

  incrementWrongCount(stored, participant.id);
  await persist(stored);

  return { ok: true as const, incorrectAttempts: attempt.wrongCount };
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
