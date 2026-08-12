import { GAME_CONFIG } from "@/lib/game/config";
import { validateJigsawFile } from "@/lib/game/validation";

/** Allow tiny rounding differences from camera exports. */
const SQUARE_ASPECT_TOLERANCE = 0.02;

export type JigsawImagePrepareResult =
  | {
      ok: true;
      dataUrl: string;
      mime: string;
      cropped: boolean;
      width: number;
      height: number;
    }
  | { ok: false; error: string };

export function isSquareAspectRatio(
  width: number,
  height: number,
  tolerance = SQUARE_ASPECT_TOLERANCE,
): boolean {
  if (width <= 0 || height <= 0) return false;
  const ratio = width / height;
  return Math.abs(ratio - 1) <= tolerance;
}

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

function outputMimeForFile(mime: string): string {
  if (mime === "image/png") return "image/png";
  if (mime === "image/webp") return "image/webp";
  return "image/jpeg";
}

/** Center-crop to square and optionally scale to `outputSize`. */
function renderSquareJigsawImage(
  img: HTMLImageElement,
  outputSize: number,
  mime: string,
): string {
  const sourceSize = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = Math.floor((img.naturalWidth - sourceSize) / 2);
  const sy = Math.floor((img.naturalHeight - sourceSize) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image.");

  ctx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, outputSize, outputSize);

  const outputMime = outputMimeForFile(mime);
  return canvas.toDataURL(outputMime, outputMime === "image/jpeg" ? 0.92 : undefined);
}

/**
 * Normalizes an uploaded puzzle image to a square crop so tile slices align with the skeleton grid.
 * Non-square uploads are center-cropped; results are capped at `maxDimension`.
 */
export async function prepareJigsawImage(file: File): Promise<JigsawImagePrepareResult> {
  const basic = validateJigsawFile(file);
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

  const { minDimension, maxDimension } = GAME_CONFIG.jigsaw;
  const shortSide = Math.min(img.naturalWidth, img.naturalHeight);
  if (shortSide < minDimension) {
    return {
      ok: false,
      error: `Use an image at least ${minDimension}×${minDimension} px on its shortest side (yours is ${img.naturalWidth}×${img.naturalHeight}).`,
    };
  }

  const cropped = !isSquareAspectRatio(img.naturalWidth, img.naturalHeight);
  const outputSize = Math.min(shortSide, maxDimension);

  try {
    const dataUrl = renderSquareJigsawImage(img, outputSize, file.type);
    const mime = outputMimeForFile(file.type);
    return {
      ok: true,
      dataUrl,
      mime,
      cropped,
      width: outputSize,
      height: outputSize,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not prepare the puzzle image.",
    };
  }
}
