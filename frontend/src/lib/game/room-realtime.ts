import { supabaseGame as supabase } from "@/lib/supabase/client";

export type RealtimeConnectionStatus = "connecting" | "connected" | "disconnected";

type RoomSyncFilters = {
  roomId?: string;
  includeHostSignals?: boolean;
};

/**
 * Subscribe to lightweight backend Broadcast invalidations.
 * The actual room data is always fetched from Express after a signal.
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
  if (!roomId) {
    callbacks.onStatus?.("disconnected");
    return () => {};
  }

  const topics = [`room:${roomId}:public`];
  if (filters.includeHostSignals) topics.push(`room:${roomId}:host`);
  const connected = new Set<string>();
  const channels = new Set<ReturnType<typeof supabase.channel>>();
  let disposed = false;

  callbacks.onStatus?.("connecting");
  for (const topic of topics) {
    const channel = supabase
      .channel(topic)
      .on("broadcast", { event: "room_changed" }, () => callbacks.onSignal());
    channels.add(channel);
    channel.subscribe((status) => {
      if (disposed) return;
      if (status === "SUBSCRIBED") {
        connected.add(topic);
        callbacks.onStatus?.(connected.size === topics.length ? "connected" : "connecting");
        return;
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        connected.delete(topic);
        callbacks.onStatus?.("disconnected");
      }
    });
  }

  return () => {
    disposed = true;
    for (const channel of channels) void supabase.removeChannel(channel);
  };
}
