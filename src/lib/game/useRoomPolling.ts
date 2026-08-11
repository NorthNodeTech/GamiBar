import { useCallback, useEffect, useState } from "react";

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
  const [retrying, setRetrying] = useState(false);
  const [pollGeneration, setPollGeneration] = useState(0);

  const retry = useCallback(() => {
    setRetrying(true);
    setPollGeneration((n) => n + 1);
  }, []);

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
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Connection lost");
        }
      } finally {
        if (!cancelled) {
          setRetrying(false);
          timer = setTimeout(tick, intervalMs);
        }
      }
    };

    void tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    args.roomId,
    args.code,
    args.authorToken,
    args.reconnectToken,
    intervalMs,
    pollGeneration,
  ]);

  const isInitialLoading = snapshot === null && error === null;
  const isReconnecting = Boolean(error && snapshot?.ok);

  return { snapshot, error, isInitialLoading, isReconnecting, retrying, retry };
}
