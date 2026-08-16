import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, Flame, Play, Shield, Timer, Trophy, Users, Zap } from "lucide-react";
import { Card3DTilt } from "./Card3DTilt";
import { sound } from "@/lib/sound";

export function InteractiveProductPreview() {
  const [xp, setXp] = useState(2450);
  const [timerSeconds, setTimerSeconds] = useState(14);
  const [recentGain, setRecentGain] = useState<{ id: number; amount: number } | null>(null);

  // Auto-simulate live application activity
  useEffect(() => {
    const interval = setInterval(() => {
      // 1. Ticking Quiz Timer
      setTimerSeconds((prev) => {
        if (prev <= 1) return 15;
        return prev - 1;
      });

      // 2. Periodic XP Boost
      if (Math.random() > 0.6) {
        const added = 50 + Math.floor(Math.random() * 100);
        setXp((prev) => prev + added);
        setRecentGain({ id: Date.now(), amount: added });
        sound.playHover();
      }
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  const leaderboard = [
    { rank: 1, name: "Elena Rostova", score: xp, avatar: "ER", streak: 8 },
    { rank: 2, name: "Marcus Vance", score: 2310, avatar: "MV", streak: 5 },
    { rank: 3, name: "Devon Chen", score: 2180, avatar: "DC", streak: 4 },
  ];

  return (
    <section className="relative mx-auto max-w-6xl px-5 pt-10 pb-20">
      <div className="text-center mb-10">
        <span className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">
          Live Operational Preview
        </span>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-5xl">
          The Engine Running Live
        </h2>
        <p className="mt-3 text-zinc-400 max-w-xl mx-auto text-sm">
          Watch real-time XP accumulation, competitive rank swaps, and game physics in action.
        </p>
      </div>

      <Card3DTilt className="relative mx-auto border-white/15 bg-[#0B0B0F]/90 p-0 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
        {/* Dashboard Top Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <div className="size-3 rounded-full bg-red-500/80" />
              <div className="size-3 rounded-full bg-amber-500/80" />
              <div className="size-3 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-xs font-mono text-zinc-400 border-l border-white/10 pl-3">
              LIVE SESSION #GB-9041
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* XP Counter Badge */}
            <div className="relative flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1 text-xs font-bold text-amber-300">
              <Zap className="size-3.5 fill-amber-300" />
              <span>{xp} XP</span>
              <AnimatePresence>
                {recentGain && (
                  <motion.span
                    key={recentGain.id}
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: -20, scale: 1.1 }}
                    exit={{ opacity: 0 }}
                    className="absolute -top-3 right-0 text-[11px] font-black text-emerald-400"
                  >
                    +{recentGain.amount} XP
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Quiz Timer Bar */}
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-mono text-zinc-300">
              <Timer className="size-3.5 text-zinc-400" />
              <span>00:{timerSeconds < 10 ? `0${timerSeconds}` : timerSeconds}</span>
            </div>
          </div>
        </div>

        {/* Floating Dashboard Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 md:p-8">
          {/* Left Column: Live Leaderboard */}
          <div className="md:col-span-5 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Trophy className="size-4 text-amber-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Cohort Standings</span>
              </div>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" /> Live Sync
              </span>
            </div>

            <div className="space-y-2.5 mt-1">
              {leaderboard.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-zinc-400 w-4">#{item.rank}</span>
                    <div className="grid size-8 place-items-center rounded-full bg-white/10 font-bold text-xs text-white">
                      {item.avatar}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">{item.name}</p>
                      <div className="flex items-center gap-1 text-[10px] text-amber-400">
                        <Flame className="size-3 fill-amber-400" /> {item.streak} streak
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-white">{item.score} XP</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Live Game Preview Canvas Simulation */}
          <div className="md:col-span-7 flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.02] p-5 relative overflow-hidden">
            {/* Question Banner */}
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-mono">GAME MODE: JIGSAW MISSION</span>
                <span className="text-zinc-500">ROUND 2 OF 5</span>
              </div>
              <h3 className="mt-2 text-base font-semibold text-white">
                "Connect every matching pair of dots to finish the board."
              </h3>
            </div>

            {/* Simulated live puzzle / connect-dots activity */}
            <div className="my-6 grid grid-cols-3 gap-2.5 p-4 rounded-xl border border-white/10 bg-black/40">
              {[1, 2, 3, 4, 5, 6].map((tile) => (
                <div
                  key={tile}
                  className="relative aspect-video rounded-lg border border-white/15 bg-white/5 flex items-center justify-center overflow-hidden group"
                >
                  {tile === 5 ? (
                    <div className="size-full border border-dashed border-amber-400/60 bg-amber-400/10 flex items-center justify-center text-[10px] font-bold text-amber-300">
                      MISSING PIECE
                    </div>
                  ) : (
                    <div className="size-full bg-gradient-to-br from-white/10 to-transparent p-2 flex flex-col justify-between">
                      <span className="text-[9px] font-mono text-zinc-400">NODE #{tile}</span>
                      <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white w-2/3" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom Status Feed */}
            <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Users className="size-3.5 text-zinc-400" /> 34 Students connected
              </span>
              <span className="text-zinc-400 font-mono">60 FPS ACTIVE</span>
            </div>
          </div>
        </div>
      </Card3DTilt>
    </section>
  );
}
