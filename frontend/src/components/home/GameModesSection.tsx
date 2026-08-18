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

      <div className="hidden gap-5 sm:gap-6 md:grid md:grid-cols-2 md:items-stretch xl:grid-cols-5">
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
    <article className="group relative flex h-full min-h-[19rem] w-full flex-col justify-end overflow-hidden rounded-lg border border-white/10 bg-[#0b0b0f] shadow-[var(--shadow-soft)] transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]">
      <img
        src={game.image}
        alt=""
        aria-hidden
        width={800}
        height={500}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full scale-110 object-cover opacity-35 blur-xl"
      />
      <img
        src={game.image}
        alt={game.imageAlt}
        width={800}
        height={500}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full object-contain p-4 transition-transform duration-500 group-hover:scale-[1.02] sm:p-5"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,10,0.06)_0%,rgba(8,8,10,0.34)_42%,rgba(8,8,10,0.95)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.2),transparent_42%)]" />

      <div className="absolute left-3 top-3 flex items-center gap-2">
        <span
          className={cn(
            "grid size-9 place-items-center rounded-lg shadow-sm",
            game.tint,
            game.accent,
          )}
        >
          <Icon className="size-4" />
        </span>
        <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#111111] shadow-sm backdrop-blur-sm">
          {game.tag}
        </span>
      </div>

      <div className="relative z-10 p-4 text-white sm:p-5">
        <h3 className="font-display text-xl font-black leading-tight">{game.title}</h3>
        <p className="mt-1 text-[11px] font-semibold text-white/62">{game.meta}</p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/78">{game.copy}</p>
        <div
          aria-hidden
          className="mt-4 inline-flex h-9 items-center gap-2 rounded-full bg-white px-4 text-xs font-black text-[#111111]"
        >
          {game.cta}
          <ArrowRight className="size-3.5" />
        </div>
      </div>
    </article>
  );
}
