import type { MutableRefObject, ReactNode } from "react";

import { jigsawSkeletonBoardWidthClass, jigsawSkeletonSlotGap } from "@shared/game/jigsaw-grid";
import { cn } from "@/lib/utils";

type JigsawMissionSkeletonBoardProps = {
  cols: number;
  rows: number;
  slotRefs?: MutableRefObject<(HTMLDivElement | null)[]>;
  /** Per-slot overlay content (placed pieces, drag ghosts). Empty slots stay blank. */
  renderSlot?: (slotIndex: number) => ReactNode;
  /** Extra classes applied to each slot shell (e.g. snap highlight). */
  slotClassName?: (slotIndex: number) => string | undefined;
  className?: string;
};

/**
 * Empty puzzle skeleton for assembly — square grid with no image preview.
 * Slot count follows the mission grid (2×2, 3×3, or 4×4).
 */
export function JigsawMissionSkeletonBoard({
  cols,
  rows,
  slotRefs,
  renderSlot,
  slotClassName,
  className,
}: JigsawMissionSkeletonBoardProps) {
  const total = cols * rows;

  return (
    <div className={cn("mx-auto", jigsawSkeletonBoardWidthClass(cols), className)}>
      <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[#737373]">
        Puzzle board
      </p>
      <div
        role="group"
        aria-label={`Empty puzzle board with ${total} square slots`}
        className={cn(
          "grid rounded-2xl border border-[#E5E7EB] bg-[#ECEFF3] p-1.5 shadow-[inset_0_2px_6px_rgba(0,0,0,0.04)] sm:p-2.5",
          jigsawSkeletonSlotGap(cols),
        )}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: total }, (_, slotIndex) => (
          <div
            key={slotIndex}
            ref={(el) => {
              if (slotRefs?.current) slotRefs.current[slotIndex] = el;
            }}
            className={cn(
              "relative aspect-square rounded-md border border-[#D1D5DB] bg-[#FAFAFA]",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
              "transition-colors duration-150",
              slotClassName?.(slotIndex),
            )}
            aria-hidden={renderSlot?.(slotIndex) == null ? true : undefined}
          >
            {renderSlot?.(slotIndex)}
          </div>
        ))}
      </div>
    </div>
  );
}
