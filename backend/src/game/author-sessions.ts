import type { GameMode } from "@shared/game/config";
import type { GamePayload } from "@shared/game/types";
import { questionCountFromConfig } from "@shared/game/session-summary";

import { HttpError } from "../http-error.js";
import { createAdminClient } from "../supabase-admin.js";

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

function readDuplicatedFromName(config: unknown): string | null {
  const raw = (config ?? {}) as Record<string, unknown>;
  return typeof raw.duplicatedFromName === "string" && raw.duplicatedFromName.trim()
    ? raw.duplicatedFromName.trim()
    : null;
}

function readRoundCount(config: unknown): number {
  const raw = (config ?? {}) as Record<string, unknown>;
  return Array.isArray(raw.roundHistory) ? raw.roundHistory.length : 0;
}

export async function fetchAuthorSessions(authorId: string, limit = 50) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("gamibar_rooms")
    .select("id, code, name, status, mode, created_at, config, gamibar_participants(count)")
    .eq("author_id", authorId)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100));

  if (error) throw error;
  return ((data ?? []) as RoomRow[]).map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    status: row.status,
    mode: row.mode,
    createdAt: row.created_at,
    playerCount: row.gamibar_participants?.[0]?.count ?? 0,
    questionCount: questionCountFromConfig(row.mode, row.config),
    duplicatedFromName: readDuplicatedFromName(row.config),
    roundCount: readRoundCount(row.config),
  }));
}

export async function deleteAuthorSession(authorId: string, roomId: string) {
  const supabase = createAdminClient();
  const [{ data: asset }, { data: visualAssets }] = await Promise.all([
    supabase
      .from("gamibar_jigsaw_assets")
      .select("storage_path")
      .eq("room_id", roomId)
      .maybeSingle(),
    supabase.from("gamibar_visual_point_assets").select("storage_path").eq("room_id", roomId),
  ]);

  const { data: deleted, error } = await supabase
    .from("gamibar_rooms")
    .delete()
    .eq("id", roomId)
    .eq("author_id", authorId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!deleted) throw new HttpError("Session not found or you do not have access.", 404);

  const removals = [];
  if (asset?.storage_path) {
    removals.push(supabase.storage.from("gamibar-jigsaw").remove([asset.storage_path]));
  }
  const visualPaths = (visualAssets ?? [])
    .map((row: { storage_path: string }) => row.storage_path)
    .filter(Boolean);
  if (visualPaths.length > 0) {
    removals.push(supabase.storage.from("gamibar-visual-point").remove(visualPaths));
  }
  await Promise.allSettled(removals);
}

export async function fetchAuthorSessionPayload(
  authorId: string,
  roomId: string,
): Promise<{ mode: GameMode; payload: GamePayload; name: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("gamibar_rooms")
    .select("id, name, mode, config")
    .eq("id", roomId)
    .eq("author_id", authorId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new HttpError("Game not found or you do not have access.", 404);
  return {
    name: data.name,
    mode: data.mode as GameMode,
    payload: data.config as GamePayload,
  };
}
