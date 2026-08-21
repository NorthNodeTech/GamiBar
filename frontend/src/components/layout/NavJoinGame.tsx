import { Link } from "@/lib/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Navigates straight to the participant join portal - no authentication. */
export function NavJoinGame({
  className,
  size = "sm",
  variant = "default",
  onClick,
}: {
  className?: string;
  size?: "sm" | "default";
  variant?: "default" | "mobile";
  onClick?: () => void;
}) {
  return (
    <Button
      asChild
      size={size}
      className={cn(
        "rounded-xl bg-[#dc2626] font-semibold text-white shadow-[0_4px_12px_rgba(220,38,38,0.28)] hover:bg-[#b91c1c]",
        variant === "mobile" && "h-9 px-3 text-xs",
        className,
      )}
    >
      <Link to="/join" onClick={onClick}>
        Join room
      </Link>
    </Button>
  );
}
