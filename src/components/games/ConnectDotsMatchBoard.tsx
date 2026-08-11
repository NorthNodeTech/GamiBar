import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  canExtendRoutePath,
  isOrthogonalRouteStep,
  isRouteCellInGrid,
  routeCellCenter,
  routeCellKey,
  routeCellsEqual,
  routingGridSize,
  validateRoutePath,
  type RouteCell,
  type RoutePoint,
} from "@/lib/game/connect-dots-path-geometry";
import {
  pairColor,
  shuffledAnswerOrder,
  type ConnectDotsMatchMap,
} from "@/lib/game/connect-dots-content";
import type { ConnectDotsContentPair } from "@/lib/game/types";
import { cn } from "@/lib/utils";

type Side = "question" | "answer";

type Endpoint = {
  side: Side;
  pairId: string;
};

type DotPoint = RoutePoint;

type GridRect = { x: number; y: number; width: number; height: number };

type ConnectDotsMatchBoardProps = {
  pairs: ConnectDotsContentPair[];
  shuffleSeed: string;
  disabled?: boolean;
  /** Student finished — freeze board and hide disconnect affordance. */
  completed?: boolean;
  onProgress?: (matched: number, total: number) => void;
  onMatchesChange?: (matches: ConnectDotsMatchMap) => void;
  onComplete?: (matches: ConnectDotsMatchMap, routes: Record<string, RouteCell[]>) => void;
  /** Restore a finished or in-progress board (e.g. after reconnect). */
  initialMatches?: ConnectDotsMatchMap;
  initialRoutes?: Record<string, RouteCell[]>;
  className?: string;
};

const NEUTRAL_DOT = "#94A3B8";

function dotKey(endpoint: Endpoint): string {
  return `${endpoint.side}:${endpoint.pairId}`;
}

