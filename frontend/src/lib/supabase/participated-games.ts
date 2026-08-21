import type { GameMode } from "@shared/game/config";

import { apiFetch } from "@/lib/api-client";

export type ParticipatedGameSummary = {
  participantId: string;
  roomId: string;
  gameName: string;
  hostName: string;
  mode: GameMode;
  playedAt: string;
  score: number | null;
  completed: boolean;
  roomStatus: string;
};

export function fetchParticipatedGames(userId: string, limit = 50) {
  return apiFetch<ParticipatedGameSummary[]>("/api/participated-games", {
    searchParams: { userId, limit },
  });
}
