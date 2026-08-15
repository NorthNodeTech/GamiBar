import { motion } from "framer-motion";
import { useMemo } from "react";

import { PUZZLE_QUEST_GRID } from "@/lib/game/config";
import { buildPieces } from "@/lib/jigsaw";

const SIZE = 120;
const PAD = 36;

export function PuzzleQuestBoard({
  revealed,
  imageSrc,
  cols = PUZZLE_QUEST_GRID.cols,
  rows = PUZZLE_QUEST_GRID.rows,
}: {
  revealed: number;
  imageSrc: string | null;
  cols?: number;
  rows?: number;
}) {
  const W = cols * SIZE;
  const H = rows * SIZE;
  const pieceCount = cols * rows;
  const pieces = useMemo(() => buildPieces(cols, rows, SIZE), [cols, rows]);
  const complete = revealed >= pieceCount;
  const placeholder =
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect fill="#f3f4f6" width="100%" height="100%"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af" font-size="14">Puzzle image</text></svg>`,
    );

  return (
    <div className="relative">
      <motion.svg
        viewBox={`${-PAD} ${-PAD} ${W + PAD * 2} ${H + PAD * 2}`}
        className="mx-auto w-full max-w-md"
        animate={
          complete
            ? { filter: "drop-shadow(0 0 24px rgba(59,130,246,0.35))" }
            : { filter: "drop-shadow(0 0 0 rgba(0,0,0,0))" }
        }
        transition={{ duration: 1 }}
      >
        <defs>
          <pattern id="pq-img" patternUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
            <image
              href={imageSrc ?? placeholder}
              x="0"
              y="0"
              width={W}
              height={H}
              preserveAspectRatio="xMidYMid slice"
            />
          </pattern>
        </defs>

        <rect x="0" y="0" width={W} height={H} rx="8" className="fill-[#F3F4F6]" />

        {pieces.map((p) => (
          <path
            key={`slot-${p.id}`}
            d={p.d}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="1"
            strokeDasharray="4 5"
          />
        ))}

        {pieces.slice(0, revealed).map((p, i) => {
          const fromX = p.col < cols / 2 ? -200 : 200;
          const fromY = p.row === 0 ? -140 : 140;
          return (
            <motion.g
              key={`piece-${p.id}`}
              initial={{
                x: fromX,
                y: fromY,
                rotate: p.col % 2 ? 12 : -10,
                opacity: 0,
                scale: 1.1,
              }}
              animate={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 140,
                damping: 16,
                mass: 0.7,
                delay: i === revealed - 1 ? 0.05 : 0,
              }}
              style={{
                originX: `${(p.col + 0.5) * SIZE}px`,
                originY: `${(p.row + 0.5) * SIZE}px`,
              }}
            >
              <path d={p.d} fill="url(#pq-img)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
            </motion.g>
          );
        })}
      </motion.svg>
    </div>
  );
}

export const PUZZLE_QUEST_PIECES = PUZZLE_QUEST_GRID.cols * PUZZLE_QUEST_GRID.rows;
