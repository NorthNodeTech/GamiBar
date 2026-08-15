import { forwardRef, useMemo, type PointerEvent as ReactPointerEvent } from "react";
import { motion } from "framer-motion";

import { JigsawTileFace } from "@/components/games/quizes/puzzle/JigsawTileFace";
import { JigsawTileCardVisual } from "@/components/games/quizes/puzzle/JigsawTileCardVisual";
import type { TileLayoutMap, TileRotationMap } from "@/lib/game/jigsaw-tile-rewards";
import { bindExplicitRotateTap } from "@/lib/game/jigsaw-tile-interaction";
import { buildJigsawTiles, tileIndexFromId, type JigsawTileCardRotation } from "@/lib/game/jigsaw-tiles";
import { cn } from "@/lib/utils";

export const COLLECTION_CARD_SIZE = 56;
export const ASSEMBLY_PILE_CARD_SIZE = 68;
export const COLLECTION_TILE_GAP_PX = 8;
const PAD_X = 12;
const PAD_Y = 10;

export function collectionAreaHeight(_tileCount: number, cardSize = COLLECTION_CARD_SIZE): string {
  const totalPx = cardSize + PAD_Y * 2;
  return `${totalPx / 16}rem`;
}

/** Target rect for a tile in the horizontal collection row (used by fly-in animation). */
export function tileRowLayoutRect(
  container: HTMLElement,
  index: number,
  total: number,
  cardSize = COLLECTION_CARD_SIZE,
  gap = COLLECTION_TILE_GAP_PX,
  padX = PAD_X,
  padY = PAD_Y,
): DOMRect {
  const base = container.getBoundingClientRect();
  const safeTotal = Math.max(1, total);
  const rowWidth = safeTotal * cardSize + Math.max(0, safeTotal - 1) * gap;
  const startX = base.left + Math.max(padX, (base.width - rowWidth) / 2);
  const left = startX + index * (cardSize + gap);
  const top = base.top + padY + Math.max(0, (base.height - padY * 2 - cardSize) / 2);
  return new DOMRect(left, top, cardSize, cardSize);
}

/** @deprecated Use tileRowLayoutRect for the horizontal collection row. */
export function tileLayoutRect(
  container: HTMLElement,
  _layout: { x: number; y: number; z: number },
  cardSize = COLLECTION_CARD_SIZE,
  index = 0,
  total = 1,
) {
  return tileRowLayoutRect(container, index, total, cardSize);
}

type JigsawMissionScrambledTilesProps = {
  tileIds: readonly string[];
  tileRotations: Readonly<TileRotationMap>;
  tileLayouts: Readonly<TileLayoutMap>;
  imageSrc: string;
  cols: number;
  rows: number;
  cardSize?: number;
  landedTileId?: string | null;
  onRotateTile?: (tileId: string) => void;
  rotateDisabled?: boolean;
  onTilePointerDown?: (tileId: string, event: ReactPointerEvent<HTMLButtonElement>) => void;
  draggingTileId?: string | null;
  tapDragThreshold?: number;
  emptyMessage?: string;
  className?: string;
  areaClassName?: string;
};

