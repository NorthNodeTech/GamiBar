import type { LeaderboardRow } from "@shared/game/types";

export type QuizRankInput = {
  participantId: string;
  displayName: string;
  score: number;
  correctCount: number;
  durationMs: number | null;
  completed: boolean;
  answeredCount: number;
  totalQuestions: number;
};

export type JigsawRankInput = {
  participantId: string;
  displayName: string;
  completed: boolean;
  durationMs: number | null;
  /** 0–1 fraction of locked pieces */
  progress: number;
  incorrectAttempts: number;
};

export type ConnectDotsRankInput = {
  participantId: string;
  displayName: string;
  completed: boolean;
  durationMs: number | null;
  connectedPairs: number;
  totalPairs: number;
  incorrectAttempts: number;
};

/**
 * Quiz Challenge: highest score first, then faster completion as tie-breaker.
 */
export function rankQuiz(inputs: QuizRankInput[]): LeaderboardRow[] {
  const sorted = [...inputs].sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    const ad = a.durationMs ?? Number.POSITIVE_INFINITY;
    const bd = b.durationMs ?? Number.POSITIVE_INFINITY;
    if (ad !== bd) return ad - bd;
    return a.displayName.localeCompare(b.displayName);
  });

  return sorted.map((row, i) => {
    const accuracyPercent =
      row.totalQuestions > 0 ? Math.round((row.correctCount / row.totalQuestions) * 100) : null;
    return {
      rank: i + 1,
      participantId: row.participantId,
      displayName: row.displayName,
      primaryMetric: row.score,
      primaryLabel: "score",
      secondaryMetric: row.durationMs,
      secondaryLabel: row.durationMs != null ? "ms" : null,
      status: row.completed ? "completed" : row.answeredCount > 0 ? "in_progress" : "incomplete",
      detail: formatAccuracy(accuracyPercent),
      performanceText:
        accuracyPercent != null ? `${row.score} · ${formatAccuracy(accuracyPercent)}` : String(row.score),
      score: row.score,
      accuracyPercent,
    };
  });
}

export function formatAccuracy(percent: number | null | undefined): string {
  if (percent == null || !Number.isFinite(percent)) return "—";
  return `${percent}%`;
}

/** Jigsaw Mission: fewest incorrect attempts first, then faster puzzle completion. */
export function rankJigsaw(inputs: JigsawRankInput[]): LeaderboardRow[] {
  const sorted = [...inputs].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? -1 : 1;

    if (a.incorrectAttempts !== b.incorrectAttempts) {
      return a.incorrectAttempts - b.incorrectAttempts;
    }

    if (a.completed && b.completed) {
      const ad = a.durationMs ?? Number.POSITIVE_INFINITY;
      const bd = b.durationMs ?? Number.POSITIVE_INFINITY;
      if (ad !== bd) return ad - bd;
    } else if (!a.completed && !b.completed && a.progress !== b.progress) {
      return b.progress - a.progress;
    }

    return a.displayName.localeCompare(b.displayName);
  });

  return sorted.map((row, i) => {
    const progressPercent = Math.round(row.progress * 100);
    const performanceText = row.completed
      ? `${row.incorrectAttempts} incorrect`
      : `${progressPercent}% · ${row.incorrectAttempts} incorrect`;

    return {
      rank: i + 1,
      participantId: row.participantId,
      displayName: row.displayName,
      primaryMetric: row.incorrectAttempts,
      primaryLabel: "incorrect",
      secondaryMetric: row.durationMs,
      secondaryLabel: row.durationMs != null ? "ms" : null,
      status: row.completed ? "completed" : row.progress > 0 ? "in_progress" : "incomplete",
      detail: row.completed ? formatDuration(row.durationMs) : `${progressPercent}%`,
      performanceText,
      incorrectAttempts: row.incorrectAttempts,
    };
  });
}

/** Connect Dots: fastest successful completion first, then fewest incorrect attempts. */
export function rankConnectDots(inputs: ConnectDotsRankInput[]): LeaderboardRow[] {
  const sorted = [...inputs].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? -1 : 1;

    if (a.completed && b.completed) {
      const ad = a.durationMs ?? Number.POSITIVE_INFINITY;
      const bd = b.durationMs ?? Number.POSITIVE_INFINITY;
      if (ad !== bd) return ad - bd;
      if (a.incorrectAttempts !== b.incorrectAttempts) {
        return a.incorrectAttempts - b.incorrectAttempts;
      }
    } else {
      if (a.connectedPairs !== b.connectedPairs) return b.connectedPairs - a.connectedPairs;
      if (a.incorrectAttempts !== b.incorrectAttempts) {
        return a.incorrectAttempts - b.incorrectAttempts;
      }
    }

    return a.displayName.localeCompare(b.displayName);
  });

  return sorted.map((row, i) => {
    const performanceText = row.completed
      ? row.incorrectAttempts === 0
        ? "All correct"
        : `${row.incorrectAttempts} incorrect`
      : `${row.connectedPairs}/${row.totalPairs} pairs · ${row.incorrectAttempts} incorrect`;

    return {
      rank: i + 1,
      participantId: row.participantId,
      displayName: row.displayName,
      primaryMetric: row.connectedPairs,
      primaryLabel: "pairs",
      secondaryMetric: row.durationMs,
      secondaryLabel: row.durationMs != null ? "ms" : null,
      status: row.completed ? "completed" : row.connectedPairs > 0 ? "in_progress" : "incomplete",
      detail: row.completed
        ? formatDuration(row.durationMs)
        : `${row.connectedPairs}/${row.totalPairs}`,
      performanceText,
      incorrectAttempts: row.incorrectAttempts,
    };
  });
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  const s = ms / 1000;
  return `${s.toFixed(1)}s`;
}
