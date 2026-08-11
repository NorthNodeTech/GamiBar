import { GAME_MODE_META, type GameMode } from "@/lib/game/config";
import { formatAccuracy, formatDuration } from "@/lib/game/ranking";
import type { LeaderboardRow } from "@/lib/game/types";

export type CompletionMetric = {
  label: string;
  value: string;
  emphasis?: boolean;
};

export type GameCompletionViewModel = {
  mode: GameMode;
  modeTitle: string;
  roomName: string;
  displayName: string;
  rank: number | null;
  durationMs: number | null;
  metrics: CompletionMetric[];
  puzzleComplete?: boolean;
};

type BuildCompletionInput = {
  mode: GameMode;
  roomName: string;
  displayName: string;
  myAttempt: {
    correctCount?: number;
    score?: number | null;
    durationMs?: number | null;
    completed?: boolean;
    wrongCount?: number;
    payload?: Record<string, unknown>;
  } | null;
  myAnswers: Array<{ isCorrect?: boolean }>;
  totalQuestions?: number;
  totalPairs?: number;
  leaderboard: LeaderboardRow[];
  participantId: string | null;
  durationMsOverride?: number | null;
};

export function buildGameCompletionViewModel(input: BuildCompletionInput): GameCompletionViewModel {
  const {
    mode,
    roomName,
    displayName,
    myAttempt,
    myAnswers,
    totalQuestions = 0,
    totalPairs = 0,
    leaderboard,
    participantId,
    durationMsOverride,
  } = input;

  const myRow = participantId
    ? leaderboard.find((row) => row.participantId === participantId)
    : undefined;
  const rank = myRow?.rank ?? null;
  const durationMs = durationMsOverride ?? myAttempt?.durationMs ?? myRow?.secondaryMetric ?? null;
  const correctCount = myAttempt?.correctCount ?? 0;

  const modeTitle = GAME_MODE_META[mode].title;

  if (mode === "quiz") {
    const score = myAttempt?.score ?? myRow?.score ?? correctCount * 100;
    const answeredCorrect =
      myAnswers.length > 0 && myAnswers.some((a) => a.isCorrect !== undefined)
        ? myAnswers.filter((a) => a.isCorrect).length
        : correctCount;
    const accuracy =
      myRow?.accuracyPercent ??
      (totalQuestions > 0 ? Math.round((answeredCorrect / totalQuestions) * 100) : null);

    return {
      mode,
      modeTitle,
      roomName,
      displayName,
      rank,
      durationMs,
      metrics: [
        { label: "Score", value: String(score), emphasis: true },
        { label: "Accuracy", value: formatAccuracy(accuracy) },
        ...(durationMs != null
          ? [{ label: "Completion time", value: formatDuration(durationMs) }]
          : []),
      ],
    };
  }

  if (mode === "jigsaw") {
    const questionTotal = totalQuestions;
    const incorrectAttempts =
      typeof myAttempt?.wrongCount === "number"
        ? myAttempt.wrongCount
        : typeof myAttempt?.payload?.wrongCount === "number"
          ? myAttempt.payload.wrongCount
          : (myRow?.incorrectAttempts ?? 0);
    const accuracy =
      questionTotal > 0 ? Math.round((correctCount / questionTotal) * 100) : null;

    return {
      mode,
      modeTitle,
      roomName,
      displayName,
      rank,
      durationMs,
      puzzleComplete: Boolean(myAttempt?.completed),
      metrics: [
        {
          label: "Incorrect attempts",
          value: String(incorrectAttempts),
          emphasis: true,
        },
        {
          label: "Puzzle",
          value: myAttempt?.completed
            ? "Complete"
            : questionTotal > 0
              ? `${correctCount}/${questionTotal} pieces`
              : "In progress",
        },
        { label: "Accuracy", value: formatAccuracy(accuracy) },
        ...(durationMs != null
          ? [{ label: "Completion time", value: formatDuration(durationMs) }]
          : []),
      ],
    };
  }

  if (mode === "connect_dots") {
    const connected = correctCount;
    const total = totalPairs || connected;
    const incorrectAttempts =
      typeof myAttempt?.wrongCount === "number"
        ? myAttempt.wrongCount
        : typeof myAttempt?.payload?.wrongCount === "number"
          ? myAttempt.payload.wrongCount
          : (myRow?.incorrectAttempts ?? 0);

    return {
      mode,
      modeTitle,
      roomName,
      displayName,
      rank,
      durationMs,
      metrics: [
        {
          label: "Connections",
          value: total > 0 ? `${connected}/${total} correct` : `${connected}`,
          emphasis: true,
        },
        {
          label: "Incorrect attempts",
          value: String(incorrectAttempts),
        },
        ...(durationMs != null
          ? [{ label: "Completion time", value: formatDuration(durationMs) }]
          : []),
      ],
    };
  }

  // Puzzle Quest + fallbacks — same visual system
  if (mode === "quiz_jigsaw") {
    const total = totalQuestions;
    const score = myAttempt?.score ?? myRow?.score ?? correctCount * 100;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : null;

    return {
      mode,
      modeTitle,
      roomName,
      displayName,
      rank,
      durationMs,
      puzzleComplete: Boolean(myAttempt?.completed),
      metrics: [
        { label: "Score", value: String(score), emphasis: true },
        { label: "Accuracy", value: formatAccuracy(accuracy) },
        {
          label: "Puzzle",
          value: myAttempt?.completed ? "Complete" : `${correctCount}/${total} pieces`,
        },
        ...(durationMs != null
          ? [{ label: "Completion time", value: formatDuration(durationMs) }]
          : []),
      ],
    };
  }

  return {
    mode,
    modeTitle,
    roomName,
    displayName,
    rank,
    durationMs,
    metrics: myRow?.detail ? [{ label: "Result", value: myRow.detail, emphasis: true }] : [],
  };
}
