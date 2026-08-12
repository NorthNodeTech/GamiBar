import { forwardRef } from "react";

import { JigsawMissionScrambledTiles, COLLECTION_CARD_SIZE } from "@/components/games/JigsawMissionScrambledTiles";
import { jigsawBoardMaxWidthClass } from "@/lib/game/jigsaw-grid";
import type { TileLayoutMap, TileRotationMap } from "@/lib/game/jigsaw-tile-rewards";
import { cn } from "@/lib/utils";

export {
  COLLECTION_CARD_SIZE as CARD_SIZE,
  tileLayoutRect,
  tileMetaFromId,
} from "@/components/games/JigsawMissionScrambledTiles";

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
        />
      </div>
    );
  },
);
