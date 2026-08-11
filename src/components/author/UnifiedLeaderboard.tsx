import { Medal, Trophy } from "lucide-react";

import type { GameMode } from "@/lib/game/config";
import {
  formatLeaderboardPerformance,
  formatLeaderboardTime,
  leaderboardRankingHint,
} from "@/lib/game/leaderboard-display";
import type { LeaderboardRow } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export function UnifiedLeaderboard({
  mode,
  rows,
  finished,
  highlightParticipantId,
  className,
}: {
  mode: GameMode;
  rows: LeaderboardRow[];
  finished?: boolean;
  highlightParticipantId?: string;
  className?: string;
}) {
  const isQuiz = mode === "quiz" || mode === "quiz_jigsaw";
  const performanceHeader = isQuiz ? "Score" : "Performance";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[24px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      <div className="border-b border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--foreground)] text-[var(--background)]">
            <Trophy className="size-4" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-[var(--foreground)]">
              {finished ? "Final standings" : "Live leaderboard"}
            </h2>
            <p className="text-xs text-[var(--muted-foreground)]">{leaderboardRankingHint(mode)}</p>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[var(--gamibar-page)] text-[var(--muted-foreground)]">
            <Medal className="size-7" />
          </div>
          <p className="mt-4 text-sm font-medium text-[var(--foreground)]">No scores yet</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Rankings appear once students start playing.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--gamibar-border)] bg-[var(--gamibar-page)]/60 text-[10px] font-bold uppercase tracking-wider text-[var(--gamibar-text-tertiary)]">
                <th className="px-4 py-3 sm:px-6">Rank</th>
                <th className="px-4 py-3 sm:px-6">Student</th>
                <th className="px-4 py-3 text-right sm:px-6">{performanceHeader}</th>
                <th className="px-4 py-3 text-right sm:px-6">Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const highlighted = row.participantId === highlightParticipantId;
                return (
                  <tr
                    key={row.participantId}
                    className={cn(
                      "border-b border-[var(--gamibar-border)]/70 last:border-0 transition-colors hover:bg-[var(--gamibar-page)]/50",
                      highlighted && "bg-[var(--gamibar-brand-soft)]",
                    )}
                  >
                    <td className="px-4 py-3 font-mono font-bold text-[var(--muted-foreground)] sm:px-6">
                      {row.rank <= 3 ? (
                        <span aria-hidden>
                          {row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : "🥉"}
                        </span>
                      ) : (
                        row.rank
                      )}
                    </td>
                    <td className="max-w-[140px] truncate px-4 py-3 font-medium text-[var(--foreground)] sm:max-w-none sm:px-6">
                      {row.displayName}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-[var(--foreground)] sm:px-6">
                      {formatLeaderboardPerformance(mode, row)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--muted-foreground)] sm:px-6">
                      {formatLeaderboardTime(row)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
