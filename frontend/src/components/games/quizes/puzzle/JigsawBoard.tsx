import { motion } from "framer-motion";

import defaultJigsawImage from "@/assets/tool-jigsaw-mission.webp";
import { buildPieces } from "@/lib/jigsaw";

const COLS = 5;
const ROWS = 2;
const SIZE = 128;
const W = COLS * SIZE;
const H = ROWS * SIZE;
const PAD = 44;

const pieces = buildPieces(COLS, ROWS, SIZE);

export const TOTAL_PIECES = pieces.length;

export function JigsawBoard({ revealed, imageSrc = defaultJigsawImage }: { revealed: number; imageSrc?: string }) {
  const complete = revealed >= TOTAL_PIECES;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--gamibar-border)] bg-black/40 p-4">
      <motion.svg
        viewBox={`${-PAD} ${-PAD} ${W + PAD * 2} ${H + PAD * 2}`}
        className="w-full max-w-xl mx-auto"
        animate={complete ? { filter: "drop-shadow(0 0 26px rgba(250,250,250,0.28))" } : { filter: "drop-shadow(0 0 0 rgba(0,0,0,0))" }}
      >
        <defs>
          <pattern id="jigsaw-img" patternUnits="userSpaceOnUse" width={W} height={H}>
            <image href={imageSrc} x="0" y="0" width={W} height={H} preserveAspectRatio="xMidYMid slice" />
          </pattern>
        </defs>

        {pieces.map((piece, i) => {
          const isRevealed = i < revealed;
          return (
            <motion.path
              key={i}
              d={piece.path}
              fill={isRevealed ? "url(#jigsaw-img)" : "rgba(255,255,255,0.05)"}
              stroke={isRevealed ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)"}
              strokeWidth="1.5"
              initial={false}
              animate={{ opacity: isRevealed ? 1 : 0.4 }}
              transition={{ duration: 0.3 }}
            />
          );
        })}
      </motion.svg>
    </div>
  );
}
