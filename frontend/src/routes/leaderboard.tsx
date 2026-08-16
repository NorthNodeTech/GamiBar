import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, Medal, Shield, Star, Swords, Trophy, Zap } from "lucide-react";
import { useEffect, useState } from "react";

import { AnimatedNumber } from "@/components/ui/animated-number";
import { levelFromXp, usePlayer } from "@/lib/player-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard - GamiBar" },
      {
        name: "description",
        content: "Cohort rankings by XP, level and accuracy across every GamiBar mode.",
      },
      { property: "og:title", content: "Leaderboard - GamiBar" },
      { property: "og:description", content: "See where you place in your cohort." },
    ],
  }),
  component: Leaderboard,
});

const base = [
  { name: "Nadia Rahman", xp: 8420, tier: "Conqueror", kills: 142 },
  { name: "Oliver Grant", xp: 7980, tier: "Ace", kills: 128 },
  { name: "Chen Wei", xp: 7315, tier: "Ace", kills: 119 },
  { name: "Marco Bellini", xp: 6640, tier: "Diamond", kills: 98 },
  { name: "Aisha Khan", xp: 5890, tier: "Diamond", kills: 87 },
  { name: "Tomas Novak", xp: 5210, tier: "Platinum", kills: 76 },
  { name: "Elena Duarte", xp: 4655, tier: "Platinum", kills: 68 },
  { name: "Jonah Weiss", xp: 3980, tier: "Gold", kills: 54 },
  { name: "Priya Menon", xp: 3410, tier: "Gold", kills: 47 },
];

const tierColors: Record<string, string> = {
  Conqueror: "text-white",
  Ace: "text-purple-400",
  Diamond: "text-cyan-400",
  Platinum: "text-blue-400",
  Gold: "text-amber-400",
};

