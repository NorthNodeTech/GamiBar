/** Square puzzle templates for Jigsaw Mission — chosen first; questions follow. */

import { GAME_CONFIG } from "@shared/game/config";

export type JigsawGridLayout = {
  cols: number;
  rows: number;
  tileCount: number;
};

export type JigsawTemplateId = "2x2" | "3x3" | "4x4";

export type JigsawTemplate = JigsawGridLayout & {
  id: JigsawTemplateId;
  label: string;
};

export const JIGSAW_TEMPLATES: readonly JigsawTemplate[] = [
  { id: "2x2", label: "2×2", cols: 2, rows: 2, tileCount: 4 },
  { id: "3x3", label: "3×3", cols: 3, rows: 3, tileCount: 9 },
  { id: "4x4", label: "4×4", cols: 4, rows: 4, tileCount: 16 },
] as const;

export const DEFAULT_JIGSAW_TEMPLATE_ID: JigsawTemplateId = "2x2";

export function jigsawTemplateById(id: JigsawTemplateId): JigsawTemplate {
  return JIGSAW_TEMPLATES.find((template) => template.id === id) ?? JIGSAW_TEMPLATES[1]!;
}

export function jigsawTemplateFromGrid(cols: number, rows: number): JigsawTemplate | null {
  return JIGSAW_TEMPLATES.find((template) => template.cols === cols && template.rows === rows) ?? null;
}

export function layoutFromTemplate(template: JigsawGridLayout): JigsawGridLayout {
  return {
    cols: template.cols,
    rows: template.rows,
    tileCount: template.cols * template.rows,
  };
}

/** Minimum questions = one per puzzle piece. */
export function minQuestionCountForTemplate(template: Pick<JigsawGridLayout, "cols" | "rows">): number {
  return Math.max(1, template.cols * template.rows);
}

/** Suggested question count when a template is picked (e.g. 2×2 → 10 questions). */
export function defaultQuestionCountForTemplate(template: JigsawGridLayout): number {
  const tileCount = template.cols * template.rows;
  return Math.min(
    GAME_CONFIG.jigsaw.maxQuestions,
    Math.max(tileCount, tileCount * 2 + 2),
  );
}

/**
 * @deprecated Legacy rooms derived grid from question count. Prefer explicit templates.
 * 1–4 questions → 2×2 · 5–9 → 3×3 · 10–16 → 4×4
 */
export function jigsawTileCountForQuestions(questionCount: number): number {
  const q = Math.max(1, Math.min(GAME_CONFIG.jigsaw.maxQuestions, questionCount));
  if (q <= 4) return 4;
  if (q <= 9) return 9;
  return 16;
}

/** @deprecated Use `layoutFromTemplate(jigsawTemplateById(...))` for new rooms. */
export function computeJigsawGrid(questionCount: number): JigsawGridLayout {
  const tileCount = jigsawTileCountForQuestions(questionCount);
  const side = Math.sqrt(tileCount) as 2 | 3 | 4;
  return { cols: side, rows: side, tileCount };
}

export function resolveJigsawGrid(
  cols: number | undefined,
  rows: number | undefined,
  questionCount: number,
): JigsawGridLayout {
  const fromPayload = jigsawTemplateFromGrid(cols ?? 0, rows ?? 0);
  if (fromPayload) return layoutFromTemplate(fromPayload);
  return computeJigsawGrid(questionCount);
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
