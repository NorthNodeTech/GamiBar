import { useEffect, useState } from "react";

import { getRoomSnapshotFn } from "@/lib/game/room.functions";

type Snapshot = Awaited<ReturnType<typeof getRoomSnapshotFn>>;

export function useRoomPolling(
  args: {
    roomId?: string;
    code?: string;
    authorToken?: string;
    reconnectToken?: string;
  },
  intervalMs = 1500,
) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const next = await getRoomSnapshotFn({ data: args });
        if (cancelled) return;
        setSnapshot(next);
        setError(next.ok ? null : next.error);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Connection lost");
      } finally {
        if (!cancelled) timer = setTimeout(tick, intervalMs);
      }
    };

    void tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [args.roomId, args.code, args.authorToken, args.reconnectToken, intervalMs]);

  return { snapshot, error };
}
