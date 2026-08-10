import type { LeaderboardRow } from "@/lib/game/types";

export type QuizRankInput = {
  participantId: string;
  displayName: string;
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
};

export type ConnectDotsRankInput = {
  participantId: string;
  displayName: string;
  completed: boolean;
  durationMs: number | null;
  connectedPairs: number;
  totalPairs: number;
};

/**
 * Quiz: accuracy/score first, then faster completion as tie-breaker.
 * Unfinished players rank below finishers by answered progress.
 */
export function rankQuiz(inputs: QuizRankInput[]): LeaderboardRow[] {
  const sorted = [...inputs].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? -1 : 1;
    if (a.correctCount !== b.correctCount) return b.correctCount - a.correctCount;
    const ad = a.durationMs ?? Number.POSITIVE_INFINITY;
    const bd = b.durationMs ?? Number.POSITIVE_INFINITY;
    if (ad !== bd) return ad - bd;
    return a.displayName.localeCompare(b.displayName);
  });

  return sorted.map((row, i) => ({
    rank: i + 1,
    participantId: row.participantId,
    displayName: row.displayName,
    primaryMetric: row.correctCount,
    primaryLabel: "correct",
    secondaryMetric: row.durationMs,
    secondaryLabel: row.durationMs != null ? "ms" : null,
    status: row.completed ? "completed" : row.answeredCount > 0 ? "in_progress" : "incomplete",
    detail: `${row.correctCount}/${row.totalQuestions}`,
  }));
}

/** Jigsaw: completed first (fastest wins), then higher progress. */
export function rankJigsaw(inputs: JigsawRankInput[]): LeaderboardRow[] {
  const sorted = [...inputs].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? -1 : 1;
    if (a.completed && b.completed) {
      return (a.durationMs ?? Infinity) - (b.durationMs ?? Infinity);
    }
    if (a.progress !== b.progress) return b.progress - a.progress;
    return a.displayName.localeCompare(b.displayName);
  });

  return sorted.map((row, i) => ({
    rank: i + 1,
    participantId: row.participantId,
    displayName: row.displayName,
    primaryMetric: row.completed ? 1 : Math.round(row.progress * 100),
    primaryLabel: row.completed ? "complete" : "%",
    secondaryMetric: row.durationMs,
    secondaryLabel: row.durationMs != null ? "ms" : null,
    status: row.completed ? "completed" : row.progress > 0 ? "in_progress" : "incomplete",
    detail: row.completed
      ? formatDuration(row.durationMs)
      : `${Math.round(row.progress * 100)}%`,
  }));
}

/** Connect Dots: completed first (fastest wins), else pairs connected. */
export function rankConnectDots(inputs: ConnectDotsRankInput[]): LeaderboardRow[] {
  const sorted = [...inputs].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? -1 : 1;
    if (a.completed && b.completed) {
      return (a.durationMs ?? Infinity) - (b.durationMs ?? Infinity);
    }
    if (a.connectedPairs !== b.connectedPairs) {
      return b.connectedPairs - a.connectedPairs;
    }
    return a.displayName.localeCompare(b.displayName);
  });

  return sorted.map((row, i) => ({
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
  }));
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "-";
  const s = ms / 1000;
  return `${s.toFixed(1)}s`;
}
