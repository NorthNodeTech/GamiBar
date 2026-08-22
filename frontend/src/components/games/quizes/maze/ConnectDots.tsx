import { RotateCcw, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  cellsEqual,
  countConnectedPairs,
  isOrthogonalStep,
  validateConnectDotsPaths,
  type Cell,
  type ConnectDotsPublicBoard,
  type ConnectDotsSolution,
  type PathMap,
} from "@shared/game/connect-dots";
import { cn } from "@/lib/utils";

type ConnectDotsProps = {
  board: ConnectDotsPublicBoard;
  disabled?: boolean;
  /** Hide Undo/Restart (e.g. author preview). */
  showControls?: boolean;
  initialPaths?: PathMap;
  /** Pre-computed maze paths — enables dot-to-dot linking with auto routing. */
  solution?: ConnectDotsSolution;
  /** Force dot-link mode (defaults to true when solution is provided). */
  linkMode?: boolean;
  onProgress?: (connectedPairs: number, total: number) => void;
  onPathsChange?: (paths: PathMap) => void;
  onComplete?: (paths: PathMap) => void;
  /** Called when the student links two dots that are not a correct pair. */
  onIncorrectLink?: () => void;
  /** Scale the board to fit a bounded parent (e.g. completion summary card). */
  fitToContainer?: boolean;
  className?: string;
};

type EndpointInfo = { pairId: string; side: "a" | "b"; cell: Cell };

function keyOf(cell: Cell) {
  return `${cell.r},${cell.c}`;
}

function endpointInfo(board: ConnectDotsPublicBoard, cell: Cell): EndpointInfo | null {
  for (const p of board.pairs) {
    if (cellsEqual(p.a, cell)) return { pairId: p.id, side: "a", cell };
    if (cellsEqual(p.b, cell)) return { pairId: p.id, side: "b", cell };
  }
  return null;
}

function endpointPairId(board: ConnectDotsPublicBoard, cell: Cell): string | null {
  return endpointInfo(board, cell)?.pairId ?? null;
}

function truncateLabel(text: string, max = 14): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function endpointLabel(pair: ConnectDotsPublicBoard["pairs"][number], idx: 0 | 1): string {
  const text = idx === 0 ? pair.question : pair.answer;
  if (text?.trim()) return truncateLabel(text);
  return String(pair.label);
}

function endpointTooltip(pair: ConnectDotsPublicBoard["pairs"][number], idx: 0 | 1): string {
  const text = idx === 0 ? pair.question : pair.answer;
  return text?.trim() ?? "";
}

function pairById(board: ConnectDotsPublicBoard, id: string) {
  return board.pairs.find((p) => p.id === id);
}

function labelFontSize(text: string, cellSize: number): number {
  const len = text.length;
  if (len <= 8) return cellSize * 0.22;
  if (len <= 12) return cellSize * 0.17;
  return cellSize * 0.13;
}

function cellCenter(cell: Cell, cellSize: number) {
  return {
    x: cell.c * cellSize + cellSize / 2,
    y: cell.r * cellSize + cellSize / 2,
  };
}

function pathOverlapsOccupied(
  path: Cell[],
  occupied: Map<string, string>,
  pairId: string,
): boolean {
  for (const cell of path) {
    const owner = occupied.get(keyOf(cell));
    if (owner && owner !== pairId) return true;
  }
  return false;
}

const UNCONNECTED_DOT = "#111111";
const DRAFT_PATH = "#525252";

type SelectedDotInfo = {
  text: string;
  label: string;
  color: string;
  pairId: string;
  side: "a" | "b";
  cell: Cell;
  x: number;
  y: number;
};

