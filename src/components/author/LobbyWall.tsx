import { Users } from "lucide-react";

import { LobbyRing, avatarTone } from "@/components/session/LobbyRing";
import type { GameMode } from "@/lib/game/config";
import { cn } from "@/lib/utils";

type Participant = {
  id: string;
  displayName: string;
  status: string;
};

export function LobbyWall({
  participants,
  mode,
  roomName,
  className,
}: {
  participants: Participant[];
  mode: GameMode;
  roomName?: string;
  className?: string;
}) {
  const joined = participants.length;

  return (
    <div
      className={cn(
        "relative isolate rounded-[28px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] p-4 shadow-[var(--shadow-soft)] sm:p-6",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_100%_0%,rgba(239,68,68,0.1),transparent_55%)]"
      />

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--gamibar-brand)]">
            Live lobby
          </p>
          <h2 className="mt-1 font-display text-xl font-extrabold text-[var(--foreground)] sm:text-2xl">
            {joined === 0
              ? "Waiting for students"
              : `${joined} student${joined === 1 ? "" : "s"} in the ring`}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Names appear around the game as students join the room.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-[var(--gamibar-border)] bg-[var(--surface)] px-3 py-2 sm:px-4 sm:py-3">
          <Users className="size-5 text-[var(--gamibar-brand)]" />
          <div>
            <p className="font-display text-2xl font-bold tabular-nums leading-none text-[var(--foreground)]">
              {joined}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--gamibar-text-tertiary)]">
              Joined
            </p>
          </div>
        </div>
      </div>

      <div className="relative mt-4 overflow-visible pb-6 sm:pb-8">
        <LobbyRing participants={participants} mode={mode} roomName={roomName} />
      </div>
    </div>
  );
}

export function ParticipantStrip({
  participants,
  className,
}: {
  participants: Participant[];
  className?: string;
}) {
  if (participants.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-2", className)}>
      <div className="flex shrink-0 -space-x-2">
        {participants.slice(0, 8).map((p) => (
          <span
            key={p.id}
            title={p.displayName}
            className={cn(
              "grid size-9 place-items-center rounded-full border-2 border-[var(--gamibar-surface)] text-xs font-bold shadow-sm",
              avatarTone(p.displayName),
            )}
          >
            {p.displayName.slice(0, 1).toUpperCase()}
          </span>
        ))}
        {participants.length > 8 && (
          <span className="grid size-9 place-items-center rounded-full border-2 border-[var(--gamibar-surface)] bg-[var(--foreground)] text-[10px] font-bold text-[var(--background)] shadow-sm">
            +{participants.length - 8}
          </span>
        )}
      </div>
      <span className="whitespace-nowrap text-sm font-medium text-[var(--muted-foreground)]">
        {participants.length} in session
      </span>
    </div>
  );
}
