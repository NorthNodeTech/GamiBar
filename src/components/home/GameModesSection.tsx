import { ArrowRight, ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

import { LandingSection } from "@/components/home/ViewportSection";
import { SectionHeading } from "@/components/ui/text-motion";
import {
  HOMEPAGE_GAME_MODES,
  HOMEPAGE_GAME_MODES_SECTION,
  type HomepageGameModeCard,
} from "@/content/homepage";
import { cn } from "@/lib/utils";

type GameCard = HomepageGameModeCard;
const games: GameCard[] = HOMEPAGE_GAME_MODES;

function ringOffset(index: number, active: number, length: number) {
  let diff = index - active;
  if (diff > length / 2) diff -= length;
  if (diff < -length / 2) diff += length;
  return diff;
}

function useCarouselShift() {
  const [shift, setShift] = useState(42);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 400) setShift(24);
      else if (w < 640) setShift(32);
      else if (w < 1024) setShift(42);
      else setShift(48);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return shift;
}

export function GameModesSection() {
  const [active, setActive] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const shiftPercent = useCarouselShift();
  const count = games.length;
  const activeGame = games[active]!;

  const goNext = useCallback(() => setActive((i) => (i + 1) % count), [count]);
  const goPrev = useCallback(() => setActive((i) => (i - 1 + count) % count), [count]);

  useEffect(() => {
    const timer = window.setInterval(goNext, 5000);
    return () => window.clearInterval(timer);
  }, [goNext]);

  return (
    <LandingSection id="games" width="5xl" className="overflow-x-clip !py-12 md:!py-16">
      <SectionHeading
        eyebrow={HOMEPAGE_GAME_MODES_SECTION.eyebrow}
        eyebrowClassName="tracking-wider text-[var(--gamibar-brand)]"
        title={HOMEPAGE_GAME_MODES_SECTION.title}
        description={HOMEPAGE_GAME_MODES_SECTION.description}
        align="center"
        className="mb-6 sm:mb-8 md:text-left md:[&_h2]:mx-0 md:[&_p]:mx-0"
        titleClassName="font-display text-[clamp(1.5rem,4.5vw,1.875rem)] md:mx-0"
      />

      <div
        className="relative mx-auto w-full max-w-full overflow-x-clip"
        onTouchStart={(e) => setTouchStartX(e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          if (touchStartX == null) return;
          const delta = (e.changedTouches[0]?.clientX ?? touchStartX) - touchStartX;
          if (delta > 48) goPrev();
          else if (delta < -48) goNext();
          setTouchStartX(null);
        }}
      >
        <div className="relative overflow-visible px-10 sm:px-14 md:px-16 lg:px-[4.5rem]">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous game mode"
            className="absolute left-0 top-1/2 z-40 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] text-[var(--foreground)] shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--surface)] sm:size-11 md:size-12"
          >
            <ChevronLeft className="size-5" />
          </button>

          <button
            type="button"
            onClick={goNext}
            aria-label="Next game mode"
            className="absolute right-0 top-1/2 z-40 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] text-[var(--foreground)] shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--surface)] sm:size-11 md:size-12"
          >
            <ChevronRight className="size-5" />
          </button>

          <div
            className="relative mx-auto w-full max-w-[min(100%,300px)] overflow-visible sm:max-w-[340px] md:max-w-[360px] lg:max-w-[380px]"
            style={{ perspective: "1400px" }}
          >
            <div className="pointer-events-none invisible" aria-hidden>
              <GameModeCard game={activeGame} featured />
            </div>

            {games.map((game, index) => {
              const offset = ringOffset(index, active, count);
              if (Math.abs(offset) > 1) return null;

              const isCenter = offset === 0;
              const shift = offset * shiftPercent;

              return (
                <motion.div
                  key={game.id}
                  style={{ transformStyle: "preserve-3d" }}
                  className={cn(
                    "absolute left-1/2 top-0 w-full max-w-[min(100%,300px)] origin-center sm:max-w-[340px] md:max-w-[360px] lg:max-w-[380px]",
                    !isCenter && "cursor-pointer",
                  )}
                  initial={false}
                  animate={{
                    x: `calc(-50% + ${shift}%)`,
                    scale: isCenter ? 1 : 0.84,
                    zIndex: isCenter ? 30 : 12 - Math.abs(offset),
                    opacity: isCenter ? 1 : 0.55,
                    rotateY: offset * -8,
                    filter: isCenter ? "blur(0px)" : "blur(0.35px)",
                  }}
                  transition={{ type: "spring", stiffness: 260, damping: 28 }}
                  onClick={() => {
                    if (!isCenter) setActive(index);
                  }}
                  aria-hidden={!isCenter}
                >
                  <GameModeCard game={game} featured={isCenter} />
                </motion.div>
              );
            })}
          </div>
        </div>

        <div
          className="mt-4 flex items-center justify-center gap-2 sm:mt-5"
          role="tablist"
          aria-label="Game modes"
        >
          {games.map((game, index) => (
            <button
              key={game.id}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-label={`Show ${game.title}`}
              onClick={() => setActive(index)}
              className={cn(
                "h-2.5 rounded-full transition-all duration-300",
                index === active
                  ? "w-7 bg-[var(--gamibar-brand)]"
                  : "w-2.5 bg-[var(--gamibar-border)] hover:bg-[var(--muted-foreground)]",
              )}
            />
          ))}
        </div>
      </div>
    </LandingSection>
  );
}

function GameModeCard({ game, featured }: { game: GameCard; featured?: boolean }) {
  const Icon = game.icon;

  return (
    <article
      className={cn(
        "flex w-full flex-col rounded-[20px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] shadow-[var(--shadow-soft)] transition-shadow duration-300",
        featured && "shadow-[var(--shadow-lift)] ring-1 ring-[var(--gamibar-border)]",
      )}
    >
      <div className="p-3 pb-0 sm:p-4 sm:pb-0 md:p-5 md:pb-0">
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border border-[var(--gamibar-border)]/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]",
            game.tint,
          )}
        >
          <div className="flex aspect-[16/10] items-center justify-center p-2.5 sm:p-3 md:p-4">
            <img
              src={game.image}
              alt={game.imageAlt}
              width={800}
              height={500}
              loading="lazy"
              decoding="async"
              className="max-h-full max-w-full object-contain object-center"
            />
          </div>
          <span
            className={cn(
              "absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-sm ring-1 ring-black/5 sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[10px]",
              game.tint,
              game.accent,
            )}
          >
            {game.tag}
          </span>
        </div>
      </div>

      <div className="flex flex-col p-3 sm:p-4 md:p-5">
        <div className="flex items-start gap-2.5 sm:gap-3">
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-xl sm:size-10",
              game.tint,
              game.accent,
            )}
          >
            <Icon className="size-4 sm:size-5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-base font-bold text-[var(--foreground)] sm:text-lg">
              {game.title}
            </h3>
            <p className="mt-0.5 text-[10px] font-medium text-[var(--gamibar-text-tertiary)] sm:text-[11px]">
              {game.meta}
            </p>
          </div>
        </div>

        <p className="mt-2.5 text-[13px] leading-relaxed text-[var(--muted-foreground)] sm:mt-3 sm:text-sm">
          {game.copy}
        </p>

        <div
          aria-hidden
          className="mt-3 inline-flex h-10 w-full cursor-default select-none items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground pointer-events-none sm:mt-4 sm:h-11"
        >
          {game.cta}
          <ArrowRight className="size-4" />
        </div>
      </div>
    </article>
  );
}
