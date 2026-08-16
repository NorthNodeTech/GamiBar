import { motion } from "framer-motion";

import { getModeCatalog } from "@/lib/game/mode-catalog";
import type { GameMode } from "@/lib/game/config";
import { GAME_MODE_META } from "@/lib/game/config";
import { cn } from "@/lib/utils";

const AVATAR_PALETTE = [
  "bg-[var(--game-quiz-soft)] text-[var(--game-quiz-deep)] ring-[var(--game-quiz)]/30",
  "bg-[var(--game-jigsaw-soft)] text-[var(--game-jigsaw-deep)] ring-[var(--game-jigsaw)]/30",
  "bg-[var(--game-connect-dots-soft)] text-[var(--game-connect-dots-deep)] ring-[var(--game-connect-dots)]/30",
  "bg-amber-50 text-amber-800 ring-amber-200/80",
  "bg-violet-50 text-violet-800 ring-violet-200/80",
  "bg-sky-50 text-sky-800 ring-sky-200/80",
] as const;

export function avatarTone(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

type Participant = {
  id: string;
  displayName: string;
};

export function LobbyRing({
  participants,
  mode,
  roomName,
  highlightParticipantId,
  className,
}: {
  participants: Participant[];
  mode: GameMode;
  roomName?: string;
  highlightParticipantId?: string;
  /** @deprecated Empty orbit slots are no longer shown. */
  showEmptySlots?: boolean;
  className?: string;
}) {
  const catalog = getModeCatalog(mode);
  const Icon = catalog?.icon;

  return (
    <div className={cn("space-y-5", className)}>
      <div className="mx-auto w-full max-w-[280px]">
        <div className="overflow-hidden rounded-[22px] border border-[var(--gamibar-border)] bg-[#111111] shadow-[0_16px_40px_rgba(0,0,0,0.12)]">
          {catalog && (
            <div className="relative aspect-[4/3] overflow-hidden">
              <img src={catalog.preview} alt="" className="size-full object-cover opacity-90" />
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent",
                  catalog.accentClass,
                  "opacity-50 mix-blend-multiply",
                )}
              />
            </div>
          )}
          <div className="px-4 py-3.5 text-center">
            {Icon && catalog && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                  catalog.badgeClass,
                )}
              >
                <Icon className="size-3 shrink-0" />
                {mode.replace("_", " ")}
              </span>
            )}
            <p className="mt-1.5 font-display text-sm font-bold leading-snug text-white sm:text-base">
              {GAME_MODE_META[mode].title}
            </p>
            {roomName && (
              <p className="mt-1 break-words text-[11px] leading-snug text-white/70">{roomName}</p>
            )}
          </div>
        </div>
      </div>

      {participants.length === 0 ? (
        <p className="text-center text-sm text-[#737373]">
          Waiting for the first participant to join...
        </p>
      ) : (
        <ul className="flex flex-wrap justify-center gap-3 sm:gap-4">
          {participants.map((participant, index) => {
            const isYou = participant.id === highlightParticipantId;

            return (
              <motion.li
                key={participant.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 26, delay: index * 0.04 }}
                className="flex w-[4.75rem] flex-col items-center sm:w-20"
              >
                <span
                  className={cn(
                    "grid size-11 place-items-center rounded-full border-2 border-white text-sm font-bold shadow-md ring-2 sm:size-12 sm:text-base",
                    avatarTone(participant.displayName),
                    isYou && "ring-[#111111] ring-offset-2 ring-offset-white",
                  )}
                >
                  {participant.displayName.slice(0, 1).toUpperCase()}
                </span>
                <p className="mt-1.5 line-clamp-2 w-full text-center text-[10px] font-semibold leading-tight text-[#111111] sm:text-[11px]">
                  {isYou ? "You" : participant.displayName}
                </p>
                {isYou && (
                  <span className="mt-1 rounded-full bg-[#111111] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">
                    Joined
                  </span>
                )}
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
