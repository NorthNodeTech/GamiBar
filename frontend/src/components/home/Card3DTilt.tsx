import { useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";

interface Card3DTiltProps {
  children: ReactNode;
  className?: string;
  cursorType?: "normal" | "button" | "puzzle" | "quiz" | "maze" | "card";
  variant?: "light" | "dark";
  tilt?: number;
}

export function Card3DTilt({
  children,
  className = "",
  cursorType = "card",
  variant = "light",
  tilt = 10,
}: Card3DTiltProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ rotateX: 0, rotateY: 0 });
  const [spotlight, setSpotlight] = useState({ x: 50, y: 50, opacity: 0 });
  const reduceMotion = useReducedMotion();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduceMotion || !shellRef.current) return;
    const rect = shellRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -tilt;
    const rotateY = ((x - centerX) / centerX) * tilt;

    setTransform({ rotateX, rotateY });
    setSpotlight({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 1,
    });
  };

  const handleMouseEnter = () => {
    if (reduceMotion) return;
    sound.playHover();
    setSpotlight((s) => ({ ...s, opacity: 1 }));
  };

  const handleMouseLeave = () => {
    setTransform({ rotateX: 0, rotateY: 0 });
    setSpotlight((s) => ({ ...s, opacity: 0 }));
  };

  const variantClasses =
    variant === "dark"
      ? "border-white/10 bg-[#0E0E12] shadow-[0_4px_30px_-4px_rgba(0,0,0,0.6)] hover:border-white/20 hover:bg-[#131318] hover:shadow-[0_12px_40px_-6px_rgba(0,0,0,0.8)] dark:border-[var(--gamibar-border)] dark:bg-[var(--elevated)] dark:hover:border-[color-mix(in_srgb,var(--foreground)_22%,var(--gamibar-border))]"
      : "border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] shadow-[var(--shadow-soft)] hover:border-[color-mix(in_srgb,var(--foreground)_18%,var(--gamibar-border))] hover:shadow-[var(--shadow-lift)]";

  const spotlightColor =
    variant === "dark"
      ? `radial-gradient(600px circle at ${spotlight.x}% ${spotlight.y}%, rgba(255,255,255,0.09), transparent 42%)`
      : `radial-gradient(600px circle at ${spotlight.x}% ${spotlight.y}%, rgba(239,68,68,0.08), transparent 42%)`;

  return (
    <div
      ref={shellRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-cursor={cursorType}
      className="relative h-full"
      style={{ perspective: 1200 }}
    >
      <motion.div
        style={{ transformStyle: "preserve-3d", willChange: "transform" }}
        animate={
          reduceMotion
            ? { rotateX: 0, rotateY: 0 }
            : { rotateX: transform.rotateX, rotateY: transform.rotateY }
        }
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className={cn(
          "relative h-full overflow-hidden rounded-xl border transition-shadow duration-300",
          variantClasses,
          className,
        )}
      >
        <div
          className="pointer-events-none absolute -inset-px z-[1] transition-opacity duration-300"
          style={{
            opacity: spotlight.opacity,
            background: spotlightColor,
          }}
        />
        <div className="relative z-10 h-full">{children}</div>
      </motion.div>
    </div>
  );
}
