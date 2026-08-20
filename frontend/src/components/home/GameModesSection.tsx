import { Link } from "@tanstack/react-router";
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
      <div className="mx-auto mb-10 max-w-3xl text-center md:mb-12">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#FF3B30]">
          {HOMEPAGE_GAME_MODES_SECTION.eyebrow}
        </span>
        <h2 className="mt-2.5 font-display text-[clamp(1.5rem,3.4vw,2.4rem)] font-black leading-tight text-[#111111]">
          {HOMEPAGE_GAME_MODES_SECTION.title}
        </h2>
        <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-[#5F6368]">
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
        className="mt-10 md:mt-12"
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
      <div className={cn("mb-5 border-l-4 pl-3.5", accentClassName)}>
        <h3 className="font-display text-base font-bold text-[#111111] md:text-lg">{title}</h3>
        <p className="mt-0.5 max-w-2xl text-xs sm:text-[13px] leading-relaxed text-[#5F6368]">{description}</p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
        className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3"
      >
        {games.map((game) => (
          <motion.div key={game.title} variants={itemVariants} className="flex h-full">
            <article className="group flex h-full w-full flex-col justify-between overflow-hidden rounded-[20px] border border-[#E7E9ED] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.04)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#D9DDE3] hover:shadow-[0_18px_36px_rgba(16,24,40,0.08)]">
              <div>
                {/* Edge-to-edge top thumbnail */}
                <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-[#EEF0F3] bg-[#F4F5F7]">
                  <img
                    src={game.image}
                    alt={game.imageAlt}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                {/* Card content below */}
                <div className="p-4 sm:p-5">
                  <span className="inline-flex rounded-full bg-[#F4F5F7] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#4A5568]">
                    {game.tag}
                  </span>
                  <h4 className="mt-2 font-display text-sm font-bold text-[#111111] transition-colors group-hover:text-[#FF3B30] sm:text-base">
                    {game.title}
                  </h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#5F6368]">
                    {game.copy}
                  </p>
                </div>
              </div>

              <div className="p-4 pt-0 sm:p-5 sm:pt-0">
                <Link
                  to={game.href}
                  className="inline-flex items-center text-xs font-bold text-[#FF3B30] transition-colors hover:text-[#E6332B]"
                >
                  {game.cta}
                  <ArrowRight className="ml-1 size-3 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </div>
            </article>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
