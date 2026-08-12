/** Square tile model for Jigsaw Mission (not traditional jigsaw shapes). */

export type JigsawTileRotation = 0;

/** Visual rotation applied to earned puzzle cards in the collection (0, 90, 180, 270). */
export type JigsawTileCardRotation = 0 | 90 | 180 | 270;

export const JIGSAW_TILE_CARD_ROTATIONS: readonly JigsawTileCardRotation[] = [0, 90, 180, 270];

export type JigsawTileCrop = {
  /** Normalised slice origin X (0–1). */
  x: number;
  /** Normalised slice origin Y (0–1). */
  y: number;
  /** Normalised slice width (0–1). */
  width: number;
  /** Normalised slice height (0–1). */
  height: number;
};

export type JigsawTile = {
  /** Stable id, e.g. tile-0-1 for row 0 col 1. */
  id: string;
  /** Linear index in row-major order (also the correct slot index). */
  index: number;
  row: number;
  col: number;
  /** Correct final board slot (same as index for a complete puzzle). */
  slotIndex: number;
  crop: JigsawTileCrop;
  /** Rotation in degrees — correct assembly orientation (not the visual card rotation). */
  rotation: JigsawTileRotation;
};

export function buildJigsawTiles(cols: number, rows: number): JigsawTile[] {
  const tiles: JigsawTile[] = [];
  let index = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      tiles.push({
        id: `tile-${row}-${col}`,
        index,
        row,
        col,
        slotIndex: index,
        rotation: 0,
        crop: {
          x: col / cols,
          y: row / rows,
          width: 1 / cols,
          height: 1 / rows,
        },
      });
      index += 1;
    }
  }
  return tiles;
}

export function tileCoords(index: number, cols: number): { row: number; col: number } {
  return { col: index % cols, row: Math.floor(index / cols) };
}

export function tileIdFromIndex(index: number, cols: number): string {
  const { row, col } = tileCoords(index, cols);
  return `tile-${row}-${col}`;
}

export function tileIndexFromId(id: string, cols: number, rows: number): number | null {
  const match = /^tile-(\d+)-(\d+)$/.exec(id);
  if (!match) return null;
  const row = Number(match[1]);
  const col = Number(match[2]);
  if (!Number.isFinite(row) || !Number.isFinite(col) || row < 0 || col < 0 || row >= rows || col >= cols) {
    return null;
  }
  return row * cols + col;
}

/** CSS background positioning so tiles reassemble into the full image. */
export function tileBackgroundStyle(
  col: number,
  row: number,
  cols: number,
  rows: number,
  imageUrl: string,
): {
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
  backgroundRepeat: "no-repeat";
} {
  const x = cols > 1 ? (col / (cols - 1)) * 100 : 0;
  const y = rows > 1 ? (row / (rows - 1)) * 100 : 0;
  return {
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: `${cols * 100}% ${rows * 100}%`,
    backgroundPosition: `${x}% ${y}%`,
    backgroundRepeat: "no-repeat",
  };
}

export function tileBackgroundStyleByIndex(
  index: number,
  cols: number,
  rows: number,
  imageUrl: string,
) {
  const { col, row } = tileCoords(index, cols);
  return tileBackgroundStyle(col, row, cols, rows, imageUrl);
}
