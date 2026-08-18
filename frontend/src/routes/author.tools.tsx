import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Blocks,
  CircleDot,
  Crosshair,
  Plus,
  QrCode,
  Radio,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";

import simpleQuizPollsArt from "@/assets/tool-simple-quiz-polls.webp";
import connectDotsArt from "@/assets/tool-connect-dots.webp";
import jigsawMissionArt from "@/assets/tool-jigsaw-mission.webp";
import pollsSurveyArt from "@/assets/tool-polls-survey.webp";
import quizBattleArt from "@/assets/tool-quiz-battle.webp";
import resourceDropArt from "@/assets/tool-resource-drop.webp";
import { AuthorShell } from "@/components/layout/AuthorShell";
import { Button } from "@/components/ui/button";
import type { CoreLiveGameMode } from "@/lib/game/session-flow";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/author/tools")({
  head: () => ({
    meta: [
      { title: "Tools - GamiBar" },
      {
        name: "description",
        content:
          "Browse GamiBar tools for simple quizzes, polls, gamified quiz experiences, and QR-based file sharing.",
      },
    ],
  }),
  component: ToolsPage,
});

type PlayableTool = {
  mode: CoreLiveGameMode;
  title: string;
  status: string;
  copy: string;
  icon: LucideIcon;
  image: string;
  accent: string;
  soft: string;
  chips: string[];
};

type ComingSoonTool = {
  title: string;
  status: "Coming soon";
  copy: string;
  icon: LucideIcon;
  image: string;
  chips: readonly string[];
};

const quizBattleTool = {
  mode: "quiz" as const,
  title: "Quiz Battle",
  status: "Available",
  copy: "Live MCQs with rankings.",
  icon: Zap,
  image: quizBattleArt,
  accent: "bg-[var(--game-quiz)]",
  soft: "bg-[var(--game-quiz-soft)] text-[var(--game-quiz-deep)]",
  chips: ["MCQs", "Leaderboard", "QR"],
} satisfies PlayableTool;

const pollsTool = {
  mode: "polls" as const,
  title: "Polls",
  status: "Available",
  copy: "Votes, ratings, surveys.",
  icon: Radio,
  image: pollsSurveyArt,
  accent: "bg-orange-500",
  soft: "bg-orange-100 text-orange-800",
  chips: ["Rating", "Survey", "Live"],
} satisfies PlayableTool;

const moreQuickChecksTool = {
  title: "More checks",
  status: "Coming soon",
  copy: "Warmups, exits, and quick rounds.",
  icon: Sparkles,
  image: simpleQuizPollsArt,
  chips: ["Warmups", "Exit tickets"],
} as const satisfies ComingSoonTool;

const gamifiedTools = [
  {
    mode: "jigsaw" as const,
    title: "Jigsaw Mission",
    status: "Available",
    copy: "Answer to unlock puzzle pieces.",
    icon: Blocks,
    image: jigsawMissionArt,
    accent: "bg-[var(--game-jigsaw)]",
    soft: "bg-[var(--game-jigsaw-soft)] text-[var(--game-jigsaw-deep)]",
    chips: ["Image puzzle", "Question unlocks", "Timer"],
  },
  {
    mode: "connect_dots" as const,
    title: "Connect Dots",
    status: "Available",
    copy: "Match questions to answers.",
    icon: CircleDot,
    image: connectDotsArt,
    accent: "bg-[var(--game-connect-dots)]",
    soft: "bg-[var(--game-connect-dots-soft)] text-[var(--game-connect-dots-deep)]",
    chips: ["Matching pairs", "Shared board", "Timer"],
  },
  {
    mode: "visual_point" as const,
    title: "Target Hunt",
    status: "Available",
    copy: "Ask learners to hunt for targets on images.",
    icon: Crosshair,
    image: jigsawMissionArt,
    accent: "bg-[var(--game-visual-point)]",
    soft: "bg-[var(--game-visual-point-soft)] text-[var(--game-visual-point-deep)]",
    chips: ["Images", "Hidden labels", "Target selection"],
  },
] satisfies PlayableTool[];

