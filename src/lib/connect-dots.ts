/** Connect Dots - guaranteed-solvable puzzle generation + validation. */

export type ConnectDotsDifficulty = "easy" | "medium" | "hard";

export type Cell = { r: number; c: number };

export type ConnectDotsPairPublic = {
  id: string;
  label: number;
  color: string;
  a: Cell;
  b: Cell;
};

export type ConnectDotsPublicBoard = {
  gridSize: number;
  difficulty: ConnectDotsDifficulty;
  pairs: ConnectDotsPairPublic[];
  seed: string;
};

export type ConnectDotsSolution = Record<string, Cell[]>;

export type ConnectDotsPuzzle = {
  publicBoard: ConnectDotsPublicBoard;
  solution: ConnectDotsSolution;
  timeLimitSeconds: number;
  pairCount: number;
};

export const CONNECT_DOTS_CONFIG = {
  easy: { gridSize: 5, pairCount: 4, timeLimitSeconds: 90 },
  medium: { gridSize: 7, pairCount: 5, timeLimitSeconds: 75 },
  hard: { gridSize: 9, pairCount: 6, timeLimitSeconds: 60 },
} as const satisfies Record<
  ConnectDotsDifficulty,
  { gridSize: number; pairCount: number; timeLimitSeconds: number }
>;

/** Distinct, classroom-friendly palette (colour + label for a11y). */
export const CONNECT_DOTS_COLORS = [
  "#EF4444", // red
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
] as const;

const DIRS: Cell[] = [
  { r: -1, c: 0 },
  { r: 1, c: 0 },
  { r: 0, c: -1 },
  { r: 0, c: 1 },
];

function cellKey(cell: Cell): string {
  return `${cell.r},${cell.c}`;
}

function inBounds(cell: Cell, n: number): boolean {
  return cell.r >= 0 && cell.c >= 0 && cell.r < n && cell.c < n;
}

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shuffleInPlace<T>(arr: T[], rand: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

function neighbors(cell: Cell, n: number): Cell[] {
  const out: Cell[] = [];
  for (const d of DIRS) {
    const next = { r: cell.r + d.r, c: cell.c + d.c };
    if (inBounds(next, n)) out.push(next);
  }
  return out;
}

/** Grow a path of target length on free cells; returns null if stuck. */
function growPath(
  n: number,
  occupied: Set<string>,
  start: Cell,
  targetLen: number,
  rand: () => number,
): Cell[] | null {
  const path: Cell[] = [start];
  occupied.add(cellKey(start));

  while (path.length < targetLen) {
    const head = path[path.length - 1]!;
    const options = neighbors(head, n).filter((c) => !occupied.has(cellKey(c)));
    if (options.length === 0) {
      for (const c of path) occupied.delete(cellKey(c));
      return null;
    }
    shuffleInPlace(options, rand);
    const next = options[0]!;
    path.push(next);
    occupied.add(cellKey(next));
  }
  return path;
}

/**
 * Solution-first generator: carve non-overlapping paths, then expose only endpoints.
 * Guarantees at least one valid solution (the stored solution).
 */
export function generateConnectDotsPuzzle(
  difficulty: ConnectDotsDifficulty,
  seedInput?: string,
): ConnectDotsPuzzle {
  const cfg = CONNECT_DOTS_CONFIG[difficulty];
  const seed = seedInput ?? `cd-${difficulty}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9)}`;
  const rand = mulberry32(hashSeed(seed));
  const n = cfg.gridSize;
  const pairCount = cfg.pairCount;

  for (let attempt = 0; attempt < 80; attempt++) {
    const occupied = new Set<string>();
    const solution: ConnectDotsSolution = {};
    const pairs: ConnectDotsPairPublic[] = [];
    let ok = true;

    const freeStarts: Cell[] = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) freeStarts.push({ r, c });
    }
    shuffleInPlace(freeStarts, rand);

    // Longer paths first so the board fills more naturally.
    const lengths: number[] = [];
    const cellsBudget = n * n;
    let remainingPairs = pairCount;
    let remainingCells = cellsBudget;
    for (let i = 0; i < pairCount; i++) {
      const minLen = 3;
      const maxLen = Math.max(minLen, Math.floor(remainingCells / remainingPairs) + 1);
      const len = Math.min(maxLen, minLen + Math.floor(rand() * (maxLen - minLen + 1)));
      lengths.push(len);
      remainingCells -= len;
      remainingPairs -= 1;
    }
    lengths.sort((a, b) => b - a);

    for (let i = 0; i < pairCount; i++) {
      const targetLen = lengths[i]!;
      let placed: Cell[] | null = null;

      for (let tryStart = 0; tryStart < freeStarts.length && !placed; tryStart++) {
        const start = freeStarts[(tryStart + Math.floor(rand() * freeStarts.length)) % freeStarts.length]!;
        if (occupied.has(cellKey(start))) continue;
        placed = growPath(n, occupied, start, targetLen, rand);
      }

      if (!placed) {
        ok = false;
        break;
      }

      const id = `pair-${i + 1}`;
      solution[id] = placed;
      pairs.push({
        id,
        label: i + 1,
        color: CONNECT_DOTS_COLORS[i % CONNECT_DOTS_COLORS.length]!,
        a: placed[0]!,
        b: placed[placed.length - 1]!,
      });
    }

    if (ok && pairs.length === pairCount) {
      return {
        publicBoard: {
          gridSize: n,
          difficulty,
          pairs,
          seed,
        },
        solution,
        timeLimitSeconds: cfg.timeLimitSeconds,
        pairCount,
      };
    }
  }

  // Extremely unlikely fallback - smaller easy board always succeeds with retries.
  if (difficulty !== "easy") {
    return generateConnectDotsPuzzle("easy", `${seed}-fallback`);
  }
  throw new Error("Could not generate a Connect Dots puzzle.");
}