export const JigsawMissionScrambledTiles = forwardRef<HTMLDivElement, JigsawMissionScrambledTilesProps>(
  function JigsawMissionScrambledTiles(
    {
      tileIds,
      tileRotations,
      tileLayouts: _tileLayouts,
      imageSrc,
      cols,
      rows,
      cardSize = COLLECTION_CARD_SIZE,
      landedTileId,
      onRotateTile,
      rotateDisabled,
      onTilePointerDown,
      draggingTileId,
      emptyMessage = "Answer correctly to collect puzzle pieces",
      className,
      areaClassName,
    },
    ref,
  ) {
    const tilesById = useMemo(() => {
      const map = new Map<string, ReturnType<typeof buildJigsawTiles>[number]>();
      for (const tile of buildJigsawTiles(cols, rows)) {
        map.set(tile.id, tile);
      }
      return map;
    }, [cols, rows]);

    const sortedTileIds = useMemo(
      () => [...tileIds].sort((a, b) => a.localeCompare(b)),
      [tileIds],
    );

    return (
      <div
        ref={ref}
        className={cn(
          "relative mx-auto flex w-full min-w-0 items-center justify-center overflow-x-auto px-3 py-2.5",
          collectionAreaHeight(tileIds.length, cardSize),
          cardSize >= 64 ? "max-w-none" : "max-w-none",
          areaClassName,
        )}
        style={{ gap: COLLECTION_TILE_GAP_PX }}
        aria-label={`${tileIds.length} puzzle pieces`}
      >
        {sortedTileIds.length === 0 ? (
          <div className="flex h-full min-h-[inherit] w-full items-center justify-center rounded-xl border-2 border-dashed border-[#D1D5DB] bg-white/70 px-3">
            <p className="text-center text-[11px] leading-snug text-[#737373]">{emptyMessage}</p>
          </div>
        ) : (
          sortedTileIds.map((id) => {
            const tile = tilesById.get(id);
            if (!tile) return null;

            const rotation = tileRotations[id] ?? (0 as JigsawTileCardRotation);
            const isDragging = draggingTileId === id;
            const canRotate = Boolean(onRotateTile) && !rotateDisabled;
            const isDraggable = Boolean(onTilePointerDown);
            const usesCombinedInteraction = canRotate && isDraggable;

            return (
              <motion.div
                key={id}
                initial={
                  landedTileId === id ? { scale: 0.85, opacity: 0.6 } : { scale: 1, opacity: 1 }
                }
                animate={{ scale: 1, opacity: isDragging ? 0.35 : 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 26 }}
                className={cn("shrink-0", className)}
                style={{ width: cardSize, height: cardSize }}
              >
                <button
                  type="button"
                  disabled={!canRotate && !isDraggable}
                  onClick={(e) => e.preventDefault()}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    if (!canRotate && !isDraggable) return;
                    e.preventDefault();

                    if (isDraggable) {
                      onTilePointerDown?.(id, e);
                      return;
                    }

                    bindExplicitRotateTap(
                      e.currentTarget,
                      { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY },
                      () => onRotateTile?.(id),
                    );
                  }}
                  aria-label={
                    usesCombinedInteraction
                      ? "Puzzle piece. Tap to rotate. Drag onto the board."
                      : isDraggable
                        ? "Puzzle piece. Drag onto the board."
                        : canRotate
                          ? "Puzzle piece. Tap to rotate clockwise."
                          : "Puzzle piece."
                  }
                  style={canRotate || isDraggable ? { touchAction: "none" } : undefined}
                  className={cn(
                    "size-full touch-manipulation overflow-hidden rounded-lg border-2 border-white shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-1",
                    isDraggable && "cursor-grab active:cursor-grabbing",
                    canRotate && !isDraggable && "cursor-pointer active:scale-[0.97]",
                    usesCombinedInteraction && "cursor-grab active:cursor-grabbing",
                    !canRotate && !isDraggable && "cursor-default",
                  )}
                >
                  <JigsawTileCardVisual rotation={rotation}>
                    <JigsawTileFace
                      col={tile.col}
                      row={tile.row}
                      cols={cols}
                      rows={rows}
                      imageUrl={imageSrc}
                      className="rounded-md"
                    />
                  </JigsawTileCardVisual>
                </button>
              </motion.div>
            );
          })
        )}
      </div>
    );
  },
);

export function tileMetaFromId(id: string, cols: number, rows: number) {
  const index = tileIndexFromId(id, cols, rows);
  if (index == null) return null;
  return buildJigsawTiles(cols, rows)[index] ?? null;
}

export function tileIdFromPieceIndex(pieceIndex: number, cols: number, rows: number): string | null {
  const tiles = buildJigsawTiles(cols, rows);
  return tiles[pieceIndex]?.id ?? null;
}

export function pieceIndexFromTileId(id: string, cols: number, rows: number): number | null {
  return tileIndexFromId(id, cols, rows);
}
