import { cn } from "@/lib/utils";
import { tileBackgroundStyle } from "@/lib/game/jigsaw-tiles";

type JigsawTileFaceProps = {
  col: number;
  row: number;
  cols: number;
  rows: number;
  imageUrl: string;
  className?: string;
};

/** Single square puzzle tile showing the correct image crop. */
export function JigsawTileFace({
  col,
  row,
  cols,
  rows,
  imageUrl,
  className,
}: JigsawTileFaceProps) {
  return (
    <div
      className={cn("size-full bg-[#111] bg-cover bg-no-repeat", className)}
      style={tileBackgroundStyle(col, row, cols, rows, imageUrl)}
      aria-hidden
    />
  );
}
