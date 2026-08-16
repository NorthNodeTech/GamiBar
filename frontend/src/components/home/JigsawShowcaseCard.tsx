import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Blocks, Check, Sparkles } from "lucide-react";

import { Card3DTilt } from "./Card3DTilt";
import { sound } from "@/lib/sound";

export function JigsawShowcaseCard() {
  const [isSnapped, setIsSnapped] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsSnapped(true);
      sound.playSnap();
      setTimeout(() => setIsSnapped(false), 2400);
    }, 3600);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card3DTilt variant="dark" cursorType="puzzle" className="flex h-full min-h-[220px] flex-col p-4 md:p-5 lg:min-h-[260px] lg:p-6 xl:min-h-[300px]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-purple-400 lg:size-10">
            <Blocks className="size-4 lg:size-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white lg:text-base">Jigsaw Mission</h3>
            <p className="text-[11px] text-zinc-400 lg:text-xs">Autonomous Piece Snap</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-purple-400/30 bg-purple-400/10 px-2 py-0.5 text-[11px] font-bold text-purple-300 lg:text-xs">
          {isSnapped ? "4 / 4 Complete" : "3 / 4 Pieces"}
        </span>
      </div>

      <div className="relative mt-3 h-28 overflow-hidden rounded-xl border border-white/15 bg-black/60 p-2 lg:mt-4 lg:h-36 xl:h-40">
        <div className="grid size-full grid-cols-2 grid-rows-2 gap-1.5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="flex flex-col justify-between rounded-lg border border-white/20 bg-gradient-to-br from-zinc-800 to-zinc-900 p-2"
            >
              <div className="size-3 rounded-full bg-white/20 lg:size-4" />
              <span className="text-[9px] font-mono text-zinc-400 lg:text-[10px]">PIECE #{String(n).padStart(2, "0")}</span>
            </div>
          ))}
          <div className="relative rounded-lg border border-dashed border-white/20 bg-white/[0.02]">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={isSnapped ? { scale: 1, opacity: 1 } : { scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              className="absolute inset-0 flex flex-col justify-between rounded-lg border border-purple-400/60 bg-purple-950/80 p-2"
            >
              <div className="flex items-center justify-between">
                <div className="size-3 rounded-full bg-purple-400/40 lg:size-4" />
                <Check className="size-3.5 text-purple-300" />
              </div>
              <span className="text-[9px] font-mono text-purple-200 lg:text-[10px]">PIECE #04</span>
            </motion.div>
          </div>
        </div>
        <AnimatePresence>
          {isSnapped && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center bg-purple-500/10"
            >
              <span className="flex items-center gap-1.5 rounded-full border border-purple-400/50 bg-black/80 px-3 py-1 text-[10px] font-bold text-purple-200 lg:text-xs">
                <Sparkles className="size-3.5" /> MISSION ASSEMBLED
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-auto pt-3 lg:pt-4">
        <Link
          to="/login"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 lg:py-3 lg:text-sm"
        >
          Play Jigsaw Mission
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </Card3DTilt>
  );
}
