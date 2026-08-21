import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

function shuffleIds(count: number): number[] {
  const ids = Array.from({ length: count }, (_, i) => i);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  }
  if (ids.every((id, index) => id === index) && ids.length > 1) {
    [ids[0], ids[1]] = [ids[1]!, ids[0]!];
  }
  return ids;
}

function pieceCoords(id: number, cols: number) {
  return { col: id % cols, row: Math.floor(id / cols) };
}

function sliceStyle(id: number, cols: number, rows: number) {
  const { col, row } = pieceCoords(id, cols);
  const x = cols > 1 ? (col / (cols - 1)) * 100 : 0;
  const y = rows > 1 ? (row / (rows - 1)) * 100 : 0;
  return {
    backgroundSize: `${cols * 100}% ${rows * 100}%`,
    backgroundPosition: `${x}% ${y}%`,
  } as const;
}

function lockedCount(slots: number[]) {
  return slots.filter((pieceId, slotIndex) => pieceId === slotIndex).length;
}

export function JigsawPuzzle({
  imageUrl,
  cols,
  rows,
  onProgress,
  disabled = false,
  initialSlots,
}: {
  imageUrl: string;
  cols: number;
  rows: number;
  onProgress: (locked: number, completed: boolean, slots?: number[]) => void;
  disabled?: boolean;
  initialSlots?: number[];
}) {
  const total = cols * rows;
  const [slots, setSlots] = useState<number[]>(() =>
    initialSlots && initialSlots.length === total ? initialSlots : shuffleIds(total),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const lastReport = useRef(-1);

  const locked = useMemo(
    () => new Set(slots.map((pieceId, i) => (pieceId === i ? i : -1)).filter((i) => i >= 0)),
    [slots],
  );
  const done = locked.size >= total;

  useEffect(() => {
    const count = lockedCount(slots);
    if (count === lastReport.current) return;
    lastReport.current = count;
    onProgress(count, count >= total, slots);
  }, [slots, onProgress, total]);

  const swapSlots = useCallback(
    (from: number, to: number) => {
      if (disabled || done) return;
      if (from === to) return;
      if (locked.has(from) || locked.has(to)) return;

      setSlots((prev) => {
        const next = [...prev];
        [next[from], next[to]] = [next[to]!, next[from]!];
        return next;
      });
      setSelected(null);
    },
    [disabled, done, locked],
  );

  const onSlotTap = (slotIndex: number) => {
    if (disabled || done || locked.has(slotIndex)) return;

    if (selected === null) {
      setSelected(slotIndex);
      return;
    }

    swapSlots(selected, slotIndex);
  };

  const onPointerDown = (slotIndex: number, e: React.PointerEvent) => {
    if (disabled || done || locked.has(slotIndex) || e.button > 0) return;
    setDragging(slotIndex);
    setSelected(slotIndex);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const slotFromPoint = (clientX: number, clientY: number) => {
    const grid = gridRef.current;
    if (!grid) return null;
    const target = document.elementFromPoint(clientX, clientY);
    const cell = target?.closest<HTMLElement>("[data-jigsaw-slot]");
    if (!cell || !grid.contains(cell)) return null;
    const index = Number(cell.dataset["jigsawSlot"]);
    return Number.isFinite(index) ? index : null;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging === null) return;
    const over = slotFromPoint(e.clientX, e.clientY);
    setDragOver(over);
  };

  const onPointerUp = (slotIndex: number, e: React.PointerEvent) => {
    if (dragging === null) return;
    const over = slotFromPoint(e.clientX, e.clientY) ?? slotIndex;
    if (over !== null && over !== dragging) swapSlots(dragging, over);
    setDragging(null);
    setDragOver(null);
    setSelected(null);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div className="space-y-4">
      <div
        ref={gridRef}
        className="mx-auto grid w-full max-w-md gap-1 rounded-2xl border border-[var(--gamibar-border)] bg-[#111111] p-1.5 shadow-[var(--shadow-soft)]"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {slots.map((pieceId, slotIndex) => {
          const isLocked = locked.has(slotIndex);
          const isSelected = selected === slotIndex;
          const isDragTarget = dragOver === slotIndex && dragging !== slotIndex;
          const { col, row } = pieceCoords(pieceId, cols);

          return (
            <motion.button
              key={slotIndex}
              type="button"
              data-jigsaw-slot={slotIndex}
              disabled={disabled || isLocked}
              onClick={() => onSlotTap(slotIndex)}
              onPointerDown={(e) => onPointerDown(slotIndex, e)}
              onPointerMove={onPointerMove}
              onPointerUp={(e) => onPointerUp(slotIndex, e)}
              {...(!isLocked && !disabled ? { whileTap: { scale: 0.98 } } : {})}
              className={cn(
                "relative aspect-square overflow-hidden rounded-lg border-2 transition-all touch-none select-none",
                isLocked
                  ? "cursor-default border-[var(--game-jigsaw)] ring-2 ring-[var(--game-jigsaw)]/30"
                  : "cursor-grab border-white/10 active:cursor-grabbing",
                isSelected && !isLocked && "z-10 border-white ring-2 ring-white/40",
                isDragTarget && "border-[var(--game-jigsaw)] bg-[var(--game-jigsaw-soft)]/20",
              )}
              style={{
                backgroundImage: `url(${imageUrl})`,
                ...sliceStyle(pieceId, cols, rows),
              }}
              aria-label={`Puzzle piece ${col + 1}, ${row + 1}${isLocked ? ", locked" : ""}`}
            >
              {isLocked && (
                <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-[var(--game-jigsaw)] text-white shadow-sm">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      <p className="text-center text-xs text-[#737373]">
        {done
          ? "Image restored - waiting for results."
          : "Tap two pieces to swap, or drag one onto another. Correct pieces lock in place."}
      </p>
    </div>
  );
}
