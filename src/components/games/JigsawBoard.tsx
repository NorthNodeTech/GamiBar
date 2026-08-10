import { motion } from "framer-motion";

import monkey from "@/assets/puzzle-monkey.webp";
import { buildPieces } from "@/lib/jigsaw";

const COLS = 5;
const ROWS = 2;
const SIZE = 128;
const W = COLS * SIZE;
const H = ROWS * SIZE;
const PAD = 44;

const pieces = buildPieces(COLS, ROWS, SIZE);

export const TOTAL_PIECES = pieces.length;

export function JigsawBoard({ revealed, imageSrc = monkey }: { revealed: number; imageSrc?: string }) {
  const complete = revealed >= TOTAL_PIECES;

  return (
    <div className="relative">
      <motion.svg
        viewBox={`${-PAD} ${-PAD} ${W + PAD * 2} ${H + PAD * 2}`}
        className="w-full"
        animate={complete ? { filter: "drop-shadow(0 0 26px rgba(250,250,250,0.28))" } : { filter: "drop-shadow(0 0 0 rgba(0,0,0,0))" }}
        transition={{ duration: 1.1 }}
      >
        <defs>
          <pattern id="jigsaw-img" patternUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
            <image href={imageSrc} x="0" y="0" width={W} height={H} preserveAspectRatio="xMidYMid slice" />
          </pattern>
        </defs>

        <rect x="0" y="0" width={W} height={H} rx="6" className="fill-elevated/60" />

        {pieces.map((p) => (
          <path
            key={`slot-${p.id}`}
            d={p.d}
            className="fill-none stroke-border"
            strokeWidth="1"
            strokeDasharray="4 5"
          />
        ))}

        {pieces.slice(0, revealed).map((p, i) => {
          const fromX = p.col < COLS / 2 ? -260 : 260;
          const fromY = p.row === 0 ? -160 : 180;
          return (
            <motion.g
              key={`piece-${p.id}`}
              initial={{ x: fromX, y: fromY, rotate: p.col % 2 ? 14 : -12, opacity: 0, scale: 1.12 }}
              animate={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 130, damping: 16, mass: 0.7, delay: i === revealed - 1 ? 0.05 : 0 }}
              style={{ originX: `${(p.col + 0.5) * SIZE}px`, originY: `${(p.row + 0.5) * SIZE}px` }}
            >
              <path d={p.d} fill="url(#jigsaw-img)" stroke="rgba(250,250,250,0.22)" strokeWidth="1" />
            </motion.g>
          );
        })}
      </motion.svg>
    </div>
  );
}