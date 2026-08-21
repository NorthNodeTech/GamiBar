import type { GameMode } from "@shared/game/config";
import type { GamePayload } from "@shared/game/types";

import { apiFetch } from "@/lib/api-client";

export type AuthorSessionSummary = {
  id: string;
  code: string;
  name: string;
  subject?: string;
  status: string;
  mode: GameMode;
  createdAt: string;
  playerCount: number;
  questionCount: number;
  duplicatedFromName: string | null;
  roundCount?: number;
};

export function fetchAuthorSessions(authorId: string, limit = 50) {
  return apiFetch<AuthorSessionSummary[]>("/api/author-sessions", {
    searchParams: { authorId, limit },
  });
}

export async function deleteAuthorSession(authorId: string, roomId: string) {
  await apiFetch<{ ok: true }>(`/api/author-sessions/${roomId}`, {
    method: "DELETE",
    json: { authorId },
  });
}

export function fetchAuthorSessionPayload(authorId: string, roomId: string) {
  return apiFetch<{ mode: GameMode; payload: GamePayload; name: string; subject?: string }>(
    `/api/author-sessions/${roomId}/payload`,
    { searchParams: { authorId } },
  );
}
