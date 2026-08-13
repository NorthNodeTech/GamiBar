import { supabaseGame as supabase } from "@/lib/supabase/client";
import { normalizeRoomCode } from "@/lib/game/room-code";

export type RealtimeConnectionStatus = "connecting" | "connected" | "disconnected";

type RoomSyncFilters = {
  roomId?: string;
  code?: string;
};

const ROOM_CHILD_TABLES = [
  "gamibar_participants",
  "gamibar_quiz_answers",
  "gamibar_attempts",
  "gamibar_jigsaw_assets",
] as const;

/**
 * Subscribe to Postgres changes that indicate room state moved forward.
 * Returns an unsubscribe function.
 */
export function subscribeRoomSyncSignals(
  filters: RoomSyncFilters,
  callbacks: {
    onSignal: () => void;
    onStatus?: (status: RealtimeConnectionStatus) => void;
  },
): () => void {
  const roomId = filters.roomId?.trim();
  const code = filters.code ? normalizeRoomCode(filters.code) : "";

  if (!roomId && !code) {
    callbacks.onStatus?.("disconnected");
    return () => {};
  }

  const channelName = roomId ? `room-sync:${roomId}` : `room-sync:code:${code}`;
  let channel = supabase.channel(channelName);

  const listen = (table: string, filter: string) => {
    channel = channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table, filter },
      () => callbacks.onSignal(),
    );
  };

  if (roomId) {
    listen("gamibar_rooms", `id=eq.${roomId}`);
    for (const table of ROOM_CHILD_TABLES) {
      listen(table, `room_id=eq.${roomId}`);
    }
  } else {
    listen("gamibar_rooms", `code=eq.${code}`);
  }

  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      callbacks.onStatus?.("connected");
      return;
    }
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
      callbacks.onStatus?.("disconnected");
      return;
    }
    callbacks.onStatus?.("connecting");
  });

  return () => {
    void supabase.removeChannel(channel);
  };
}
