import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Blocks,
  CircleDot,
  ClipboardList,
  Crosshair,
  Gamepad2,
  Plus,
  QrCode,
  Radio,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import connectDotsArt from "@/assets/tool-connect-dots.webp";
import jigsawMissionArt from "@/assets/tool-jigsaw-mission.webp";
import pollsSurveyArt from "@/assets/tool-polls-survey.webp";
import quizBattleArt from "@/assets/tool-quiz-battle.webp";
import resourceDropArt from "@/assets/tool-resource-drop.webp";
import targetHuntArt from "@/assets/tool-target-hunt.webp";
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
          "Browse GamiBar tools for quizzes, polls, gamified experiences, Target Hunt image challenges, and QR-based file sharing.",
      },
    ],
  }),
  component: ToolsPage,
});

type ToolCardData = {
  mode: CoreLiveGameMode;
  title: string;
  description: string;
  tags: string[];
  image: string;
  imageAlt: string;
  icon: LucideIcon;
};

const quickCheckTools: ToolCardData[] = [
  {
    mode: "quiz",
    title: "Quiz Battle",
    description: "Turn MCQs into a live classroom challenge with instant results and rankings.",
    tags: ["MCQs", "Live rankings", "Instant results", "QR join"],
    image: quizBattleArt,
    imageAlt: "Quiz Battle interactive classroom",
    icon: ClipboardList,
  },
  {
    mode: "polls",
    title: "Polls",
    description: "Ask the room, collect responses instantly, and see what everyone thinks.",
    tags: ["Live voting", "Ratings", "Surveys", "Instant results"],
    image: pollsSurveyArt,
    imageAlt: "Polls live feedback activity",
    icon: Radio,
  },
];

const playableGameTools: ToolCardData[] = [
  {
    mode: "jigsaw",
    title: "Jigsaw Mission",
    description:
      "Answer questions, unlock puzzle pieces, and rebuild the image before time runs out.",
    tags: ["Image puzzle", "Question unlocks", "Timer"],
    image: jigsawMissionArt,
    imageAlt: "Jigsaw Mission puzzle activity",
    icon: Blocks,
  },
  {
    mode: "connect_dots",
    title: "Connect Dots",
    description:
      "Match concepts to the right answers by drawing the correct connections before time runs out.",
    tags: ["Matching", "Shared board", "Timer"],
    image: connectDotsArt,
    imageAlt: "Connect Dots matching game",
    icon: CircleDot,
  },
  {
    mode: "visual_point",
    title: "Target Hunt",
    description:
      "Turn images and maps into a challenge by asking players to find the correct target.",
    tags: ["Images", "Hidden targets", "Target selection"],
    image: targetHuntArt,
    imageAlt: "Target Hunt image challenge",
    icon: Crosshair,
  },
];

const fileSharingTags = ["PDF", "PPT", "PPTX", "DOC", "DOCX", "7/14/28 days"];

