import { motion } from "framer-motion";
import { createPortal } from "react-dom";

import { JigsawTileFace } from "@/components/games/JigsawTileFace";
import { JigsawTileCardVisual } from "@/components/games/JigsawTileCardVisual";
import type { JigsawTileCardRotation } from "@/lib/game/jigsaw-tiles";

type JigsawMissionFlyingTileProps = {
  tileId: string;
  col: number;
  row: number;
  cols: number;
  rows: number;
  imageUrl: string;
  visualRotation: JigsawTileCardRotation;
  from: DOMRect;
  to: DOMRect;
  onComplete: () => void;
};

/** Flies a single earned tile from the question area into the collection stack. */
export function JigsawMissionFlyingTile({
  col,
  row,
  cols,
  rows,
  imageUrl,
  visualRotation,
  from,
  to,
  onComplete,
}: JigsawMissionFlyingTileProps) {
  const startSize = Math.min(Math.max(from.width, 48), 80);
  const endSize = to.width;

  const startX = from.left + from.width / 2;
  const startY = from.top + from.height / 2;
  const endX = to.left + to.width / 2;
  const endY = to.top + to.height / 2;

  return createPortal(
    <motion.div
      className="pointer-events-none fixed z-[100] overflow-hidden rounded-lg border-2 border-white shadow-[0_12px_32px_rgba(0,0,0,0.22)]"
      initial={{
        left: startX,
        top: startY,
        width: startSize,
        height: startSize,
        x: "-50%",
        y: "-50%",
        opacity: 0.98,
        scale: 1.08,
      }}
      animate={{
        left: endX,
        top: endY,
        width: endSize,
        height: endSize,
        x: "-50%",
        y: "-50%",
        opacity: 1,
        scale: 1,
      }}
      transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={onComplete}
    >
      <JigsawTileCardVisual rotation={visualRotation}>
        <JigsawTileFace
          col={col}
          row={row}
          cols={cols}
          rows={rows}
          imageUrl={imageUrl}
          className="rounded-md"
        />
      </JigsawTileCardVisual>
    </motion.div>,
    document.body,
  );
}
