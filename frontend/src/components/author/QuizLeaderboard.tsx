import { Medal, Trophy } from "lucide-react";

import { formatAccuracy, formatDuration } from "@/lib/game/ranking";
import type { LeaderboardRow } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export function QuizLeaderboard({
  rows,
  finished,
  highlightParticipantId,
  className,
}: {
  rows: LeaderboardRow[];
  finished?: boolean;
  highlightParticipantId?: string;
  className?: string;
}) {
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
            <p className="text-xs text-[var(--muted-foreground)]">
              Ranked by score, then fastest completion time
            </p>
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
            Rankings appear once participants start answering.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--gamibar-border)] bg-[var(--gamibar-page)]/60 text-[10px] font-bold uppercase tracking-wider text-[var(--gamibar-text-tertiary)]">
                <th className="px-4 py-3 sm:px-6">Rank</th>
                <th className="px-4 py-3 sm:px-6">Participant</th>
                <th className="px-4 py-3 text-right sm:px-6">Score</th>
                <th className="px-4 py-3 text-right sm:px-6">Accuracy</th>
                <th className="px-4 py-3 text-right sm:px-6">Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const highlighted = row.participantId === highlightParticipantId;
                const score = row.score ?? row.primaryMetric;
                const accuracy = row.accuracyPercent ?? null;
                const timeLabel =
                  row.status === "completed" && row.secondaryMetric != null
                    ? formatDuration(row.secondaryMetric)
                    : row.status === "in_progress"
                      ? "In progress"
                      : "—";

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
                      {score}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--muted-foreground)] sm:px-6">
                      {formatAccuracy(accuracy)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--muted-foreground)] sm:px-6">
                      {timeLabel}
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
