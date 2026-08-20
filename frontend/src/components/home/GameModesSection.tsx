import { useMemo } from "react";
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
const games: GameCard[] = HOMEPAGE_TOOL_WALL;

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
  const assessments = useMemo(() => games.filter(g => ["quiz", "polls", "resource_drop"].includes(g.id)), []);
  const challenges = useMemo(() => games.filter(g => ["jigsaw", "connect_dots", "visual_point"].includes(g.id)), []);

  return (
    <LandingSection id="games" width="7xl" className="bg-[#FAFAFA] min-h-screen flex flex-col justify-center !py-16 md:!py-24">
      {/* Main Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
        <span className="text-xs font-bold uppercase tracking-widest text-[#FF3B30]">
          {HOMEPAGE_GAME_MODES_SECTION.eyebrow}
        </span>
        <h2 className="mt-4 font-display text-[clamp(2.2rem,5vw,3.4rem)] font-black leading-tight text-[#111111]">
          {HOMEPAGE_GAME_MODES_SECTION.title}
        </h2>
        <p className="mt-4 text-sm sm:text-base text-[#5F6368] leading-relaxed">
          {HOMEPAGE_GAME_MODES_SECTION.description}
        </p>
      </div>

      {/* Subsection 1: Quizzes, Polls & Document Sharing */}
      <div className="mb-16 md:mb-20">
        <div className="border-l-4 border-[#FF3B30] pl-4 mb-8">
          <h3 className="font-display text-xl md:text-2xl font-bold text-[#111111]">
            Live assessment & feedback
          </h3>
          <p className="mt-1 text-sm text-[#5F6368]">
            Test knowledge, collect votes, and share presentation handouts with the room instantly.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch"
        >
          {assessments.map((game) => (
            <motion.div
              key={game.id}
              variants={itemVariants}
              className="h-full"
            >
              <GameModeCard game={game} />
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Subsection 2: Interactive Games & Puzzle Challenges */}
      <div>
        <div className="border-l-4 border-indigo-500 pl-4 mb-8">
          <h3 className="font-display text-xl md:text-2xl font-bold text-[#111111]">
            Gamified games & puzzles
          </h3>
          <p className="mt-1 text-sm text-[#5F6368]">
            Increase engagement with path-matching, image target hunting, and collaborative jigsaw quests.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch"
        >
          {challenges.map((game) => (
            <motion.div
              key={game.id}
              variants={itemVariants}
              className="h-full"
            >
              <GameModeCard game={game} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </LandingSection>
  );
}

function GameModeCard({ game }: { game: GameCard }) {
  return (
    <a
      href={game.href}
      className="group flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl border border-[#E7E9ED] bg-white text-left shadow-[0_1px_3px_rgba(16,24,40,0.04)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#D9DDE3] hover:shadow-[0_12px_28px_rgba(16,24,40,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3B30] focus-visible:ring-offset-2"
    >
      <div className="w-full">
        {/* Tool Thumbnail (Edge-to-Edge) */}
        <div className="relative aspect-video w-full overflow-hidden border-b border-[#EEF0F3]">
          <img
            src={game.image}
            alt={game.imageAlt}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
          />
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5">
          <h3 className="font-display text-lg font-bold text-[#111111] transition-colors group-hover:text-[#FF3B30]">
            {game.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#5F6368]">
            {game.copy}
          </p>
        </div>
      </div>
    </a>
  );
}
