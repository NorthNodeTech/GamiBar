import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { JigsawMissionSkeletonBoard } from "@/components/games/JigsawMissionSkeletonBoard";
import {
  ASSEMBLY_PILE_CARD_SIZE,
  JigsawMissionScrambledTiles,
  pieceIndexFromTileId,
  tileIdFromPieceIndex,
} from "@/components/games/JigsawMissionScrambledTiles";
import { JigsawTileCardVisual } from "@/components/games/JigsawTileCardVisual";
import { JigsawTileFace } from "@/components/games/JigsawTileFace";
import { nextLiveMessage } from "@/lib/accessibility";
import {
  jigsawAssemblyValidationMessage,
  layoutFromPlacements,
  validateJigsawAssembly,
} from "@/lib/game/jigsaw-assembly";
import {
  ASSEMBLY_DRAG_THRESHOLD_COARSE_PX,
  ASSEMBLY_DRAG_THRESHOLD_PX,
  ASSEMBLY_SNAP_RATIO,
  ASSEMBLY_SNAP_RATIO_COARSE,
  findSnapSlot,
} from "@/lib/game/jigsaw-assembly-drag";
import { pointerMovedBeyondTapThreshold } from "@/lib/game/jigsaw-tile-interaction";
import type { TileLayoutMap, TileRotationMap } from "@/lib/game/jigsaw-tile-rewards";
import { buildJigsawTiles, type JigsawTileCardRotation } from "@/lib/game/jigsaw-tiles";
import { cn } from "@/lib/utils";

type DragState = {
  pieceId: number;
  tileId: string;
  pointerId: number;
  fromSlot: number | null;
};

