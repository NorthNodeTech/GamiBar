import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Blocks,
  CircleDot,
  ClipboardList,
  FileText,
  Gamepad2,
  Plus,
  QrCode,
  Radio,
  ScanLine,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";

import gameConnectDotsPreview from "@/assets/game-connect-dots-preview.png";
import gameJigsawPreview from "@/assets/game-jigsaw-preview.webp";
import gameQuizPreview from "@/assets/game-quiz-preview.webp";
import { AuthorShell } from "@/components/layout/AuthorShell";
import { Button } from "@/components/ui/button";
import type { GameMode } from "@/lib/game/config";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/author/")({
  head: () => ({
    meta: [
      { title: "Teacher Workspace - GamiBar" },
      {
        name: "description",
        content:
          "Create classroom activities, live sessions, resource drops, and reports from one GamiBar teacher workspace.",
      },
    ],
  }),
  component: AuthorHome,
});

const startTools = [
  {
    title: "Normal Quiz",
    copy: "Fast MCQ checks, revision rounds, and leaderboard-based recaps.",
    icon: ClipboardList,
    status: "Ready",
    action: "Create quiz",
    mode: "quiz" as const,
    tint: "bg-[var(--game-quiz-soft)] text-[var(--game-quiz)]",
  },
  {
    title: "Interactive Games",
    copy: "Use Jigsaw Mission or Connect Dots when the session needs movement and focus.",
    icon: Gamepad2,
    status: "Ready",
    action: "Choose game",
    mode: "jigsaw" as const,
    tint: "bg-[var(--game-jigsaw-soft)] text-[var(--game-jigsaw)]",
  },
  {
    title: "Resource Drop",
    copy: "Upload handouts once, choose 7, 14, or 28 days, and share one QR.",
    icon: QrCode,
    status: "New",
    action: "Attach files",
    to: "/author/create",
    tint: "bg-[var(--game-connect-dots-soft)] text-[var(--game-connect-dots-deep)]",
  },
  {
    title: "Polls",
    copy: "Quick pulse checks and opinion questions belong here next.",
    icon: Radio,
    status: "Planned",
    action: "Coming next",
    disabled: true,
    tint: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  },
] as const;

const gameModes = [
  {
    mode: "quiz" as const,
    title: "Quiz Challenge",
    copy: "Multiple-choice rounds with accuracy-first ranking and live room control.",
    icon: Zap,
    preview: gameQuizPreview,
    ring: "hover:border-[var(--game-quiz)]",
    iconTint: "bg-[var(--game-quiz-soft)] text-[var(--game-quiz)]",
  },
  {
    mode: "jigsaw" as const,
    title: "Jigsaw Mission",
    copy: "Unlock puzzle pieces through questions, then rebuild the image together.",
    icon: Blocks,
    preview: gameJigsawPreview,
    ring: "hover:border-[var(--game-jigsaw)]",
    iconTint: "bg-[var(--game-jigsaw-soft)] text-[var(--game-jigsaw)]",
  },
  {
    mode: "connect_dots" as const,
    title: "Connect Dots",
    copy: "Match concepts and draw correct paths before the timer runs out.",
    icon: CircleDot,
    preview: gameConnectDotsPreview,
    ring: "hover:border-[var(--game-connect-dots)]",
    iconTint: "bg-[var(--game-connect-dots-soft)] text-[var(--game-connect-dots)]",
  },
] as const;

const opsLinks = [
  {
    to: "/author/sessions",
    title: "Live sessions",
    copy: "Open active rooms, duplicate past sessions, or review summaries.",
    icon: Radio,
  },
  {
    to: "/author/reports",
    title: "Reports",
    copy: "Participation and performance insights for post-session follow-up.",
    icon: BarChart3,
  },
  {
    to: "/join",
    title: "Student join",
    copy: "Open the join flow for testing QR and room-code entry.",
    icon: ScanLine,
  },
] as const;

