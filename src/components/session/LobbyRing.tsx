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

function ringSlotCount(participantCount: number) {
  if (participantCount <= 8) return 8;
  if (participantCount <= 12) return 12;
  if (participantCount <= 16) return 16;
  return Math.min(24, Math.ceil((participantCount + 2) / 4) * 4);
}

function ringPosition(index: number, total: number, radiusPercent: number) {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  return {
    left: `${50 + radiusPercent * Math.cos(angle)}%`,
    top: `${50 + radiusPercent * Math.sin(angle)}%`,
  };
}

export function LobbyRing({
  participants,
  mode,
  roomName,
  highlightParticipantId,
  showEmptySlots = true,
  className,
}: {
  participants: Participant[];
  mode: GameMode;
  roomName?: string;
  highlightParticipantId?: string;
  showEmptySlots?: boolean;
  className?: string;
}) {
  const catalog = getModeCatalog(mode);
  const Icon = catalog?.icon;
  const slots = ringSlotCount(participants.length);

  return (
    <div
      className={cn(
        "relative mx-auto aspect-square w-full min-h-[300px] max-w-[min(100%,480px)] overflow-visible sm:min-h-[360px]",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 size-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[var(--gamibar-border)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 size-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--gamibar-brand)]/10"
        aria-hidden
      />

      <div className="absolute left-1/2 top-1/2 z-10 w-[min(46%,168px)] -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-[22px] border border-[var(--gamibar-border)] bg-[#111111] shadow-[0_20px_50px_rgba(0,0,0,0.18)]">
          {catalog && (
            <div className="relative aspect-[4/3] overflow-hidden rounded-t-[22px]">
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
          <div className="px-3 py-3 text-center sm:px-4 sm:py-3.5">
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

      {Array.from({ length: showEmptySlots ? slots : participants.length }).map((_, index) => {
        const participant = participants[index];
        if (!participant) {
          if (!showEmptySlots) return null;
          const pos = ringPosition(index, slots, 42);
          return (
            <div
              key={`open-${index}`}
              className="absolute z-0 -translate-x-1/2 -translate-y-1/2"
              style={pos}
              aria-hidden
            >
              <span className="grid size-8 place-items-center rounded-full border border-dashed border-[var(--gamibar-border)] bg-white/60 text-[10px] font-medium text-[#A3A3A3] sm:size-9">
                {index + 1}
              </span>
            </div>
          );
        }

        const pos = ringPosition(index, showEmptySlots ? slots : Math.max(participants.length, 8), 42);
        const isYou = participant.id === highlightParticipantId;

        return (
          <motion.div
            key={participant.id}
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 24, delay: index * 0.05 }}
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
            style={pos}
          >
            <div className="flex w-[4.5rem] flex-col items-center sm:w-20">
              <span
                className={cn(
                  "grid size-11 place-items-center rounded-full border-2 border-white text-sm font-bold shadow-md ring-2 sm:size-12 sm:text-base",
                  avatarTone(participant.displayName),
                  isYou && "ring-[#111111] ring-offset-2 ring-offset-[var(--gamibar-page)]",
                )}
              >
                {participant.displayName.slice(0, 1).toUpperCase()}
              </span>
              <p className="mt-1 line-clamp-2 w-full text-center text-[10px] font-semibold leading-tight text-[#111111] sm:text-[11px]">
                {isYou ? "You" : participant.displayName}
              </p>
              {isYou && (
                <span className="mt-0.5 rounded-full bg-[#111111] px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-white">
                  Joined
                </span>
              )}
            </div>
          </motion.div>
        );
      })}

      {participants.length > slots && (
        <p className="absolute -bottom-6 left-0 right-0 text-center text-xs font-medium text-[#525252]">
          +{participants.length - slots} more in the lobby
        </p>
      )}
    </div>
  );
}
