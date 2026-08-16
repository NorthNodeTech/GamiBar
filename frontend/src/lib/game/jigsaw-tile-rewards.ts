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
 * Suggested unlock schedule when the author has not customised rewards.
 * First piece after floor(questions ÷ pieces) correct; remaining pieces unlock one per
 * question at the end (10 questions, 4 pieces → unlock at 2, 8, 9, 10).
 */
export function defaultPieceUnlockAt(questionCount: number, tileCount: number): number[] {
  if (questionCount <= 0 || tileCount <= 0) return [];
  if (tileCount === 1) return [Math.max(1, questionCount)];

  if (questionCount <= tileCount) {
    return Array.from({ length: tileCount }, (_, tileIndex) =>
      tileIndex < questionCount ? tileIndex + 1 : questionCount,
    );
  }

  const firstThreshold = Math.max(1, Math.floor(questionCount / tileCount));
  return Array.from({ length: tileCount }, (_, tileIndex) => {
    if (tileIndex === 0) return firstThreshold;
    return questionCount - (tileCount - 1 - tileIndex);
  });
}

/** @deprecated Use `defaultPieceUnlockAt`. */
export function tileUnlockThresholds(questionCount: number, tileCount: number): number[] {
  return defaultPieceUnlockAt(questionCount, tileCount);
}

export function maxUnlockAtForPiece(
  pieceIndex: number,
  questionCount: number,
  tileCount: number,
): number {
  return questionCount - (tileCount - 1 - pieceIndex);
}

