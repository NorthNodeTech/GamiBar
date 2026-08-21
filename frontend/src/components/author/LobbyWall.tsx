import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Sparkles, Users, WifiOff } from "lucide-react";

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
        "relative isolate flex min-h-[460px] flex-col justify-between overflow-hidden rounded-[28px] border border-black/10 bg-white p-5 shadow-xl sm:p-7",
        className,
      )}
    >
      {/* Background Ambience */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(255,59,48,0.06),transparent_70%)]"
      />

      {/* Header Bar */}
      <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-black/5 pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-[#FF3B30] animate-pulse" />
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#FF3B30]">
              Waiting Lobby
            </p>
          </div>
          <h2 className="mt-1 font-display text-2xl font-black text-[#111111] sm:text-3xl">
            {joined === 0
              ? "Waiting for participants…"
              : `${joined} Player${joined === 1 ? "" : "s"} In Room`}
          </h2>
          <p className="mt-0.5 text-xs font-medium text-[#5F6368]">
            Names pop up live on this screen as players join.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-black/10 bg-[#F8F9FA] px-4 py-2 text-[#111111] shadow-xs">
          <Users className="size-5 text-[#FF3B30]" />
          <span className="font-display text-3xl font-black tabular-nums">{joined}</span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#5F6368]">
            Joined
          </span>
        </div>
      </div>

      {/* Main Bubble Area */}
      <div className="relative my-4 flex-1">
        {joined === 0 ? (
          <div className="grid min-h-[300px] place-items-center rounded-2xl border-2 border-dashed border-black/10 bg-[#FAFAFA] p-8 text-center">
            <div className="max-w-sm">
              <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-black text-[#FF3B30] shadow-lg shadow-black/10">
                <Sparkles className="size-8" />
              </div>
              <p className="mt-4 font-display text-lg font-black text-[#111111]">
                No players joined yet
              </p>
              <p className="mt-1.5 text-xs font-medium leading-relaxed text-[#5F6368]">
                Scan the QR code or enter the 6-digit room code on your phone to pop up here!
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-3 p-2 sm:gap-3.5">
            <AnimatePresence mode="popLayout">
              {participants.map((participant, index) => {
                const disconnected = participant.status === "DISCONNECTED";

                return (
                  <motion.div
                    key={participant.id}
                    layout={!reduceMotion}
                    initial={
                      reduceMotion
                        ? { opacity: 0 }
                        : {
                            opacity: 0,
                            scale: 0.2,
                            y: 25,
                            rotate: (index % 5) - 2,
                          }
                    }
                    animate={{
                      opacity: 1,
                      scale: 1,
                      y: 0,
                      rotate: 0,
                    }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    whileHover={reduceMotion ? undefined : { scale: 1.06, y: -2 }}
                    transition={{
                      type: "spring",
                      stiffness: 450,
                      damping: 22,
                      mass: 0.8,
                    }}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-full border border-black/10 bg-white py-2 pl-2 pr-4 shadow-md transition-shadow hover:shadow-lg",
                      disconnected && "opacity-60 grayscale",
                    )}
                  >
                    {/* Pop-in sparkle accent */}
                    <span className="pointer-events-none absolute -right-1 -top-1 size-3 rounded-full bg-[#FF3B30] opacity-80 animate-ping" />

                    {/* Avatar Circle */}
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-full font-display text-sm font-black text-[#111111] shadow-xs ring-2 ring-white",
                        avatarTone(participant.displayName),
                      )}
                    >
                      {participant.displayName.slice(0, 1).toUpperCase()}
                    </span>

                    {/* Name & status */}
                    <div className="min-w-0 pr-1">
                      <span className="block max-w-[160px] truncate font-display text-sm font-black tracking-tight text-[#111111] sm:max-w-[200px]">
                        {participant.displayName}
                      </span>
                      {disconnected && (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-[#5F6368]">
                          <WifiOff className="size-2.5" /> Reconnecting
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer Info Pill */}
      <div className="relative flex items-center justify-between rounded-2xl border border-black/5 bg-[#F8F9FA] px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2 font-bold text-[#111111]">
          {ModeIcon && <ModeIcon className="size-4 text-[#FF3B30]" />}
          <span>{GAME_MODE_META[mode].title}</span>
          {roomName && <span className="text-[#5F6368] font-medium">· {roomName}</span>}
        </div>
        <span className="font-semibold text-[#5F6368]">Projector View · Ready to host</span>
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
              "grid size-9 place-items-center rounded-full border-2 border-white text-xs font-bold shadow-xs",
              avatarTone(p.displayName),
            )}
          >
            {p.displayName.slice(0, 1).toUpperCase()}
          </span>
        ))}
        {participants.length > 8 && (
          <span className="grid size-9 place-items-center rounded-full border-2 border-white bg-[#111111] text-[10px] font-bold text-white shadow-xs">
            +{participants.length - 8}
          </span>
        )}
      </div>
      <span className="whitespace-nowrap text-sm font-semibold text-[#5F6368]">
        {participants.length} in session
      </span>
    </div>
  );
}
