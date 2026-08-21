import { useCallback, useEffect, useRef, useState } from "react";

import { getRoomSnapshotFn } from "@/lib/game/room.functions";
import { subscribeRoomSyncSignals, type RealtimeConnectionStatus } from "@/lib/game/room-realtime";

type Snapshot = Awaited<ReturnType<typeof getRoomSnapshotFn>>;

type RoomSyncArgs = {
  roomId?: string;
  code?: string;
  authorToken?: string;
  reconnectToken?: string;
};

const SIGNAL_REFETCH_THROTTLE_MS = 400;
// Broadcast invalidations and reconnect/visibility listeners do the immediate
// synchronization. This slower fallback limits full snapshot reads in large
// classes while still recovering if a client misses an invalidation.
const STUDENT_RECONCILIATION_MS = 300_000;
const HOST_RECONCILIATION_MS = 5_000;

export function useRoomSync(args: RoomSyncArgs) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeConnectionStatus>("connecting");
  const [refreshGeneration, setRefreshGeneration] = useState(0);

  const argsRef = useRef(args);
  argsRef.current = args;
  const realtimeStatusRef = useRef<RealtimeConnectionStatus>("connecting");
  const fetchGenerationRef = useRef(0);

  const fetchSnapshot = useCallback(async () => {
    const generation = ++fetchGenerationRef.current;
    try {
      const next = await getRoomSnapshotFn({ data: argsRef.current });
      if (generation === fetchGenerationRef.current) {
        setSnapshot(next);
        setError(next.ok ? null : next.error);
      }
      return next;
    } catch (e) {
      if (generation === fetchGenerationRef.current) {
        setError(e instanceof Error ? e.message : "Connection lost");
      }
      return null;
    }
  }, []);

  const refresh = useCallback(async () => {
    setRetrying(true);
    try {
      return await fetchSnapshot();
    } finally {
      setRetrying(false);
    }
  }, [fetchSnapshot]);

  const retry = useCallback(() => {
    setRefreshGeneration((n) => n + 1);
  }, []);

  // Initial load + manual retry.
  useEffect(() => {
    let cancelled = false;
    setRetrying(true);
    void (async () => {
      await fetchSnapshot();
      if (!cancelled) setRetrying(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    args.roomId,
    args.code,
    args.authorToken,
    args.reconnectToken,
    refreshGeneration,
    fetchSnapshot,
  ]);

  const resolvedRoomId = snapshot?.ok ? snapshot.room.id : args.roomId;
  useEffect(() => {
    if (!resolvedRoomId) return;

    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeRoomSyncSignals(
      { roomId: resolvedRoomId, includeHostSignals: Boolean(args.authorToken) },
      {
        onSignal: () => {
          if (debounceTimer) return;
          const delayMs = args.authorToken
            ? 100
            : SIGNAL_REFETCH_THROTTLE_MS + Math.floor(Math.random() * 1_000);
          debounceTimer = setTimeout(() => {
            debounceTimer = undefined;
            void fetchSnapshot();
          }, delayMs);
        },
        onStatus: (status) => {
          const previous = realtimeStatusRef.current;
          if (previous === status) return;
          realtimeStatusRef.current = status;
          setRealtimeStatus(status);
          if (status === "connected" && previous === "disconnected") {
            void fetchSnapshot();
          }
        },
      },
    );

    return () => {
      clearTimeout(debounceTimer);
      unsubscribe();
    };
  }, [resolvedRoomId, args.authorToken, fetchSnapshot]);

  // Broadcast is an invalidation hint, not the source of truth. A slow fallback
  // reconciliation covers sleeping tabs and the rare signal missed during reconnect.
  useEffect(() => {
    if (!resolvedRoomId) return;
    const intervalMs = args.authorToken ? HOST_RECONCILIATION_MS : STUDENT_RECONCILIATION_MS;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const schedule = () => {
      const jitteredInterval = intervalMs * (0.8 + Math.random() * 0.4);
      timer = setTimeout(() => {
        if (cancelled) return;
        if (document.visibilityState === "visible" && navigator.onLine) void fetchSnapshot();
        schedule();
      }, jitteredInterval);
    };

    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [resolvedRoomId, args.authorToken, fetchSnapshot]);

  // Re-sync after browser-level interruptions that can drop websocket events.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchSnapshot();
    };
    const onOnline = () => void fetchSnapshot();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [fetchSnapshot]);

  const isInitialLoading = snapshot === null && error === null;
  const isReconnecting = Boolean(error && snapshot?.ok);

  return {
    snapshot,
    error,
    isInitialLoading,
    isReconnecting,
    retrying,
    retry,
    refresh,
    realtimeStatus,
  };
}
