import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Blocks, Target, Route as RouteIcon } from "lucide-react";

export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [cursorState, setCursorState] = useState<"normal" | "button" | "puzzle" | "quiz" | "maze" | "card">("normal");

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  const springConfig = { damping: 18, stiffness: 900, mass: 0.15 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (isTouch) return;

    setEnabled(true);
    document.body.classList.add("custom-cursor-active");

    const onMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const cursorAttr = target.closest("[data-cursor]")?.getAttribute("data-cursor");
      if (cursorAttr) {
        setCursorState(cursorAttr as typeof cursorState);
        return;
      }

      if (target.closest("button, a, [role='button']")) {
        setCursorState("button");
      } else if (target.closest(".panel, [data-card]")) {
        setCursorState("card");
      } else {
        setCursorState("normal");
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.body.classList.remove("custom-cursor-active");
    };
  }, [mouseX, mouseY]);

  if (!enabled) return null;

  const ringSize =
    cursorState === "button"
      ? 48
      : cursorState === "card"
        ? 40
        : cursorState === "puzzle" || cursorState === "quiz" || cursorState === "maze"
          ? 44
          : 28;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      <motion.div
        className="fixed top-0 left-0 size-1.5 rounded-full bg-[#111111]"
        style={{
          x: mouseX,
          y: mouseY,
          translateX: "-50%",
          translateY: "-50%",
        }}
      />

      <motion.div
        className="fixed top-0 left-0 flex items-center justify-center rounded-full border-2 border-[#111111]/60 bg-transparent transition-[width,height] duration-100"
        style={{
          x: cursorX,
          y: cursorY,
          translateX: "-50%",
          translateY: "-50%",
          width: ringSize,
          height: ringSize,
        }}
      >
        {cursorState === "puzzle" && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.1 }}>
            <Blocks className="size-4 text-[#111111]" />
          </motion.div>
        )}
        {cursorState === "quiz" && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.1 }}>
            <Target className="size-4 text-[#111111]" />
          </motion.div>
        )}
        {cursorState === "maze" && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.1 }}>
            <RouteIcon className="size-4 text-[#111111]" />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
