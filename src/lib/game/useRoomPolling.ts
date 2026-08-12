import { useCallback, useEffect, useRef, useState } from "react";

import { getRoomSnapshotFn } from "@/lib/game/room.functions";
import {
  subscribeRoomSyncSignals,
  type RealtimeConnectionStatus,
} from "@/lib/game/room-realtime";

type Snapshot = Awaited<ReturnType<typeof getRoomSnapshotFn>>;

type RoomSyncArgs = {
  roomId?: string;
  code?: string;
  authorToken?: string;
  reconnectToken?: string;
};

type RoomSyncOptions = {
  /** Heartbeat poll while Realtime is connected (ms). */
  connectedPollMs?: number;
  /** Poll interval when Realtime is unavailable (ms). */
  fallbackPollMs?: number;
};

const DEFAULT_CONNECTED_POLL_MS = 30_000;
const DEFAULT_FALLBACK_POLL_MS = 3_000;
const REFETCH_DEBOUNCE_MS = 200;

export function useRoomSync(
  args: RoomSyncArgs,
  options: RoomSyncOptions = {},
) {
  const connectedPollMs = options.connectedPollMs ?? DEFAULT_CONNECTED_POLL_MS;
  const fallbackPollMs = options.fallbackPollMs ?? DEFAULT_FALLBACK_POLL_MS;

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeConnectionStatus>("connecting");
  const [pollGeneration, setPollGeneration] = useState(0);

  const argsRef = useRef(args);
  argsRef.current = args;

  const fetchSnapshot = useCallback(async () => {
    try {
      const next = await getRoomSnapshotFn({ data: argsRef.current });
      setSnapshot(next);
      setError(next.ok ? null : next.error);
      return next;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection lost");
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
    setPollGeneration((n) => n + 1);
  }, []);

  // Initial load + manual retry
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
    pollGeneration,
    fetchSnapshot,
  ]);

  const resolvedRoomId = snapshot?.ok ? snapshot.room.id : args.roomId;
  const resolvedCode = snapshot?.ok ? snapshot.room.code : args.code;

  // Realtime: refetch when room row changes in Supabase
  useEffect(() => {
    if (!resolvedRoomId && !resolvedCode) return;

    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeRoomSyncSignals(
      { roomId: resolvedRoomId, code: resolvedCode },
      {
        onSignal: () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            void fetchSnapshot();
          }, REFETCH_DEBOUNCE_MS);
        },
        onStatus: setRealtimeStatus,
      },
    );

    return () => {
      clearTimeout(debounceTimer);
      unsubscribe();
    };
  }, [resolvedRoomId, resolvedCode, fetchSnapshot]);

  // Adaptive fallback polling (slow when Realtime works, fast when it does not)
  useEffect(() => {
    const intervalMs =
      realtimeStatus === "connected" ? connectedPollMs : fallbackPollMs;
    const timer = window.setInterval(() => {
      void fetchSnapshot();
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [realtimeStatus, connectedPollMs, fallbackPollMs, fetchSnapshot]);

  // Refetch when tab becomes visible or browser comes back online
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

/** @deprecated Prefer `useRoomSync` — kept for existing imports. */
export const useRoomPolling = useRoomSync;
