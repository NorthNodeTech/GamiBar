import type { GameMode } from "@shared/game/config";
import type { GamePayload, PollResponseValue, QuizOptionId } from "@shared/game/types";
import { apiPost } from "@/lib/api-client";

/** Browser room API. The database work is owned by the Express backend. */

// The room engine returns mode-specific payloads. Keep the client wrapper loose so existing
// screens preserve their previous inferred shapes while the transport moves to Express.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function gameAction<T = any>(action: string, data: unknown, auth = true): Promise<T> {
  return apiPost<T>(`/api/game/${action}`, data, auth);
}

export async function createRoomFn({
  data,
}: {
  data: {
    name: string;
    subject: string;
    authorId: string;
    authorName: string;
    mode: GameMode;
    payload: GamePayload;
  };
}) {
  return gameAction("create-room", data);
}

export async function joinRoomFn({ data }: { data: { code: string; displayName: string } }) {
  return gameAction("join-room", data);
}

export async function reconnectParticipantFn({ data }: { data: { reconnectToken: string } }) {
  return gameAction("reconnect-participant", data, false);
}

export async function getRoomSnapshotFn({
  data,
}: {
  data: {
    roomId?: string;
    code?: string;
    authorToken?: string;
    reconnectToken?: string;
  };
}) {
  return gameAction("room-snapshot", data, false);
}

export async function getAuthorRoomResultsFn({
  data,
}: {
  data: { roomId: string; authorId: string };
}) {
  return gameAction("author-room-results", data);
}

export async function duplicateRoomFn({
  data,
}: {
  data: { sourceRoomId: string; authorId: string; authorName: string; name: string };
}) {
  return gameAction("duplicate-room", data);
}

export async function claimAuthorSessionFn({
  data,
}: {
  data: { roomId: string; authorId: string };
}) {
  return gameAction("claim-author-session", data);
}

export async function startGameFn({ data }: { data: { roomId: string; authorToken: string } }) {
  return gameAction("start-game", data, false);
}

export async function stopGameFn({ data }: { data: { roomId: string; authorToken: string } }) {
  return gameAction("stop-game", data, false);
}

export async function setShowLeaderboardToStudentsFn({
  data,
}: {
  data: { roomId: string; authorToken: string; enabled: boolean };
}) {
  return gameAction("set-student-leaderboard", data, false);
}

export async function submitQuizAnswerFn({
  data,
}: {
  data: {
    roomId: string;
    reconnectToken: string;
    questionId: string;
    selectedOption: QuizOptionId;
  };
}) {
  return gameAction("submit-quiz-answer", data, false);
}

export async function submitVisualPointAnswerFn({
  data,
}: {
  data: {
    roomId: string;
    reconnectToken: string;
    questionId: string;
    selectedPointId: string;
  };
}) {
  return gameAction("submit-visual-point-answer", data, false);
}

export async function submitPollResponsesFn({
  data,
}: {
  data: {
    roomId: string;
    reconnectToken: string;
    responses: Record<string, PollResponseValue>;
  };
}) {
  return gameAction("submit-poll-responses", data, false);
}

export async function submitPollQuestionResponseFn({
  data,
}: {
  data: {
    roomId: string;
    reconnectToken: string;
    questionId: string;
    value?: PollResponseValue;
  };
}) {
  return gameAction("submit-poll-question-response", data, false);
}

export async function expireQuestionTimerFn({
  data,
}: {
  data: {
    roomId: string;
    reconnectToken: string;
    stepId: string;
  };
}) {
  return gameAction("expire-question-timer", data, false);
}

export async function submitQuizJigsawAnswerFn({
  data,
}: {
  data: {
    roomId: string;
    reconnectToken: string;
    questionId: string;
    selectedOption: QuizOptionId;
  };
}) {
  return gameAction("submit-quiz-jigsaw-answer", data, false);
}

export async function submitJigsawMissionAnswerFn({
  data,
}: {
  data: {
    roomId: string;
    reconnectToken: string;
    questionId: string;
    selectedOption: QuizOptionId;
  };
}) {
  return gameAction("submit-jigsaw-mission-answer", data, false);
}

export async function rotateJigsawMissionTileFn({
  data,
}: {
  data: {
    roomId: string;
    reconnectToken: string;
    tileId: string;
    rotation: number;
  };
}) {
  return gameAction("rotate-jigsaw-mission-tile", data, false);
}

export async function submitJigsawProgressFn({
  data,
}: {
  data: {
    roomId: string;
    reconnectToken: string;
    lockedCount: number;
    totalPieces: number;
    completed: boolean;
    layout?: number[];
  };
}) {
  return gameAction("submit-jigsaw-progress", data, false);
}

export async function submitJigsawMissionAssemblyFn({
  data,
}: {
  data: {
    roomId: string;
    reconnectToken: string;
    layout: number[];
    totalPieces: number;
    tileRotations?: Record<string, number>;
  };
}) {
  return gameAction("submit-jigsaw-mission-assembly", data, false);
}

export async function submitConnectDotsMatchesFn({
  data,
}: {
  data: {
    roomId: string;
    reconnectToken: string;
    matches: Record<string, string>;
    routes?: Record<string, Array<{ r: number; c: number }>>;
  };
}) {
  return gameAction("submit-connect-dots-matches", data, false);
}

export async function submitConnectDotsPathsFn({
  data,
}: {
  data: {
    roomId: string;
    reconnectToken: string;
    paths: Record<string, Array<{ r: number; c: number }>>;
    completed?: boolean;
  };
}) {
  return gameAction("submit-connect-dots-paths", data, false);
}

export async function recordConnectDotsIncorrectAttemptFn({
  data,
}: {
  data: {
    roomId: string;
    reconnectToken: string;
  };
}) {
  return gameAction("record-connect-dots-incorrect-attempt", data, false);
}