function AuthorHome() {
  const navigate = useNavigate();

  const openCreateWithMode = (mode: GameMode) => {
    navigate({ to: "/author/create", search: { mode } });
  };

  return (
    <AuthorShell>
      <div className="mx-auto grid w-full max-w-6xl gap-7 py-3 sm:py-5">
        <section className="author-card overflow-hidden p-0">
          <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--gamibar-brand-soft)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--gamibar-brand)]">
                <Sparkles className="size-3.5" />
                No more boring classrooms, no more boring sessions
              </span>
              <h1 className="mt-4 max-w-3xl font-display text-2xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-3xl">
                Teacher workspace
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted-foreground)]">
                Start activities, share documents by QR, manage live rooms, and keep every classroom
                session in one place.
              </p>
            </div>
            <div className="grid gap-2 min-[420px]:grid-cols-2 lg:w-[22rem]">
              <Button
                type="button"
                onClick={() => navigate({ to: "/author/create" })}
                className="h-11 rounded-xl bg-[#111111] font-semibold text-white hover:bg-black"
              >
                <Plus className="size-4" />
                Create session
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: "/join" })}
                className="h-11 rounded-xl border-[var(--gamibar-border)] bg-white font-semibold text-[#111111] hover:bg-[var(--gamibar-page)]"
              >
                <ScanLine className="size-4" />
                Join test
              </Button>
            </div>
          </div>
        </section>

        <section>
          <SectionTitle
            eyebrow="Start from a tool"
            title="What do you want to run?"
            copy="GamiBar is structured as a toolkit. Games are one category, not the whole product."
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {startTools.map((tool, index) => (
              <ToolCard
                key={tool.title}
                tool={tool}
                index={index}
                onMode={(mode) => openCreateWithMode(mode)}
              />
            ))}
          </div>
        </section>

        <section>
          <SectionTitle
            eyebrow="Current activities"
            title="Live game modes"
            copy="These are the first playable activities. The structure now supports more tools and categories around them."
          />
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {gameModes.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.mode}
                  type="button"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.05 }}
                  onClick={() => openCreateWithMode(item.mode)}
                  className={cn(
                    "group overflow-hidden rounded-[20px] border border-[var(--gamibar-border)] bg-white text-left shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]",
                    item.ring,
                  )}
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-[var(--gamibar-page)]">
                    <img
                      src={item.preview}
                      alt=""
                      className="size-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    <span
                      className={cn(
                        "absolute left-3 top-3 grid size-9 place-items-center rounded-xl shadow-sm",
                        item.iconTint,
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="font-display text-base font-bold text-[#111111]">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#737373]">{item.copy}</p>
                    <span className="mt-3 inline-flex items-center text-xs font-semibold text-[#111111]">
                      Set up activity
                      <ArrowRight className="ml-1 size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>

        <section>
          <SectionTitle
            eyebrow="Session operations"
            title="Manage what happens around the activity"
            copy="Live rooms, reports, and student entry are separated from creation so repeat work is easier to scan."
          />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {opsLinks.map((item) => (
              <OperationLink key={item.title} item={item} />
            ))}
          </div>
        </section>
      </div>
    </AuthorShell>
  );
}

function SectionTitle({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--gamibar-brand)]">
          {eyebrow}
        </p>
        <h2 className="mt-1 font-display text-xl font-bold text-[var(--foreground)] sm:text-2xl">
          {title}
        </h2>
      </div>
      <p className="max-w-xl text-sm leading-relaxed text-[var(--muted-foreground)]">{copy}</p>
    </div>
  );
}

function ToolCard({
  tool,
  index,
  onMode,
}: {
  tool: (typeof startTools)[number];
  index: number;
  onMode: (mode: GameMode) => void;
}) {
  const Icon = tool.icon;
  const disabled = "disabled" in tool && tool.disabled;

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={cn("grid size-10 place-items-center rounded-xl", tool.tint)}>
          <Icon className="size-5" />
        </span>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
            disabled
              ? "bg-[var(--gamibar-page)] text-[var(--gamibar-text-tertiary)]"
              : "bg-[var(--gamibar-brand-soft)] text-[var(--gamibar-brand)]",
          )}
        >
          {tool.status}
        </span>
      </div>
      <div className="mt-5">
        <h3 className="font-display text-base font-bold text-[var(--foreground)]">{tool.title}</h3>
        <p className="mt-2 min-h-[3.25rem] text-sm leading-relaxed text-[var(--muted-foreground)]">
          {tool.copy}
        </p>
      </div>
      <span
        className={cn(
          "mt-4 inline-flex items-center text-xs font-bold",
          disabled ? "text-[var(--gamibar-text-tertiary)]" : "text-[var(--foreground)]",
        )}
      >
        {tool.action}
        {!disabled ? <ArrowRight className="ml-1 size-3.5" /> : null}
      </span>
    </>
  );

  if (disabled) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 + index * 0.04 }}
        className="rounded-[20px] border border-dashed border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] p-4 opacity-85"
      >
        {content}
      </motion.div>
    );
  }

  if ("to" in tool) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 + index * 0.04 }}
      >
        <Link
          to={tool.to}
          className="block rounded-[20px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] p-4 text-left shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-[var(--gamibar-brand)]/35 hover:shadow-[var(--shadow-lift)]"
        >
          {content}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 + index * 0.04 }}
      onClick={() => ("mode" in tool ? onMode(tool.mode) : undefined)}
      className="rounded-[20px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] p-4 text-left shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-[var(--gamibar-brand)]/35 hover:shadow-[var(--shadow-lift)]"
    >
      {content}
    </motion.button>
  );
}

function OperationLink({
  item,
}: {
  item: { to: string; title: string; copy: string; icon: LucideIcon };
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className="group rounded-[20px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] p-4 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-[var(--gamibar-brand)]/35 hover:shadow-[var(--shadow-lift)]"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--gamibar-page)] text-[var(--foreground)]">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold text-[var(--foreground)]">
            {item.title}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-[var(--muted-foreground)]">{item.copy}</p>
          <span className="mt-3 inline-flex items-center text-xs font-bold text-[var(--foreground)]">
            Open
            <ArrowRight className="ml-1 size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
