import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { GameModeNav } from "@/components/games/GameModeNav";

export function GameShell({
  title,
  subtitle,
  progress,
  progressLabel,
  className,
  hideProgress,
  children,
}: {
  title: string;
  subtitle: string;
  progress: number;
  progressLabel: string;
  className?: string;
  hideProgress?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={className ?? "mx-auto w-full max-w-6xl px-4 py-8 sm:px-5 md:py-10 lg:px-8 lg:py-14"}>
      <GameModeNav />
      <div className="mt-2 flex flex-col gap-4 rounded-[20px] border border-[var(--gamibar-border)] bg-white px-4 py-4 shadow-[var(--shadow-soft)] sm:px-5 sm:py-5 md:flex-row md:flex-wrap md:items-end md:justify-between md:px-7">
        <div className="min-w-0">
          <h1 className="font-display text-[clamp(1.5rem,4vw,1.875rem)] font-extrabold tracking-tight text-[#111111]">
            {title}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#525252]">{subtitle}</p>
        </div>
        {!hideProgress && (
          <div className="w-full min-w-0 md:min-w-56 md:w-auto">
            <div className="flex items-center justify-between text-xs text-[#737373]">
              <span>Progress</span>
              <span className="tabular-nums font-medium text-[#111111]">{progressLabel}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--gamibar-page)]">
              <motion.div
                className="h-full rounded-full bg-[var(--gamibar-brand)]"
                animate={{ width: `${Math.round(progress * 100)}%` }}
                transition={{ type: "spring", stiffness: 140, damping: 22 }}
              />
            </div>
          </div>
        )}
      </div>
      <div className="mt-6 md:mt-8">{children}</div>
    </div>
  );
}
