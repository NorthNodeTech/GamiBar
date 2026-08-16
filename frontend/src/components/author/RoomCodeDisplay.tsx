import { cn } from "@/lib/utils";

export function RoomCodeDisplay({
  code,
  size = "default",
  className,
}: {
  code: string;
  size?: "default" | "large";
  className?: string;
}) {
  const digits = code.replace(/\D/g, "").slice(0, 6).padStart(6, " ").split("");

  return (
    <div
      className={cn(
        "grid w-full min-w-0 grid-cols-6 gap-1 sm:gap-1.5",
        size === "large" ? "max-w-full" : "max-w-md sm:max-w-lg",
        className,
      )}
      aria-label={`Room code ${code.replace(/\D/g, "")}`}
    >
      {digits.map((digit, index) => (
        <span
          key={index}
          className={cn(
            "flex h-11 min-w-0 items-center justify-center rounded-xl border font-mono font-bold tabular-nums shadow-[var(--shadow-soft)] transition-colors sm:h-12",
            "border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] text-[var(--foreground)]",
            size === "large"
              ? "text-lg sm:text-xl md:text-2xl"
              : "text-base sm:text-lg md:text-xl",
            digit.trim() &&
              "border-[var(--gamibar-brand)]/40 bg-[var(--gamibar-brand-soft)] text-[var(--foreground)]",
          )}
        >
          {digit.trim() || "·"}
        </span>
      ))}
    </div>
  );
}
