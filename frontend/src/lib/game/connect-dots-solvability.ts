import { shuffledAnswerOrder } from "@/lib/game/connect-dots-content";
import {
  canExtendRoutePath,
  routeCellKey,
  routeCellsEqual,
  routingGridSize,
  type RouteCell,
} from "@/lib/game/connect-dots-path-geometry";
import type { ConnectDotsContentPair } from "@/lib/game/types";

export type ConnectDotsLayoutAssessment = {
  solvable: boolean;
  /** Plain-language warning for teachers when layout may be unsolvable. */
  warning: string | null;
};

function unitGridRect(cols: number, rows: number) {
  return { x: 0, y: 0, width: cols, height: rows };
}

const STEP_DIRS: RouteCell[] = [
  { r: 0, c: 1 },
  { r: 0, c: -1 },
  { r: 1, c: 0 },
  { r: -1, c: 0 },
];

function findNonCrossingRoute(
  entry: RouteCell,
  exit: RouteCell,
  locked: ReadonlyMap<string, RouteCell[]>,
  rows: number,
  cols: number,
  pairId: string,
): RouteCell[] | null {
  const grid = unitGridRect(cols, rows);
  const queue: RouteCell[][] = [[entry]];
  const visited = new Set<string>([routeCellKey(entry)]);

  while (queue.length > 0) {
    const cells = queue.shift()!;
    const last = cells[cells.length - 1]!;
    if (routeCellsEqual(last, exit)) return cells;

    for (const dir of STEP_DIRS) {
      const next = { r: last.r + dir.r, c: last.c + dir.c };
      const key = routeCellKey(next);
      if (visited.has(key)) continue;
      if (!canExtendRoutePath(cells, next, rows, cols, locked, grid, pairId)) continue;
      visited.add(key);
      queue.push([...cells, next]);
    }
  }
  return null;
}

function solvePairOrder(
  pairIds: string[],
  questionRow: (id: string) => number,
  answerRow: (id: string) => number,
  rows: number,
  cols: number,
): boolean {
  const ordered = [...pairIds].sort((a, b) => {
    const costA = Math.abs(questionRow(a) - answerRow(a)) + (cols - 1);
    const costB = Math.abs(questionRow(b) - answerRow(b)) + (cols - 1);
    return costB - costA;
  });

  const locked = new Map<string, RouteCell[]>();

  function solve(index: number): boolean {
    if (index >= ordered.length) return true;
    const id = ordered[index]!;
    const entry: RouteCell = { r: questionRow(id), c: 0 };
    const exit: RouteCell = { r: answerRow(id), c: cols - 1 };
    const path = findNonCrossingRoute(entry, exit, locked, rows, cols, id);
    if (!path) return false;
    locked.set(id, path);
    if (solve(index + 1)) return true;
    locked.delete(id);
    return false;
  }

  return solve(0);
}

export const CONNECT_DOTS_LAYOUT_WARNING =
  "This answer arrangement may be impossible to complete without paths crossing. Students might get stuck — try shuffling answers or using fewer pairs.";

/** Check whether non-crossing routes likely exist for every pair on the routing grid. */
export function assessConnectDotsLayoutSolvability(
  pairIds: string[],
  questionRow: (id: string) => number,
  answerRow: (id: string) => number,
  rows: number,
  cols: number,
): ConnectDotsLayoutAssessment {
  if (pairIds.length === 0) {
    return { solvable: true, warning: null };
  }

  const solvable = solvePairOrder(pairIds, questionRow, answerRow, rows, cols);
  return {
    solvable,
    warning: solvable ? null : CONNECT_DOTS_LAYOUT_WARNING,
  };
}

export function assessConnectDotsContentSolvability(
  pairs: ConnectDotsContentPair[],
  shuffleSeed: string,
): ConnectDotsLayoutAssessment {
  if (pairs.length === 0) return { solvable: true, warning: null };

  const { rows, cols } = routingGridSize(pairs.length);
  const answerOrder = shuffledAnswerOrder(
    pairs.map((p) => p.id),
    shuffleSeed,
  );
  const questionRow = (id: string) => pairs.findIndex((p) => p.id === id);
  const answerRow = (id: string) => answerOrder.indexOf(id);

  return assessConnectDotsLayoutSolvability(
    pairs.map((p) => p.id),
    questionRow,
    answerRow,
    rows,
    cols,
  );
}
