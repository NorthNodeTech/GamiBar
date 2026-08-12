import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { StudentLobbyView } from "@/components/session/StudentLobbyView";
import { Button } from "@/components/ui/button";
import { ConnectionBanner, PageErrorState, PageLoader } from "@/components/ui/async-state";
import { friendlyGameError } from "@/lib/accessibility";
import { loadParticipantSession } from "@/lib/game/client-session";
import { useRoomPolling } from "@/lib/game/useRoomPolling";

const searchSchema = z.object({
  code: z.string().catch(""),
});

export const Route = createFileRoute("/join/lobby")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: "Lobby - GamiBAR" }],
  }),
  component: StudentLobbyPage,
});

function StudentLobbyPage() {
  const navigate = useNavigate();
  const { code } = Route.useSearch();
  const participant = useMemo(() => loadParticipantSession(), [code]);
  const reconnectToken =
    participant && participant.code === code ? participant.reconnectToken : undefined;
  const { snapshot, error, isInitialLoading, isReconnecting, retrying, retry } = useRoomPolling({
    code,
    reconnectToken,
  });
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!snapshot?.ok) return;
    if (snapshot.room.status === "COUNTDOWN" || snapshot.room.status === "LIVE") {
      setCountdown(3);
    }
    if (snapshot.room.status === "FINISHED" || snapshot.room.status === "CANCELLED") {
      navigate({ to: "/play/$roomId", params: { roomId: snapshot.room.id } });
    }
  }, [snapshot?.ok, snapshot?.ok ? snapshot.room.status : null, snapshot?.ok ? snapshot.room.id : null, navigate]);

  useEffect(() => {
    if (countdown == null) return;
    if (countdown <= 0) {
      if (snapshot?.ok) {
        navigate({ to: "/play/$roomId", params: { roomId: snapshot.room.id } });
      }
      return;
    }
    const t = window.setTimeout(() => setCountdown((c) => (c == null ? c : c - 1)), 700);
    return () => window.clearTimeout(t);
  }, [countdown, navigate, snapshot]);

  if (!code || !reconnectToken) {
    return (
      <PageErrorState
        title="Session not found"
        message="Enter the room code and the same name you used before to restore your spot."
        fullScreen
        className="bg-[var(--gamibar-page)]"
      >
        <Button asChild className="rounded-xl bg-[#111111] hover:bg-black">
          <Link to={code ? "/join/name" : "/join"} search={code ? { code } : undefined}>
            Rejoin
          </Link>
        </Button>
      </PageErrorState>
    );
  }

  if (isInitialLoading) {
    return (
      <PageLoader
        message="Connecting to lobby…"
        description="Checking who is in the room."
        className="bg-[var(--gamibar-page)]"
      />
    );
  }

  if (!snapshot) {
    return (
      <PageErrorState
        title="Connection problem"
        message={friendlyGameError(error, "Could not reach the lobby. Check your network and try again.")}
        onRetry={retry}
        retrying={retrying}
        fullScreen
        className="bg-[var(--gamibar-page)]"
      >
        <Button asChild variant="outline" className="rounded-xl">
          <Link to="/join">Enter room code</Link>
        </Button>
      </PageErrorState>
    );
  }

  if (!snapshot.ok) {
    return (
      <PageErrorState
        title="Could not join lobby"
        message={friendlyGameError(error ?? snapshot.error, "This room may have closed or the code changed.")}
        onRetry={retry}
        retrying={retrying}
        fullScreen
        className="bg-[var(--gamibar-page)]"
      >
        <Button asChild className="rounded-xl bg-[#111111] hover:bg-black">
          <Link to="/join">Rejoin with code</Link>
        </Button>
      </PageErrorState>
    );
  }

  const room = snapshot.room;

  if (countdown != null && countdown > 0) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#111111] text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">Get ready</p>
        <p className="mt-4 font-display text-8xl font-black tabular-nums">{countdown}</p>
        <p className="mt-4 text-sm text-white/70">Game starting…</p>
      </div>
    );
  }

  return (
    <>
      {isReconnecting ? (
        <ConnectionBanner
          message="Connection interrupted. Live updates paused — retrying automatically."
          onRetry={retry}
          retrying={retrying}
        />
      ) : null}
      <StudentLobbyView
        roomName={room.name}
        mode={room.mode}
        instruction={room.instruction}
        participants={room.participants}
        participantId={snapshot.participantId}
        status={room.status}
      />
    </>
  );
}