type PendingDrag = {
  pieceId: number;
  tileId: string;
  pointerId: number;
  fromSlot: number | null;
  startX: number;
  startY: number;
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
  earnedTileIds,
  tileRotations,
  tileLayouts,
  onSubmit,
  onRotateTile,
  submitting = false,
  disabled = false,
  locked = false,
  assemblyCardSize = ASSEMBLY_PILE_CARD_SIZE,
  submitMessage,
  initialPlacements,
}: {
  imageUrl: string;
  cols: number;
  rows: number;
  earnedTileIds: readonly string[];
  tileRotations: Readonly<TileRotationMap>;
  tileLayouts: Readonly<TileLayoutMap>;
  onSubmit: (layout: number[]) => void;
  onRotateTile?: (tileId: string) => void;
  submitting?: boolean;
  disabled?: boolean;
  locked?: boolean;
  assemblyCardSize?: number;
  submitMessage?: string | null;
  initialPlacements?: Array<number | null>;
}) {
  const total = cols * rows;
  const tiles = useMemo(() => buildJigsawTiles(cols, rows), [cols, rows]);
  const slotRefs = useRef<Array<HTMLDivElement | null>>([]);
  const coarsePointer = useCoarsePointer();
  const snapRatio = coarsePointer ? ASSEMBLY_SNAP_RATIO_COARSE : ASSEMBLY_SNAP_RATIO;
  const dragThreshold = coarsePointer ? ASSEMBLY_DRAG_THRESHOLD_COARSE_PX : ASSEMBLY_DRAG_THRESHOLD_PX;

  const [placements, setPlacements] = useState<Array<number | null>>(() => {
    if (initialPlacements && initialPlacements.length === total) {
      return initialPlacements.map((piece) =>
        typeof piece === "number" && piece >= 0 ? piece : null,
      );
    }
    return Array.from({ length: total }, () => null);
  });

  const [drag, setDrag] = useState<DragState | null>(null);
  const [snapSlot, setSnapSlot] = useState<number | null>(null);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const [dragPieceSize, setDragPieceSize] = useState(80);
  const [landedSlot, setLandedSlot] = useState<number | null>(null);
  const [liveMessage, setLiveMessage] = useState("");
  const [localSubmitMessage, setLocalSubmitMessage] = useState<string | null>(null);

  const pendingDragRef = useRef<PendingDrag | null>(null);
  const dragStartedRef = useRef(false);
  const activeListenersRef = useRef<{
    move: (e: PointerEvent) => void;
    up: (e: PointerEvent) => void;
  } | null>(null);

  const placedIndices = useMemo(
    () => new Set(placements.filter((p): p is number => p != null)),
    [placements],
  );

  const pileTileIds = useMemo(
    () =>
      earnedTileIds.filter((id) => {
        const index = pieceIndexFromTileId(id, cols, rows);
        return index != null && !placedIndices.has(index);
      }),
    [earnedTileIds, cols, rows, placedIndices],
  );

  const draggingTileId = drag?.tileId ?? null;

  const interactionsDisabled = submitting || disabled || locked;

  const slotSnapAt = useCallback(
    (clientX: number, clientY: number) =>
      findSnapSlot(clientX, clientY, slotRefs.current, snapRatio),
    [snapRatio],
  );

  const placePiece = useCallback((pieceId: number, slotIndex: number) => {
    setPlacements((prev) => {
      const next = [...prev];
      const fromSlot = next.findIndex((p) => p === pieceId);
      if (fromSlot >= 0) next[fromSlot] = null;

      const displaced = next[slotIndex];
      next[slotIndex] = pieceId;

      if (displaced != null && displaced !== pieceId && fromSlot >= 0) {
        next[fromSlot] = displaced;
      }

      return next;
    });
    setLandedSlot(slotIndex);
    window.setTimeout(() => setLandedSlot((current) => (current === slotIndex ? null : current)), 280);
  }, []);

  const removeFromSlot = useCallback((slotIndex: number) => {
    setPlacements((prev) => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
  }, []);

  const clearActiveListeners = useCallback(() => {
    const active = activeListenersRef.current;
    if (!active) return;
    window.removeEventListener("pointermove", active.move);
    window.removeEventListener("pointerup", active.up);
    window.removeEventListener("pointercancel", active.up);
    activeListenersRef.current = null;
  }, []);

  const finishDrag = useCallback(
    (pieceId: number, clientX: number, clientY: number, fromSlot: number | null) => {
      clearActiveListeners();
      pendingDragRef.current = null;

      const slot = slotSnapAt(clientX, clientY);
      if (slot != null) {
        placePiece(pieceId, slot);
        nextLiveMessage("Puzzle piece snapped into a slot.", setLiveMessage);
      } else if (fromSlot != null) {
        removeFromSlot(fromSlot);
        nextLiveMessage("Puzzle piece returned to the pile.", setLiveMessage);
      }

      setDrag(null);
      setSnapSlot(null);
      setDragPoint(null);
    },
    [clearActiveListeners, placePiece, removeFromSlot, slotSnapAt],
  );

  const beginActiveDrag = useCallback(
    (pending: PendingDrag, clientX: number, clientY: number) => {
      dragStartedRef.current = true;
      const slotRect = slotRefs.current[0]?.getBoundingClientRect();
      if (slotRect) setDragPieceSize(slotRect.width);

      setDrag({
        pieceId: pending.pieceId,
        tileId: pending.tileId,
        pointerId: pending.pointerId,
        fromSlot: pending.fromSlot,
      });
      setDragPoint({ x: clientX, y: clientY });
      setSnapSlot(slotSnapAt(clientX, clientY));

      nextLiveMessage(
        pending.fromSlot != null
          ? "Moving puzzle piece on the board."
          : "Drag the puzzle piece onto the board.",
        setLiveMessage,
      );

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pending.pointerId) return;
        ev.preventDefault();
        setDragPoint({ x: ev.clientX, y: ev.clientY });
        setSnapSlot(slotSnapAt(ev.clientX, ev.clientY));
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pending.pointerId) return;
        ev.preventDefault();
        finishDrag(pending.pieceId, ev.clientX, ev.clientY, pending.fromSlot);
      };

      clearActiveListeners();
      activeListenersRef.current = { move: onMove, up: onUp };
      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [clearActiveListeners, finishDrag, slotSnapAt],
  );

  const onPointerDown = (
    pieceId: number,
    tileId: string,
    e: ReactPointerEvent,
    fromSlot: number | null = null,
  ) => {
    if (submitting || disabled || locked || e.button !== 0) return;
    e.preventDefault();

    dragStartedRef.current = false;
    pendingDragRef.current = {
      pieceId,
      tileId,
      pointerId: e.pointerId,
      fromSlot,
      startX: e.clientX,
      startY: e.clientY,
    };

    const onMove = (ev: PointerEvent) => {
      const pending = pendingDragRef.current;
      if (!pending || ev.pointerId !== pending.pointerId) return;

      const dx = ev.clientX - pending.startX;
      const dy = ev.clientY - pending.startY;
      if (Math.hypot(dx, dy) < dragThreshold) return;

      ev.preventDefault();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      beginActiveDrag(pending, ev.clientX, ev.clientY);
    };

    const onUp = (ev: PointerEvent) => {
      const pending = pendingDragRef.current;
      if (!pending || pending.pointerId !== ev.pointerId) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      pendingDragRef.current = null;

      if (
        !dragStartedRef.current &&
        onRotateTile &&
        !pointerMovedBeyondTapThreshold(pending.startX, pending.startY, ev.clientX, ev.clientY, dragThreshold)
      ) {
        onRotateTile(pending.tileId);
      }
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  useEffect(() => () => clearActiveListeners(), [clearActiveListeners]);

  const handleSubmit = () => {
    if (locked || interactionsDisabled) return;
    const layout = layoutFromPlacements(placements);
    const validation = validateJigsawAssembly(layout, tileRotations, total, cols, rows);
    if (!validation.ok) {
      setLocalSubmitMessage(jigsawAssemblyValidationMessage(validation.reason));
      return;
    }
    setLocalSubmitMessage(null);
    onSubmit(layout);
  };

  const displaySubmitMessage = submitMessage ?? localSubmitMessage;

  const renderPieceFace = (pieceId: number, className?: string) => {
    const tile = tiles[pieceId];
    if (!tile) return null;
    const rotation = tileRotations[tile.id] ?? (0 as JigsawTileCardRotation);
    return (
      <JigsawTileCardVisual rotation={rotation}>
        <JigsawTileFace
          col={tile.col}
          row={tile.row}
          cols={cols}
          rows={rows}
          imageUrl={imageUrl}
          className={cn(
            "size-full rounded-md border-2 border-white/20 shadow-md touch-none select-none",
            className,
          )}
        />
      </JigsawTileCardVisual>
    );
  };

  const floatingPiece =
    drag != null && dragPoint ? (
      <motion.div
        className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 opacity-95 shadow-2xl"
        style={{
          left: dragPoint.x,
          top: dragPoint.y,
          width: dragPieceSize,
          height: dragPieceSize,
        }}
        initial={{ scale: 1.04 }}
        animate={{ scale: snapSlot != null ? 0.96 : 1.02 }}
        transition={{ duration: 0.12 }}
      >
        {renderPieceFace(drag.pieceId, "ring-2 ring-[var(--game-jigsaw)]")}
      </motion.div>
    ) : null;

  return (
    <div
      className="touch-none space-y-3 select-none md:space-y-4"
      style={{ touchAction: "none" }}
      onDragStart={(e) => e.preventDefault()}
    >
      <p className="sr-only" role="status" aria-live="polite">
        {liveMessage}
      </p>

      <JigsawMissionSkeletonBoard
        cols={cols}
        rows={rows}
        slotRefs={slotRefs}
        slotClassName={(slotIndex) => {
          const isSnapTarget = snapSlot === slotIndex && drag != null;
          return isSnapTarget
            ? "border-[var(--game-jigsaw)] bg-[var(--game-jigsaw-soft)]/30 ring-2 ring-[var(--game-jigsaw)]/35"
            : undefined;
        }}
        renderSlot={(slotIndex) => {
          const pieceId = placements[slotIndex];
          const showGhost = snapSlot === slotIndex && drag != null;
          const justLanded = landedSlot === slotIndex;

          return (
            <>
              {showGhost && drag ? renderPieceFace(drag.pieceId, "opacity-45") : null}
              {pieceId != null && drag?.pieceId !== pieceId && (
                <motion.div
                  key={`${slotIndex}-${pieceId}`}
                  initial={justLanded ? { scale: 0.88, opacity: 0.7 } : false}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 460, damping: 28 }}
                  className="absolute inset-0"
                >
                  <button
                    type="button"
                    className="size-full cursor-grab touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 active:cursor-grabbing"
                    style={{ touchAction: "none" }}
                    aria-label="Puzzle piece on the board. Tap to rotate. Drag to move."
                    aria-grabbed={drag?.pieceId === pieceId}
                    onPointerDown={(e) => {
                      const tileId = tileIdFromPieceIndex(pieceId, cols, rows);
                      if (!tileId) return;
                      onPointerDown(pieceId, tileId, e, slotIndex);
                    }}
                  >
                    {renderPieceFace(pieceId)}
                  </button>
                </motion.div>
              )}
            </>
          );
        }}
      />

      <div className="rounded-2xl border border-[var(--gamibar-border)] bg-[#F3F4F6] p-2.5 sm:p-4">
        <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] sm:text-xs">
          Your puzzle pieces
        </p>
        <JigsawMissionScrambledTiles
          tileIds={pileTileIds}
          tileRotations={tileRotations}
          tileLayouts={tileLayouts}
          imageSrc={imageUrl}
          cols={cols}
          rows={rows}
          cardSize={assemblyCardSize}
          draggingTileId={draggingTileId}
          onRotateTile={onRotateTile}
          rotateDisabled={interactionsDisabled}
          onTilePointerDown={(tileId, e) => {
            const pieceId = pieceIndexFromTileId(tileId, cols, rows);
            if (pieceId == null) return;
            onPointerDown(pieceId, tileId, e);
          }}
          emptyMessage="All pieces are on the board"
          areaClassName="max-w-none"
        />
      </div>

      <p className="text-center text-[11px] leading-snug text-[var(--muted-foreground)] md:text-xs">
        <span className="md:hidden">Tap to rotate · drag onto the board · submit when done.</span>
        <span className="hidden md:inline">
          Tap a piece to rotate it 90°. Drag pieces onto the board — they snap into the nearest slot.
          Figure out where each tile belongs, then submit.
        </span>
      </p>

      {displaySubmitMessage && (
        <p
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-900"
          role="alert"
        >
          {displaySubmitMessage}
        </p>
      )}

      {!locked ? (
        <Button
          type="button"
          className="h-12 w-full rounded-xl bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 md:h-12"
          disabled={interactionsDisabled}
          onClick={handleSubmit}
        >
          {submitting ? "Checking…" : "Submit puzzle"}
        </Button>
      ) : null}

      {floatingPiece}
    </div>
  );
}
