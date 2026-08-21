import { type ReactNode } from "react";
import { Medal, Trophy } from "lucide-react";

import type { GameMode } from "@shared/game/config";
import {
  formatLeaderboardPerformance,
  formatLeaderboardTime,
  leaderboardRankingHint,
} from "@shared/game/leaderboard-display";
import type { LeaderboardRow } from "@shared/game/types";
import { cn } from "@/lib/utils";

export function UnifiedLeaderboard({
  mode,
  rows,
  finished,
  highlightParticipantId,
  className,
  title,
  subtitle,
  headerExtra,
}: {
  mode: GameMode;
  rows: LeaderboardRow[];
  finished?: boolean;
  highlightParticipantId?: string;
  className?: string;
  title?: string;
  subtitle?: string;
  headerExtra?: ReactNode;
}) {
  const isQuiz = mode === "quiz" || mode === "quiz_jigsaw";
  const performanceHeader = isQuiz ? "Score" : "Performance";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[20px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] shadow-[var(--shadow-soft)] sm:rounded-[24px]",
        className,
      )}
    >
      <div className="border-b border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--foreground)] text-[var(--background)]">
              <Trophy className="size-4" />
            </span>
            <div className="min-w-0">
              <h2 className="break-words font-display text-base font-bold leading-tight text-[var(--foreground)] sm:text-lg">
                {title ?? (finished ? "Final standings" : "Live leaderboard")}
              </h2>
              <p className="mt-1 max-w-full text-xs leading-snug text-[var(--muted-foreground)]">
                {subtitle ?? leaderboardRankingHint(mode)}
              </p>
            </div>
          </div>
          {headerExtra ? <div className="shrink-0">{headerExtra}</div> : null}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[var(--gamibar-page)] text-[var(--muted-foreground)]">
            <Medal className="size-7" />
          </div>
          <p className="mt-4 text-sm font-medium text-[var(--foreground)]">No scores yet</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Rankings appear once participants start playing.
          </p>
        </div>
      ) : (
        <>
          <ol className="divide-y divide-[var(--gamibar-border)]/70 sm:hidden">
            {rows.map((row) => {
              const highlighted = row.participantId === highlightParticipantId;
              return (
                <li
                  key={row.participantId}
                  className={cn(
                    "grid gap-3 px-4 py-4 transition-colors",
                    highlighted && "bg-[var(--gamibar-brand-soft)]",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <RankBadge rank={row.rank} />
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--foreground)]">
                      {row.displayName}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <MetricPill
                      label={performanceHeader}
                      value={formatLeaderboardPerformance(mode, row)}
                    />
                    <MetricPill label="Time" value={formatLeaderboardTime(row)} muted />
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--gamibar-border)] bg-[var(--gamibar-page)]/60 text-[10px] font-bold uppercase tracking-wider text-[var(--gamibar-text-tertiary)]">
                  <th className="px-4 py-3 sm:px-6">Rank</th>
                  <th className="px-4 py-3 sm:px-6">Participant</th>
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
                        <RankBadge rank={row.rank} compact />
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3 font-medium text-[var(--foreground)] lg:max-w-none sm:px-6">
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
        </>
      )}
    </div>
  );
}

function RankBadge({ rank, compact }: { rank: number; compact?: boolean }) {
  const rankLabel = rank === 1 ? "1st" : rank === 2 ? "2nd" : rank === 3 ? "3rd" : `${rank}`;

  if (compact) {
    return (
      <span className="inline-flex min-w-7 items-center font-bold text-[var(--foreground)]">
        #{rank}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full border text-xs font-black",
        rank === 1 && "border-[#111111] bg-[#111111] text-white",
        rank === 2 && "border-[#E5E7EB] bg-[#E5E7EB] text-[#111111]",
        rank === 3 && "border-[#E5E7EB] bg-[#F3F4F6] text-[#374151]",
        rank > 3 &&
          "border-[var(--gamibar-border)] bg-[var(--gamibar-page)] text-[var(--muted-foreground)]",
      )}
      aria-label={`${rankLabel} place`}
    >
      {rank}
    </span>
  );
}

function MetricPill({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] px-3 py-2">
      <p className="truncate text-[10px] font-bold uppercase tracking-wider text-[var(--gamibar-text-tertiary)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 min-w-0 break-words text-sm font-semibold tabular-nums leading-tight",
          muted ? "text-[var(--muted-foreground)]" : "text-[var(--foreground)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}
