/** Pick a cols×rows grid with piece count equal to question count (closest to square). */
export function computeJigsawGrid(pieceCount: number): { cols: number; rows: number } {
  if (pieceCount <= 0) return { cols: 1, rows: 1 };
  if (pieceCount === 1) return { cols: 1, rows: 1 };

  let cols = Math.ceil(Math.sqrt(pieceCount));
  while (pieceCount % cols !== 0 && cols > 1) cols -= 1;
  if (pieceCount % cols !== 0) {
    return { cols: pieceCount, rows: 1 };
  }
  return { cols, rows: pieceCount / cols };
}

export function jigsawPieceCount(cols: number, rows: number): number {
  return Math.max(1, cols * rows);
}
