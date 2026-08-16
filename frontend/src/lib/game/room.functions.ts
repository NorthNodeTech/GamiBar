import type { GameMode } from "@/lib/game/config";
import type { GamePayload, QuizOptionId } from "@/lib/game/types";
import { apiPost } from "@/lib/api-client";

/** Browser room API. The database work is owned by the Express backend. */

// The room engine returns mode-specific payloads. Keep the client wrapper loose so existing
// screens preserve their previous inferred shapes while the transport moves to Express.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function gameAction(action: string, data: unknown, auth = true): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return apiPost<any>(`/api/game/${action}`, data, auth);
}

export async function ensureDemoRoomFn() {
  return gameAction<{ ok: true }>("ensure-demo-room", {}, false);
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

export async function joinRoomFn({
  data,
}: {
  data: { code: string; displayName: string; userId?: string | null };
}) {
  return gameAction("join-room", data, false);
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
