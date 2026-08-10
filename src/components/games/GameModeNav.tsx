import { Link, useRouterState } from "@tanstack/react-router";
import { Blocks, CircleDot, Timer } from "lucide-react";

import { cn } from "@/lib/utils";

const modes = [
  {
    to: "/games/quiz",
    label: "Quiz Challenge",
    icon: Timer,
    desc: "Timed MCQ",
    activeClass: "bg-[var(--game-quiz)] text-white",
  },
  {
    to: "/games/jigsaw",
    label: "Jigsaw Mission",
    icon: Blocks,
    desc: "Puzzle build",
    activeClass: "bg-[var(--game-jigsaw)] text-white",
  },
  {
    to: "/games/connect-dots",
    label: "Connect Dots",
    icon: CircleDot,
    desc: "Path puzzle",
    activeClass: "bg-[var(--game-connect-dots)] text-white",
  },
] as const;

export function GameModeNav({
  className,
}: {
  className?: string;
  /** @deprecated Dark gameplay chrome is not used - bright theme only */
  variant?: "light" | "dark";
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      className={cn(
        "mb-6 flex flex-wrap gap-2 rounded-2xl border border-[var(--gamibar-border)] bg-white p-1.5 shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      {modes.map((mode) => {
        const active = pathname === mode.to;
        return (
          <Link
            key={mode.to}
            to={mode.to}
            className={cn(
              "flex min-w-[140px] flex-1 items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm transition-all duration-150",
              active
                ? mode.activeClass
                : "text-[#525252] hover:bg-[var(--gamibar-page)] hover:text-[#111111]",
            )}
          >
            <mode.icon className="size-4 shrink-0" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{mode.label}</p>
              <p
                className={cn(
                  "truncate text-[10px]",
                  active ? "text-white/70" : "text-[#A3A3A3]",
                )}
              >
                {mode.desc}
              </p>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
