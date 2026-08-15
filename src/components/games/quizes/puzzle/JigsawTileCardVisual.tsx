import type { ReactNode } from "react";
import { motion } from "framer-motion";

import type { JigsawTileCardRotation } from "@/lib/game/jigsaw-tiles";
import { cn } from "@/lib/utils";

type JigsawTileCardVisualProps = {
  rotation: JigsawTileCardRotation;
  children: ReactNode;
  className?: string;
};

/** Rotates the card face visually without changing the underlying image crop. */
export function JigsawTileCardVisual({ rotation, children, className }: JigsawTileCardVisualProps) {
  return (
    <div className={cn("size-full overflow-hidden", className)}>
      <motion.div
        className="size-full origin-center"
        animate={{ rotate: rotation }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}
