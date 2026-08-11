import type { GameMode } from "@/lib/game/config";
import type { GamePayload } from "@/lib/game/types";
import { supabase } from "@/lib/supabase/client";

export type AuthorSessionSummary = {
  id: string;
  code: string;
  name: string;
  subject: string;
  status: string;
  mode: GameMode;
  createdAt: string;
  playerCount: number;
  questionCount: number;
};

type RoomRow = {
  id: string;
  code: string;
  name: string;
  subject: string;
  status: string;
  mode: GameMode;
  created_at: string;
  config: unknown;
  gamibar_participants: { count: number }[] | null;
};

/** Count teacher-authored items from persisted room config. */
export function questionCountFromConfig(mode: GameMode, config: unknown): number {
  if (!config || typeof config !== "object") return 0;
  const raw = config as Record<string, unknown>;

  if (mode === "connect_dots") {
    const connectDots = raw.connectDots as Record<string, unknown> | undefined;
    const contentPairs = connectDots?.contentPairs;
    if (Array.isArray(contentPairs) && contentPairs.length > 0) return contentPairs.length;
    if (typeof connectDots?.pairCount === "number") return connectDots.pairCount;
    return 0;
  }

  const questions = raw.questions;
  return Array.isArray(questions) ? questions.length : 0;
}

export async function fetchAuthorSessions(authorId: string, limit = 50): Promise<AuthorSessionSummary[]> {
  const { data, error } = await supabase
    .from("gamibar_rooms")
    .select(
      "id, code, name, subject, status, mode, created_at, config, gamibar_participants(count)",
    )
    .eq("author_id", authorId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as RoomRow[]).map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    subject: row.subject,
    status: row.status,
    mode: row.mode,
    createdAt: row.created_at,
    playerCount: row.gamibar_participants?.[0]?.count ?? 0,
    questionCount: questionCountFromConfig(row.mode, row.config),
  }));
}

export async function deleteAuthorSession(authorId: string, roomId: string): Promise<void> {
  const { data: asset } = await supabase
    .from("gamibar_jigsaw_assets")
    .select("storage_path")
    .eq("room_id", roomId)
    .maybeSingle();

  const { error } = await supabase
    .from("gamibar_rooms")
    .delete()
    .eq("id", roomId)
    .eq("author_id", authorId);

  if (error) {
    throw new Error(error.message);
  }

  if (asset?.storage_path) {
    await supabase.storage.from("gamibar-jigsaw").remove([asset.storage_path]);
  }
}

export async function fetchAuthorSessionPayload(
  authorId: string,
  roomId: string,
): Promise<{ mode: GameMode; payload: GamePayload; name: string; subject: string }> {
  const { data, error } = await supabase
    .from("gamibar_rooms")
    .select("id, name, subject, mode, config, author_id")
    .eq("id", roomId)
    .eq("author_id", authorId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Game not found or you do not have access.");

  return {
    name: data.name,
    subject: data.subject,
    mode: data.mode as GameMode,
    payload: data.config as GamePayload,
  };
}
