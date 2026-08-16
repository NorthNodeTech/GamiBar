import { createFileRoute, redirect } from "@tanstack/react-router";
import { getStoredAuth } from "@/lib/auth-store";

import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Reveal } from "@/components/ui/reveal";
import { levelFromXp, usePlayer } from "@/lib/player-store";

export const Route = createFileRoute("/profile")({
  beforeLoad: () => {
    const auth = getStoredAuth();
    if (!auth) throw redirect({ to: "/login" });
    if (auth.role !== "student") throw redirect({ to: "/author" });
  },
  head: () => ({
    meta: [
      { title: "Profile - GamiBar" },
      {
        name: "description",
        content:
          "Your GamiBar profile: XP, coins, level, accuracy, streaks, achievements and history.",
      },
      { property: "og:title", content: "Profile - GamiBar" },
      { property: "og:description", content: "Statistics, achievements and match history." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { player } = usePlayer();
  const accuracy = player.answered ? Math.round((player.correct / player.answered) * 100) : 0;

  const stats = [
    { label: "XP", value: player.xp },
    { label: "Coins", value: player.coins },
    { label: "Current level", value: levelFromXp(player.xp) },
    { label: "Games played", value: player.gamesPlayed },
    { label: "Accuracy", value: accuracy, suffix: "%" },
    { label: "Current streak", value: player.streak, suffix: " days" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-5 py-16">
      <PageHeader
        eyebrow="Profile"
        title={player.name}
        subtitle="Learner · Ashford College cohort 2026"
      />

      <Reveal className="panel mt-10 flex items-center gap-5 p-7">
        <span className="grid size-16 place-items-center rounded-full border border-divider bg-elevated font-display text-lg font-bold">
          {player.name.slice(0, 2).toUpperCase()}
        </span>
        <div>
          <p className="font-semibold">{player.name}</p>
          <p className="text-sm text-muted-foreground">
            Level {levelFromXp(player.xp)} · {player.achievements.length} achievements unlocked
          </p>
        </div>
      </Reveal>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.05} className="panel hover-lift p-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</p>
            <p className="mt-3 font-display text-2xl font-bold tabular-nums">
              <AnimatedNumber value={s.value} />
              {s.suffix ?? ""}
            </p>
          </Reveal>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Reveal className="panel p-7">
          <h2 className="font-semibold">Achievements</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {player.achievements.map((a) => (
              <span
                key={a}
                className="rounded-full border border-divider bg-elevated px-3.5 py-1.5 text-xs"
              >
                {a}
              </span>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.05} className="panel p-7">
          <h2 className="font-semibold">Participated games</h2>
          <div className="mt-5 divide-y divide-border">
            {player.history.map((h, i) => (
              <div key={i} className="flex items-center justify-between py-3 text-sm">
                <span>{h.game}</span>
                <span className="tabular-nums text-muted-foreground">+{h.xp} XP</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
