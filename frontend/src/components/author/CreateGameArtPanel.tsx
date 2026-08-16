import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import {
  CREATE_STEP_COPY,
  getModeCatalog,
  SESSION_FACTS,
  type GameModeCatalogItem,
} from "@/lib/game/mode-catalog";
import type { GameMode } from "@/lib/game/config";
import { cn } from "@/lib/utils";

type CreateGameArtPanelProps = {
  step: keyof typeof CREATE_STEP_COPY;
  mode: GameMode | null;
  roomName?: string;
  subject?: string;
  className?: string;
};

export function CreateGameArtPanel({
  step,
  mode,
  roomName,
  subject,
  className,
}: CreateGameArtPanelProps) {
  if (step === "details" || !mode) return null;

  const selected = getModeCatalog(mode);
  if (!selected) return null;

  const copy = CREATE_STEP_COPY[step];

  return (
    <aside
      className={cn(
        "relative hidden overflow-hidden rounded-2xl border border-[var(--gamibar-border)] bg-[#111111] lg:block lg:max-h-[calc(100dvh-7rem)] lg:min-h-[360px]",
        className,
      )}
    >
      <div className="absolute inset-0">
        <ModeHero item={selected} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/55 to-[#111111]/20" />
      </div>

      <div className="relative flex h-full flex-col justify-between p-5">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/80">
            <Sparkles className="size-3" />
            Session builder
          </span>
          <h2 className="mt-3 font-display text-xl font-extrabold leading-tight text-white">
            {copy.title}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-white/70">{copy.hint}</p>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">
              Selected mode
            </p>
            <p className="mt-1 text-sm font-bold text-white">{selected.tagline}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selected.specs.map((spec) => (
                <span
                  key={spec}
                  className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/85"
                >
                  {spec}
                </span>
              ))}
            </div>
          </div>

          {(roomName || subject) && (
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-md">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                Session
              </p>
              <p className="mt-0.5 text-sm font-semibold text-white">
                {roomName || "Untitled room"}
              </p>
              {subject && <p className="text-xs text-white/60">{subject}</p>}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {SESSION_FACTS.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-medium text-white/75"
              >
                <Icon className="size-3" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

function ModeHero({ item }: { item: GameModeCatalogItem }) {
  const Icon = item.icon;
  return (
    <motion.div
      key={item.mode}
      initial={{ opacity: 0, scale: 1.03 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="relative h-full min-h-[220px]"
    >
      <ModePreviewImage src={item.preview} />
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-35 mix-blend-multiply",
          item.accentClass,
        )}
      />
      <div className="absolute left-4 top-4">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[10px] font-bold",
            item.badgeClass,
          )}
        >
          <Icon className="size-3.5" />
          {item.mode.toUpperCase()}
        </span>
      </div>
    </motion.div>
  );
}

export function MobileGameBanner({
  mode,
  step,
}: {
  mode: GameMode | null;
  step: keyof typeof CREATE_STEP_COPY;
}) {
  if (step === "details" || !mode) return null;

  const selected = getModeCatalog(mode);
  if (!selected) return null;

  return (
    <div className="relative mb-4 overflow-hidden rounded-xl border border-[var(--gamibar-border)] lg:hidden">
      <div className="relative aspect-video max-h-[180px]">
        <ModePreviewImage src={selected.preview} />
        <div className={cn("absolute inset-0 bg-gradient-to-r opacity-50", selected.accentClass)} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
        <p className="absolute bottom-2.5 left-3 font-display text-sm font-bold text-white">
          {selected.tagline}
        </p>
      </div>
    </div>
  );
}

function ModePreviewImage({ src }: { src: string }) {
  return (
    <>
      <img
        src={src}
        alt=""
        aria-hidden
        className="absolute inset-0 size-full scale-110 object-cover opacity-30 blur-xl"
        loading="lazy"
      />
      <img src={src} alt="" className="relative z-10 size-full object-contain p-3" loading="lazy" />
    </>
  );
}
