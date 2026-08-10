import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { getStoredAuth } from "@/lib/auth-store";
import { motion } from "framer-motion";
import { Award, Bell, Coins, Flame, Trophy, Zap } from "lucide-react";

import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { Reveal } from "@/components/ui/reveal";
import { levelFromXp, levelProgress, usePlayer } from "@/lib/player-store";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    const auth = getStoredAuth();
    if (!auth) throw redirect({ to: "/login" });
    if (auth.role !== "student") throw redirect({ to: "/author" });
  },
  head: () => ({
    meta: [
      { title: "Dashboard - GamiBar" },
      {
        name: "description",
        content: "Track XP, coins, level, streaks, achievements and weekly progress on GamiBar.",
      },
      { property: "og:title", content: "Dashboard - GamiBar" },
      { property: "og:description", content: "Your learning analytics at a glance." },
    ],
  }),
  component: Dashboard,
});

const week = [42, 68, 30, 88, 74, 96, 58];
const days = ["M", "T", "W", "T", "F", "S", "S"];

function Dashboard() {
  const { player } = usePlayer();
  const level = levelFromXp(player.xp);
  const progress = levelProgress(player.xp);
  const accuracy = player.answered ? Math.round((player.correct / player.answered) * 100) : 0;

  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${player.name.split(" ")[0]}`}
        subtitle="Your progress across every game mode, updated after each round."
        action={
          <Button asChild>
            <Link to="/games">Continue playing</Link>
          </Button>
        }
      />

      <div className="mt-10 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={Zap} label="XP" value={player.xp} delay={0} />
        <StatCard icon={Coins} label="Coins" value={player.coins} delay={0.05} />
        <StatCard icon={Trophy} label="Level" value={level} delay={0.1} />
        <StatCard icon={Flame} label="Daily streak" value={player.streak} suffix=" days" delay={0.15} />
        <StatCard icon={Award} label="Rank" value={7} prefix="#" delay={0.2} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Reveal className="panel p-7">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Weekly progress</h2>
            <span className="text-xs text-muted-foreground">XP per day</span>
          </div>
          <div className="mt-8 flex h-44 items-end gap-3">
            {week.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-3">
                <motion.div
                  initial={{ height: 0 }}
                  whileInView={{ height: `${v}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full rounded-t-md bg-foreground/80"
                />
                <span className="text-[11px] text-muted-foreground">{days[i]}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Level {level} progress</span>
              <span className="tabular-nums">{Math.round(progress * 100)}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-elevated">
              <motion.div
                className="h-full rounded-full bg-foreground"
                initial={{ width: 0 }}
                whileInView={{ width: `${progress * 100}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        </Reveal>

        <div className="space-y-4">
          <Reveal delay={0.05} className="panel p-7">
            <h2 className="font-semibold">Continue playing</h2>
            <div className="mt-5 space-y-2.5">
              {[
                { to: "/games/quiz", n: "Quiz Challenge", m: "Round 4 of 10" },
                { to: "/games/jigsaw", n: "Jigsaw Mission", m: "6 / 9 pieces" },
                { to: "/games/connect-dots", n: "Connect Dots", m: "3 / 5 pairs" },
              ].map((g) => (
                <Link
                  key={g.to}
                  to={g.to}
                  className="flex items-center justify-between rounded-lg border border-border bg-elevated/50 px-4 py-3 text-sm transition-colors hover:border-divider hover:bg-elevated"
                >
                  <span>{g.n}</span>
                  <span className="text-xs text-muted-foreground">{g.m}</span>
                </Link>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.1} className="panel p-7">
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-muted-foreground" />
              <h2 className="font-semibold">Notifications</h2>
            </div>
            <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
              <li>Weekly cohort leaderboard resets in 2 days.</li>
              <li>New question bank published: Applied Statistics.</li>
              <li>You are 120 XP away from level {level + 1}.</li>
            </ul>
          </Reveal>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Reveal className="panel p-7">
          <h2 className="font-semibold">Recent games</h2>
          <div className="mt-5 divide-y divide-border">
            {player.history.map((h, i) => (
              <div key={i} className="flex items-center justify-between py-3 text-sm">
                <span>{h.game}</span>
                <span className="tabular-nums text-muted-foreground">+{h.xp} XP</span>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.05} className="panel p-7">
          <h2 className="font-semibold">Achievements</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {["Perfect Score", "Quiz Master", "Puzzle Champion", "Dots Master", "Learning Legend"].map(
              (a) => {
                const owned = player.achievements.includes(a);
                return (
                  <motion.span
                    key={a}
                    className={
                      owned
                        ? "rounded-full border border-divider bg-elevated px-3.5 py-1.5 text-xs"
                        : "rounded-full border border-dashed border-border px-3.5 py-1.5 text-xs text-muted-foreground"
                    }
                  >
                    {a}
                  </motion.span>
                );
              },
            )}
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Overall accuracy {accuracy}% across {player.gamesPlayed} games.
          </p>
        </Reveal>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  prefix = "",
  suffix = "",
  delay,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  delay: number;
}) {
  return (
    <Reveal delay={delay} className="panel hover-lift p-6">
      <Icon className="size-4 text-muted-foreground" />
      <p className="mt-4 font-display text-2xl font-bold tabular-nums">
        {prefix}
        <AnimatedNumber value={value} />
        {suffix}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </Reveal>
  );
}
