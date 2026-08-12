import { tileIdFromIndex, type JigsawTileCardRotation } from "@/lib/game/jigsaw-tiles";

export type TileRotationMap = Record<string, JigsawTileCardRotation>;

/** Normalised random placement for a collected puzzle card (not grid-aligned). */
export type TileCollectionLayout = {
  /** 0–1 horizontal offset within the collection area. */
  x: number;
  /** 0–1 vertical offset within the collection area. */
  y: number;
  /** Stacking order — higher values appear on top. */
  z: number;
};

export type TileLayoutMap = Record<string, TileCollectionLayout>;

/**
 * Minimum number of correctly answered questions required to earn each tile.
 * Spreads tiles evenly (e.g. 10 questions, 4 tiles → unlock at 3, 5, 8, 10).
 */
export function tileUnlockThresholds(questionCount: number, tileCount: number): number[] {
  if (questionCount <= 0 || tileCount <= 0) return [];
  return Array.from({ length: tileCount }, (_, tileIndex) =>
    Math.min(questionCount, Math.ceil(((tileIndex + 1) * questionCount) / tileCount)),
  );
}

/** Tile indices earned for a given count of correctly answered questions. */
export function earnedTileIndicesForCorrectCount(
  correctQuestionCount: number,
  questionCount: number,
  tileCount: number,
): number[] {
  if (correctQuestionCount <= 0 || tileCount <= 0) return [];

  const thresholds = tileUnlockThresholds(questionCount, tileCount);
  const earned: number[] = [];

  for (let i = 0; i < tileCount; i++) {
    if (correctQuestionCount >= thresholds[i]!) {
      earned.push(i);
    }
  }

  if (correctQuestionCount >= questionCount) {
    for (let i = 0; i < tileCount; i++) {
      if (!earned.includes(i)) earned.push(i);
    }
  }

  return [...new Set(earned)].sort((a, b) => a - b);
}

export function earnedTileIdsForCorrectCount(
  correctQuestionCount: number,
  questionCount: number,
  tileCount: number,
  cols: number,
): string[] {
  return earnedTileIndicesForCorrectCount(correctQuestionCount, questionCount, tileCount).map(
    (index) => tileIdFromIndex(index, cols),
  );
}

/** Merge newly earned tiles with existing — never duplicates. */
export function mergeEarnedTileIds(
  existing: readonly string[],
  correctQuestionCount: number,
  questionCount: number,
  tileCount: number,
  cols: number,
): string[] {
  const next = new Set(existing);
  for (const id of earnedTileIdsForCorrectCount(
    correctQuestionCount,
    questionCount,
    tileCount,
    cols,
  )) {
    next.add(id);
  }
  return [...next].sort((a, b) => a.localeCompare(b));
}

export function readEarnedTileIds(
  payload: Record<string, unknown> | undefined,
  cols: number,
  rows: number,
  correctQuestionCount: number,
  questionCount: number,
): string[] {
  const stored = payload?.earnedTileIds;
  if (Array.isArray(stored) && stored.every((id) => typeof id === "string")) {
    return stored as string[];
  }

  const tileCount = cols * rows;
  return earnedTileIdsForCorrectCount(correctQuestionCount, questionCount, tileCount, cols);
}

export function allTilesEarned(earnedTileIds: readonly string[], tileCount: number): boolean {
  return tileCount > 0 && earnedTileIds.length >= tileCount;
}

export function allQuestionsAnsweredCorrectly(
  correctQuestionCount: number,
  questionCount: number,
): boolean {
  return questionCount > 0 && correctQuestionCount >= questionCount;
}

/** Tile ids newly present in `next` but not in `prev`. */
export function newlyEarnedTileIds(prev: readonly string[], next: readonly string[]): string[] {
  const seen = new Set(prev);
  return next.filter((id) => !seen.has(id));
}

