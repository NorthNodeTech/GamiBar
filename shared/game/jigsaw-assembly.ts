import type { TileRotationMap } from "@shared/game/jigsaw-tile-rewards";
import { buildJigsawTiles, tileBackgroundStyleByIndex } from "@shared/game/jigsaw-tiles";

/** Returns true when every slot holds the matching piece (piece id === slot index). */
export function validateJigsawLayout(layout: number[], totalPieces: number): boolean {
  if (layout.length !== totalPieces) return false;
  for (let slot = 0; slot < totalPieces; slot++) {
    if (layout[slot] !== slot) return false;
  }
  return true;
}

/** Returns true when every earned tile is upright (0° visual rotation). */
export function validateJigsawRotations(
  tileRotations: Readonly<TileRotationMap>,
  cols: number,
  rows: number,
  tileIds?: readonly string[],
): boolean {
  const ids =
    tileIds ??
    buildJigsawTiles(cols, rows).map((tile) => tile.id);
  for (const id of ids) {
    if ((tileRotations[id] ?? 0) !== 0) return false;
  }
  return true;
}

export type JigsawAssemblyValidation =
  | { ok: true }
  | { ok: false; reason: "empty" | "layout" | "rotation" };

/** Puzzle is solved only when every slot is correct and every tile is upright. */
export function validateJigsawAssembly(
  layout: number[],
  tileRotations: Readonly<TileRotationMap>,
  totalPieces: number,
  cols: number,
  rows: number,
  earnedTileIds?: readonly string[],
): JigsawAssemblyValidation {
  if (layout.length !== totalPieces || layout.some((piece) => piece < 0)) {
    return { ok: false, reason: "empty" };
  }
  if (!validateJigsawLayout(layout, totalPieces)) {
    return { ok: false, reason: "layout" };
  }
  if (!validateJigsawRotations(tileRotations, cols, rows, earnedTileIds)) {
    return { ok: false, reason: "rotation" };
  }
  return { ok: true };
}

export function jigsawAssemblyValidationMessage(
  reason: Extract<JigsawAssemblyValidation, { ok: false }>["reason"],
): string {
  switch (reason) {
    case "empty":
      return "Place every puzzle piece on the board before submitting.";
    case "layout":
      return "Not quite — the image is not complete yet. Keep rearranging the pieces.";
    case "rotation":
      return "Some pieces are rotated incorrectly. Tap each piece to turn it upright.";
  }
}

/** Background crop for a square tile (index = piece id). */
export function pieceSliceStyle(pieceId: number, cols: number, rows: number) {
  const { backgroundSize, backgroundPosition } = tileBackgroundStyleByIndex(
    pieceId,
    cols,
    rows,
    "",
  );
  return {
    backgroundSize,
    backgroundPosition,
  } as const;
}

export function shufflePieceIds(count: number): number[] {
  const ids = Array.from({ length: count }, (_, i) => i);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  }
  if (ids.every((id, index) => id === index) && ids.length > 1) {
    [ids[0], ids[1]] = [ids[1]!, ids[0]!];
  }
  return ids;
}

/** Build slot → piece map from nullable placements. Empty slots are omitted. */
export function layoutFromPlacements(placements: Array<number | null>): number[] {
  return placements.map((pieceId, slot) => (pieceId == null ? -1 : pieceId));
}

export function allSlotsFilled(placements: Array<number | null>): boolean {
  return placements.every((p) => p != null);
}
