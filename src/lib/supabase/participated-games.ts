import type { GameMode } from "@/lib/game/config";
import { supabase } from "@/lib/supabase/client";

export type ParticipatedGameSummary = {
  participantId: string;
  roomId: string;
  gameName: string;
  mode: GameMode;
  playedAt: string;
  score: number | null;
  completed: boolean;
  roomStatus: string;
};

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
  } | null;
  gamibar_attempts: Array<{
    score: number | null;
    completed: boolean;
    updated_at: string;
  }> | null;
};

export async function fetchParticipatedGames(userId: string, limit = 50): Promise<ParticipatedGameSummary[]> {
  const { data, error } = await supabase
    .from("gamibar_participants")
    .select(
      `
      id,
      joined_at,
      status,
      room_id,
      gamibar_rooms (
        id,
        name,
        mode,
        status
      ),
      gamibar_attempts (
        score,
        completed,
        updated_at
      )
    `,
    )
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ParticipantRow[])
    .filter((row) => row.gamibar_rooms)
    .map((row) => {
      const attempt = row.gamibar_attempts?.[0];
      const room = row.gamibar_rooms!;
      return {
        participantId: row.id,
        roomId: room.id,
        gameName: room.name,
        mode: room.mode,
        playedAt: attempt?.updated_at ?? row.joined_at,
        score: attempt?.score ?? null,
        completed: attempt?.completed ?? row.status === "COMPLETED",
        roomStatus: room.status,
      };
    });
}
