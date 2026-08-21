import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthorPageFrameProps = {
  children: ReactNode;
  className?: string;
  /** sm | md | lg | xl — max content width */
  width?: "sm" | "md" | "lg" | "xl";
};

const widthClass = {
  sm: "max-w-3xl",
  md: "max-w-4xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
} as const;

/** Consistent author page container with subtle ambient depth. */
export function AuthorPageFrame({ children, className, width = "lg" }: AuthorPageFrameProps) {
  return (
    <div
      className={cn(
        "author-page relative mx-auto w-full overflow-x-clip pb-6 sm:pb-10",
        widthClass[width],
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -left-8 top-0 hidden size-48 rounded-full bg-[var(--gamibar-brand)]/8 blur-3xl sm:block sm:-left-16 sm:size-64"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-6 top-24 hidden size-40 rounded-full bg-blue-500/6 blur-3xl sm:block sm:-right-12 sm:size-56"
        aria-hidden
      />
      <div className="relative min-w-0">{children}</div>
    </div>
  );
}
