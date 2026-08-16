import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { MOTION_EASE } from "@/components/ui/text-motion";

export function Reveal({
  children,
  delay = 0,
  className,
  y = 28,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  /** Vertical slide distance in px */
  y?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-48px" }}
      transition={{ duration: 0.55, delay, ease: MOTION_EASE }}
    >
      {children}
    </motion.div>
  );
}