const moreGamifiedTool = {
  title: "More games",
  status: "Coming soon",
  copy: "More playful quiz formats.",
  icon: Sparkles,
  image: jigsawMissionArt,
  chips: ["Teams", "Challenges"],
} as const satisfies ComingSoonTool;

function ToolsPage() {
  return (
    <AuthorShell>
      <div className="mx-auto grid w-full max-w-5xl gap-4 py-1 sm:gap-5 sm:py-3">
        <header className="grid gap-3 border-b border-[var(--gamibar-border)] pb-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--gamibar-brand-soft)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--gamibar-brand)]">
              <Sparkles className="size-3.5" />
              No more boring classrooms, no more boring sessions
            </span>
            <h1 className="mt-3 max-w-3xl font-display text-2xl font-extrabold leading-tight tracking-tight text-[var(--foreground)] sm:text-3xl">
              Tools
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--muted-foreground)]">
              Pick a tool. Share a QR. Run the room.
            </p>
          </div>
          <div className="grid gap-2 min-[430px]:grid-cols-2 lg:w-[21rem]">
            <Button
              asChild
              className="h-10 rounded-lg bg-[#111111] text-sm font-semibold text-white hover:bg-black"
            >
              <Link to="/author/create">
                <Plus className="size-4" />
                Create room
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-10 rounded-lg border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--gamibar-page)]"
            >
              <Link to="/author/sessions">
                <QrCode className="size-4" />
                My sessions
              </Link>
            </Button>
          </div>
        </header>

        <ToolSection
          eyebrow="Quick checks"
          title="Simple Quiz and Polls"
          copy="Fast checks, ratings, and live feedback."
        >
          <div className="grid gap-3 min-[520px]:grid-cols-2 lg:grid-cols-3">
            <GameToolCard tool={quizBattleTool} index={0} />
            <GameToolCard tool={pollsTool} index={1} />
            <ComingSoonCard tool={moreQuickChecksTool} index={3} />
          </div>
        </ToolSection>

        <ToolSection
          eyebrow="Playable now"
          title="Quizzes with gamified experiences"
          copy="Visual games for puzzles and matching."
        >
          <div className="grid gap-3 min-[520px]:grid-cols-2 lg:grid-cols-3">
            {gamifiedTools.map((tool, index) => (
              <GameToolCard key={tool.mode} tool={tool} index={index} />
            ))}
            <ComingSoonCard tool={moreGamifiedTool} index={3} />
          </div>
        </ToolSection>

        <ToolSection
          eyebrow="File sharing"
          title="Share files with your audience"
          copy="Upload files. Share one QR. Auto-expire them."
        >
          <ResourceDropCard />
        </ToolSection>
      </div>
    </AuthorShell>
  );
}

function ToolSection({
  eyebrow,
  title,
  copy,
  children,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3.5 border-b border-[var(--gamibar-border)] pb-5 last:border-b-0 last:pb-0">
      <SectionHeader eyebrow={eyebrow} title={title} copy={copy} />
      {children}
    </section>
  );
}

function SectionHeader({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="grid max-w-2xl gap-1">
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--gamibar-brand)]">
          {eyebrow}
        </p>
        <h2 className="mt-0.5 font-display text-lg font-bold tracking-tight text-[var(--foreground)] sm:text-xl">
          {title}
        </h2>
      </div>
      <p className="max-w-sm text-xs leading-relaxed text-[var(--muted-foreground)]">{copy}</p>
    </div>
  );
}

function ComingSoonCard({ tool, index }: { tool: ComingSoonTool; index: number }) {
  const Icon = tool.icon;

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 + index * 0.05 }}
      className="overflow-hidden rounded-lg border border-dashed border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] shadow-[var(--shadow-soft)]"
    >
      <div className="relative aspect-video overflow-hidden bg-[var(--gamibar-page)]">
        <FittedToolImage src={tool.image} alt="" className="opacity-75 saturate-[0.9]" />
        <div className="absolute inset-0 bg-white/18 dark:bg-black/25" aria-hidden />
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#525252] shadow-sm backdrop-blur-sm dark:bg-black/65 dark:text-white/80">
          <Icon className="size-3.5" />
          {tool.status}
        </span>
      </div>
      <div className="grid gap-1.5 p-2.5">
        <div>
          <h3 className="font-display text-sm font-bold text-[var(--foreground)]">{tool.title}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted-foreground)]">
            {tool.copy}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {tool.chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-[var(--gamibar-page)] px-2 py-0.5 text-[10px] font-semibold text-[var(--gamibar-text-tertiary)]"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    </motion.article>
  );
}

