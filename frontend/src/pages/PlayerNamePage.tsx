import { useSearch } from "@/lib/navigation";
import { Link, useNavigate } from "@/lib/navigation";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineErrorBanner, PageErrorState, PageLoader } from "@/components/ui/async-state";
import { loadParticipantSession, saveParticipantSession } from "@/lib/game/client-session";
import { getRoomSnapshotFn, joinRoomFn, reconnectParticipantFn } from "@/lib/game/room.functions";
import { GAME_MODE_META } from "@shared/game/config";
import { friendlyGameError } from "@/lib/accessibility";
import { isValidRoomCodeFormat, normalizeRoomCode } from "@shared/game/room-code";

export default function NicknamePage() {
  const navigate = useNavigate();
  const { code } = useSearch();
  const [name, setName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [modeLabel, setModeLabel] = useState("");
  const [roomStatus, setRoomStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [pageState, setPageState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const clean = normalizeRoomCode(code);
      if (!isValidRoomCodeFormat(clean)) {
        if (!cancelled) setPageState("missing");
        return;
      }

      if (!cancelled) setPageState("loading");
      try {
        const snap = await getRoomSnapshotFn({ data: { code: clean } });
        if (cancelled) return;
        if (!snap.ok) {
          setPageState("missing");
          return;
        }
        const isResourceDrop = Boolean(
          ("isResourceDrop" in snap.room.payload && snap.room.payload.isResourceDrop === true) ||
          snap.room.subject === "Resource Drop" ||
          snap.room.name === "Presentation Resources" ||
          snap.room.name === "Presentation Resource" ||
          snap.room.name.toLowerCase().includes("presentation resource") ||
          snap.room.name.toLowerCase().includes("qr drop") ||
          snap.room.name.toLowerCase().includes("qrfile") ||
          snap.room.name.toLowerCase().includes("resource drop"),
        );
        if (isResourceDrop) {
          navigate({ to: "/share/$shareSlug", params: { shareSlug: clean } });
          return;
        }
        setRoomName(snap.room.name);
        setAuthorName(snap.room.authorName);
        setModeLabel(GAME_MODE_META[snap.room.mode].title);
        setRoomStatus(snap.room.status);
        setPageState("ready");
      } catch {
        if (!cancelled) setPageState("missing");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, navigate]);

  const avatarLetter = useMemo(
    () => (name.trim() ? name.trim().slice(0, 1).toUpperCase() : "?"),
    [name],
  );

  if (pageState === "loading") {
    return <PageLoader message="Looking up room…" description="Verifying the game code." />;
  }

  if (pageState === "missing") {
    return (
      <PageErrorState
        title="Room not found"
        message={
          code
            ? friendlyGameError(null, "That room code was not found or the game has ended.")
            : "Enter a valid 6-digit room code to continue."
        }
        fullScreen
      >
        <Button asChild className="rounded-xl bg-[#111111] hover:bg-black">
          <Link to="/join">Try another code</Link>
        </Button>
      </PageErrorState>
    );
  }

  const handleEnter = async () => {
    const clean = normalizeRoomCode(code);
    setLoading(true);
    setJoinError(null);
    try {
      const displayName = name.trim();
      const savedSession = loadParticipantSession();
      const canReconnect =
        savedSession?.code === clean &&
        savedSession.displayName.trim().toLowerCase() === displayName.toLowerCase();
      const result = canReconnect
        ? await reconnectParticipantFn({
            data: { reconnectToken: savedSession.reconnectToken },
          })
        : await joinRoomFn({ data: { code: clean, displayName } });
      if (!result.ok) {
        const message = friendlyGameError(
          result.error,
          "Could not join this room. Check the code and try again.",
        );
        setJoinError(message);
        toast.error(message);
        return;
      }
      saveParticipantSession({
        roomId: result.room.id,
        code: result.room.code,
        participantId: result.participantId,
        reconnectToken: result.reconnectToken,
        displayName,
      });
      if (result.room.status === "LIVE" || result.room.status === "COUNTDOWN") {
        navigate({ to: "/play/$roomId", params: { roomId: result.room.id } });
        return;
      }
      navigate({ to: "/join/lobby", search: { code: result.room.code } });
    } catch {
      const message = "Could not join. Check your connection and try again.";
      setJoinError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-5 py-12">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-[#111111] p-2.5 shadow-sm">
        <Logo size={34} />
      </div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-[var(--gamibar-brand)]">
        {roomName || "Loading…"}
      </p>
      <p className="mt-1 text-sm text-[#737373]">
        {authorName ? `Hosted by ${authorName}` : " "}
        {modeLabel ? ` · ${modeLabel}` : ""}
      </p>

      <div className="mt-8 w-full max-w-md text-center">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#111111]">
          {roomStatus === "LIVE" || roomStatus === "COUNTDOWN"
            ? "Rejoin your game"
            : "What's your name?"}
        </h1>
        {(roomStatus === "LIVE" || roomStatus === "COUNTDOWN") && (
          <p className="mt-2 text-sm text-[#525252]">
            On the same device, enter the same name to restore your progress securely.
          </p>
        )}

        <div className="mx-auto mt-6 grid size-16 place-items-center rounded-full bg-[var(--gamibar-brand-soft)] font-display text-2xl font-bold text-[var(--gamibar-brand)]">
          {avatarLetter}
        </div>

        <Input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 32))}
          placeholder="Enter nickname"
          autoFocus
          className="mt-6 h-14 rounded-2xl border-[var(--gamibar-border)] text-center text-lg font-semibold"
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleEnter();
          }}
        />

        <Button
          type="button"
          onClick={() => void handleEnter()}
          disabled={loading || !name.trim()}
          className="mt-6 h-14 w-full rounded-2xl bg-[#111111] text-base font-bold hover:bg-black"
        >
          {loading
            ? "Joining…"
            : roomStatus === "LIVE" || roomStatus === "COUNTDOWN"
              ? "REJOIN GAME"
              : "ENTER LOBBY"}
          <ArrowRight className="ml-2 size-5" />
        </Button>
        {joinError ? (
          <InlineErrorBanner
            className="mt-4 text-left"
            message={joinError}
            onRetry={() => void handleEnter()}
            retrying={loading}
            onDismiss={() => setJoinError(null)}
          />
        ) : null}

        <p className="mt-6 text-center text-xs text-[#737373]">
          Joining and playing are always free. No account, subscription, or purchase is required.
        </p>
      </div>
    </div>
  );
}
