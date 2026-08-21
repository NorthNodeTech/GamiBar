import type { GameMode } from "@shared/game/config";

import { createAdminClient } from "../supabase-admin.js";

type ParticipantRow = {
  id: string;
  joined_at: string;
  status: string;
  room_id: string;
  gamibar_rooms: {
    id: string;
    name: string;
    mode: GameMode;
    status: string;
    author_id: string | null;
    author_name: string;
  } | null;
  gamibar_attempts: Array<{
    score: number | null;
    completed: boolean;
    updated_at: string;
  }> | null;
};

export async function fetchParticipatedGames(userId: string, limit = 50) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("gamibar_participants")
    .select(`
      id,
      joined_at,
      status,
      room_id,
      gamibar_rooms (id, name, mode, status, author_id, author_name),
      gamibar_attempts (score, completed, updated_at)
    `)
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100));

  if (error) throw error;
  return ((data ?? []) as ParticipantRow[])
    .filter((row) => row.gamibar_rooms && row.gamibar_rooms.author_id !== userId)
    .map((row) => {
      const room = row.gamibar_rooms!;
      const attempt = row.gamibar_attempts?.[0];
      return {
        participantId: row.id,
        roomId: room.id,
        gameName: room.name,
        hostName: room.author_name,
        mode: room.mode,
        playedAt: attempt?.updated_at ?? row.joined_at,
        score: attempt?.score ?? null,
        completed: attempt?.completed ?? row.status === "COMPLETED",
        roomStatus: room.status,
      };
    });
}
