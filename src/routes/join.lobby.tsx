import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { StudentLobbyView } from "@/components/session/StudentLobbyView";
import { Button } from "@/components/ui/button";
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
  const { snapshot, error } = useRoomPolling({ code, reconnectToken }, 1200);
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
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--gamibar-page)] px-5">
        <p className="text-sm text-[#525252]">Join session missing. Enter the room code again.</p>
        <Button asChild className="mt-4 rounded-xl bg-[#111111] hover:bg-black">
          <Link to="/join">Rejoin</Link>
        </Button>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--gamibar-page)] text-sm text-[#525252]">
        Connecting to lobby…
      </div>
    );
  }

  if (!snapshot.ok) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--gamibar-page)] px-5">
        <p className="text-sm text-[#525252]">{error ?? snapshot.error}</p>
        <Button asChild className="mt-4 rounded-xl bg-[#111111] hover:bg-black">
          <Link to="/join">Rejoin</Link>
        </Button>
      </div>
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
    <StudentLobbyView
      roomName={room.name}
      mode={room.mode}
      instruction={room.instruction}
      participants={room.participants}
      participantId={snapshot.participantId}
      status={room.status}
    />
  );
}
