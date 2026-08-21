import { tileIdFromIndex, type JigsawTileCardRotation } from "@shared/game/jigsaw-tiles";

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
 * Automatic cumulative unlock thresholds distributed as evenly as possible.
 * Examples: 10 questions / 5 pieces -> 2, 4, 6, 8, 10.
 * 10 questions / 4 pieces -> 3, 5, 8, 10 (groups of 3, 2, 3, 2).
 */
export function defaultPieceUnlockAt(questionCount: number, tileCount: number): number[] {
  if (questionCount <= 0 || tileCount <= 0) return [];
  if (questionCount <= tileCount) {
    return Array.from({ length: tileCount }, (_, tileIndex) =>
      tileIndex < questionCount ? tileIndex + 1 : questionCount,
    );
  }

  return Array.from({ length: tileCount }, (_, tileIndex) =>
    Math.ceil(((tileIndex + 1) * questionCount) / tileCount),
  );
}

/** @deprecated Use `defaultPieceUnlockAt`. */
export function tileUnlockThresholds(questionCount: number, tileCount: number): number[] {
  return defaultPieceUnlockAt(questionCount, tileCount);
}

export function resolvePieceUnlockAt(
  questionCount: number,
  tileCount: number,
  _custom?: readonly number[] | null,
): number[] {
  return defaultPieceUnlockAt(questionCount, tileCount);
}

export function validatePieceUnlockAt(
  thresholds: readonly number[],
  questionCount: number,
  tileCount: number,
): { ok: true } | { ok: false; error: string } {
  if (tileCount <= 0) return { ok: false, error: "Choose a puzzle grid first." };
  if (thresholds.length !== tileCount) {
    return { ok: false, error: "Could not calculate automatic puzzle progress." };
  }

  const automatic = defaultPieceUnlockAt(questionCount, tileCount);
  if (thresholds.some((value, index) => value !== automatic[index])) {
    return { ok: false, error: "Puzzle piece progress must use the automatic schedule." };
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
  _custom?: readonly number[] | null,
): string {
  const requirements = tileQuestionRequirements(questionCount, tileCount);
  if (requirements.length === 0) return "";
  if (requirements.every((value) => value === 1)) {
    return "Automatic: every correct answer completes one puzzle piece.";
  }
  if (requirements.every((value) => value === requirements[0])) {
    const each = requirements[0]!;
    return `Automatic: every piece fills across ${each} correct answers.`;
  }
  return `Automatic: questions are balanced across the pieces (${requirements.join(", ")}).`;
}

export function tileUnlockScheduleEntries(
  questionCount: number,
  tileCount: number,
  _custom?: readonly number[] | null,
): Array<{ piece: number; afterCorrect: number; questionsForPiece: number }> {
  const thresholds = defaultPieceUnlockAt(questionCount, tileCount);
  return thresholds.map((afterCorrect, index) => ({
    piece: index + 1,
    afterCorrect,
    questionsForPiece: Math.max(0, afterCorrect - (thresholds[index - 1] ?? 0)),
  }));
}

export function tileQuestionRequirements(questionCount: number, tileCount: number): number[] {
  return tileUnlockScheduleEntries(questionCount, tileCount).map(
    (entry) => entry.questionsForPiece,
  );
}

export type TileQuestionProgress = {
  pieceIndex: number;
  completedQuestions: number;
  requiredQuestions: number;
  progress: number;
  earned: boolean;
};

/** Per-piece fill state. Partial pieces remain locked until their progress reaches 1. */
export function tileQuestionProgressForCorrectCount(
  correctQuestionCount: number,
  questionCount: number,
  tileCount: number,
): TileQuestionProgress[] {
  const thresholds = defaultPieceUnlockAt(questionCount, tileCount);
  const safeCorrect = Math.max(0, Math.min(questionCount, Math.trunc(correctQuestionCount)));

  return thresholds.map((threshold, pieceIndex) => {
    const previousThreshold = thresholds[pieceIndex - 1] ?? 0;
    const requiredQuestions = Math.max(0, threshold - previousThreshold);
    const completedQuestions = Math.max(
      0,
      Math.min(requiredQuestions, safeCorrect - previousThreshold),
    );
    const earned =
      requiredQuestions === 0
        ? safeCorrect >= questionCount
        : completedQuestions >= requiredQuestions;
    return {
      pieceIndex,
      completedQuestions,
      requiredQuestions,
      progress:
        requiredQuestions === 0 ? (earned ? 1 : 0) : completedQuestions / requiredQuestions,
      earned,
    };
  });
}

export function activeTileQuestionProgress(
  correctQuestionCount: number,
  questionCount: number,
  tileCount: number,
): TileQuestionProgress | null {
  return (
    tileQuestionProgressForCorrectCount(correctQuestionCount, questionCount, tileCount).find(
      (piece) => !piece.earned,
    ) ?? null
  );
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