function pathToPolyline(
  cells: RouteCell[],
  gridRect: GridRect,
  rows: number,
  cols: number,
  startAnchor: DotPoint | null,
  endAnchor: DotPoint | null,
): string {
  if (cells.length === 0) return "";
  const points: DotPoint[] = [];
  if (startAnchor) points.push(startAnchor);
  for (const cell of cells) {
    points.push(routeCellCenter(cell, gridRect, rows, cols));
  }
  if (endAnchor) points.push(endAnchor);
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

export function ConnectDotsMatchBoard({
  pairs,
  shuffleSeed,
  disabled = false,
  completed = false,
  onProgress,
  onMatchesChange,
  onComplete,
  className,
  initialMatches,
  initialRoutes,
}: ConnectDotsMatchBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const completedRef = useRef(false);
  const drawingRef = useRef(false);

  const { rows, cols } = useMemo(() => routingGridSize(pairs.length), [pairs.length]);

  const [dotPositions, setDotPositions] = useState<Map<string, DotPoint>>(new Map());
  const [gridRect, setGridRect] = useState<GridRect | null>(null);
  const [lockedRoutes, setLockedRoutes] = useState<Map<string, RouteCell[]>>(() => {
    if (!initialRoutes) return new Map();
    return new Map(Object.entries(initialRoutes));
  });
  const [locked, setLocked] = useState<ConnectDotsMatchMap>(() => initialMatches ?? {});
  const [draft, setDraft] = useState<{ pairId: string; from: Side; cells: RouteCell[] } | null>(
    null,
  );
  const [rejectPath, setRejectPath] = useState<{ pairId: string; cells: RouteCell[] } | null>(
    null,
  );
  const [collisionHint, setCollisionHint] = useState(false);

  const pairById = useMemo(() => new Map(pairs.map((p) => [p.id, p])), [pairs]);
  const answerOrder = useMemo(
    () => shuffledAnswerOrder(pairs.map((p) => p.id), shuffleSeed),
    [pairs, shuffleSeed],
  );
  const colorByPairId = useMemo(
    () => new Map(pairs.map((p, i) => [p.id, pairColor(i)])),
    [pairs],
  );

  const lockedPairIds = useMemo(() => new Set(Object.keys(locked)), [locked]);
  const matchedCount = lockedPairIds.size;

  const questionRow = useCallback(
    (pairId: string) => pairs.findIndex((p) => p.id === pairId),
    [pairs],
  );
  const answerRow = useCallback(
    (pairId: string) => answerOrder.indexOf(pairId),
    [answerOrder],
  );

  const entryCell = useCallback(
    (pairId: string): RouteCell => ({ r: questionRow(pairId), c: 0 }),
    [questionRow],
  );
  const exitCell = useCallback(
    (pairId: string): RouteCell => ({ r: answerRow(pairId), c: cols - 1 }),
    [answerRow, cols],
  );

  const measureLayout = useCallback(() => {
    const board = boardRef.current;
    const grid = gridRef.current;
    if (!board || !grid) return;

    const boardRect = board.getBoundingClientRect();
    const gridBounds = grid.getBoundingClientRect();

    setGridRect({
      x: gridBounds.left - boardRect.left,
      y: gridBounds.top - boardRect.top,
      width: gridBounds.width,
      height: gridBounds.height,
    });

    const nextDots = new Map<string, DotPoint>();
    for (const [key, el] of dotRefs.current) {
      const rect = el.getBoundingClientRect();
      nextDots.set(key, {
        x: rect.left + rect.width / 2 - boardRect.left,
        y: rect.top + rect.height / 2 - boardRect.top,
      });
    }
    setDotPositions(nextDots);
  }, []);

  useLayoutEffect(() => {
    measureLayout();
    const board = boardRef.current;
    if (!board) return;
    const observer = new ResizeObserver(() => measureLayout());
    observer.observe(board);
    return () => observer.disconnect();
  }, [measureLayout, pairs, answerOrder, rows, cols]);

  useEffect(() => {
    onProgress?.(matchedCount, pairs.length);
  }, [matchedCount, pairs.length, onProgress]);

  useEffect(() => {
    onMatchesChange?.(locked);
  }, [locked, onMatchesChange]);

  const frozen = disabled || completed;

  useEffect(() => {
    if (completed) completedRef.current = true;
  }, [completed]);

  useEffect(() => {
    if (disabled || completedRef.current) return;
    if (matchedCount === pairs.length && pairs.length > 0) {
      completedRef.current = true;
      onComplete?.(locked, Object.fromEntries(lockedRoutes));
    }
  }, [disabled, completed, locked, lockedRoutes, matchedCount, onComplete, pairs.length]);

  const dotFor = useCallback(
    (endpoint: Endpoint): DotPoint | null => dotPositions.get(dotKey(endpoint)) ?? null,
    [dotPositions],
  );

  const registerDot = useCallback((endpoint: Endpoint, el: HTMLButtonElement | null) => {
    const key = dotKey(endpoint);
    if (el) dotRefs.current.set(key, el);
    else dotRefs.current.delete(key);
  }, []);

  const cellFromPointer = useCallback(
    (clientX: number, clientY: number): RouteCell | null => {
      const grid = gridRef.current;
      if (!grid) return null;
      const rect = grid.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
      const c = Math.floor((x / rect.width) * cols);
      const r = Math.floor((y / rect.height) * rows);
      if (!isRouteCellInGrid({ r, c }, rows, cols)) return null;
      return { r, c };
    },
    [cols, rows],
  );

  const hitTestEndpoint = useCallback((clientX: number, clientY: number): Endpoint | null => {
    const threshold = 28;
    for (const [key, el] of dotRefs.current) {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      if (Math.hypot(clientX - cx, clientY - cy) <= threshold) {
        const [side, pairId] = key.split(":") as [Side, string];
        return { side, pairId };
      }
    }
    return null;
  }, []);

  const flashRejectPath = useCallback((pairId: string, cells: RouteCell[]) => {
    setRejectPath({ pairId, cells });
    window.setTimeout(() => setRejectPath(null), 420);
  }, []);

  const flashCollision = useCallback(() => {
    setCollisionHint(true);
    window.setTimeout(() => setCollisionHint(false), 280);
  }, []);

  const disconnectPair = useCallback(
    (pairId: string) => {
      if (frozen || completed) return;
      completedRef.current = false;
      setLockedRoutes((prev) => {
        const next = new Map(prev);
        next.delete(pairId);
        return next;
      });
      setLocked((prev) => {
        if (!prev[pairId]) return prev;
        const next = { ...prev };
        delete next[pairId];
        return next;
      });
    },
    [completed, frozen],
  );

  const tryLockPath = useCallback(
    (pairId: string, cells: RouteCell[]) => {
      if (frozen || !gridRect) return;
      if (lockedPairIds.has(pairId)) return;

      const validation = validateRoutePath(
        cells,
        rows,
        cols,
        lockedRoutes,
        gridRect,
        pairId,
        entryCell(pairId),
        exitCell(pairId),
      );

      if (!validation.ok) {
        flashRejectPath(pairId, cells);
        return;
      }

      setLockedRoutes((prev) => new Map(prev).set(pairId, cells));
      setLocked((prev) => ({ ...prev, [pairId]: pairId }));
    },
    [cols, completed, entryCell, exitCell, flashRejectPath, frozen, gridRect, lockedPairIds, lockedRoutes, rows],
  );

  const beginFromEndpoint = useCallback(
    (endpoint: Endpoint) => {
      if (frozen || !gridRect) return;
      if (lockedPairIds.has(endpoint.pairId)) return;

      const startCell =
        endpoint.side === "question" ? entryCell(endpoint.pairId) : exitCell(endpoint.pairId);
      drawingRef.current = true;
      setDraft({ pairId: endpoint.pairId, from: endpoint.side, cells: [startCell] });
    },
    [entryCell, exitCell, frozen, gridRect, lockedPairIds],
  );

  const extendDraft = useCallback(
    (cell: RouteCell) => {
      if (!draft || !gridRect) return;

      setDraft((prev) => {
        if (!prev) return prev;
        const path = prev.cells;
        const last = path[path.length - 1]!;

        const idx = path.findIndex((c) => routeCellsEqual(c, cell));
        if (idx >= 0) return { ...prev, cells: path.slice(0, idx + 1) };

        if (!isOrthogonalRouteStep(last, cell)) return prev;

        if (!canExtendRoutePath(path, cell, rows, cols, lockedRoutes, gridRect, prev.pairId)) {
          flashCollision();
          return prev;
        }

        return { ...prev, cells: [...path, cell] };
      });
    },
    [cols, draft, flashCollision, gridRect, lockedRoutes, rows],
  );

  const endDrawing = useCallback(
    (clientX: number, clientY: number) => {
      if (!draft || !gridRect) {
        drawingRef.current = false;
        setDraft(null);
        return;
      }

      const endpoint = hitTestEndpoint(clientX, clientY);
      drawingRef.current = false;

      if (endpoint && endpoint.side !== draft.from) {
        if (endpoint.pairId !== draft.pairId) {
          flashRejectPath(draft.pairId, draft.cells);
          setDraft(null);
          return;
        }

        const targetCell =
          endpoint.side === "answer" ? exitCell(draft.pairId) : entryCell(draft.pairId);
        const path = draft.cells;
        const last = path[path.length - 1]!;

        let finalPath = path;
        if (!routeCellsEqual(last, targetCell)) {
          if (
            isOrthogonalRouteStep(last, targetCell) &&
            canExtendRoutePath(path, targetCell, rows, cols, lockedRoutes, gridRect, draft.pairId)
          ) {
            finalPath = [...path, targetCell];
          } else {
            flashRejectPath(draft.pairId, path);
            setDraft(null);
            return;
          }
        }

        tryLockPath(draft.pairId, finalPath);
      }

      setDraft(null);
    },
    [
      draft,
      entryCell,
      exitCell,
      flashRejectPath,
      gridRect,
      hitTestEndpoint,
      lockedRoutes,
      rows,
      cols,
      tryLockPath,
    ],
  );

  useEffect(() => {
    if (!draft) return;

    const handleMove = (e: PointerEvent) => {
      if (!drawingRef.current) return;
      const cell = cellFromPointer(e.clientX, e.clientY);
      if (cell) extendDraft(cell);
    };

    const handleUp = (e: PointerEvent) => {
      if (!drawingRef.current) return;
      endDrawing(e.clientX, e.clientY);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [cellFromPointer, draft, endDrawing, extendDraft]);

  const onGridPointerDown = (e: React.PointerEvent) => {
    if (frozen || !gridRect) return;
    const cell = cellFromPointer(e.clientX, e.clientY);
    if (!cell) return;

    if (draft) {
      extendDraft(cell);
      return;
    }

    for (const pair of pairs) {
      if (lockedPairIds.has(pair.id)) continue;
      if (routeCellsEqual(cell, entryCell(pair.id))) {
        e.preventDefault();
        beginFromEndpoint({ side: "question", pairId: pair.id });
        return;
      }
      if (routeCellsEqual(cell, exitCell(pair.id))) {
        e.preventDefault();
        beginFromEndpoint({ side: "answer", pairId: pair.id });
        return;
      }
    }
  };

  const renderDot = (endpoint: Endpoint, align: "left" | "right") => {
    const pair = pairById.get(endpoint.pairId);
    if (!pair) return null;
    const isLocked = lockedPairIds.has(endpoint.pairId);
    const color = colorByPairId.get(endpoint.pairId) ?? pairColor(0);

    return (
      <button
        type="button"
        ref={(el) => registerDot(endpoint, el)}
        disabled={frozen}
        aria-label={
          endpoint.side === "question"
            ? `Connection point for question ${pair.question}`
            : `Connection point for answer ${pair.answer}`
        }
        onClick={() => {
          if (isLocked && !completed) disconnectPair(endpoint.pairId);
        }}
        onPointerDown={(e) => {
          if (isLocked || frozen) return;
          e.preventDefault();
          beginFromEndpoint(endpoint);
        }}
        className={cn(
          "relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 transition-transform",
          align === "left" ? "-mr-1" : "-ml-1",
          isLocked
            ? "scale-110 border-white shadow-md"
            : "border-[var(--gamibar-border)] bg-white hover:scale-105",
          frozen && "cursor-default",
        )}
        style={isLocked ? { backgroundColor: color } : undefined}
      >
        {!isLocked && (
          <span className="size-3 rounded-full" style={{ backgroundColor: NEUTRAL_DOT }} aria-hidden />
        )}
      </button>
    );
  };

  const renderRoutePath = (
    pairId: string,
    cells: RouteCell[],
    opts?: { dashed?: boolean; opacity?: number; reject?: boolean; strokeOverride?: string },
  ) => {
    if (!gridRect || cells.length === 0) return null;
    const color = opts?.reject
      ? "#EF4444"
      : (opts?.strokeOverride ?? colorByPairId.get(pairId) ?? pairColor(0));
    const qAnchor = dotFor({ side: "question", pairId });
    const aAnchor = dotFor({ side: "answer", pairId });
    const d = pathToPolyline(cells, gridRect, rows, cols, qAnchor, aAnchor);
    if (!d) return null;

    return (
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={opts?.dashed ? "6 4" : undefined}
        opacity={opts?.opacity ?? 0.92}
      />
    );
  };

  const occupiedCells = useMemo(() => {
    const set = new Set<string>();
    for (const cells of lockedRoutes.values()) {
      for (const cell of cells) set.add(routeCellKey(cell));
    }
    if (draft) {
      for (const cell of draft.cells) set.add(routeCellKey(cell));
    }
    return set;
  }, [draft, lockedRoutes]);

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          {matchedCount}/{pairs.length} pairs matched
        </p>
        {!disabled && !completed && (
          <p className="text-xs text-[var(--muted-foreground)]">
            Drag through the board · route around paths · tap a dot to undo
          </p>
        )}
      </div>

      <div
        ref={boardRef}
        className={cn(
          "relative touch-none select-none rounded-2xl border bg-white p-2 sm:p-3",
          collisionHint || rejectPath
            ? "border-[#FCA5A5] bg-[#FEF2F2]/40"
            : "border-[var(--gamibar-border)]",
        )}
        style={{ touchAction: "none" }}
      >
        <svg className="pointer-events-none absolute inset-0 z-[5] h-full w-full overflow-visible">
          {[...lockedRoutes.entries()].map(([pairId, cells]) => (
            <g key={pairId}>{renderRoutePath(pairId, cells)}</g>
          ))}

          {draft &&
            renderRoutePath(draft.pairId, draft.cells, {
              dashed: true,
              opacity: 0.7,
              strokeOverride: NEUTRAL_DOT,
            })}

          {rejectPath && renderRoutePath(rejectPath.pairId, rejectPath.cells, { reject: true, opacity: 0.85 })}
        </svg>

        <div className="relative z-10 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-1 sm:gap-2">
          <div className="grid gap-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--gamibar-text-tertiary)]">
              Questions
            </p>
            {pairs.map((pair) => {
              const isLocked = lockedPairIds.has(pair.id);
              return (
                <div
                  key={pair.id}
                  className={cn(
                    "flex min-h-[52px] items-center gap-1 rounded-xl border bg-[var(--gamibar-page)] p-2 sm:p-2.5",
                    isLocked
                      ? "border-[var(--game-connect-dots)]/40 bg-[var(--game-connect-dots-soft)]/30"
                      : "border-[var(--gamibar-border)]",
                  )}
                >
                  <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-[var(--foreground)]">
                    {pair.question}
                  </p>
                  {renderDot({ side: "question", pairId: pair.id }, "right")}
                </div>
              );
            })}
          </div>

          <div
            ref={gridRef}
            className={cn(
              "relative mx-0.5 w-[min(42vw,160px)] shrink-0 self-stretch rounded-xl border sm:w-[min(36vw,200px)]",
              collisionHint
                ? "border-[#F87171]/60 bg-[#FEE2E2]/20"
                : "border-[var(--gamibar-border)] bg-[var(--gamibar-page)]/80",
            )}
            onPointerDown={onGridPointerDown}
          >
            <svg className="pointer-events-none absolute inset-0 h-full w-full">
              {Array.from({ length: cols + 1 }, (_, ci) => (
                <line
                  key={`v-${ci}`}
                  x1={`${(ci / cols) * 100}%`}
                  y1="0%"
                  x2={`${(ci / cols) * 100}%`}
                  y2="100%"
                  stroke="#E5E7EB"
                  strokeWidth={1}
                />
              ))}
              {Array.from({ length: rows + 1 }, (_, ri) => (
                <line
                  key={`h-${ri}`}
                  x1="0%"
                  y1={`${(ri / rows) * 100}%`}
                  x2="100%"
                  y2={`${(ri / rows) * 100}%`}
                  stroke="#E5E7EB"
                  strokeWidth={1}
                />
              ))}

              {Array.from({ length: rows }, (_, r) =>
                Array.from({ length: cols }, (_, c) => {
                  const key = routeCellKey({ r, c });
                  const occupied = occupiedCells.has(key);
                  if (!occupied) return null;
                  return (
                    <rect
                      key={key}
                      x={`${(c / cols) * 100 + 100 / cols / 4}%`}
                      y={`${(r / rows) * 100 + 100 / rows / 4}%`}
                      width={`${100 / cols / 2}%`}
                      height={`${100 / rows / 2}%`}
                      rx={2}
                      fill="var(--game-connect-dots)"
                      opacity={0.12}
                    />
                  );
                }),
              )}
            </svg>
          </div>

          <div className="grid gap-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--gamibar-text-tertiary)]">
              Answers
            </p>
            {answerOrder.map((pairId) => {
              const pair = pairById.get(pairId);
              if (!pair) return null;
              const isLocked = lockedPairIds.has(pairId);
              return (
                <div
                  key={`answer-${pairId}`}
                  className={cn(
                    "flex min-h-[52px] items-center gap-1 rounded-xl border bg-[var(--gamibar-page)] p-2 sm:p-2.5",
                    isLocked
                      ? "border-[var(--game-connect-dots)]/40 bg-[var(--game-connect-dots-soft)]/30"
                      : "border-[var(--gamibar-border)]",
                  )}
                >
                  {renderDot({ side: "answer", pairId }, "left")}
                  <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-[var(--foreground)]">
                    {pair.answer}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
