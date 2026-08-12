import { forwardRef, useMemo, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { motion } from "framer-motion";

import { JigsawTileFace } from "@/components/games/JigsawTileFace";
import { JigsawTileCardVisual } from "@/components/games/JigsawTileCardVisual";
import type { TileCollectionLayout, TileLayoutMap, TileRotationMap } from "@/lib/game/jigsaw-tile-rewards";
import { bindRotateOnTap } from "@/lib/game/jigsaw-tile-interaction";
import { ASSEMBLY_DRAG_THRESHOLD_PX } from "@/lib/game/jigsaw-assembly-drag";
import { buildJigsawTiles, tileIndexFromId, type JigsawTileCardRotation } from "@/lib/game/jigsaw-tiles";
import { cn } from "@/lib/utils";

export const COLLECTION_CARD_SIZE = 56;
export const ASSEMBLY_PILE_CARD_SIZE = 68;
const PAD_X = 12;
const PAD_Y = 10;

export function collectionAreaHeight(tileCount: number, cardSize = COLLECTION_CARD_SIZE): string {
  if (cardSize >= 76) {
    if (tileCount <= 4) return "10rem";
    if (tileCount <= 9) return "12rem";
    return "14rem";
  }
  if (cardSize > 60) {
    if (tileCount <= 4) return "9rem";
    if (tileCount <= 9) return "11rem";
    return "13rem";
  }
  if (tileCount <= 2) return "5.75rem";
  if (tileCount <= 6) return "7.25rem";
  if (tileCount <= 12) return "8.75rem";
  return "10.25rem";
}

export function layoutPositionStyle(
  layout: TileCollectionLayout,
  cardSize: number,
  padX = PAD_X,
  padY = PAD_Y,
): CSSProperties {
  return {
    left: `calc(${padX}px + ${layout.x} * (100% - ${padX * 2}px - ${cardSize}px))`,
    top: `calc(${padY}px + ${layout.y} * (100% - ${padY * 2}px - ${cardSize}px))`,
    zIndex: layout.z,
  };
}

export function tileLayoutRect(
  container: HTMLElement,
  layout: TileCollectionLayout,
  cardSize = COLLECTION_CARD_SIZE,
  padX = PAD_X,
  padY = PAD_Y,
): DOMRect {
  const base = container.getBoundingClientRect();
  const innerW = Math.max(0, base.width - padX * 2 - cardSize);
  const innerH = Math.max(0, base.height - padY * 2 - cardSize);
  const left = base.left + padX + layout.x * innerW;
  const top = base.top + padY + layout.y * innerH;
  return new DOMRect(left, top, cardSize, cardSize);
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
      tileLayouts,
      imageSrc,
      cols,
      rows,
      cardSize = COLLECTION_CARD_SIZE,
      landedTileId,
      onRotateTile,
      rotateDisabled,
      onTilePointerDown,
      draggingTileId,
      tapDragThreshold = ASSEMBLY_DRAG_THRESHOLD_PX,
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

    return (
      <div
        ref={ref}
        className={cn(
          "relative mx-auto w-full min-w-0",
          collectionAreaHeight(tileIds.length, cardSize),
          cardSize >= 64 ? "max-w-none" : "max-w-[13rem]",
          areaClassName,
        )}
        aria-label={`${tileIds.length} puzzle pieces`}
      >
        {tileIds.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-[#D1D5DB] bg-white/70 px-3">
            <p className="text-center text-[11px] leading-snug text-[#737373]">{emptyMessage}</p>
          </div>
        ) : (
          tileIds.map((id) => {
            const tile = tilesById.get(id);
            const layout = tileLayouts[id];
            if (!tile || !layout) return null;

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
                className={cn("absolute", className)}
                style={{
                  width: cardSize,
                  height: cardSize,
                  ...layoutPositionStyle(layout, cardSize),
                }}
              >
                <button
                  type="button"
                  disabled={!canRotate && !isDraggable}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    if (!canRotate && !isDraggable) return;
                    e.preventDefault();

                    if (isDraggable) {
                      onTilePointerDown?.(id, e);
                      return;
                    }

                    bindRotateOnTap(
                      { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY },
                      () => onRotateTile?.(id),
                      tapDragThreshold,
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
