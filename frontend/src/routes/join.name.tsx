import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineErrorBanner, PageErrorState, PageLoader } from "@/components/ui/async-state";
import { saveParticipantSession } from "@/lib/game/client-session";
import { getLinkedParticipantUserId, getStoredAuth } from "@/lib/auth-store";
import { getRoomSnapshotFn, joinRoomFn } from "@/lib/game/room.functions";
import { GAME_MODE_META } from "@/lib/game/config";
import { friendlyGameError } from "@/lib/accessibility";
import { isValidRoomCodeFormat, normalizeRoomCode } from "@/lib/game/room-code";

const searchSchema = z.object({
  code: z.string().catch(""),
});

export const Route = createFileRoute("/join/name")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: "Your Name - GamiBAR" }],
  }),
  component: NicknamePage,
});

function NicknamePage() {
  const navigate = useNavigate();
  const { code } = Route.useSearch();
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
  }, [code]);

  const linkedUserId = useMemo(() => getLinkedParticipantUserId(), []);
  const signedIn = useMemo(() => {
    const auth = getStoredAuth();
    return Boolean(auth?.id && !auth.id.startsWith("guest"));
  }, []);
  const avatarLetter = useMemo(
    () => (name.trim() ? name.trim().slice(0, 1).toUpperCase() : "?"),
    [name],
  );

  if (pageState === "loading") {
    return (
      <PageLoader message="Looking up room…" description="Verifying the game code." />
    );
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
      const result = await joinRoomFn({
        data: { code: clean, displayName: name, userId: linkedUserId },
      });
      if (!result.ok) {
        const message = friendlyGameError(result.error, "Could not join this room. Check the code and try again.");
        setJoinError(message);
        toast.error(message);
        return;
      }
      saveParticipantSession({
        roomId: result.room.id,
        code: result.room.code,
        participantId: result.participantId,
        reconnectToken: result.reconnectToken,
        displayName: name.trim(),
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
      <div className="grid size-14 place-items-center rounded-2xl bg-[#111111] p-2.5 shadow-sm">
        <Logo size={44} />
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
            Enter the same name you used before to restore your progress.
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
          {loading ? "Joining…" : roomStatus === "LIVE" || roomStatus === "COUNTDOWN" ? "REJOIN GAME" : "ENTER LOBBY"}
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

        {!signedIn ? (
          <p className="mt-6 text-center text-xs text-[#737373]">
            <Link
              to="/author/login"
              search={{ redirect: `/join/name?code=${normalizeRoomCode(code)}` }}
              className="font-semibold text-[#111111] underline-offset-2 hover:underline"
            >
              Sign in
            </Link>{" "}
            with your GamiBAR account to save games you join in Participated Games.
          </p>
        ) : (
          <p className="mt-6 text-center text-xs text-emerald-700">
            Signed in — this session will appear in Participated Games.
          </p>
        )}
      </div>
    </div>
  );
}
