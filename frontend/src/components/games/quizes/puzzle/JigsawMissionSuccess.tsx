import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

import { Confetti } from "@/components/games/ui/Confetti";
import { jigsawSkeletonBoardWidthClass } from "@shared/game/jigsaw-grid";
import { formatAccuracy, formatDuration } from "@shared/game/ranking";
import { cn } from "@/lib/utils";

type JigsawMissionSuccessProps = {
  imageUrl: string;
  cols: number;
  durationMs: number | null;
  questionTotal: number;
  correctCount: number;
  incorrectAttempts: number;
  className?: string;
};

/**
 * Celebration screen after a correct Jigsaw Mission assembly —
 * shows the full reconstructed image and key performance stats (read-only).
 */
export function JigsawMissionSuccess({
  imageUrl,
  cols,
  durationMs,
  questionTotal,
  correctCount,
  incorrectAttempts,
  className,
}: JigsawMissionSuccessProps) {
  const accuracy = questionTotal > 0 ? Math.round((correctCount / questionTotal) * 100) : null;

  return (
    <div
      className={cn(
        "relative flex min-h-[50vh] flex-col items-center justify-center px-3 py-6 sm:min-h-[60vh] sm:px-4 sm:py-8",
        className,
      )}
    >
      <Confetti />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md text-center"
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--game-jigsaw-soft)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--game-jigsaw-deep)]">
          <CheckCircle2 className="size-4" aria-hidden />
          Puzzle complete
        </span>

        <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-[#111111] sm:text-3xl">
          You rebuilt the image!
        </h2>
        <p className="mt-2 text-sm text-[#525252]">
          Every piece is in the right place and facing the right way.
        </p>

        <motion.div
          className={cn(
            "mx-auto mt-6 overflow-hidden rounded-2xl shadow-2xl ring-4 ring-[var(--game-jigsaw)]/25",
            jigsawSkeletonBoardWidthClass(cols),
          )}
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 24, delay: 0.12 }}
        >
          <img
            src={imageUrl}
            alt="Completed puzzle"
            className="aspect-square w-full object-cover"
            draggable={false}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.35 }}
          className="mt-6 grid grid-cols-3 gap-2 sm:gap-3"
        >
          <div className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#737373]">Time</p>
            <p className="mt-1 font-display text-lg font-extrabold tabular-nums text-[var(--game-jigsaw-deep)]">
              {durationMs != null ? formatDuration(durationMs) : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#737373]">
              Accuracy
            </p>
            <p className="mt-1 font-display text-lg font-extrabold tabular-nums text-[#111111]">
              {formatAccuracy(accuracy)}
            </p>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#737373]">Misses</p>
            <p className="mt-1 font-display text-lg font-extrabold tabular-nums text-[#111111]">
              {incorrectAttempts}
            </p>
          </div>
        </motion.div>

        <p className="mt-5 text-xs text-[#737373]" role="status">
          Loading your full results…
        </p>
      </motion.div>
    </div>
  );
}
