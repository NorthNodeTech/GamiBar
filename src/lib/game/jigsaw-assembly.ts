/** Returns true when every slot holds the matching piece (piece id === slot index). */
export function validateJigsawLayout(layout: number[], totalPieces: number): boolean {
  if (layout.length !== totalPieces) return false;
  for (let slot = 0; slot < totalPieces; slot++) {
    if (layout[slot] !== slot) return false;
  }
  return true;
}

export function pieceSliceStyle(pieceId: number, cols: number, rows: number) {
  const col = pieceId % cols;
  const row = Math.floor(pieceId / cols);
  const x = cols > 1 ? (col / (cols - 1)) * 100 : 0;
  const y = rows > 1 ? (row / (rows - 1)) * 100 : 0;
  return {
    backgroundSize: `${cols * 100}% ${rows * 100}%`,
    backgroundPosition: `${x}% ${y}%`,
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
