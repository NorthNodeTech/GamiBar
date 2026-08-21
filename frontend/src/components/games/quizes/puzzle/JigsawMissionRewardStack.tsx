import { forwardRef } from "react";
import { LockKeyhole } from "lucide-react";

import { JigsawTileFace } from "@/components/games/quizes/puzzle/JigsawTileFace";
import {
  JigsawMissionScrambledTiles,
  COLLECTION_CARD_SIZE,
  tileMetaFromId,
} from "@/components/games/quizes/puzzle/JigsawMissionScrambledTiles";
import { jigsawBoardMaxWidthClass } from "@shared/game/jigsaw-grid";
import type {
  TileLayoutMap,
  TileQuestionProgress,
  TileRotationMap,
} from "@shared/game/jigsaw-tile-rewards";
import { cn } from "@/lib/utils";

export {
  COLLECTION_CARD_SIZE as CARD_SIZE,
  tileLayoutRect,
  tileRowLayoutRect,
  tileMetaFromId,
} from "@/components/games/quizes/puzzle/JigsawMissionScrambledTiles";

type JigsawMissionRewardStackProps = {
  displayedTileIds: readonly string[];
  tileRotations: Readonly<TileRotationMap>;
  tileLayouts: Readonly<TileLayoutMap>;
  imageSrc: string | null;
  cols: number;
  rows: number;
  landedTileId?: string | null;
  onRotateTile?: (tileId: string) => void;
  rotateDisabled?: boolean;
  cardSize?: number;
  tapDragThreshold?: number;
  pendingPiece?: (TileQuestionProgress & { tileId: string }) | null;
  className?: string;
};

export const JigsawMissionRewardStack = forwardRef<HTMLDivElement, JigsawMissionRewardStackProps>(
  function JigsawMissionRewardStack(
    {
      displayedTileIds,
      tileRotations,
      tileLayouts,
      imageSrc,
      cols,
      rows,
      landedTileId,
      onRotateTile,
      rotateDisabled,
      cardSize = COLLECTION_CARD_SIZE,
      tapDragThreshold,
      pendingPiece,
      className,
    },
    ref,
  ) {
    const src =
      imageSrc ??
      "data:image/svg+xml," +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect fill="#e5e7eb" width="100%" height="100%"/></svg>`,
        );

    return (
      <div
        className={cn(
          "mx-auto w-full rounded-2xl border border-[var(--gamibar-border)] bg-[#F3F4F6] p-3 shadow-[var(--shadow-soft)]",
          jigsawBoardMaxWidthClass(cols),
          className,
        )}
      >
        <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[#737373]">
          Your collection
        </p>
        <JigsawMissionScrambledTiles
          ref={ref}
          tileIds={displayedTileIds}
          tileRotations={tileRotations}
          tileLayouts={tileLayouts}
          imageSrc={src}
          cols={cols}
          rows={rows}
          cardSize={cardSize}
          tapDragThreshold={tapDragThreshold}
          landedTileId={landedTileId}
          onRotateTile={onRotateTile}
          rotateDisabled={rotateDisabled}
          emptyMessage="Fully colored pieces will appear here"
        />
        {pendingPiece
          ? (() => {
              const tile = tileMetaFromId(pendingPiece.tileId, cols, rows);
              if (!tile) return null;
              const percent = Math.round(pendingPiece.progress * 100);
              return (
                <div
                  className="mt-2 flex items-center gap-3 rounded-xl border border-[#DDD6FE] bg-white p-2.5"
                  aria-label={`Piece ${pendingPiece.pieceIndex + 1} is ${percent}% colored and remains locked`}
                >
                  <div className="relative size-[4.25rem] shrink-0 overflow-hidden rounded-lg border-2 border-white bg-[#E5E7EB] shadow-md">
                    <div className="absolute inset-0 grayscale opacity-55">
                      <JigsawTileFace
                        col={tile.col}
                        row={tile.row}
                        cols={cols}
                        rows={rows}
                        imageUrl={src}
                      />
                    </div>
                    <div
                      className="absolute inset-0 overflow-hidden transition-[clip-path] duration-500 ease-out"
                      style={{ clipPath: `inset(0 ${100 - percent}% 0 0)` }}
                    >
                      <JigsawTileFace
                        col={tile.col}
                        row={tile.row}
                        cols={cols}
                        rows={rows}
                        imageUrl={src}
                      />
                    </div>
                    <span className="absolute bottom-1 right-1 grid size-5 place-items-center rounded-full bg-[#111111]/80 text-white shadow-sm">
                      <LockKeyhole className="size-3" aria-hidden />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
                      <span className="text-[#111111]">Piece {pendingPiece.pieceIndex + 1}</span>
                      <span className="tabular-nums text-[var(--game-jigsaw-deep)]">
                        {pendingPiece.completedQuestions}/{pendingPiece.requiredQuestions} correct
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
                      <div
                        className="h-full rounded-full bg-[var(--game-jigsaw)] transition-[width] duration-500 ease-out"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] leading-snug text-[#737373]">
                      {percent}% colored · unlocks and becomes usable at 100%
                    </p>
                  </div>
                </div>
              );
            })()
          : null}
      </div>
    );
  },
);
