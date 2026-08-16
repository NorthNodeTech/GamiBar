import type { GameMode } from "@/lib/game/config";
import { formatAccuracy, formatDuration } from "@/lib/game/ranking";
import type { LeaderboardRow } from "@/lib/game/types";

/** Per-mode ranking explanation shown under the leaderboard title. */
export function leaderboardRankingHint(mode: GameMode): string {
  switch (mode) {
    case "quiz":
    case "quiz_jigsaw":
      return "Ranked by score, then fastest completion time";
    case "jigsaw":
      return "Ranked by fewest incorrect attempts, then fastest puzzle completion";
    case "connect_dots":
      return "Ranked by fastest successful completion, then fewest incorrect attempts";
    case "polls":
      return "Ordered by submitted responses";
    default:
      return "Rankings for this game mode only";
  }
}

export function formatLeaderboardTime(row: LeaderboardRow): string {
  if (row.status === "completed" && row.secondaryMetric != null) {
    return formatDuration(row.secondaryMetric);
  }
  if (row.status === "in_progress") return "In progress";
  return "—";
}

export function formatLeaderboardPerformance(mode: GameMode, row: LeaderboardRow): string {
  if (row.performanceText) return row.performanceText;

  switch (mode) {
    case "quiz":
    case "quiz_jigsaw": {
      const score = row.score ?? row.primaryMetric;
      const accuracy = row.accuracyPercent;
      return accuracy != null ? `${score} · ${formatAccuracy(accuracy)}` : String(score);
    }
    case "jigsaw":
      if (row.status === "completed") {
        return `${row.incorrectAttempts ?? row.primaryMetric} incorrect`;
      }
      return `${row.detail ?? `${Math.round(row.primaryMetric)}%`} · ${row.incorrectAttempts ?? 0} incorrect`;
    case "connect_dots":
      if (row.status === "completed") {
        const wrong = row.incorrectAttempts ?? 0;
        return wrong === 0 ? "All correct" : `${wrong} incorrect`;
      }
      return row.detail ?? `${row.primaryMetric} pairs`;
    case "polls":
      return row.performanceText ?? row.detail ?? `${row.primaryMetric} answered`;
    default:
      return row.detail ?? String(row.primaryMetric);
  }
}
