import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthorPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function AuthorPageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: AuthorPageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--gamibar-brand)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-[clamp(1.65rem,5vw,2rem)] font-extrabold tracking-tight text-[var(--foreground)]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--muted-foreground)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center [&_a]:min-h-11 [&_button]:min-h-11 sm:[&_a]:min-h-0 sm:[&_button]:min-h-0">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
