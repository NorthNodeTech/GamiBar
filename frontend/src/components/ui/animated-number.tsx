import { animate, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export function AnimatedNumber({
  value,
  duration = 1.1,
  format = (n: number) => Math.round(n).toLocaleString(),
  immediate = false,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  /** Count up as soon as mounted (for above-the-fold hero stats). */
  immediate?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!immediate && !inView) return;
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [immediate, inView, value, duration]);

  return <span ref={ref}>{format(display)}</span>;
}