function ToolsPage() {
  return (
    <AuthorShell>
      <div className="mx-auto w-full max-w-[72rem] py-3 text-[#111111] sm:py-5">
        <header className="grid gap-5 border-b border-[#E7E9ED] pb-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase text-[#FF3B30]">
              No more boring classrooms, no more boring sessions
            </p>
            <h1 className="mt-3 font-display text-[2rem] font-bold leading-tight text-[#111111] sm:text-[2.5rem]">
              Tools
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-6 text-[#5F6368]">
              Everything you need to make your next session interactive.
            </p>
          </div>

          <div className="grid gap-2 min-[430px]:grid-cols-2 lg:w-[21rem]">
            <Button
              asChild
              className="h-12 rounded-xl bg-[#111111] px-5 text-sm font-semibold text-white shadow-none hover:bg-[#2A2A2A]"
            >
              <Link to="/author/create">
                <Plus className="size-4" />
                Create room
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-xl border-[#D9DDE3] bg-white px-5 text-sm font-semibold text-[#111111] shadow-none hover:bg-[#F3F4F6]"
            >
              <Link to="/author/sessions">
                <QrCode className="size-4" />
                My sessions
              </Link>
            </Button>
          </div>
        </header>

        <div className="space-y-14 pt-10">
          <ToolSection
            eyebrow="Quick checks"
            title="Simple Quiz and Polls"
            description="Fast ways to check understanding, collect opinions, and get instant feedback."
          >
            <div className="grid auto-rows-fr gap-4 md:grid-cols-2">
              {quickCheckTools.map((tool, index) => (
                <ToolCard key={tool.mode} tool={tool} index={index} />
              ))}
            </div>
          </ToolSection>

          <ToolSection
            eyebrow="Playable now"
            title="Quizzes with gamified experiences"
            description="Turn questions into interactive challenges that get people thinking, matching, and competing."
          >
            <div className="grid auto-rows-fr gap-4 md:grid-cols-2 lg:grid-cols-3">
              {playableGameTools.map((tool, index) => (
                <ToolCard key={tool.mode} tool={tool} index={index} compact />
              ))}
            </div>
            <MoreGamesBanner />
          </ToolSection>

          <ToolSection
            eyebrow="File sharing"
            title="Share files with your audience"
            description="Upload once. Share one QR. Let everyone download instantly."
          >
            <FilesByQrCard />
          </ToolSection>
        </div>
      </div>
    </AuthorShell>
  );
}

function ToolSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} />
      {children}
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-[11px] font-bold uppercase text-[#FF3B30]">{eyebrow}</p>
      <h2 className="mt-1 font-display text-[1.55rem] font-bold leading-tight text-[#111111] sm:text-[1.75rem]">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#5F6368]">{description}</p>
    </div>
  );
}

function ToolCard({
  tool,
  index,
  compact = false,
}: {
  tool: ToolCardData;
  index: number;
  compact?: boolean;
}) {
  const Icon = tool.icon;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 + index * 0.04, duration: 0.18 }}
      className="h-full"
    >
      <Link
        to="/author/create"
        search={{ mode: tool.mode }}
        aria-label={`Build ${tool.title}`}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#E7E9ED] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D9DDE3] hover:shadow-[0_8px_22px_rgba(16,24,40,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3B30] focus-visible:ring-offset-2"
      >
        <ToolImage
          src={tool.image}
          alt={tool.imageAlt}
          icon={Icon}
          className={compact ? "aspect-video" : "aspect-[16/8.6]"}
        />

        <div className="flex min-h-[14.25rem] flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#F6F7F9] text-[#111111]">
                <Icon className="size-4" aria-hidden />
              </span>
              <h3 className="font-display text-[1.08rem] font-bold leading-tight text-[#111111]">
                {tool.title}
              </h3>
            </div>
            <AvailabilityBadge />
          </div>

          <p className="mt-3 text-sm leading-6 text-[#5F6368]">{tool.description}</p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {tool.tags.map((tag) => (
              <FeatureTag key={tag}>{tag}</FeatureTag>
            ))}
          </div>

          <span className="mt-auto inline-flex items-center pt-5 text-sm font-bold text-[#111111] transition-colors group-hover:text-[#FF3B30]">
            Build
            <ArrowRight className="ml-1 size-4 transition-transform duration-200 group-hover:translate-x-1" />
          </span>
        </div>
      </Link>
    </motion.article>
  );
}

