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

export function AuthorPageFrame({ children, className, width = "lg" }: AuthorPageFrameProps) {
  return (
    <div
      className={cn(
        "author-page relative mx-auto w-full overflow-x-clip pb-6 sm:pb-10",
        widthClass[width],
        className,
      )}
    >
      <div className="relative min-w-0">{children}</div>
    </div>
  );
}
