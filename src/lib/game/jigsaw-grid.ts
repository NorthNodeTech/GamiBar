/** Balanced square grids for Jigsaw Mission — not tied 1:1 to question count. */

export type JigsawGridLayout = {
  cols: number;
  rows: number;
  tileCount: number;
};

const SQUARE_GRID_SIDE = [2, 3, 4] as const;

/**
 * Pick a square tile grid from question count:
 * - 1–4 questions → 2×2 (4 tiles)
 * - 5–9 questions → 3×3 (9 tiles)
 * - 10–16 questions → 4×4 (16 tiles)
 */
export function jigsawTileCountForQuestions(questionCount: number): number {
  const q = Math.max(1, Math.min(16, questionCount));
  if (q <= 4) return 4;
  if (q <= 9) return 9;
  return 16;
}

export function computeJigsawGrid(questionCount: number): JigsawGridLayout {
  const tileCount = jigsawTileCountForQuestions(questionCount);
  const side = Math.sqrt(tileCount) as (typeof SQUARE_GRID_SIDE)[number];
  return { cols: side, rows: side, tileCount };
}

export function jigsawPieceCount(cols: number, rows: number): number {
  return Math.max(1, cols * rows);
}

/** Responsive max board width (px) — keeps square tiles readable on small screens. */
export function jigsawBoardMaxWidth(cols: number): number {
  if (cols <= 2) return 280;
  if (cols === 3) return 320;
  return 360;
}

/** Tailwind max-width classes: full width on mobile, fixed cap from md up. */
export function jigsawBoardMaxWidthClass(cols: number): string {
  if (cols <= 2) return "w-full max-w-[min(100%,280px)] md:max-w-[280px]";
  if (cols === 3) return "w-full max-w-[min(100%,320px)] md:max-w-[320px]";
  return "w-full max-w-[min(100%,360px)] md:max-w-[360px]";
}

/** Full-width assembly skeleton — scales to mobile viewports without overflowing. */
export function jigsawSkeletonBoardWidthClass(cols: number): string {
  const viewportCap = "max-w-[min(100%,calc(100vw-2rem))]";
  if (cols <= 2) return cnViewport(viewportCap, "sm:max-w-[280px]");
  if (cols === 3) return cnViewport(viewportCap, "sm:max-w-[320px]");
  return cnViewport(viewportCap, "sm:max-w-[340px] md:max-w-[360px]");
}

function cnViewport(viewportCap: string, desktop: string): string {
  return `w-full ${viewportCap} ${desktop}`;
}

/** Pixel gap between skeleton slots — tighter on dense grids. */
export function jigsawSkeletonSlotGap(cols: number): string {
  if (cols <= 2) return "gap-1.5";
  if (cols === 3) return "gap-1";
  return "gap-0.5 sm:gap-1";
}