export function cellsEqual(a: Cell, b: Cell): boolean {
  return a.r === b.r && a.c === b.c;
}

export function isOrthogonalStep(a: Cell, b: Cell): boolean {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

export type PathMap = Record<string, Cell[]>;

/** Validate student-submitted paths against public board rules (+ optional known solution). */
export function validateConnectDotsPaths(
  board: ConnectDotsPublicBoard,
  paths: PathMap,
  solution?: ConnectDotsSolution,
): { ok: true; connectedPairs: number } | { ok: false; error: string; connectedPairs: number } {
  const n = board.gridSize;
  const occupied = new Map<string, string>();
  let connected = 0;

  for (const pair of board.pairs) {
    const path = paths[pair.id];
    if (!path || path.length < 2) continue;

    // Endpoints must match the pair (order either way).
    const startOk =
      (cellsEqual(path[0]!, pair.a) && cellsEqual(path[path.length - 1]!, pair.b)) ||
      (cellsEqual(path[0]!, pair.b) && cellsEqual(path[path.length - 1]!, pair.a));
    if (!startOk) {
      return { ok: false, error: `Path for pair ${pair.label} has wrong endpoints.`, connectedPairs: connected };
    }

    for (let i = 0; i < path.length; i++) {
      const cell = path[i]!;
      if (!inBounds(cell, n)) {
        return { ok: false, error: "Path leaves the board.", connectedPairs: connected };
      }
      if (i > 0 && !isOrthogonalStep(path[i - 1]!, cell)) {
        return { ok: false, error: "Paths must move to adjacent cells.", connectedPairs: connected };
      }

      // Cannot pass through another pair's endpoint (except own ends).
      for (const other of board.pairs) {
        if (other.id === pair.id) continue;
        if (cellsEqual(cell, other.a) || cellsEqual(cell, other.b)) {
          return { ok: false, error: "Path crosses another pair's endpoint.", connectedPairs: connected };
        }
      }

      const key = cellKey(cell);
      const owner = occupied.get(key);
      if (owner && owner !== pair.id) {
        return { ok: false, error: "Paths cannot overlap.", connectedPairs: connected };
      }
      occupied.set(key, pair.id);
    }

    // Optional: must match known solution cells as a set (order may reverse).
    if (solution?.[pair.id]) {
      const expected = new Set(solution[pair.id]!.map(cellKey));
      const got = new Set(path.map(cellKey));
      if (expected.size !== got.size || [...expected].some((k) => !got.has(k))) {
        // Accept any valid path, not only the generated solution path.
        // Solution is retained for author/debug; gameplay allows alternate routes.
      }
    }

    connected += 1;
  }

  if (connected !== board.pairs.length) {
    return {
      ok: false,
      error: `Connect all pairs (${connected}/${board.pairs.length}).`,
      connectedPairs: connected,
    };
  }

  return { ok: true, connectedPairs: connected };
}

export function countConnectedPairs(board: ConnectDotsPublicBoard, paths: PathMap): number {
  let n = 0;
  for (const pair of board.pairs) {
    const path = paths[pair.id];
    if (!path || path.length < 2) continue;
    const startOk =
      (cellsEqual(path[0]!, pair.a) && cellsEqual(path[path.length - 1]!, pair.b)) ||
      (cellsEqual(path[0]!, pair.b) && cellsEqual(path[path.length - 1]!, pair.a));
    if (!startOk) continue;
    let valid = true;
    for (let i = 1; i < path.length; i++) {
      if (!isOrthogonalStep(path[i - 1]!, path[i]!)) {
        valid = false;
        break;
      }
    }
    if (valid) n += 1;
  }
  return n;
}