function Leaderboard() {
  const { player } = usePlayer();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const rows = [...base, { name: `${player.name}`, xp: player.xp, tier: "Silver", kills: 32, self: true }].sort(
    (a, b) => b.xp - a.xp,
  );

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);
  const playerRank = rows.findIndex((r) => "self" in r && r.self) + 1;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0f] text-white">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(255,255,255,0.06),transparent)]" />
        <div className="absolute left-0 top-1/4 size-[500px] rounded-full bg-purple-600/10 blur-[120px] animate-pulse" />
        <div className="absolute right-0 top-1/3 size-[400px] rounded-full bg-amber-500/10 blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
        {/* Scan lines */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-4xl px-5 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
            <Swords className="size-3.5" />
            Season Rankings
          </div>
          <h1 className="mt-5 font-display text-4xl font-black tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
              Leaderboard
            </span>
          </h1>
          <p className="mt-3 text-sm text-white/50">
            Top warriors of the cohort · Updated live after every match
          </p>
        </motion.div>

        {/* Podium - top 3 */}
        {mounted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6, type: "spring" }}
            className="mt-14 flex items-end justify-center gap-3 sm:gap-6"
          >
            {/* 2nd place */}
            <PodiumPlayer rank={2} player={top3[1]} delay={0.4} height="h-28" />
            {/* 1st place */}
            <PodiumPlayer rank={1} player={top3[0]} delay={0.3} height="h-36" featured />
            {/* 3rd place */}
            <PodiumPlayer rank={3} player={top3[2]} delay={0.5} height="h-24" />
          </motion.div>
        )}

        {/* Your rank banner */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="mx-auto mt-10 flex max-w-md items-center justify-between rounded-xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3">
            <Shield className="size-5 text-blue-400" />
            <span className="text-sm text-white/70">Your Rank</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-display text-2xl font-black text-amber-400">#{playerRank}</span>
            <span className="text-sm text-white/50">
              <AnimatedNumber value={player.xp} /> XP
            </span>
          </div>
        </motion.div>

        {/* Full rankings list */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm">
          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 border-b border-white/10 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white/40">
            <span>Rank</span>
            <span>Player</span>
            <span className="hidden sm:block">Tier</span>
            <span>XP</span>
          </div>

          <AnimatePresence>
            {rest.map((r, i) => {
              const rank = i + 4;
              const isSelf = "self" in r && r.self;
              return (
                <motion.div
                  key={r.name}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + i * 0.05, duration: 0.4 }}
                  className={cn(
                    "grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 border-b border-white/5 px-5 py-4 last:border-0",
                    isSelf && "bg-amber-500/10 ring-1 ring-inset ring-amber-500/20",
                  )}
                >
                  <span className="grid size-8 place-items-center rounded-lg bg-white/5 font-display text-sm font-bold tabular-nums text-white/60">
                    {rank}
                  </span>
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold",
                        isSelf ? "bg-amber-500/20 text-amber-300 ring-2 ring-amber-500/40" : "bg-white/10 text-white/70",
                      )}
                    >
                      {r.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {r.name}
                        {isSelf && (
                          <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-400">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-white/40">Lv. {levelFromXp(r.xp)}</p>
                    </div>
                  </div>
                  <span className={cn("hidden text-xs font-semibold sm:block", tierColors[r.tier] ?? "text-white/50")}>
                    {r.tier}
                  </span>
                  <div className="text-right">
                    <p className="font-display text-sm font-bold tabular-nums text-amber-300">
                      <AnimatedNumber value={r.xp} />
                    </p>
                    <p className="text-[10px] text-white/30">XP</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function PodiumPlayer({
  rank,
  player,
  delay,
  height,
  featured = false,
}: {
  rank: number;
  player: (typeof base)[0] & { self?: boolean };
  delay: number;
  height: string;
  featured?: boolean;
}) {
  const medals = [
    { bg: "from-amber-400 to-yellow-600", ring: "ring-amber-400/50", glow: "shadow-amber-500/30", icon: Crown },
    { bg: "from-slate-300 to-slate-500", ring: "ring-slate-400/50", glow: "shadow-slate-400/20", icon: Medal },
    { bg: "from-orange-400 to-orange-700", ring: "ring-orange-500/50", glow: "shadow-orange-500/20", icon: Medal },
  ];
  const style = medals[rank - 1];
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, type: "spring", stiffness: 200 }}
      className="flex flex-col items-center"
    >
      {featured && (
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <Crown className="mb-1 size-6 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
        </motion.div>
      )}

      <div
        className={cn(
          "relative mb-3 grid place-items-center rounded-full bg-gradient-to-br shadow-xl",
          featured ? "size-20" : "size-16",
          style.bg,
          style.ring,
          `ring-2 ${style.glow}`,
        )}
      >
        <span className="font-display text-lg font-black text-white/90">
          {player.name.slice(0, 2).toUpperCase()}
        </span>
        <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full bg-[#0a0a0f] ring-1 ring-white/20">
          <Icon className="size-3 text-amber-400" />
        </span>
      </div>

      <p className={cn("max-w-[100px] truncate text-center font-semibold", featured ? "text-sm" : "text-xs")}>
        {player.name}
      </p>
      <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-400/80">
        <Zap className="size-3" />
        <AnimatedNumber value={player.xp} />
      </p>

      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay: delay + 0.2, duration: 0.4 }}
        style={{ originY: 1 }}
        className={cn(
          "mt-3 flex w-24 flex-col items-center justify-end rounded-t-xl border border-white/10 bg-gradient-to-t from-white/5 to-white/10 sm:w-28",
          height,
        )}
      >
        <span className="mb-2 font-display text-2xl font-black text-white/80">{rank}</span>
        {rank === 1 && <Trophy className="mb-3 size-5 text-amber-400" />}
        {rank === 2 && <Star className="mb-3 size-4 text-slate-300" />}
        {rank === 3 && <Star className="mb-3 size-4 text-orange-400" />}
      </motion.div>
    </motion.div>
  );
}