export function pieceUnlockAtOptions(
  pieceIndex: number,
  questionCount: number,
  tileCount: number,
  current: readonly number[],
): number[] {
  const min = pieceIndex === 0 ? 1 : current[pieceIndex - 1]! + 1;
  const max = maxUnlockAtForPiece(pieceIndex, questionCount, tileCount);
  if (min > max) return [max];
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

/** Clamp and enforce strictly increasing unlock counts for the current grid + question total. */
export function normalizePieceUnlockAt(
  raw: readonly number[],
  questionCount: number,
  tileCount: number,
): number[] {
  const defaults = defaultPieceUnlockAt(questionCount, tileCount);
  if (tileCount <= 0 || questionCount <= 0) return [];

  const result: number[] = [];
  for (let index = 0; index < tileCount; index++) {
    const min = index === 0 ? 1 : result[index - 1]! + 1;
    const max = maxUnlockAtForPiece(index, questionCount, tileCount);
    const fallback = defaults[index] ?? min;
    const value = Math.min(max, Math.max(min, raw[index] ?? fallback));
    result.push(value);
  }
  return result;
}

export function resolvePieceUnlockAt(
  questionCount: number,
  tileCount: number,
  custom?: readonly number[] | null,
): number[] {
  if (!custom || custom.length !== tileCount) {
    return defaultPieceUnlockAt(questionCount, tileCount);
  }
  return normalizePieceUnlockAt(custom, questionCount, tileCount);
}

export function validatePieceUnlockAt(
  thresholds: readonly number[],
  questionCount: number,
  tileCount: number,
): { ok: true } | { ok: false; error: string } {
  if (tileCount <= 0) return { ok: false, error: "Choose a puzzle grid first." };
  if (thresholds.length !== tileCount) {
    return { ok: false, error: "Set when each puzzle piece unlocks." };
  }

  for (let index = 0; index < tileCount; index++) {
    const value = thresholds[index]!;
    const min = index === 0 ? 1 : thresholds[index - 1]! + 1;
    const max = maxUnlockAtForPiece(index, questionCount, tileCount);
    if (!Number.isInteger(value) || value < min || value > max) {
      return {
        ok: false,
        error: `Piece ${index + 1} must unlock after ${min}–${max} correct answers.`,
      };
    }
  }

  return { ok: true };
}

/** Correct answers needed before the first puzzle piece unlocks. */
export function firstPieceUnlockAt(
  questionCount: number,
  tileCount: number,
  custom?: readonly number[] | null,
): number {
  const thresholds = resolvePieceUnlockAt(questionCount, tileCount, custom);
  return thresholds[0] ?? 1;
}

/** Human-readable unlock schedule for author configure UI. */
export function describeTileUnlockSchedule(
  questionCount: number,
  tileCount: number,
  custom?: readonly number[] | null,
): string {
  const thresholds = resolvePieceUnlockAt(questionCount, tileCount, custom);
  if (thresholds.length === 0) return "";

  if (thresholds.every((value, index) => value === index + 1)) {
    return "Students earn one puzzle piece per correct answer.";
  }

  const first = thresholds[0]!;
  if (thresholds.length === 1) {
    return `Students unlock the puzzle piece after ${first} correct answer${first === 1 ? "" : "s"}.`;
  }

  const rest = thresholds
    .slice(1)
    .map((threshold, index) => `piece ${index + 2} at ${threshold}`)
    .join(", ");
  return `First piece after ${first} correct answer${first === 1 ? "" : "s"}, then ${rest}.`;
}

export function tileUnlockScheduleEntries(
  questionCount: number,
  tileCount: number,
  custom?: readonly number[] | null,
): Array<{ piece: number; afterCorrect: number }> {
  return resolvePieceUnlockAt(questionCount, tileCount, custom).map((afterCorrect, index) => ({
    piece: index + 1,
    afterCorrect,
  }));
}

/** Tile indices earned for a given count of correctly answered questions. */
export function earnedTileIndicesForCorrectCount(
  correctQuestionCount: number,
  questionCount: number,
  tileCount: number,
  customThresholds?: readonly number[] | null,
): number[] {
  if (correctQuestionCount <= 0 || tileCount <= 0) return [];

  const thresholds = resolvePieceUnlockAt(questionCount, tileCount, customThresholds);
  const earned: number[] = [];

  for (let index = 0; index < tileCount; index++) {
    if (correctQuestionCount >= thresholds[index]!) {
      earned.push(index);
    }
  }

  if (correctQuestionCount >= questionCount) {
    for (let index = 0; index < tileCount; index++) {
      if (!earned.includes(index)) earned.push(index);
    }
  }

  return [...new Set(earned)].sort((a, b) => a - b);
}

export function earnedTileIdsForCorrectCount(
  correctQuestionCount: number,
  questionCount: number,
  tileCount: number,
  cols: number,
  customThresholds?: readonly number[] | null,
): string[] {
  return earnedTileIndicesForCorrectCount(
    correctQuestionCount,
    questionCount,
    tileCount,
    customThresholds,
  ).map((index) => tileIdFromIndex(index, cols));
}

/** Merge newly earned tiles with existing — never duplicates. */
export function mergeEarnedTileIds(
  existing: readonly string[],
  correctQuestionCount: number,
  questionCount: number,
  tileCount: number,
  cols: number,
  customThresholds?: readonly number[] | null,
): string[] {
  const next = new Set(existing);
  for (const id of earnedTileIdsForCorrectCount(
    correctQuestionCount,
    questionCount,
    tileCount,
    cols,
    customThresholds,
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
  customThresholds?: readonly number[] | null,
): string[] {
  const tileCount = cols * rows;
  const computed = earnedTileIdsForCorrectCount(
    correctQuestionCount,
    questionCount,
    tileCount,
    cols,
    customThresholds,
  );

  const stored = payload?.earnedTileIds;
  if (!Array.isArray(stored) || !stored.every((id) => typeof id === "string")) {
    return computed;
  }

  return [...new Set([...(stored as string[]), ...computed])].sort((a, b) => a.localeCompare(b));
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

export function horizontalTileCollectionLayout(
  index: number,
  total: number,
): TileCollectionLayout {
  const safeTotal = Math.max(1, total);
  const x = safeTotal <= 1 ? 0.5 : index / (safeTotal - 1);
  return {
    x,
    y: 0.5,
    z: index,
  };
}

export function randomTileCollectionLayout(): TileCollectionLayout {
  return horizontalTileCollectionLayout(0, 1);
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

/** Assign row layouts for earned tiles that do not have placement data. */
export function ensureTileLayoutsForEarned(
  earnedTileIds: readonly string[],
  existing: Readonly<TileLayoutMap>,
): { tileLayouts: TileLayoutMap; changed: boolean } {
  const sorted = [...earnedTileIds].sort((a, b) => a.localeCompare(b));
  const tileLayouts: TileLayoutMap = { ...existing };
  let changed = false;

  sorted.forEach((id, index) => {
    const next = horizontalTileCollectionLayout(index, sorted.length);
    const current = tileLayouts[id];
    if (!current || current.x !== next.x || current.y !== next.y) {
      tileLayouts[id] = next;
      changed = true;
    }
  });

  return { tileLayouts, changed };
}

export function mergeTileLayoutsForNewTiles(
  existing: Readonly<TileLayoutMap>,
  _newTileIds: readonly string[],
  allTileIds: readonly string[],
): TileLayoutMap {
  const sorted = [...allTileIds].sort((a, b) => a.localeCompare(b));
  const tileLayouts: TileLayoutMap = { ...existing };

  sorted.forEach((id, index) => {
    tileLayouts[id] = horizontalTileCollectionLayout(index, sorted.length);
  });

  return tileLayouts;
}
