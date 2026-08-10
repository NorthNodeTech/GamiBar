import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type LandingSectionProps = {
  id?: string;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
  /** Container max width */
  width?: "5xl" | "6xl" | "7xl";
};

/** Content-hugging landing section - no forced viewport height. */
export function LandingSection({
  id,
  className,
  innerClassName,
  children,
  width = "6xl",
}: LandingSectionProps) {
  const maxWidth =
    width === "5xl" ? "max-w-5xl" : width === "7xl" ? "max-w-7xl" : "max-w-6xl";

  return (
    <section id={id} className={cn("scroll-mt-20 py-14 sm:py-16 md:py-20", className)}>
      <div
        className={cn(
          "mx-auto w-full px-4 sm:px-5 lg:px-8",
          maxWidth,
          innerClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

/** @deprecated Use LandingSection */
export const ViewportSection = LandingSection;
