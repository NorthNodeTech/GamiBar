import { GAME_CONFIG } from "@/lib/game/config";
import type { VisualPoint, VisualPointQuestionDraft } from "@/lib/game/types";
import { validateVisualPointFile } from "@/lib/game/validation";

export const VISUAL_POINT_DOT_SIZE = 18;
export const VISUAL_POINT_TOUCH_SIZE = 44;

export type VisualPointImagePrepareResult =
  | {
      ok: true;
      dataUrl: string;
      mime: string;
      width: number;
      height: number;
    }
  | { ok: false; error: string };

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image. Try a different file."));
    };
    img.src = url;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read that image."));
    };
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
}

export async function prepareVisualPointImage(
  file: File,
): Promise<VisualPointImagePrepareResult> {
  const basic = validateVisualPointFile(file);
  if (!basic.ok) return basic;

  let img: HTMLImageElement;
  try {
    img = await loadImageFromFile(file);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not read that image.",
    };
  }

  const { minDimension, maxDimension } = GAME_CONFIG.visual_point;
  const shortest = Math.min(img.naturalWidth, img.naturalHeight);
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  if (shortest < minDimension) {
    return {
      ok: false,
      error: `Use an image at least ${minDimension}px on its shortest side (yours is ${img.naturalWidth}x${img.naturalHeight}).`,
    };
  }
  if (longest > maxDimension) {
    return {
      ok: false,
      error: `Use an image no larger than ${maxDimension}px on its longest side.`,
    };
  }

  try {
    const dataUrl = await readFileAsDataUrl(file);
    return {
      ok: true,
      dataUrl,
      mime: file.type,
      width: img.naturalWidth,
      height: img.naturalHeight,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not prepare that image.",
    };
  }
}

export function createVisualPointId(points: VisualPoint[]): string {
  let index = points.length + 1;
  let id = `point-${index}`;
  const existing = new Set(points.map((point) => point.id));
  while (existing.has(id)) {
    index += 1;
    id = `point-${index}`;
  }
  return id;
}

export function clampVisualCoordinate(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Number(value.toFixed(2))));
}

export function normalizeVisualPointQuestion(
  question: VisualPointQuestionDraft,
): VisualPointQuestionDraft {
  return {
    ...question,
    prompt: question.prompt.trim(),
    imageWidth: question.imageWidth ?? null,
    imageHeight: question.imageHeight ?? null,
    points: question.points.map((point) => ({
      id: point.id,
      x: clampVisualCoordinate(point.x),
      y: clampVisualCoordinate(point.y),
      isCorrect: Boolean(point.isCorrect),
      ...(point.adminReference?.trim()
        ? { adminReference: point.adminReference.trim().slice(0, 120) }
        : {}),
      color: point.color || "#111111",
    })),
  };
}
