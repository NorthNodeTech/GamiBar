import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const MOTION_EASE = [0.22, 1, 0.36, 1] as const;

const viewport = { once: true, margin: "-48px" as const };

export function FadeUp({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "span" | "p" | "h1" | "h2" | "h3";
}) {
  const reduce = useReducedMotion();
  const Component = motion[Tag] as typeof motion.div;

  return (
    <Component
      className={className}
      initial={reduce ? false : { opacity: 0, y: 22 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={viewport}
      transition={{ duration: 0.55, delay, ease: MOTION_EASE }}
    >
      {children}
    </Component>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
  titleClassName,
  eyebrowClassName,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
  titleClassName?: string;
  eyebrowClassName?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <div
      className={cn(
        align === "center" ? "text-center" : "text-left md:text-left",
        className,
      )}
    >
      {eyebrow && (
        <motion.span
          initial={reduce ? false : { opacity: 0, y: 10, filter: "blur(6px)" }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={viewport}
          transition={{ duration: 0.45, ease: MOTION_EASE }}
          className={cn(
            "inline-block text-xs font-semibold uppercase tracking-widest text-[var(--gamibar-text-tertiary)]",
            eyebrowClassName,
          )}
        >
          {eyebrow}
        </motion.span>
      )}

      <motion.h2
        initial={reduce ? false : { opacity: 0, y: 24 }}
        whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
        viewport={viewport}
        transition={{ duration: 0.6, delay: 0.07, ease: MOTION_EASE }}
        className={cn(
          "font-display font-bold tracking-tight text-[var(--foreground)]",
          !eyebrow && "mt-0",
          eyebrow && "mt-2",
          align === "center"
            ? "mx-auto text-[clamp(1.75rem,4.5vw,3rem)]"
            : "text-[clamp(1.5rem,4.5vw,1.875rem)]",
          titleClassName,
        )}
      >
        {title}
      </motion.h2>

      {description && (
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 18 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ duration: 0.55, delay: 0.14, ease: MOTION_EASE }}
          className={cn(
            "mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted-foreground)]",
            align === "center" && "mx-auto",
          )}
        >
          {description}
        </motion.p>
      )}
    </div>
  );
}

const wordContainer: Variants = {
  hidden: {},
  show: (delay: number) => ({
    transition: { staggerChildren: 0.045, delayChildren: delay },
  }),
};

const wordItem: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.45, ease: MOTION_EASE },
  },
};

export function AnimatedWords({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <span className={className}>{text}</span>;

  return (
    <motion.span
      className={cn("inline", className)}
      variants={wordContainer}
      initial="hidden"
      animate="show"
      custom={delay}
    >
      {text.split(" ").map((word, i) => (
        <motion.span key={`${word}-${i}`} variants={wordItem} className="mr-[0.28em] inline-block">
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
}

export function AnimatedAccent({
  children,
  className,
  delay = 0.2,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.span
      className={className}
      initial={reduce ? false : { opacity: 0, y: 20, scale: 0.96 }}
      animate={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.65, delay, ease: MOTION_EASE }}
    >
      {children}
    </motion.span>
  );
}
