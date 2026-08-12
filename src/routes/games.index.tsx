import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Blocks, CircleDot, Flame, Sparkles, Timer, Trophy, Zap } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/games/")({
  head: () => ({
    meta: [
      { title: "Games - GamiBar" },
      {
        name: "description",
        content: "Play Quiz Challenge, Jigsaw Mission and Connect Dots on GamiBar.",
      },
      { property: "og:title", content: "Games - GamiBar" },
      {
        name: "og:description",
        content: "Three gamified learning modes: timed quizzes, jigsaw missions and connect-the-dots puzzles.",
      },
    ],
  }),
  component: GamesIndex,
});

const games = [
  {
    to: "/games/quiz" as const,
    icon: Timer,
    name: "Quiz Challenge",
    tagline: "SPEED RUN",
    copy: "Timed multiple choice with combo streaks and instant feedback.",
    meta: "Flexible question count",
    xp: "400 XP",
    difficulty: "Medium",
    border: "hover:border-red-500/40",
    iconBg: "bg-red-500/10 text-red-600",
    btnClass: "bg-[#111111] hover:bg-black",
  },
  {
    to: "/games/jigsaw" as const,
    icon: Blocks,
    name: "Jigsaw Mission",
    tagline: "PUZZLE OPS",
    copy: "Unlock interlocking pieces with every correct answer until the image completes.",
    meta: "9 pieces",
    xp: "450 XP",
    difficulty: "Hard",
    border: "hover:border-blue-500/40",
    iconBg: "bg-blue-500/10 text-blue-600",
    btnClass: "bg-blue-600 hover:bg-blue-700",
  },
  {
    to: "/games/connect-dots" as const,
    icon: CircleDot,
    name: "Connect Dots",
    tagline: "PATH PUZZLE",
    copy: "Connect matching coloured dots and complete every path as fast as possible.",
    meta: "Same board for all",
    xp: "500 XP",
    difficulty: "Expert",
    border: "hover:border-emerald-500/40",
    iconBg: "bg-emerald-500/10 text-emerald-600",
    btnClass: "bg-emerald-600 hover:bg-emerald-700",
  },
] as const;

function GamesIndex() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(239,68,68,0.08),transparent)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 py-16">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-red-600">
            <Sparkles className="size-3.5" />
            Mission Select
          </div>
          <h1 className="mt-6 font-display text-4xl font-black tracking-tight sm:text-5xl">
            Choose Your{" "}
            <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              Game Mode
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Each mode is a completely different experience. Pick one and jump straight in.
          </p>
        </div>

        <div className="mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-6 rounded-2xl border border-border bg-white/80 px-8 py-4">
          {[
            { icon: Trophy, label: "3 Modes", value: "Available" },
            { icon: Zap, label: "Max Reward", value: "500 XP" },
            { icon: Flame, label: "Combo", value: "Streak Bonus" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <s.icon className="size-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="text-sm font-bold">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {games.map((g, i) => (
            <Reveal key={g.to} delay={i * 0.08}>
              <div
                className={cn(
                  "flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white transition-shadow hover:shadow-lg",
                  g.border,
                )}
              >
                <div
                  className={cn(
                    "h-1.5",
                    g.to === "/games/quiz" && "bg-red-500",
                    g.to === "/games/jigsaw" && "bg-blue-500",
                    g.to === "/games/connect-dots" && "bg-emerald-500",
                  )}
                />

                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-start justify-between">
                    <span className={cn("grid size-12 place-items-center rounded-xl", g.iconBg)}>
                      <g.icon className="size-5" />
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                      {g.tagline}
                    </span>
                  </div>

                  <h2 className="mt-5 text-xl font-bold">{g.name}</h2>
                  <p className="mt-2 flex-1 text-sm text-muted-foreground">{g.copy}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">{g.meta}</span>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold">{g.xp}</span>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">{g.difficulty}</span>
                  </div>

                  <Link
                    to={g.to}
                    className={cn(
                      "mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition-colors",
                      g.btnClass,
                    )}
                  >
                    Play {g.name.split(" ")[0]}
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
