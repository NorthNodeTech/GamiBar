import { motion } from "framer-motion";
import { useMemo } from "react";

import { JigsawTileFace } from "@/components/games/JigsawTileFace";
import { jigsawBoardMaxWidthClass } from "@/lib/game/jigsaw-grid";
import { buildJigsawTiles } from "@/lib/game/jigsaw-tiles";
import { cn } from "@/lib/utils";

const PLACEHOLDER_SVG =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><rect fill="#f3f4f6" width="100%" height="100%"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af" font-size="14">Puzzle image</text></svg>`,
  );

/**
 * Jigsaw Mission preview board — square tiles in a balanced grid.
 * Tiles are revealed individually as the student earns them (separate from question count).
 */
export function JigsawMissionTileBoard({
  earnedTileIds,
  imageSrc,
  cols,
  rows,
}: {
  earnedTileIds: ReadonlySet<string>;
  imageSrc: string | null;
  cols: number;
  rows: number;
}) {
  const tiles = useMemo(() => buildJigsawTiles(cols, rows), [cols, rows]);
  const tileCount = tiles.length;
  const revealedCount = tiles.filter((tile) => earnedTileIds.has(tile.id)).length;
  const complete = revealedCount >= tileCount;
  const src = imageSrc ?? PLACEHOLDER_SVG;

  return (
    <div
      className={cn(
        "mx-auto w-full rounded-2xl border border-[var(--gamibar-border)] bg-[#F3F4F6] p-1 shadow-[var(--shadow-soft)]",
        jigsawBoardMaxWidthClass(cols),
        complete && "ring-2 ring-[var(--game-jigsaw)]/40",
      )}
    >
      <div
        className="grid gap-px overflow-hidden rounded-xl bg-[var(--gamibar-border)]"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {tiles.map((tile) => {
          const isRevealed = earnedTileIds.has(tile.id);
          return (
            <div
              key={tile.id}
              className="relative aspect-square bg-[#E5E7EB]"
              aria-label={
                isRevealed
                  ? `Puzzle tile ${tile.id} revealed`
                  : `Puzzle tile slot ${tile.id} locked`
              }
            >
              {isRevealed ? (
                <motion.div
                  className="size-full"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                >
                  <JigsawTileFace
                    col={tile.col}
                    row={tile.row}
                    cols={cols}
                    rows={rows}
                    imageUrl={src}
                    className="rounded-sm"
                  />
                </motion.div>
              ) : (
                <div className="flex size-full items-center justify-center">
                  <span className="size-2 rounded-full bg-[#D1D5DB]" aria-hidden />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
