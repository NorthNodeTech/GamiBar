import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveParticipantSession } from "@/lib/game/client-session";
import { getRoomSnapshotFn, joinRoomFn } from "@/lib/game/room.functions";
import { GAME_MODE_META } from "@/lib/game/config";
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
  const [loading, setLoading] = useState(false);
  const [pageState, setPageState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const clean = normalizeRoomCode(code);
      if (!isValidRoomCodeFormat(clean)) {
        if (!code) return;
        if (!cancelled) setPageState("missing");
        return;
      }

      if (!cancelled) setPageState("loading");
      const snap = await getRoomSnapshotFn({ data: { code: clean } });
      if (cancelled) return;
      if (!snap.ok) {
        setPageState("missing");
        return;
      }
      setRoomName(snap.room.name);
      setAuthorName(snap.room.authorName);
      setModeLabel(GAME_MODE_META[snap.room.mode].title);
      setPageState("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const avatarLetter = useMemo(
    () => (name.trim() ? name.trim().slice(0, 1).toUpperCase() : "?"),
    [name],
  );

  if (pageState === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-5">
        <p className="text-sm text-[#525252]">Looking up room…</p>
      </div>
    );
  }

  if (pageState === "missing") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-5">
        <p className="text-sm text-[#525252]">Session not found. Enter a valid room code.</p>
        <Button asChild className="mt-4 rounded-xl bg-[#111111] hover:bg-black">
          <Link to="/join">Try another code</Link>
        </Button>
      </div>
    );
  }

  const handleEnter = async () => {
    const clean = normalizeRoomCode(code);
    setLoading(true);
    try {
      const result = await joinRoomFn({ data: { code: clean, displayName: name } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      saveParticipantSession({
        roomId: result.room.id,
        code: result.room.code,
        participantId: result.participantId,
        reconnectToken: result.reconnectToken,
        displayName: name.trim(),
      });
      navigate({ to: "/join/lobby", search: { code: result.room.code } });
    } catch {
      toast.error("Could not join. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-5 py-12">
      <Logo size={40} />
      <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-[var(--gamibar-brand)]">
        {roomName || "Loading…"}
      </p>
      <p className="mt-1 text-sm text-[#737373]">
        {authorName ? `Hosted by ${authorName}` : " "}
        {modeLabel ? ` · ${modeLabel}` : ""}
      </p>

      <div className="mt-8 w-full max-w-md text-center">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#111111]">
          What&apos;s your name?
        </h1>

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
          disabled={loading}
          className="mt-6 h-14 w-full rounded-2xl bg-[#111111] text-base font-bold hover:bg-black"
        >
          {loading ? "Joining…" : "ENTER LOBBY"}
          <ArrowRight className="ml-2 size-5" />
        </Button>
      </div>
    </div>
  );
}
