import { cn } from "@/lib/utils";
import { tileBackgroundStyle } from "@shared/game/jigsaw-tiles";

type JigsawTileFaceProps = {
  col: number;
  row: number;
  cols: number;
  rows: number;
  imageUrl: string;
  className?: string;
  colorProgress?: number; // 0 to 1
};

/** Single square puzzle tile showing the correct image crop with optional partial fractional color progress. */
export function JigsawTileFace({
  col,
  row,
  cols,
  rows,
  imageUrl,
  className,
  colorProgress = 1,
}: JigsawTileFaceProps) {
  const bgStyle = tileBackgroundStyle(col, row, cols, rows, imageUrl);
  const clampedProgress = Math.max(0, Math.min(1, colorProgress));
  const isPartial = clampedProgress < 1;

  if (!isPartial) {
    return (
      <div
        className={cn("size-full bg-[#111] bg-cover bg-no-repeat", className)}
        style={bgStyle}
        aria-hidden
      />
    );
  }

  // Fractional Color Reveal:
  // Base layer is Black & White / Grayscale
  // Top layer is Full Vibrant Color, clipped to the exact progress percentage
  const colorPercentage = Math.round(clampedProgress * 100);

  return (
    <div className={cn("relative size-full overflow-hidden bg-[#222]", className)} aria-hidden>
      {/* Base Layer: Black & White / Grayscale */}
      <div
        className="absolute inset-0 size-full bg-cover bg-no-repeat grayscale contrast-125 brightness-90"
        style={bgStyle}
      />

      {/* Top Layer: Full Color, clipped from left to right according to progress */}
      <div
        className="absolute inset-0 size-full bg-cover bg-no-repeat transition-all duration-300 ease-out"
        style={{
          ...bgStyle,
          clipPath: `inset(0 ${100 - colorPercentage}% 0 0)`,
        }}
      />

      {/* Subtle Divider Line between color and grayscale sections */}
      {colorPercentage > 0 && colorPercentage < 100 && (
        <div
          className="absolute top-0 bottom-0 w-[1.5px] bg-white/90 shadow-[0_0_6px_rgba(255,255,255,0.9)] z-10"
          style={{ left: `${colorPercentage}%` }}
        />
      )}
    </div>
  );
}
