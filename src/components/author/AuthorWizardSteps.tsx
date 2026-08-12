import { cn } from "@/lib/utils";

const steps = [
  { key: "mode", label: "Game", short: "Game" },
  { key: "details", label: "Details", short: "Info" },
  { key: "configure", label: "Content", short: "Content" },
  { key: "review", label: "Launch", short: "Go" },
] as const;

type WizardStepKey = (typeof steps)[number]["key"];

export function AuthorWizardSteps({
  current,
  className,
  compact,
}: {
  current: WizardStepKey;
  className?: string;
  compact?: boolean;
}) {
  const currentIndex = steps.findIndex((s) => s.key === current);

  return (
    <ol className={cn("flex w-full items-center", className)} aria-label="Create session progress">
      {steps.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={step.key} className="flex min-w-0 flex-1 items-center last:flex-none">
            <div className="flex min-w-0 flex-col items-center gap-1">
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold sm:size-8",
                  done && "bg-[var(--game-connect-dots)] text-white",
                  active && "bg-[#111111] text-white ring-2 ring-[#111111]/15 sm:ring-4",
                  !done && !active && "border border-[var(--gamibar-border)] bg-white text-[#737373]",
                )}
              >
                {done ? "✓" : index + 1}
              </span>
              <span
                className={cn(
                  "max-w-[4.5rem] truncate text-center text-[10px] font-semibold sm:max-w-none sm:text-xs",
                  active ? "text-[#111111]" : done ? "text-[var(--game-connect-dots-deep)]" : "text-[#737373]",
                )}
              >
                {compact ? step.short : step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "mx-1 h-px flex-1 min-w-[8px] sm:mx-2",
                  index < currentIndex ? "bg-[var(--game-connect-dots)]" : "bg-[var(--gamibar-border)]",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export type { WizardStepKey };
