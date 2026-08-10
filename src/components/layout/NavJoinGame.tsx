import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Navigates straight to the student join portal - no authentication. */
export function NavJoinGame({
  className,
  size = "sm",
  variant = "default",
}: {
  className?: string;
  size?: "sm" | "default";
  variant?: "default" | "mobile";
}) {
  return (
    <Button
      asChild
      size={size}
      className={cn(
        "rounded-xl bg-[var(--gamibar-brand)] font-semibold text-white shadow-[0_4px_12px_rgba(239,68,68,0.28)] hover:bg-[var(--gamibar-brand-hover)]",
        variant === "mobile" && "h-9 px-3 text-xs",
        className,
      )}
    >
      <Link to="/join">Join Game</Link>
    </Button>
  );
}
