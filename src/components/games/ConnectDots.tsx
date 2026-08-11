import { RotateCcw, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  cellsEqual,
  countConnectedPairs,
  isOrthogonalStep,
  type Cell,
  type ConnectDotsPublicBoard,
  type PathMap,
} from "@/lib/connect-dots";
import { cn } from "@/lib/utils";

type ConnectDotsProps = {
  board: ConnectDotsPublicBoard;
  disabled?: boolean;
  /** Hide Undo/Restart (e.g. author preview). */
  showControls?: boolean;
  onProgress?: (connectedPairs: number, total: number) => void;
  onPathsChange?: (paths: PathMap) => void;
  onComplete?: (paths: PathMap) => void;
  className?: string;
};

function keyOf(cell: Cell) {
  return `${cell.r},${cell.c}`;
}

function endpointPairId(board: ConnectDotsPublicBoard, cell: Cell): string | null {
  for (const p of board.pairs) {
    if (cellsEqual(p.a, cell) || cellsEqual(p.b, cell)) return p.id;
  }
  return null;
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

function pairById(board: ConnectDotsPublicBoard, id: string) {
  return board.pairs.find((p) => p.id === id);
}

function labelFontSize(text: string, cellSize: number): number {
  const len = text.length;
  if (len <= 8) return cellSize * 0.22;
  if (len <= 12) return cellSize * 0.17;
  return cellSize * 0.13;
}

export function ConnectDots({
  board,
  disabled = false,
  showControls = true,
  onProgress,
  onPathsChange,
  onComplete,
  className,
}: ConnectDotsProps) {
  const n = board.gridSize;
  const [paths, setPaths] = useState<PathMap>({});
  const [draft, setDraft] = useState<Cell[]>([]);
  const [activePairId, setActivePairId] = useState<string | null>(null);
  const [history, setHistory] = useState<PathMap[]>([]);
  const completedRef = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const drawingRef = useRef(false);

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
    onPathsChange?.(paths);
  }, [paths, onPathsChange]);

  useEffect(() => {
    if (disabled || completedRef.current) return;
    if (connected === board.pairs.length && board.pairs.length > 0) {
      completedRef.current = true;
      onComplete?.(paths);
    }
  }, [connected, board.pairs.length, paths, onComplete, disabled]);

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

  const canEnter = useCallback(
    (pairId: string, cell: Cell, pathSoFar: Cell[]): boolean => {
      const k = keyOf(cell);
      const owner = occupied.get(k);
      if (owner && owner !== pairId) return false;

      const ep = endpointPairId(board, cell);
      if (ep && ep !== pairId) return false;

      // Allow revisiting own draft by truncating (handled by caller).
      if (pathSoFar.some((c) => cellsEqual(c, cell))) return true;

      return true;
    },
    [board, occupied],
  );

  const beginAt = useCallback(
    (cell: Cell) => {
      if (disabled) return;
      const pairId = endpointPairId(board, cell);
      if (!pairId) return;

      drawingRef.current = true;
      setActivePairId(pairId);
      // Redrawing clears existing path for that pair.
      setPaths((prev) => {
        if (!prev[pairId]) return prev;
        const next = { ...prev };
        delete next[pairId];
        pushHistory(prev);
        return next;
      });
      setDraft([cell]);
    },
    [board, disabled, pushHistory],
  );

  const extendTo = useCallback(
    (cell: Cell) => {
      if (!drawingRef.current || !activePairId) return;
      setDraft((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1]!;
        if (cellsEqual(last, cell)) return prev;

        // Truncate if revisiting own draft.
        const idx = prev.findIndex((c) => cellsEqual(c, cell));
        if (idx >= 0) return prev.slice(0, idx + 1);

        if (!isOrthogonalStep(last, cell)) return prev;
        if (!canEnter(activePairId, cell, prev)) return prev;

        const pair = pairById(board, activePairId);
        if (!pair) return prev;

        // Don't continue past the matching endpoint.
        const isMatchEnd =
          (cellsEqual(prev[0]!, pair.a) && cellsEqual(cell, pair.b)) ||
          (cellsEqual(prev[0]!, pair.b) && cellsEqual(cell, pair.a));

        const next = [...prev, cell];
        if (isMatchEnd) {
          // Commit on reaching endpoint (also handled on pointer up).
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

    setPaths((prev) => {
      pushHistory(prev);
      return { ...prev, [pair.id]: path };
    });
    setDraft([]);
  }, [activePairId, board, draft, pushHistory]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const cell = cellFromPointer(e.clientX, e.clientY);
    if (cell) beginAt(cell);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const cell = cellFromPointer(e.clientX, e.clientY);
    if (cell) extendTo(cell);
  };

  const undo = () => {
    if (disabled || history.length === 0) return;
    completedRef.current = false;
    const prev = history[history.length - 1]!;
    setHistory((h) => h.slice(0, -1));
    setPaths(prev);
    setDraft([]);
    setActivePairId(null);
  };

  const restart = () => {
    if (disabled) return;
    completedRef.current = false;
    pushHistory(paths);
    setPaths({});
    setDraft([]);
    setActivePairId(null);
  };

  const cellSize = 100 / n;
  const activeColor = activePairId ? pairById(board, activePairId)?.color : undefined;

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
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] px-3 text-xs font-semibold text-[var(--foreground)] disabled:opacity-40"
            >
              <Undo2 className="size-3.5" />
              Undo
            </button>
            <button
              type="button"
              onClick={restart}
              disabled={disabled}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] px-3 text-xs font-semibold text-[var(--foreground)] disabled:opacity-40"
            >
              <RotateCcw className="size-3.5" />
              Restart
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-[min(100%,100vw-2rem)] touch-none select-none sm:max-w-[min(100%,520px)]">
        <svg
          ref={svgRef}
          viewBox={`0 0 100 100`}
          className="aspect-square w-full rounded-2xl border border-[var(--gamibar-border)] bg-white shadow-[var(--shadow-soft)]"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          style={{ touchAction: "none" }}
        >
          {/* Grid */}
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

          {/* Completed paths */}
          {Object.entries(paths).map(([pairId, path]) => {
            const pair = pairById(board, pairId);
            if (!pair || path.length < 2) return null;
            const d = path
              .map((cell, i) => {
                const x = cell.c * cellSize + cellSize / 2;
                const y = cell.r * cellSize + cellSize / 2;
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
                opacity={0.9}
              />
            );
          })}

          {/* Draft path */}
          {draft.length >= 2 && activeColor && (
            <path
              d={draft
                .map((cell, i) => {
                  const x = cell.c * cellSize + cellSize / 2;
                  const y = cell.r * cellSize + cellSize / 2;
                  return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                })
                .join(" ")}
              fill="none"
              stroke={activeColor}
              strokeWidth={cellSize * 0.42}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.55}
            />
          )}

          {/* Endpoints */}
          {board.pairs.map((pair) =>
            [pair.a, pair.b].map((cell, idx) => {
              const cx = cell.c * cellSize + cellSize / 2;
              const cy = cell.r * cellSize + cellSize / 2;
              const r = cellSize * 0.28;
              const label = endpointLabel(pair, idx as 0 | 1);
              const fontSize = labelFontSize(label, cellSize);
              const title = idx === 0 ? pair.question?.trim() : pair.answer?.trim();
              return (
                <g key={`${pair.id}-${idx}`}>
                  {title && <title>{title}</title>}
                  <circle cx={cx} cy={cy} r={r} fill={pair.color} />
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
                </g>
              );
            }),
          )}
        </svg>
      </div>
    </div>
  );
}
