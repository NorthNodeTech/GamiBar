import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { nextLiveMessage } from "@/lib/accessibility";
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
  fromSlot: number | null;
};

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return coarse;
}

export function JigsawMissionAssembly({
  imageUrl,
  cols,
  rows,
  onSubmit,
  submitting = false,
  submitMessage,
  initialPlacements,
}: {
  imageUrl: string;
  cols: number;
  rows: number;
  onSubmit: (layout: number[]) => void;
  submitting?: boolean;
  submitMessage?: string | null;
  initialPlacements?: Array<number | null>;
}) {
  const total = cols * rows;
  const boardRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<Array<HTMLDivElement | null>>([]);
  const coarsePointer = useCoarsePointer();
  const snapRatio = coarsePointer ? 0.52 : SNAP_RATIO;

  const [placements, setPlacements] = useState<Array<number | null>>(() => {
    if (initialPlacements && initialPlacements.length === total) {
      return initialPlacements.map((piece) =>
        typeof piece === "number" && piece >= 0 ? piece : null,
      );
    }
    return Array.from({ length: total }, () => null);
  });
  const [trayOrder] = useState(() => shufflePieceIds(total));
  const [drag, setDrag] = useState<DragState | null>(null);
  const [snapSlot, setSnapSlot] = useState<number | null>(null);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const [liveMessage, setLiveMessage] = useState("");

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
        const threshold = Math.min(rect.width, rect.height) * snapRatio;
        const dist = Math.hypot(clientX - cx, clientY - cy);
        if (dist <= threshold && (!best || dist < best.dist)) {
          best = { index: i, dist };
        }
      }
      return best?.index ?? null;
    },
    [total, snapRatio],
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
        nextLiveMessage(`Piece ${pieceId + 1} placed in slot ${slot + 1}.`, setLiveMessage);
      } else if (fromSlot != null) {
        removeFromSlot(fromSlot);
        nextLiveMessage(`Piece ${pieceId + 1} returned to the tray.`, setLiveMessage);
      }
      setDrag(null);
      setSnapSlot(null);
      setDragPoint(null);
    },
    [nearestSlot, placePiece, removeFromSlot],
  );

  const startDrag = (pieceId: number, e: React.PointerEvent, fromSlot: number | null = null) => {
    if (submitting) return;
    e.preventDefault();
    setDrag({ pieceId, pointerId: e.pointerId, fromSlot });
    setDragPoint({ x: e.clientX, y: e.clientY });
    nextLiveMessage(
      fromSlot != null
        ? `Moving piece ${pieceId + 1} from slot ${fromSlot + 1}.`
        : `Moving piece ${pieceId + 1} from the tray.`,
      setLiveMessage,
    );
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  useEffect(() => {
    if (!drag) return;

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      onDragMove(e.clientX, e.clientY);
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      finishDrag(
        drag.pieceId,
        e.clientX,
        e.clientY,
        drag.fromSlot ?? undefined,
      );
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [drag, finishDrag, onDragMove]);

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
        className="pointer-events-none fixed z-50 aspect-square w-[min(24vw,96px)] -translate-x-1/2 -translate-y-1/2 opacity-95 shadow-xl sm:w-[min(18vw,96px)]"
        style={{ left: dragPoint.x, top: dragPoint.y }}
      >
        {renderPieceFace(drag.pieceId, "ring-2 ring-[var(--game-jigsaw)]")}
      </div>
    ) : null;

  return (
    <div className="touch-none space-y-4 select-none" style={{ touchAction: "none" }}>
      <p className="sr-only" role="status" aria-live="polite">
        {liveMessage}
      </p>
      <div
        ref={boardRef}
        role="group"
        aria-label="Puzzle board"
        className="mx-auto grid w-full max-w-[min(100%,22rem)] gap-1 rounded-2xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] p-1.5 shadow-[var(--shadow-soft)] focus-within:ring-2 focus-within:ring-[var(--ring)] focus-within:ring-offset-2 sm:max-w-md sm:p-2"
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
                  className="absolute inset-0 cursor-grab touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 active:cursor-grabbing"
                  aria-label={`Puzzle piece ${pieceId + 1} in slot ${slotIndex + 1}. Drag to move.`}
                  aria-grabbed={drag?.pieceId === pieceId}
                  onPointerDown={(e) => startDrag(pieceId, e, slotIndex)}
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
                "aspect-square w-[min(22vw,76px)] shrink-0 cursor-grab touch-manipulation rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 active:cursor-grabbing sm:w-16",
                drag?.pieceId === pieceId && "opacity-30",
              )}
              aria-label={`Puzzle piece ${pieceId + 1} in tray. Drag onto the board.`}
              aria-grabbed={drag?.pieceId === pieceId}
              onPointerDown={(e) => startDrag(pieceId, e)}
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
