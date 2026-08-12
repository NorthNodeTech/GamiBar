import { Loader2, Radio, Sparkles, Users } from "lucide-react";

import { Logo } from "@/components/layout/Logo";
import { LobbyRing } from "@/components/session/LobbyRing";
import type { GameMode } from "@/lib/game/config";
import { GAME_MODE_META } from "@/lib/game/config";
import { cn } from "@/lib/utils";

type Participant = {
  id: string;
  displayName: string;
  status: string;
};

function studentCountLabel(count: number) {
  return count === 1 ? "1 student in the lobby" : `${count} students in the lobby`;
}

export function StudentLobbyView({
  roomName,
  mode,
  instruction,
  participants,
  participantId,
  status,
}: {
  roomName: string;
  mode: GameMode;
  instruction: string;
  participants: Participant[];
  participantId?: string;
  status: string;
}) {
  const you = participants.find((p) => p.id === participantId);
  const inLobby = status === "LOBBY" || status === "READY";

  return (
    <div className="min-h-dvh-screen bg-[var(--gamibar-page)]">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(239,68,68,0.08),transparent_60%)]"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-dvh-screen w-full max-w-lg flex-col px-4 pb-8 pt-5 sm:px-6">
        <header className="flex items-center justify-between">
          <Logo size={36} />
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
              inLobby
                ? "bg-[var(--gamibar-brand-soft)] text-[var(--gamibar-brand)]"
                : "bg-[var(--game-connect-dots-soft)] text-[var(--game-connect-dots-deep)]",
            )}
          >
            <Radio className="size-3" />
            {status}
          </span>
        </header>

        <div className="mt-6 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--gamibar-brand)]">
            You&apos;re in the lobby
          </p>
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-[#111111] sm:text-3xl">
            {roomName}
          </h1>
          <p className="mt-2 text-sm font-medium text-[#525252]">{GAME_MODE_META[mode].title}</p>
        </div>

        <div className="mt-6 rounded-[24px] border border-[var(--gamibar-border)] bg-white p-4 shadow-[var(--shadow-soft)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-xl bg-[var(--gamibar-brand-soft)] text-[var(--gamibar-brand)]">
                <Users className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#111111]">{studentCountLabel(participants.length)}</p>
                <p className="text-xs text-[#737373]">More classmates appear as they join</p>
              </div>
            </div>
            <p className="font-display text-3xl font-bold tabular-nums text-[#111111]">{participants.length}</p>
          </div>

          <div className="mt-5">
            <LobbyRing
              participants={participants}
              mode={mode}
              roomName={roomName}
              highlightParticipantId={participantId}
            />
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-[var(--gamibar-border)] bg-white p-4 shadow-[var(--shadow-soft)]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#737373]">How to play</p>
          <p className="mt-2 text-sm leading-relaxed text-[#525252]">{instruction}</p>
        </div>

        <div className="mt-5 flex items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--gamibar-brand)]/25 bg-[var(--gamibar-brand-soft)]/40 px-4 py-4">
          <Loader2 className="size-5 animate-spin text-[var(--gamibar-brand)]" />
          <div>
            <p className="text-sm font-semibold text-[#111111]">Waiting for the host to start</p>
            <p className="text-xs text-[#525252]">Stay on this screen - the game launches automatically</p>
          </div>
        </div>

        {you && (
          <p className="mt-4 text-center text-xs text-[#737373]">
            Playing as <span className="font-semibold text-[#111111]">{you.displayName}</span>
            <Sparkles className="ml-1 inline size-3 text-[var(--gamibar-brand)]" />
          </p>
        )}
      </div>
    </div>
  );
}