function MoreGamesBanner() {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-[#D9DDE3] bg-white px-5 py-6 shadow-[0_1px_3px_rgba(16,24,40,0.04)] sm:flex sm:items-center sm:justify-between sm:gap-6 sm:px-6">
      <div className="flex min-w-0 gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#FFF1F0] text-[#FF3B30]">
          <Gamepad2 className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase text-[#FF3B30]">More games are coming</p>
          <h3 className="mt-1 font-display text-lg font-bold text-[#111111]">
            New interactive formats are on the way.
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#5F6368]">
            GamiBAR is being built so future games can join this catalog without changing the way
            hosts start a room.
          </p>
        </div>
      </div>
      <span className="mt-4 inline-flex items-center text-sm font-bold text-[#111111] sm:mt-0">
        More games coming soon
        <ArrowRight className="ml-1 size-4" aria-hidden />
      </span>
    </div>
  );
}

function FilesByQrCard() {
  return (
    <Link
      to="/author/create"
      aria-label="Create Files by QR share"
      className="group grid overflow-hidden rounded-[18px] border border-[#E7E9ED] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D9DDE3] hover:shadow-[0_10px_28px_rgba(16,24,40,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3B30] focus-visible:ring-offset-2 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]"
    >
      <ToolImage
        src={resourceDropArt}
        alt="Files by QR file sharing"
        icon={QrCode}
        fit="contain"
        className="aspect-[4/3] bg-[#F6F7F9] p-3 sm:p-5 lg:min-h-[22rem]"
      />

      <div className="flex flex-col justify-center p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF1F0] px-2.5 py-1 text-[11px] font-bold uppercase text-[#FF3B30]">
            <Upload className="size-3.5" aria-hidden />
            Resource Drop
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF6FF] px-2.5 py-1 text-[11px] font-bold uppercase text-[#2563EB]">
            <QrCode className="size-3.5" aria-hidden />
            One QR
          </span>
        </div>

        <h3 className="mt-4 font-display text-[1.8rem] font-bold leading-tight text-[#111111]">
          Files by QR
        </h3>
        <p className="mt-3 text-[15px] leading-7 text-[#5F6368]">
          Upload your presentation once, share one QR, and let the entire room download it
          instantly.
        </p>

        <p className="mt-4 text-xs font-bold uppercase text-[#111111]">
          One upload. One QR. Instant download.
        </p>

        <div className="mt-5 flex flex-wrap gap-1.5">
          {fileSharingTags.map((tag) => (
            <FeatureTag key={tag}>{tag}</FeatureTag>
          ))}
        </div>

        <span className="mt-7 inline-flex items-center text-sm font-bold text-[#111111] transition-colors group-hover:text-[#FF3B30]">
          Upload
          <ArrowRight className="ml-1 size-4 transition-transform duration-200 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

function AvailabilityBadge() {
  return (
    <span className="shrink-0 rounded-full bg-[#FFF1F0] px-2.5 py-1 text-[11px] font-bold uppercase text-[#FF3B30]">
      Available
    </span>
  );
}

function FeatureTag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-[#F6F7F9] px-2.5 py-1 text-xs font-semibold text-[#5F6368]">
      {children}
    </span>
  );
}

function ToolImage({
  src,
  alt,
  icon: Icon,
  fit = "cover",
  className,
}: {
  src: string;
  alt: string;
  icon: LucideIcon;
  fit?: "cover" | "contain";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={cn("relative shrink-0 overflow-hidden bg-[#F1F3F5]", className)}
      role={failed ? "img" : undefined}
      aria-label={failed ? alt : undefined}
    >
      {failed ? (
        <div className="absolute inset-0 grid place-items-center text-[#5F6368]">
          <Icon className="size-8" aria-hidden />
        </div>
      ) : (
        <>
          {fit === "contain" ? (
            <img
              src={src}
              alt=""
              aria-hidden
              className="absolute inset-0 size-full scale-110 object-cover opacity-20 blur-xl"
              loading="lazy"
            />
          ) : null}
          <img
            src={src}
            alt={alt}
            className={cn(
              "relative z-10 size-full transition-transform duration-200 group-hover:scale-[1.02]",
              fit === "cover" ? "object-cover" : "object-contain",
            )}
            loading="lazy"
            onError={() => setFailed(true)}
          />
        </>
      )}
    </div>
  );
}