function GameToolCard({ tool, index }: { tool: PlayableTool; index: number }) {
  const Icon = tool.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.05 }}
      className="h-full"
    >
      <Link
        to="/author/create"
        search={{ mode: tool.mode }}
        className="group block h-full overflow-hidden rounded-lg border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] shadow-[var(--shadow-soft)] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[var(--gamibar-brand)]/45 hover:shadow-[var(--shadow-lift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gamibar-brand)] focus-visible:ring-offset-2"
      >
        <div className="relative aspect-video overflow-hidden bg-[var(--gamibar-page)]">
          <FittedToolImage
            src={tool.image}
            alt=""
            className="transition-transform duration-300 group-hover:scale-[1.02]"
          />
          <span
            className={cn(
              "absolute left-2 top-2 grid size-8 place-items-center rounded-lg border border-white/75 shadow-sm backdrop-blur-sm",
              tool.soft,
            )}
          >
            <Icon className="size-4" />
          </span>
          <span className={cn("absolute inset-x-0 bottom-0 h-1", tool.accent)} aria-hidden />
        </div>
        <div className="grid gap-1.5 p-2.5">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-sm font-bold leading-tight text-[var(--foreground)]">
                {tool.title}
              </h3>
              <span className="shrink-0 rounded-full bg-[var(--gamibar-brand-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--gamibar-brand)]">
                {tool.status}
              </span>
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted-foreground)]">
              {tool.copy}
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            {tool.chips.map((chip) => (
              <span
                key={chip}
                className="rounded-full bg-[var(--gamibar-page)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted-foreground)]"
              >
                {chip}
              </span>
            ))}
          </div>
          <span className="inline-flex items-center text-xs font-bold text-[var(--foreground)]">
            Build
            <ArrowRight className="ml-1 size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function ResourceDropCard() {
  return (
    <Link
      to="/author/create"
      className="group grid overflow-hidden rounded-xl border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] shadow-[var(--shadow-soft)] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[var(--gamibar-brand)]/45 hover:shadow-[var(--shadow-lift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gamibar-brand)] focus-visible:ring-offset-2 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]"
    >
      <div className="relative aspect-video overflow-hidden bg-[var(--gamibar-page)] md:min-h-56">
        <FittedToolImage
          src={resourceDropArt}
          alt=""
          className="p-3 transition-transform duration-300 group-hover:scale-[1.02] sm:p-4"
        />
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#111111] shadow-sm backdrop-blur-sm dark:bg-black/65 dark:text-white">
          <QrCode className="size-3.5 text-[var(--gamibar-brand)]" />
          Resource Drop
        </span>
      </div>
      <div className="grid content-center gap-3 p-4 sm:p-5">
        <div>
          <h3 className="font-display text-xl font-black leading-tight text-[var(--foreground)]">
            Files by QR
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-[var(--muted-foreground)]">
            PPT, PDF, DOC. Auto-expiry.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["PDF", "PPTX", "DOCX", "7/14/28 days"].map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-[var(--gamibar-page)] px-2.5 py-1 text-[10px] font-bold text-[var(--muted-foreground)]"
            >
              {chip}
            </span>
          ))}
        </div>
        <span className="inline-flex items-center text-xs font-bold text-[var(--foreground)]">
          Upload
          <ArrowRight className="ml-1 size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function FittedToolImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <>
      <img
        src={src}
        alt=""
        aria-hidden
        className="absolute inset-0 size-full scale-110 object-cover opacity-25 blur-xl"
        loading="lazy"
      />
      <img
        src={src}
        alt={alt}
        className={cn("relative z-10 size-full object-contain p-2", className)}
        loading="lazy"
      />
    </>
  );
}
