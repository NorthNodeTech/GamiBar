/** Grid cell for Connect Dots routing paths. */
export type RouteCell = { r: number; c: number };

export type RoutePoint = { x: number; y: number };

export type RouteSegment = { a: RoutePoint; b: RoutePoint };

const EPS = 1e-6;

export function routeCellKey(cell: RouteCell): string {
  return `${cell.r},${cell.c}`;
}

export function routeCellsEqual(a: RouteCell, b: RouteCell): boolean {
  return a.r === b.r && a.c === b.c;
}

export function isOrthogonalRouteStep(a: RouteCell, b: RouteCell): boolean {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

export function isRouteCellInGrid(cell: RouteCell, rows: number, cols: number): boolean {
  return cell.r >= 0 && cell.c >= 0 && cell.r < rows && cell.c < cols;
}

export function routeCellCenter(
  cell: RouteCell,
  grid: { x: number; y: number; width: number; height: number },
  rows: number,
  cols: number,
): RoutePoint {
  const cw = grid.width / cols;
  const ch = grid.height / rows;
  return {
    x: grid.x + (cell.c + 0.5) * cw,
    y: grid.y + (cell.r + 0.5) * ch,
  };
}

export function segmentsFromRouteCells(
  cells: RouteCell[],
  grid: { x: number; y: number; width: number; height: number },
  rows: number,
  cols: number,
): RouteSegment[] {
  if (cells.length < 2) return [];
  const segments: RouteSegment[] = [];
  for (let i = 1; i < cells.length; i++) {
    segments.push({
      a: routeCellCenter(cells[i - 1]!, grid, rows, cols),
      b: routeCellCenter(cells[i]!, grid, rows, cols),
    });
  }
  return segments;
}

function isHorizontal(seg: RouteSegment): boolean {
  return Math.abs(seg.a.y - seg.b.y) < EPS;
}

function isVertical(seg: RouteSegment): boolean {
  return Math.abs(seg.a.x - seg.b.x) < EPS;
}

/** Point lies strictly in the interior of a segment (not at endpoints). */
function pointOnSegmentInterior(p: RoutePoint, seg: RouteSegment): boolean {
  const minX = Math.min(seg.a.x, seg.b.x);
  const maxX = Math.max(seg.a.x, seg.b.x);
  const minY = Math.min(seg.a.y, seg.b.y);
  const maxY = Math.max(seg.a.y, seg.b.y);

  if (isHorizontal(seg)) {
    if (Math.abs(p.y - seg.a.y) > EPS) return false;
    return p.x > minX + EPS && p.x < maxX - EPS;
  }
  if (isVertical(seg)) {
    if (Math.abs(p.x - seg.a.x) > EPS) return false;
    return p.y > minY + EPS && p.y < maxY - EPS;
  }
  return false;
}

/** Proper intersection of two axis-aligned segments at an interior point of both. */
export function routeSegmentsCross(a: RouteSegment, b: RouteSegment): boolean {
  const aHoriz = isHorizontal(a);
  const aVert = isVertical(a);
  const bHoriz = isHorizontal(b);
  const bVert = isVertical(b);

  if ((aHoriz && bHoriz) || (aVert && bVert)) {
    if (aHoriz && bHoriz && Math.abs(a.a.y - b.a.y) < EPS) {
      const minAx = Math.min(a.a.x, a.b.x);
      const maxAx = Math.max(a.a.x, a.b.x);
      const minBx = Math.min(b.a.x, b.b.x);
      const maxBx = Math.max(b.a.x, b.b.x);
      const overlapMin = Math.max(minAx, minBx);
      const overlapMax = Math.min(maxAx, maxBx);
      return overlapMax - overlapMin > EPS * 2;
    }
    if (aVert && bVert && Math.abs(a.a.x - b.a.x) < EPS) {
      const minAy = Math.min(a.a.y, a.b.y);
      const maxAy = Math.max(a.a.y, a.b.y);
      const minBy = Math.min(b.a.y, b.b.y);
      const maxBy = Math.max(b.a.y, b.b.y);
      const overlapMin = Math.max(minAy, minBy);
      const overlapMax = Math.min(maxAy, maxBy);
      return overlapMax - overlapMin > EPS * 2;
    }
    return false;
  }

  const h = aHoriz ? a : b;
  const v = aHoriz ? b : a;
  if (!isHorizontal(h) || !isVertical(v)) return false;

  const cross: RoutePoint = { x: v.a.x, y: h.a.y };
  return pointOnSegmentInterior(cross, h) && pointOnSegmentInterior(cross, v);
}

export function routePathsShareCell(a: RouteCell[], b: RouteCell[]): boolean {
  const setB = new Set(b.map(routeCellKey));
  for (const cell of a) {
    if (setB.has(routeCellKey(cell))) return true;
  }
  return false;
}

export function routePathCrossesLocked(
  draftCells: RouteCell[],
  locked: ReadonlyMap<string, RouteCell[]>,
  grid: { x: number; y: number; width: number; height: number },
  rows: number,
  cols: number,
  excludePairId?: string,
): boolean {
  const draftSegments = segmentsFromRouteCells(draftCells, grid, rows, cols);

  for (const [pairId, cells] of locked) {
    if (pairId === excludePairId) continue;
    if (routePathsShareCell(draftCells, cells)) return true;
    const lockedSegments = segmentsFromRouteCells(cells, grid, rows, cols);
    for (const ds of draftSegments) {
      for (const ls of lockedSegments) {
        if (routeSegmentsCross(ds, ls)) return true;
      }
    }
  }
  return false;
}

export function validateRoutePath(
  cells: RouteCell[],
  rows: number,
  cols: number,
  locked: ReadonlyMap<string, RouteCell[]>,
  grid: { x: number; y: number; width: number; height: number },
  pairId: string,
  entry: RouteCell,
  exit: RouteCell,
): { ok: true } | { ok: false; reason: "bounds" | "overlap" | "endpoints" | "steps" } {
  if (cells.length < 2) return { ok: false, reason: "endpoints" };
  if (!routeCellsEqual(cells[0]!, entry) || !routeCellsEqual(cells[cells.length - 1]!, exit)) {
    return { ok: false, reason: "endpoints" };
  }

  for (const cell of cells) {
    if (!isRouteCellInGrid(cell, rows, cols)) return { ok: false, reason: "bounds" };
  }

  for (let i = 1; i < cells.length; i++) {
    if (!isOrthogonalRouteStep(cells[i - 1]!, cells[i]!)) {
      return { ok: false, reason: "steps" };
    }
  }

  if (routePathCrossesLocked(cells, locked, grid, rows, cols, pairId)) {
    return { ok: false, reason: "overlap" };
  }

  return { ok: true };
}

export function canExtendRoutePath(
  cells: RouteCell[],
  next: RouteCell,
  rows: number,
  cols: number,
  locked: ReadonlyMap<string, RouteCell[]>,
  grid: { x: number; y: number; width: number; height: number },
  activePairId: string,
): boolean {
  if (!isRouteCellInGrid(next, rows, cols)) return false;
  if (cells.length === 0) return true;

  const last = cells[cells.length - 1]!;
  if (routeCellsEqual(last, next)) return false;
  if (!isOrthogonalRouteStep(last, next)) return false;

  const idx = cells.findIndex((c) => routeCellsEqual(c, next));
  if (idx >= 0) return true;

  const extended = [...cells, next];
  return !routePathCrossesLocked(extended, locked, grid, rows, cols, activePairId);
}

export function routingGridSize(pairCount: number): { rows: number; cols: number } {
  const rows = Math.max(pairCount, 3);
  const cols = Math.max(6, Math.min(14, pairCount + 4));
  return { rows, cols };
}
