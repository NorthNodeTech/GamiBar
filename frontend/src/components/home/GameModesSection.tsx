import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

import { LandingSection } from "@/components/home/ViewportSection";
import {
  HOMEPAGE_GAME_MODES_SECTION,
  HOMEPAGE_TOOL_WALL,
  type HomepageToolCard,
} from "@/content/homepage";
import { cn } from "@/lib/utils";

type GameCard = HomepageToolCard;

const assessmentIds = ["quiz", "polls", "resource_drop"] as const;
const challengeIds = ["jigsaw", "connect_dots", "visual_point"] as const;

const assessments = HOMEPAGE_TOOL_WALL.filter((game) => assessmentIds.some((id) => id === game.id));
const challenges = HOMEPAGE_TOOL_WALL.filter((game) => challengeIds.some((id) => id === game.id));

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.215, 0.61, 0.355, 1] as const },
  },
};

export function GameModesSection() {
  return (
    <LandingSection
      id="games"
      width="7xl"
      className="flex min-h-[100svh] flex-col justify-center bg-[#FAFAFA] !py-16 md:!py-24"
    >
      <div className="mx-auto mb-14 max-w-3xl text-center md:mb-16">
        <span className="text-xs font-bold uppercase tracking-widest text-[#FF3B30]">
          {HOMEPAGE_GAME_MODES_SECTION.eyebrow}
        </span>
        <h2 className="mt-4 font-display text-[clamp(2rem,5vw,3.25rem)] font-black leading-tight text-[#111111]">
          {HOMEPAGE_GAME_MODES_SECTION.title}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-[#5F6368]">
          {HOMEPAGE_GAME_MODES_SECTION.description}
        </p>
      </div>

      <ToolGroup
        title="Live assessment and feedback"
        description="Test knowledge, collect votes, and share presentation handouts with the room instantly."
        games={assessments}
        accentClassName="border-[#FF3B30]"
      />

      <ToolGroup
        title="Gamified games and puzzles"
        description="Increase engagement with path matching, image target hunting, and visual jigsaw quests."
        games={challenges}
        accentClassName="border-[#4F46E5]"
        className="mt-14 md:mt-16"
      />
    </LandingSection>
  );
}

function ToolGroup({
  title,
  description,
  games,
  accentClassName,
  className,
}: {
  title: string;
  description: string;
  games: GameCard[];
  accentClassName: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className={cn("mb-7 border-l-4 pl-4", accentClassName)}>
        <h3 className="font-display text-xl font-bold text-[#111111] md:text-2xl">{title}</h3>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#5F6368]">{description}</p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
        className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {games.map((game) => (
          <motion.div key={game.id} variants={itemVariants} className="h-full">
            <GameModeCard game={game} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

function GameModeCard({ game }: { game: GameCard }) {
  const Icon = game.icon;

  return (
    <a
      href={game.href}
      className="group flex h-full w-full flex-col justify-between overflow-hidden rounded-[20px] border border-[#E7E9ED] bg-white text-left shadow-[0_1px_3px_rgba(16,24,40,0.04)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#D9DDE3] hover:shadow-[0_12px_28px_rgba(16,24,40,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3B30] focus-visible:ring-offset-2"
    >
      <div>
        <div className="relative aspect-video w-full overflow-hidden border-b border-[#EEF0F3]">
          <img
            src={game.image}
            alt={game.imageAlt}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
          />
        </div>

        <div className="p-5">
          <div className="flex items-center gap-2">
            <span className={cn("grid size-9 place-items-center rounded-xl", game.tint)}>
              <Icon className={cn("size-4", game.accent)} />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-[#7A7F87]">
              {game.tag}
            </span>
          </div>

          <h3 className="mt-4 font-display text-lg font-bold text-[#111111] transition-colors group-hover:text-[#FF3B30]">
            {game.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#5F6368]">{game.copy}</p>
          <p className="mt-3 text-xs font-semibold text-[#7A7F87]">{game.meta}</p>
        </div>
      </div>

      <div className="flex min-h-12 items-center justify-between border-t border-[#EEF0F3] px-5 py-3 text-sm font-bold text-[#111111]">
        <span>{game.cta}</span>
        <ArrowRight className="size-4 text-[#FF3B30] transition-transform group-hover:translate-x-1" />
      </div>
    </a>
  );
}
