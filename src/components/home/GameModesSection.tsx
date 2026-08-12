import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

import { LandingSection } from "@/components/home/ViewportSection";
import { SectionCarousel } from "@/components/home/SectionCarousel";
import { SectionHeading } from "@/components/ui/text-motion";
import {
  HOMEPAGE_GAME_MODES,
  HOMEPAGE_GAME_MODES_SECTION,
  type HomepageGameModeCard,
} from "@/content/homepage";
import { cn } from "@/lib/utils";

type GameCard = HomepageGameModeCard;
const games: GameCard[] = HOMEPAGE_GAME_MODES;

export function GameModesSection() {
  return (
    <LandingSection id="games" width="5xl" className="!py-12 md:!py-16">
      <SectionHeading
        eyebrow={HOMEPAGE_GAME_MODES_SECTION.eyebrow}
        eyebrowClassName="tracking-wider text-[var(--gamibar-brand)]"
        title={HOMEPAGE_GAME_MODES_SECTION.title}
        description={HOMEPAGE_GAME_MODES_SECTION.description}
        align="center"
        className="mb-8 sm:mb-10 md:text-left md:[&_h2]:mx-0 md:[&_p]:mx-0"
        titleClassName="font-display text-[clamp(1.5rem,4.5vw,1.875rem)] md:mx-0"
      />

      <div className="md:hidden">
        <SectionCarousel
          ariaLabel="Game modes"
          items={games.map((game) => (
            <GameModeCard key={game.id} game={game} />
          ))}
        />
      </div>

      <div className="hidden gap-5 sm:gap-6 md:grid md:grid-cols-3 md:items-stretch">
        {games.map((game, i) => (
          <motion.div
            key={game.id}
            className="h-full"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
          >
            <GameModeCard game={game} />
          </motion.div>
        ))}
      </div>
    </LandingSection>
  );
}

function GameModeCard({ game }: { game: GameCard }) {
  const Icon = game.icon;

  return (
    <article className="flex h-full w-full flex-col rounded-[20px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] shadow-[var(--shadow-soft)] transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]">
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
              className="h-full w-full object-contain object-center"
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

      <div className="flex flex-1 flex-col p-3 sm:p-4 md:p-5">
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
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base font-bold text-[var(--foreground)] sm:text-lg">
              {game.title}
            </h3>
            <p className="mt-0.5 text-[10px] font-medium text-[var(--gamibar-text-tertiary)] sm:text-[11px]">
              {game.meta}
            </p>
          </div>
        </div>

        <p className="mt-2.5 flex-1 text-[13px] leading-relaxed text-[var(--muted-foreground)] sm:mt-3 sm:text-sm">
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