export function ConnectDots({
  board,
  disabled = false,
  showControls = true,
  initialPaths,
  solution,
  linkMode,
  onProgress,
  onPathsChange,
  onComplete,
  onIncorrectLink,
  fitToContainer = false,
  className,
}: ConnectDotsProps) {
  const n = board.gridSize;
  const cellSize = 100 / n;
  const hasContent = board.pairs.some((p) => p.question?.trim() || p.answer?.trim());
  /** Manual grid drawing — never auto-apply solution paths unless explicitly opted in. */
  const useLinkMode = linkMode === true;

  const [paths, setPaths] = useState<PathMap>(() => initialPaths ?? {});
  const skipInitialEmit = useRef(Boolean(initialPaths && Object.keys(initialPaths).length > 0));
  const [draft, setDraft] = useState<Cell[]>([]);
  const [activePairId, setActivePairId] = useState<string | null>(null);
  const [history, setHistory] = useState<PathMap[]>([]);
  const completedRef = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const drawingRef = useRef(false);

  const [linkFrom, setLinkFrom] = useState<EndpointInfo | null>(null);
  const [pointerPreview, setPointerPreview] = useState<{ x: number; y: number } | null>(null);
  const [rejectFlash, setRejectFlash] = useState<string | null>(null);
  const [selectedDot, setSelectedDot] = useState<SelectedDotInfo | null>(null);

  const lockedPairIds = useMemo(
    () =>
      new Set(
        Object.entries(paths)
          .filter(([, path]) => path.length >= 2)
          .map(([id]) => id),
      ),
    [paths],
  );

  const occupied = useMemo(() => {
    const map = new Map<string, string>();
    for (const [pairId, path] of Object.entries(paths)) {
      if (activePairId === pairId) continue;
      for (const cell of path) map.set(keyOf(cell), pairId);
    }
    return map;
  }, [paths, activePairId]);

  const connected = countConnectedPairs(board, paths);

  useEffect(() => {
    onProgress?.(connected, board.pairs.length);
  }, [connected, board.pairs.length, onProgress]);

  useEffect(() => {
    if (skipInitialEmit.current) {
      skipInitialEmit.current = false;
      return;
    }
    onPathsChange?.(paths);
  }, [paths, onPathsChange]);

  useEffect(() => {
    if (disabled || completedRef.current) return;
    if (connected !== board.pairs.length || board.pairs.length === 0) return;
    const validation = validateConnectDotsPaths(board, paths, solution);
    if (!validation.ok) return;
    completedRef.current = true;
    onComplete?.(paths);
  }, [connected, board, paths, onComplete, disabled, solution]);

  const pushHistory = useCallback((next: PathMap) => {
    setHistory((h) => [...h.slice(-19), next]);
  }, []);

  const cellFromPointer = useCallback(
    (clientX: number, clientY: number): Cell | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const cell = rect.width / n;
      const c = Math.floor(x / cell);
      const r = Math.floor(y / cell);
      if (r < 0 || c < 0 || r >= n || c >= n) return null;
      return { r, c };
    },
    [n],
  );

  const pointerToViewBox = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const canEnter = useCallback(
    (pairId: string, cell: Cell, pathSoFar: Cell[]): boolean => {
      const k = keyOf(cell);
      const owner = occupied.get(k);
      if (owner && owner !== pairId) return false;

      const ep = endpointPairId(board, cell);
      if (ep && ep !== pairId) return false;

      if (pathSoFar.some((c) => cellsEqual(c, cell))) return true;

      return true;
    },
    [board, occupied],
  );

  const selectDotAtCell = useCallback(
    (cell: Cell) => {
      const ep = endpointInfo(board, cell);
      if (!ep) return;
      const pair = pairById(board, ep.pairId);
      if (!pair) return;
      const idx = ep.side === "a" ? 0 : 1;
      const text = endpointTooltip(pair, idx as 0 | 1) || endpointLabel(pair, idx as 0 | 1);
      const { x: cx, y: cy } = cellCenter(cell, cellSize);
      setSelectedDot({
        text,
        label: endpointLabel(pair, idx as 0 | 1),
        color: pair.color,
        pairId: ep.pairId,
        side: ep.side,
        cell,
        x: (cx / 100) * 100,
        y: (cy / 100) * 100,
      });
    },
    [board, cellSize],
  );

  const beginAt = useCallback(
    (cell: Cell) => {
      if (disabled) return;
      selectDotAtCell(cell);
      const pairId = endpointPairId(board, cell);
      if (!pairId) return;
      if (lockedPairIds.has(pairId)) return;

      drawingRef.current = true;
      setActivePairId(pairId);
      if (paths[pairId]) {
        pushHistory(paths);
        setPaths((prev) => {
          if (!prev[pairId]) return prev;
          const next = { ...prev };
          delete next[pairId];
          return next;
        });
      }
      setDraft([cell]);
    },
    [board, disabled, lockedPairIds, paths, pushHistory, selectDotAtCell],
  );

  const extendTo = useCallback(
    (cell: Cell) => {
      if (!drawingRef.current || !activePairId) return;
      setDraft((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1]!;
        if (cellsEqual(last, cell)) return prev;

        const idx = prev.findIndex((c) => cellsEqual(c, cell));
        if (idx >= 0) return prev.slice(0, idx + 1);

        if (!isOrthogonalStep(last, cell)) return prev;
        if (!canEnter(activePairId, cell, prev)) return prev;

        const pair = pairById(board, activePairId);
        if (!pair) return prev;

        const isMatchEnd =
          (cellsEqual(prev[0]!, pair.a) && cellsEqual(cell, pair.b)) ||
          (cellsEqual(prev[0]!, pair.b) && cellsEqual(cell, pair.a));

        const next = [...prev, cell];
        if (isMatchEnd) {
          return next;
        }
        return next;
      });
    },
    [activePairId, board, canEnter],
  );

  const endStroke = useCallback(() => {
    if (!drawingRef.current || !activePairId) {
      drawingRef.current = false;
      return;
    }
    drawingRef.current = false;
    const pair = pairById(board, activePairId);
    const path = draft;
    setActivePairId(null);

    if (!pair || path.length < 2) {
      setDraft([]);
      return;
    }

    const complete =
      (cellsEqual(path[0]!, pair.a) && cellsEqual(path[path.length - 1]!, pair.b)) ||
      (cellsEqual(path[0]!, pair.b) && cellsEqual(path[path.length - 1]!, pair.a));

    if (!complete) {
      setDraft([]);
      return;
    }

    pushHistory(paths);
    setPaths((prev) => ({ ...prev, [pair.id]: path }));
    setDraft([]);
  }, [activePairId, board, draft, paths, pushHistory]);

  const flashReject = useCallback(
    (pairId: string) => {
      setRejectFlash(pairId);
      onIncorrectLink?.();
      window.setTimeout(() => setRejectFlash(null), 500);
    },
    [onIncorrectLink],
  );

  const tryCompleteLink = useCallback(
    (target: EndpointInfo) => {
      if (!linkFrom) return;

      const from = linkFrom;
      setLinkFrom(null);
      setPointerPreview(null);

      if (cellsEqual(from.cell, target.cell)) return;

      if (from.pairId === target.pairId && from.side !== target.side) {
        if (lockedPairIds.has(from.pairId)) return;

        const solutionPath = solution?.[from.pairId];
        if (!solutionPath || solutionPath.length < 2) {
          flashReject(from.pairId);
          return;
        }

        if (pathOverlapsOccupied(solutionPath, occupied, from.pairId)) {
          flashReject(from.pairId);
          return;
        }

        pushHistory(paths);
        setPaths((prev) => ({ ...prev, [from.pairId]: solutionPath }));
        return;
      }

      flashReject(from.pairId);
    },
    [flashReject, linkFrom, lockedPairIds, occupied, paths, pushHistory, solution],
  );

  const onLinkPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const cell = cellFromPointer(e.clientX, e.clientY);
    if (!cell) return;
    selectDotAtCell(cell);
    const ep = endpointInfo(board, cell);
    if (!ep || lockedPairIds.has(ep.pairId)) return;

    setLinkFrom(ep);
    const center = cellCenter(cell, cellSize);
    setPointerPreview(center);
  };

  const onLinkPointerMove = (e: React.PointerEvent) => {
    if (!linkFrom) return;
    const pt = pointerToViewBox(e.clientX, e.clientY);
    if (pt) setPointerPreview(pt);
  };

  const onLinkPointerUp = (e: React.PointerEvent) => {
    if (!linkFrom) return;
    const cell = cellFromPointer(e.clientX, e.clientY);
    if (cell) {
      const target = endpointInfo(board, cell);
      if (target) tryCompleteLink(target);
      else {
        setLinkFrom(null);
        setPointerPreview(null);
      }
    } else {
      setLinkFrom(null);
      setPointerPreview(null);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (useLinkMode) {
      onLinkPointerDown(e);
      return;
    }
    if (disabled) return;
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const cell = cellFromPointer(e.clientX, e.clientY);
    if (cell) beginAt(cell);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (useLinkMode) {
      onLinkPointerMove(e);
      return;
    }
    if (!drawingRef.current) return;
    const cell = cellFromPointer(e.clientX, e.clientY);
    if (cell) extendTo(cell);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (useLinkMode) {
      onLinkPointerUp(e);
      return;
    }
    endStroke();
  };

  const undo = () => {
    if (disabled || history.length === 0) return;
    completedRef.current = false;
    const prev = history[history.length - 1]!;
    setHistory((h) => h.slice(0, -1));
    setPaths(prev);
    setDraft([]);
    setActivePairId(null);
    setLinkFrom(null);
    setPointerPreview(null);
  };

  const restart = () => {
    if (disabled) return;
    completedRef.current = false;
    pushHistory(paths);
    setPaths({});
    setDraft([]);
    setActivePairId(null);
    setLinkFrom(null);
    setPointerPreview(null);
    setSelectedDot(null);
  };

  const viewPad = fitToContainer ? cellSize * 0.35 : 0;
  const viewBox =
    viewPad > 0
      ? `${-viewPad} ${-viewPad} ${100 + viewPad * 2} ${100 + viewPad * 2}`
      : "0 0 100 100";
  const activeColor = activePairId ? pairById(board, activePairId)?.color : undefined;
  const linkColor = linkFrom ? pairById(board, linkFrom.pairId)?.color : undefined;

  return (
    <div className={cn("w-full", className)}>
      {showControls && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {connected}/{board.pairs.length} pairs
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={undo}
              disabled={disabled || history.length === 0}
              aria-label="Undo last connection"
              className="inline-flex min-h-10 touch-manipulation items-center gap-1.5 rounded-xl border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] px-3 text-xs font-semibold text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:opacity-40 sm:h-9"
            >
              <Undo2 className="size-3.5" />
              Undo
            </button>
            <button
              type="button"
              onClick={restart}
              disabled={disabled}
              aria-label="Clear all connections and restart"
              className="inline-flex min-h-10 touch-manipulation items-center gap-1.5 rounded-xl border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] px-3 text-xs font-semibold text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:opacity-40 sm:h-9"
            >
              <RotateCcw className="size-3.5" />
              Restart
            </button>
          </div>
        </div>
      )}

      <div
        className={cn(
          "relative touch-none select-none",
          fitToContainer
            ? "mx-auto flex h-full w-full items-center justify-center"
            : "mx-auto w-full max-w-[min(100%,100vw-2rem)] sm:max-w-[min(100%,520px)]",
        )}
      >
        {selectedDot ? (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-30 max-w-[min(340px,92vw)] -translate-x-1/2 rounded-xl border-2 bg-white px-3.5 py-2 text-xs font-semibold leading-relaxed text-[#111111] shadow-xl animate-in fade-in zoom-in-95 duration-150 break-words text-center"
            style={{
              left: `${Math.max(18, Math.min(82, selectedDot.x))}%`,
              top:
                selectedDot.y < 28
                  ? `${selectedDot.y + cellSize * 0.42}%`
                  : `${selectedDot.y - cellSize * 0.42}%`,
              borderColor: selectedDot.color,
              transform:
                selectedDot.y < 28
                  ? "translate(-50%, 8px)"
                  : "translate(-50%, calc(-100% - 8px))",
            }}
          >
            <div className="mb-1 flex items-center justify-center gap-1.5">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: selectedDot.color }}
              />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#737373]">
                {selectedDot.side === "a" ? "Prompt / Question" : "Match / Answer"}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-[#111111] leading-snug break-words">
              {selectedDot.text}
            </p>
          </div>
        ) : null}

        <svg
          ref={svgRef}
          viewBox={viewBox}
          role="img"
          aria-label={`Connect dots board. ${connected} of ${board.pairs.length} pairs connected.`}
          className={cn(
            "aspect-square rounded-2xl border border-[var(--gamibar-border)] bg-white shadow-[var(--shadow-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2",
            fitToContainer ? "h-full max-h-full w-full max-w-full overflow-visible" : "w-full",
          )}
          tabIndex={disabled ? -1 : 0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ touchAction: "none" }}
        >
          {Array.from({ length: n + 1 }, (_, i) => (
            <g key={`g-${i}`}>
              <line
                x1={i * cellSize}
                y1={0}
                x2={i * cellSize}
                y2={100}
                stroke="#E5E7EB"
                strokeWidth={0.35}
              />
              <line
                x1={0}
                y1={i * cellSize}
                x2={100}
                y2={i * cellSize}
                stroke="#E5E7EB"
                strokeWidth={0.35}
              />
            </g>
          ))}

          {Object.entries(paths).map(([pairId, path]) => {
            const pair = pairById(board, pairId);
            if (!pair || path.length < 2) return null;
            const d = path
              .map((cell, i) => {
                const { x, y } = cellCenter(cell, cellSize);
                return `${i === 0 ? "M" : "L"} ${x} ${y}`;
              })
              .join(" ");
            return (
              <path
                key={pairId}
                d={d}
                fill="none"
                stroke={pair.color}
                strokeWidth={cellSize * 0.42}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.92}
              />
            );
          })}

          {draft.length >= 2 && !useLinkMode && (
            <path
              d={draft
                .map((cell, i) => {
                  const { x, y } = cellCenter(cell, cellSize);
                  return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                })
                .join(" ")}
              fill="none"
              stroke={hasContent ? DRAFT_PATH : (activeColor ?? DRAFT_PATH)}
              strokeWidth={cellSize * 0.42}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.55}
            />
          )}

          {useLinkMode && linkFrom && pointerPreview && linkColor && (
            <line
              x1={cellCenter(linkFrom.cell, cellSize).x}
              y1={cellCenter(linkFrom.cell, cellSize).y}
              x2={pointerPreview.x}
              y2={pointerPreview.y}
              stroke={linkColor}
              strokeWidth={cellSize * 0.12}
              strokeLinecap="round"
              opacity={0.45}
              strokeDasharray={`${cellSize * 0.2} ${cellSize * 0.15}`}
            />
          )}

          {board.pairs.map((pair) =>
            [pair.a, pair.b].map((cell, idx) => {
              const { x: cx, y: cy } = cellCenter(cell, cellSize);
              const r = cellSize * 0.28;
              const tooltip = endpointTooltip(pair, idx as 0 | 1);
              const showLabels = !hasContent && !useLinkMode;
              const label = endpointLabel(pair, idx as 0 | 1);
              const fontSize = labelFontSize(label, cellSize);
              const isLocked = lockedPairIds.has(pair.id);
              const isReject = rejectFlash === pair.id;
              const isLinkSource =
                linkFrom?.pairId === pair.id && linkFrom.side === (idx === 0 ? "a" : "b");
              const isSelected =
                cellsEqual(selectedDot?.cell ?? { r: -1, c: -1 }, cell);

              return (
                <g
                  key={`${pair.id}-${idx}`}
                  onClick={() => selectDotAtCell(cell)}
                  style={{ cursor: "pointer" }}
                >
                  {tooltip ? <title>{tooltip}</title> : null}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r * 1.15}
                    fill="transparent"
                    style={{ pointerEvents: disabled ? "none" : "all" }}
                  />
                  {isSelected ? (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r * 1.38}
                      fill="none"
                      stroke={pair.color}
                      strokeWidth={cellSize * 0.08}
                      opacity={0.85}
                      className="animate-pulse"
                    />
                  ) : null}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={hasContent && !isLocked ? UNCONNECTED_DOT : pair.color}
                    stroke={
                      isReject
                        ? "#DC2626"
                        : isSelected
                          ? pair.color
                          : isLinkSource
                            ? "#111111"
                            : "transparent"
                    }
                    strokeWidth={
                      isReject
                        ? 0.5
                        : isSelected
                          ? cellSize * 0.06
                          : isLinkSource
                            ? 0.35
                            : 0
                    }
                    opacity={isLocked ? 1 : 0.95}
                    className={cn(isReject && "animate-pulse")}
                  />
                  {showLabels ? (
                    <text
                      x={cx}
                      y={cy}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={fontSize}
                      fontWeight={700}
                      fill="#fff"
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {label}
                    </text>
                  ) : null}
                </g>
              );
            }),
          )}
        </svg>

        {hasContent ? (
          selectedDot ? (
            <div className="mt-3.5 flex items-start gap-3 rounded-2xl border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] p-3.5 shadow-xs transition-all animate-in fade-in">
              <span
                className="mt-0.5 size-3.5 shrink-0 rounded-full ring-2 ring-white shadow-xs"
                style={{ backgroundColor: selectedDot.color }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                  {selectedDot.side === "a" ? "Prompt / Question" : "Match / Answer"}
                </p>
                <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--foreground)] leading-snug break-words">
                  {selectedDot.text}
                </p>
              </div>
            </div>
          ) : !disabled ? (
            <p className="mt-2.5 text-center text-xs text-[var(--muted-foreground)]">
              Tap any dot to view its full text and connect matching pairs.
            </p>
          ) : null
        ) : null}
      </div>
    </div>
  );
}
