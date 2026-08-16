import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
  /** Narrower max width for forms and game screens */
  narrow?: boolean;
};

/** Shared responsive page gutter + max-width wrapper. */
export function PageContainer({ children, className, narrow }: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full min-w-0 px-4 sm:px-5 md:px-6 lg:px-8",
        narrow ? "max-w-lg" : "max-w-6xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
