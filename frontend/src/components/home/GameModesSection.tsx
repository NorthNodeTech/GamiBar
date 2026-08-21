import { Link } from "@/lib/navigation";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

import { LandingSection } from "@/components/home/ViewportSection";
import { MobileCarousel } from "@/components/ui/MobileCarousel";
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
      className="flex min-h-[100svh] flex-col justify-center bg-[#FAFAFA] !py-10 md:!py-24"
    >
      <div className="mx-auto mb-6 max-w-3xl text-center md:mb-12">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#FF3B30] sm:text-[11px]">
          {HOMEPAGE_GAME_MODES_SECTION.eyebrow}
        </span>
        <h2 className="mt-2 font-display text-[clamp(1.35rem,3.4vw,2.4rem)] font-black leading-tight text-[#111111]">
          {HOMEPAGE_GAME_MODES_SECTION.title}
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-[#5F6368]">
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
        className="mt-8 md:mt-12"
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
      <div className={cn("mb-3.5 border-l-4 pl-3 md:mb-5 md:pl-3.5", accentClassName)}>
        <h3 className="font-display text-sm font-bold text-[#111111] md:text-lg">{title}</h3>
        <p className="mt-0.5 max-w-2xl text-[11px] sm:text-[13px] leading-relaxed text-[#5F6368]">
          {description}
        </p>
      </div>

      {/* Mobile Touch Carousel with Autoplay & Buttons (< md) */}
      <div className="block md:hidden">
        <MobileCarousel autoPlay={true} autoPlayInterval={4000}>
          {games.map((game) => (
            <article
              key={game.title}
              className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[18px] border border-[#CBD5E1] bg-white shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
            >
              <div>
                <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-[#CBD5E1] bg-[#F4F5F7]">
                  <img
                    src={game.image}
                    alt={game.imageAlt}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover"
                  />
                </div>

                <div className="p-3.5">
                  <span className="inline-flex rounded-full border border-[#D1D5DB] bg-[#F4F5F7] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#4A5568]">
                    {game.tag}
                  </span>
                  <h4 className="mt-1.5 font-display text-sm font-bold text-[#111111]">
                    {game.title}
                  </h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#5F6368]">{game.copy}</p>
                </div>
              </div>

              <div className="p-3.5 pt-0">
                <Link
                  to={game.href}
                  className="inline-flex items-center rounded-lg border border-[#CBD5E1] bg-[#FAFAFA] px-3 py-1.5 text-xs font-bold text-[#FF3B30] transition-colors hover:border-[#FF3B30] hover:bg-[#FFF5F5]"
                >
                  {game.cta}
                  <ArrowRight className="ml-1 size-3" />
                </Link>
              </div>
            </article>
          ))}
        </MobileCarousel>
      </div>

      {/* Desktop Multi-column Grid (>= md) with Darker Crisp Borders */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
        className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 items-stretch gap-5"
      >
        {games.map((game) => (
          <motion.div key={game.title} variants={itemVariants} className="flex h-full">
            <article className="group flex h-full w-full flex-col justify-between overflow-hidden rounded-[20px] border border-[#CBD5E1] bg-white shadow-[0_2px_6px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#94A3B8] hover:shadow-[0_18px_36px_rgba(16,24,40,0.09)]">
              <div>
                <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-[#CBD5E1] bg-[#F4F5F7]">
                  <img
                    src={game.image}
                    alt={game.imageAlt}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                <div className="p-4 sm:p-5">
                  <span className="inline-flex rounded-full border border-[#D1D5DB] bg-[#F4F5F7] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#4A5568]">
                    {game.tag}
                  </span>
                  <h4 className="mt-2 font-display text-sm font-bold text-[#111111] transition-colors group-hover:text-[#FF3B30] sm:text-base">
                    {game.title}
                  </h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#5F6368]">{game.copy}</p>
                </div>
              </div>

              <div className="p-4 pt-0 sm:p-5 sm:pt-0">
                <Link
                  to={game.href}
                  className="inline-flex items-center rounded-lg border border-[#CBD5E1] bg-[#FAFAFA] px-3.5 py-1.5 text-xs font-bold text-[#FF3B30] transition-colors hover:border-[#FF3B30] hover:bg-[#FFF5F5]"
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
