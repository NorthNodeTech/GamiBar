import { motion, useReducedMotion } from "framer-motion";
import { Radio, Users, WifiOff } from "lucide-react";

import { avatarTone } from "@/components/session/LobbyRing";
import { GAME_MODE_META, type GameMode } from "@shared/game/config";
import { getModeCatalog } from "@/lib/game/mode-catalog";
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
  const reduceMotion = useReducedMotion();
  const catalog = getModeCatalog(mode);
  const ModeIcon = catalog?.icon;

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-[28px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] p-4 shadow-[var(--shadow-soft)] sm:p-6",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_100%_0%,rgba(239,68,68,0.1),transparent_55%)]"
      />

      <div className="relative flex items-start justify-between gap-4 border-b border-[var(--gamibar-border)] pb-4 sm:pb-5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--gamibar-brand)]">
            Live lobby
          </p>
          <h2 className="mt-1 font-display text-xl font-extrabold text-[var(--foreground)] sm:text-2xl">
            {joined === 0
              ? "Waiting for participants"
              : `${joined} participant${joined === 1 ? "" : "s"} in the lobby`}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Ready to start when you are.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 pt-0.5 text-[var(--foreground)]">
          <Users className="size-4 text-[var(--gamibar-brand)] sm:size-5" />
          <span className="font-display text-2xl font-bold tabular-nums leading-none sm:text-3xl">
            {joined}
          </span>
          <span className="hidden text-[10px] font-semibold uppercase tracking-wider text-[var(--gamibar-text-tertiary)] sm:block">
            Joined
          </span>
        </div>
      </div>

      <div className="relative mt-4 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_13rem] lg:items-start lg:gap-6">
        <section className="min-w-0" aria-labelledby="lobby-roster-heading">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3
              id="lobby-roster-heading"
              className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--gamibar-text-tertiary)]"
            >
              Participant roster
            </h3>
            {joined > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted-foreground)]">
                <span className="size-1.5 rounded-full bg-[var(--game-connect-dots)]" />
                Live
              </span>
            )}
          </div>

          {joined === 0 ? (
            <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-[var(--gamibar-border)] bg-[var(--surface)]/55 px-5 py-8 text-center">
              <div>
                <span className="mx-auto grid size-10 place-items-center rounded-xl bg-[var(--gamibar-brand-soft)] text-[var(--gamibar-brand)]">
                  <Users className="size-5" />
                </span>
                <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">
                  No participants yet
                </p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Joined names will appear in this roster.
                </p>
              </div>
            </div>
          ) : (
            <motion.ul
              layout={!reduceMotion}
              className="grid min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(9.5rem,9.5rem))] sm:gap-3"
            >
              {participants.map((participant, index) => {
                const disconnected = participant.status === "DISCONNECTED";

                return (
                  <motion.li
                    layout={!reduceMotion}
                    key={participant.id}
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 30,
                      delay: index * 0.025,
                    }}
                    className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-[var(--gamibar-border)] bg-[var(--surface)] px-3 py-3 shadow-sm"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold ring-1",
                        avatarTone(participant.displayName),
                        disconnected && "grayscale",
                      )}
                    >
                      {participant.displayName.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
                        {participant.displayName}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 flex items-center gap-1 text-[10px] font-medium",
                          disconnected
                            ? "text-[var(--gamibar-text-tertiary)]"
                            : "text-[var(--game-connect-dots-deep)]",
                        )}
                      >
                        {disconnected ? (
                          <WifiOff className="size-2.5" />
                        ) : (
                          <Radio className="size-2.5" />
                        )}
                        {disconnected ? "Reconnecting" : "Ready"}
                      </span>
                    </span>
                  </motion.li>
                );
              })}
            </motion.ul>
          )}
        </section>

        <aside className="overflow-hidden rounded-2xl border border-[var(--gamibar-border)] bg-[var(--surface)]">
          <div className="flex min-w-0 items-center gap-3 p-3 lg:block lg:p-0">
            {catalog && (
              <div className="relative size-16 shrink-0 overflow-hidden rounded-xl lg:aspect-[16/10] lg:size-auto lg:rounded-none">
                <img
                  src={catalog.preview}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 size-full scale-110 object-cover opacity-25 blur-lg"
                  loading="lazy"
                />
                <img
                  src={catalog.preview}
                  alt=""
                  className="relative z-10 size-full object-contain p-1.5"
                  loading="lazy"
                />
                <div
                  aria-hidden
                  className={cn(
                    "absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-40",
                    catalog.accentClass,
                  )}
                />
              </div>
            )}
            <div className="min-w-0 lg:p-4">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--gamibar-brand)]">
                {ModeIcon && <ModeIcon className="size-3" />}
                Up next
              </p>
              <p className="mt-1 truncate font-display text-sm font-bold text-[var(--foreground)] lg:whitespace-normal">
                {GAME_MODE_META[mode].title}
              </p>
              {roomName && (
                <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)] lg:mt-1 lg:whitespace-normal lg:break-words">
                  {roomName}
                </p>
              )}
            </div>
          </div>
        </aside>
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
