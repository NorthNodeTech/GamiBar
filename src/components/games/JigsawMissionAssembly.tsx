import { useCallback, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  allSlotsFilled,
  pieceSliceStyle,
  shufflePieceIds,
} from "@/lib/game/jigsaw-assembly";
import { cn } from "@/lib/utils";

const SNAP_RATIO = 0.42;

type DragState = {
  pieceId: number;
  pointerId: number;
};

export function JigsawMissionAssembly({
  imageUrl,
  cols,
  rows,
  onSubmit,
  submitting = false,
  submitMessage,
}: {
  imageUrl: string;
  cols: number;
  rows: number;
  onSubmit: (layout: number[]) => void;
  submitting?: boolean;
  submitMessage?: string | null;
}) {
  const total = cols * rows;
  const boardRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<Array<HTMLDivElement | null>>([]);

  const [placements, setPlacements] = useState<Array<number | null>>(() =>
    Array.from({ length: total }, () => null),
  );
  const [trayOrder] = useState(() => shufflePieceIds(total));
  const [drag, setDrag] = useState<DragState | null>(null);
  const [snapSlot, setSnapSlot] = useState<number | null>(null);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);

  const trayPieces = useMemo(() => {
    const placed = new Set(placements.filter((p): p is number => p != null));
    return trayOrder.filter((id) => !placed.has(id));
  }, [placements, trayOrder, total]);

  const nearestSlot = useCallback(
    (clientX: number, clientY: number): number | null => {
      let best: { index: number; dist: number } | null = null;
      for (let i = 0; i < total; i++) {
        const el = slotRefs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const threshold = Math.min(rect.width, rect.height) * SNAP_RATIO;
        const dist = Math.hypot(clientX - cx, clientY - cy);
        if (dist <= threshold && (!best || dist < best.dist)) {
          best = { index: i, dist };
        }
      }
      return best?.index ?? null;
    },
    [total],
  );

  const placePiece = useCallback(
    (pieceId: number, slotIndex: number) => {
      setPlacements((prev) => {
        const next = [...prev];
        const existingSlot = next.findIndex((p) => p === pieceId);
        if (existingSlot >= 0) next[existingSlot] = null;
        const displaced = next[slotIndex];
        next[slotIndex] = pieceId;
        if (displaced != null && displaced !== pieceId && existingSlot >= 0) {
          next[existingSlot] = displaced;
        }
        return next;
      });
    },
    [],
  );

  const removeFromSlot = useCallback((slotIndex: number) => {
    setPlacements((prev) => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
  }, []);

  const onDragMove = useCallback(
    (clientX: number, clientY: number) => {
      setDragPoint({ x: clientX, y: clientY });
      setSnapSlot(nearestSlot(clientX, clientY));
    },
    [nearestSlot],
  );

  const finishDrag = useCallback(
    (pieceId: number, clientX: number, clientY: number, fromSlot?: number) => {
      const slot = nearestSlot(clientX, clientY);
      if (slot != null) {
        placePiece(pieceId, slot);
      } else if (fromSlot != null) {
        removeFromSlot(fromSlot);
      }
      setDrag(null);
      setSnapSlot(null);
      setDragPoint(null);
    },
    [nearestSlot, placePiece, removeFromSlot],
  );

  const startDrag = (pieceId: number, e: React.PointerEvent) => {
    if (submitting) return;
    e.preventDefault();
    setDrag({ pieceId, pointerId: e.pointerId });
    setDragPoint({ x: e.clientX, y: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleSubmit = () => {
    if (!allSlotsFilled(placements)) {
      onSubmit(placements.map((p) => p ?? -1));
      return;
    }
    onSubmit(placements.map((p) => p as number));
  };

  const renderPieceFace = (pieceId: number, className?: string) => (
    <div
      className={cn(
        "size-full rounded-lg border-2 border-white/20 bg-[#111] shadow-md touch-none select-none",
        className,
      )}
      style={{
        backgroundImage: `url(${imageUrl})`,
        ...pieceSliceStyle(pieceId, cols, rows),
      }}
      aria-hidden
    />
  );

  const floatingPiece =
    drag != null && dragPoint ? (
      <div
        className="pointer-events-none fixed z-50 aspect-square w-[min(22vw,88px)] -translate-x-1/2 -translate-y-1/2 opacity-95 shadow-xl sm:w-[min(18vw,96px)]"
        style={{ left: dragPoint.x, top: dragPoint.y }}
      >
        {renderPieceFace(drag.pieceId, "ring-2 ring-[var(--game-jigsaw)]")}
      </div>
    ) : null;

  return (
    <div className="space-y-4">
      <div
        ref={boardRef}
        className="mx-auto grid w-full max-w-md gap-1 rounded-2xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] p-1.5 shadow-[var(--shadow-soft)]"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: total }, (_, slotIndex) => {
          const pieceId = placements[slotIndex];
          const isSnapTarget = snapSlot === slotIndex && drag != null;
          const showGhost = isSnapTarget && drag != null;

          return (
            <div
              key={slotIndex}
              ref={(el) => {
                slotRefs.current[slotIndex] = el;
              }}
              className={cn(
                "relative aspect-square rounded-lg border-2 border-dashed transition-colors",
                isSnapTarget
                  ? "border-[var(--game-jigsaw)] bg-[var(--game-jigsaw-soft)]/30"
                  : "border-[var(--gamibar-border)] bg-white/60",
              )}
            >
              {showGhost && renderPieceFace(drag.pieceId, "opacity-40")}
              {pieceId != null && drag?.pieceId !== pieceId && (
                <button
                  type="button"
                  className="absolute inset-0 cursor-grab active:cursor-grabbing"
                  aria-label="Puzzle piece"
                  onPointerDown={(e) => startDrag(pieceId, e)}
                  onPointerMove={(e) => {
                    if (drag?.pointerId !== e.pointerId) return;
                    onDragMove(e.clientX, e.clientY);
                  }}
                  onPointerUp={(e) => {
                    if (drag?.pointerId !== e.pointerId) return;
                    finishDrag(pieceId, e.clientX, e.clientY, slotIndex);
                    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                  }}
                  onPointerCancel={(e) => {
                    if (drag?.pointerId !== e.pointerId) return;
                    removeFromSlot(slotIndex);
                    setDrag(null);
                    setSnapSlot(null);
                    setDragPoint(null);
                  }}
                >
                  {renderPieceFace(pieceId)}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-[var(--gamibar-border)] bg-white p-3 sm:p-4">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Piece tray
        </p>
        <div className="flex min-h-[4.5rem] flex-wrap justify-center gap-2">
          {trayPieces.map((pieceId) => (
            <button
              key={pieceId}
              type="button"
              className={cn(
                "aspect-square w-[min(20vw,72px)] shrink-0 cursor-grab rounded-lg active:cursor-grabbing sm:w-16",
                drag?.pieceId === pieceId && "opacity-30",
              )}
              aria-label="Puzzle piece"
              onPointerDown={(e) => startDrag(pieceId, e)}
              onPointerMove={(e) => {
                if (drag?.pointerId !== e.pointerId) return;
                onDragMove(e.clientX, e.clientY);
              }}
              onPointerUp={(e) => {
                if (drag?.pointerId !== e.pointerId) return;
                finishDrag(pieceId, e.clientX, e.clientY);
                (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
              }}
              onPointerCancel={() => {
                setDrag(null);
                setSnapSlot(null);
                setDragPoint(null);
              }}
            >
              {renderPieceFace(pieceId)}
            </button>
          ))}
          {trayPieces.length === 0 && (
            <p className="py-4 text-center text-xs text-[var(--muted-foreground)]">
              All pieces are on the board
            </p>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-[var(--muted-foreground)]">
        Drag pieces onto the board. They snap when close to a slot. Arrange the full image, then submit.
      </p>

      {submitMessage && (
        <p
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-900"
          role="alert"
        >
          {submitMessage}
        </p>
      )}

      <Button
        type="button"
        className="h-12 w-full rounded-xl bg-[var(--foreground)] text-[var(--background)] hover:opacity-90"
        disabled={submitting}
        onClick={handleSubmit}
      >
        {submitting ? "Checking…" : "Submit puzzle"}
      </Button>

      {floatingPiece}
    </div>
  );
}
