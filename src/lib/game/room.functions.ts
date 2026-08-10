import type { GameMode } from "@/lib/game/config";
import type { GamePayload, QuizOptionId } from "@/lib/game/types";
import {
  createRoom,
  ensureDemoRoom,
  getRoomSnapshot,
  joinRoom,
  reconnectParticipant,
  startGame,
  stopGame,
  submitJigsawProgress,
  submitConnectDotsPaths,
  submitQuizAnswer,
  submitQuizJigsawAnswer,
} from "@/lib/game/room-engine";

/** Client-side room API for static SPA (Supabase-backed). Same `{ data }` call shape as before. */

export async function ensureDemoRoomFn() {
  await ensureDemoRoom();
  return { ok: true as const };
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
  return createRoom(data);
}

export async function joinRoomFn({
  data,
}: {
  data: { code: string; displayName: string };
}) {
  await ensureDemoRoom();
  return joinRoom(data);
}

export async function reconnectParticipantFn({
  data,
}: {
  data: { reconnectToken: string };
}) {
  return reconnectParticipant(data);
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
  if (data.code) await ensureDemoRoom();
  return getRoomSnapshot(data);
}

export async function startGameFn({
  data,
}: {
  data: { roomId: string; authorToken: string };
}) {
  return startGame(data);
}

export async function stopGameFn({
  data,
}: {
  data: { roomId: string; authorToken: string };
}) {
  return stopGame(data);
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
  return submitQuizAnswer(data);
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
  return submitQuizJigsawAnswer(data);
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
  };
}) {
  return submitJigsawProgress(data);
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
  return submitConnectDotsPaths(data);
}