export function isTileCardRotation(value: unknown): value is JigsawTileCardRotation {
  return value === 0 || value === 90 || value === 180 || value === 270;
}

export function randomTileCardRotation(): JigsawTileCardRotation {
  const options: JigsawTileCardRotation[] = [0, 90, 180, 270];
  return options[Math.floor(Math.random() * options.length)]!;
}

export function readTileRotations(payload: Record<string, unknown> | undefined): TileRotationMap {
  const raw = payload?.tileRotations;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const out: TileRotationMap = {};
  for (const [id, deg] of Object.entries(raw)) {
    if (typeof id === "string" && isTileCardRotation(deg)) {
      out[id] = deg;
    }
  }
  return out;
}

/** Assign random card rotations for earned tiles that do not have one yet. */
export function ensureTileRotationsForEarned(
  earnedTileIds: readonly string[],
  existing: Readonly<TileRotationMap>,
): { tileRotations: TileRotationMap; changed: boolean } {
  const tileRotations: TileRotationMap = { ...existing };
  let changed = false;

  for (const id of earnedTileIds) {
    if (!(id in tileRotations)) {
      tileRotations[id] = randomTileCardRotation();
      changed = true;
    }
  }

  return { tileRotations, changed };
}

export function mergeTileRotationsForNewTiles(
  existing: Readonly<TileRotationMap>,
  newTileIds: readonly string[],
): TileRotationMap {
  const tileRotations: TileRotationMap = { ...existing };
  for (const id of newTileIds) {
    if (!(id in tileRotations)) {
      tileRotations[id] = randomTileCardRotation();
    }
  }
  return tileRotations;
}

/** Advance visual card rotation clockwise by 90°. */
export function nextClockwiseTileCardRotation(
  rotation: JigsawTileCardRotation,
): JigsawTileCardRotation {
  switch (rotation) {
    case 0:
      return 90;
    case 90:
      return 180;
    case 180:
      return 270;
    default:
      return 0;
  }
}

function isNormalizedCoord(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function isTileCollectionLayout(value: unknown): value is TileCollectionLayout {
  if (!value || typeof value !== "object") return false;
  const raw = value as Record<string, unknown>;
  return (
    isNormalizedCoord(raw.x) &&
    isNormalizedCoord(raw.y) &&
    typeof raw.z === "number" &&
    Number.isFinite(raw.z)
  );
}

export function randomTileCollectionLayout(): TileCollectionLayout {
  return {
    x: 0.02 + Math.random() * 0.72,
    y: 0.02 + Math.random() * 0.68,
    z: Math.floor(Math.random() * 1000),
  };
}

export function readTileLayouts(payload: Record<string, unknown> | undefined): TileLayoutMap {
  const raw = payload?.tileLayouts;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const out: TileLayoutMap = {};
  for (const [id, layout] of Object.entries(raw)) {
    if (typeof id === "string" && isTileCollectionLayout(layout)) {
      out[id] = layout;
    }
  }
  return out;
}

/** Assign scrambled collection layouts for earned tiles missing placement data. */
export function ensureTileLayoutsForEarned(
  earnedTileIds: readonly string[],
  existing: Readonly<TileLayoutMap>,
): { tileLayouts: TileLayoutMap; changed: boolean } {
  const tileLayouts: TileLayoutMap = { ...existing };
  let changed = false;

  for (const id of earnedTileIds) {
    if (!(id in tileLayouts)) {
      tileLayouts[id] = randomTileCollectionLayout();
      changed = true;
    }
  }

  return { tileLayouts, changed };
}

export function mergeTileLayoutsForNewTiles(
  existing: Readonly<TileLayoutMap>,
  newTileIds: readonly string[],
): TileLayoutMap {
  const tileLayouts: TileLayoutMap = { ...existing };
  for (const id of newTileIds) {
    if (!(id in tileLayouts)) {
      tileLayouts[id] = randomTileCollectionLayout();
    }
  }
  return tileLayouts;
}
