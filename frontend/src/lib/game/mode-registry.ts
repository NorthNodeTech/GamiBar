import { buildConnectDotsFromContentPairs } from "@/lib/game/connect-dots-content";
import { GAME_CONFIG, type GameMode } from "@/lib/game/config";
import { resolveJigsawGrid } from "@/lib/game/jigsaw-grid";
import { normalizePieceUnlockAt } from "@/lib/game/jigsaw-tile-rewards";
import { rankConnectDots, rankJigsaw, rankQuiz } from "@/lib/game/ranking";
import type { ConnectDotsBoardConfig, GamePayload, LeaderboardRow, Room } from "@/lib/game/types";
import { toPublicQuizQuestions } from "@/lib/game/validation";
import type { StoredRoom } from "@/lib/game/room-persistence";
import { CORE_LIVE_GAME_MODES, type CoreLiveGameMode } from "@/lib/game/session-flow";
import { normalizePollPayload } from "@/lib/game/polls";

export { CORE_LIVE_GAME_MODES, type CoreLiveGameMode };

type RankingKind = "quiz" | "jigsaw" | "connect_dots" | "polls";

export type LiveModeDefinition = {
  mode: GameMode;
  ranking: RankingKind;
  /** Teacher configure step includes MCQ editor. */
  usesQuestions: boolean;
  /** Room creation uploads image to Storage. */
  usesJigsawAsset: boolean;
  /** Answers written to gamibar_quiz_answers on persist. */
  persistQuizAnswers: boolean;
  normalizeCreatePayload: (payload: GamePayload) => GamePayload;
  toPublicPayload: (payload: GamePayload, opts?: { includeSecrets?: boolean }) => GamePayload;
  computeLeaderboard: (stored: StoredRoom) => LeaderboardRow[];
  isStudentFinished: (input: {
    room: Room;
    answeredCount: number;
    questionTotal: number;
    attemptCompleted: boolean;
  }) => boolean;
  finalizeIncompleteAttempts: (stored: StoredRoom, finishedAt: number) => void;
};

function publicConnectDotsBoard(
  config: Extract<GamePayload, { mode: "connect_dots" }>["connectDots"],
) {
  return {
    difficulty: config.difficulty,
    gridSize: config.gridSize,
    pairCount: config.pairCount,
    seed: config.seed,
    pairs: config.pairs.map((p) => ({
      id: p.id,
      label: p.label,
      color: p.color,
      a: p.a,
      b: p.b,
      question: p.question,
      answer: p.answer,
    })),
    contentPairs: (config.contentPairs ?? []).map((p) => ({
      id: p.id,
      question: p.question,
      answer: p.answer,
    })),
    /** Maze routing paths — required for auto-draw on correct dot links. */
    solution: config.solution,
  };
}

function quizLeaderboard(stored: StoredRoom, totalQuestions: number): LeaderboardRow[] {
  const { participants, attempts, quizAnswers } = stored;
  return rankQuiz(
    [...participants.values()].map((p) => {
      const answers = quizAnswers.get(p.id);
      const attempt = attempts.get(p.id);
      const correctCount = attempt?.correctCount ?? 0;
      const score = attempt?.score ?? correctCount * 100;
      return {
        participantId: p.id,
        displayName: p.displayName,
        score,
        correctCount,
        durationMs: attempt?.durationMs ?? null,
        completed: Boolean(attempt?.completed),
        answeredCount: stored.room.mode === "quiz_jigsaw" ? correctCount : (answers?.size ?? 0),
        totalQuestions,
      };
    }),
  );
}

function finalizeQuizAttempts(
  stored: StoredRoom,
  questionCount: number,
  progressFromAnswers: boolean,
) {
  const finishedAt = Date.now();
  for (const p of stored.participants.values()) {
    const answers = stored.quizAnswers.get(p.id);
    const attempt = stored.attempts.get(p.id);
    if (!attempt || attempt.completed || !answers) continue;

    let correct = 0;
    for (const a of answers.values()) if (a.isCorrect) correct += 1;
    attempt.correctCount = correct;
    attempt.score = correct * 100;
    attempt.progress = progressFromAnswers ? answers.size / questionCount : correct / questionCount;
    if (stored.room.startedAt) {
      attempt.durationMs = finishedAt - stored.room.startedAt;
    }
    p.status = "ONLINE";
  }
}

function quizQuestionTotal(stored: StoredRoom): number {
  if (stored.room.mode !== "quiz" || stored.room.payload.mode !== "quiz") {
    return GAME_CONFIG.quiz.defaultQuestionCount;
  }
  return stored.room.payload.questions.length;
}

const QUIZ_MODE: LiveModeDefinition = {
  mode: "quiz",
  ranking: "quiz",
  usesQuestions: true,
  usesJigsawAsset: false,
  persistQuizAnswers: true,
  normalizeCreatePayload: (payload) => {
    if (payload.mode !== "quiz") return payload;
    return { ...payload, timeLimitSeconds: payload.timeLimitSeconds ?? null };
  },
  toPublicPayload: (payload, opts) => {
    if (payload.mode !== "quiz") return payload;
    if (opts?.includeSecrets) return payload;
    return {
      mode: "quiz",
      questions: toPublicQuizQuestions(payload.questions),
      timeLimitSeconds: payload.timeLimitSeconds,
    };
  },
  computeLeaderboard: (stored) => quizLeaderboard(stored, quizQuestionTotal(stored)),
  isStudentFinished: ({ room, answeredCount, questionTotal, attemptCompleted }) => {
    if (room.mode !== "quiz" || room.payload.mode !== "quiz") return attemptCompleted;
    return answeredCount >= questionTotal || attemptCompleted;
  },
  finalizeIncompleteAttempts: (stored) =>
    finalizeQuizAttempts(stored, quizQuestionTotal(stored), true),
};

const JIGSAW_MODE: LiveModeDefinition = {
  mode: "jigsaw",
  ranking: "jigsaw",
  usesQuestions: true,
  usesJigsawAsset: true,
  persistQuizAnswers: true,
  normalizeCreatePayload: (payload) => {
    if (payload.mode !== "jigsaw") return payload;
    const grid = resolveJigsawGrid(
      payload.jigsaw.cols,
      payload.jigsaw.rows,
      payload.questions.length,
    );
    const tileCount = grid.cols * grid.rows;
    const pieceUnlockAt = normalizePieceUnlockAt(
      payload.jigsaw.pieceUnlockAt ?? [],
      payload.questions.length,
      tileCount,
    );
    return {
      ...payload,
      jigsaw: {
        ...payload.jigsaw,
        cols: grid.cols,
        rows: grid.rows,
        pieceUnlockAt,
      },
      timeLimitSeconds: payload.timeLimitSeconds ?? null,
    };
  },
  toPublicPayload: (payload, opts) => {
    if (payload.mode !== "jigsaw") return payload;
    const grid = { cols: payload.jigsaw.cols, rows: payload.jigsaw.rows };
    const jigsaw = {
      imageUrl: payload.jigsaw.imageUrl,
      imageMime: payload.jigsaw.imageMime,
      cols: grid.cols,
      rows: grid.rows,
      pieceUnlockAt: payload.jigsaw.pieceUnlockAt,
      libraryImageId: payload.jigsaw.libraryImageId ?? null,
    };
    if (opts?.includeSecrets) {
      return {
        mode: "jigsaw",
        questions: payload.questions,
        jigsaw,
        timeLimitSeconds: payload.timeLimitSeconds,
      };
    }
    return {
      mode: "jigsaw",
      questions: toPublicQuizQuestions(payload.questions),
      jigsaw,
      timeLimitSeconds: payload.timeLimitSeconds,
    };
  },
  computeLeaderboard: (stored) => {
    const { participants, attempts } = stored;
    return rankJigsaw(
      [...participants.values()].map((p) => {
        const attempt = attempts.get(p.id);
        return {
          participantId: p.id,
          displayName: p.displayName,
          completed: Boolean(attempt?.completed),
          durationMs: attempt?.durationMs ?? null,
          progress: attempt?.progress ?? 0,
          incorrectAttempts: attempt?.wrongCount ?? 0,
        };
      }),
    );
  },
  isStudentFinished: ({ attemptCompleted }) => attemptCompleted,
  finalizeIncompleteAttempts: (stored, finishedAt) => {
    if (stored.room.payload.mode !== "jigsaw") return;
    const count = stored.room.payload.questions.length;
    if (count > 0) finalizeQuizAttempts(stored, count, false);
    for (const p of stored.participants.values()) {
      const attempt = stored.attempts.get(p.id);
      if (!attempt || attempt.completed) continue;
      if (stored.room.startedAt && attempt.durationMs == null) {
        attempt.durationMs = finishedAt - stored.room.startedAt;
      }
      if (p.status === "PLAYING") p.status = "ONLINE";
    }
  },
};

const CONNECT_DOTS_MODE: LiveModeDefinition = {
  mode: "connect_dots",
  ranking: "connect_dots",
  usesQuestions: false,
  usesJigsawAsset: false,
  persistQuizAnswers: false,
  normalizeCreatePayload: (payload) => {
    if (payload.mode !== "connect_dots") return payload;
    const contentPairs = payload.connectDots.contentPairs ?? [];
    if (contentPairs.length > 0) {
      const built = buildConnectDotsFromContentPairs(contentPairs, payload.connectDots.seed);
      return {
        mode: "connect_dots",
        connectDots: built.boardConfig,
        timeLimitSeconds: payload.timeLimitSeconds ?? null,
      };
    }
    return {
      ...payload,
      timeLimitSeconds: payload.timeLimitSeconds ?? null,
    };
  },
  toPublicPayload: (payload, opts) => {
    if (payload.mode !== "connect_dots") return payload;
    if (opts?.includeSecrets) return payload;
    return {
      mode: "connect_dots",
      connectDots: publicConnectDotsBoard(payload.connectDots),
      timeLimitSeconds: payload.timeLimitSeconds,
    };
  },
  computeLeaderboard: (stored) => {
    const { room, participants, attempts } = stored;
    const totalPairs =
      room.mode === "connect_dots" && room.payload.mode === "connect_dots"
        ? room.payload.connectDots.pairCount
        : GAME_CONFIG.connect_dots.difficulties.medium.pairCount;
    return rankConnectDots(
      [...participants.values()].map((p) => {
        const attempt = attempts.get(p.id);
        return {
          participantId: p.id,
          displayName: p.displayName,
          completed: Boolean(attempt?.completed),
          durationMs: attempt?.durationMs ?? null,
          connectedPairs: attempt?.correctCount ?? 0,
          totalPairs,
          incorrectAttempts: attempt?.wrongCount ?? 0,
        };
      }),
    );
  },
  isStudentFinished: ({ attemptCompleted }) => attemptCompleted,
  finalizeIncompleteAttempts: (stored, finishedAt) => {
    for (const p of stored.participants.values()) {
      const attempt = stored.attempts.get(p.id);
      if (!attempt || attempt.completed) continue;
      if (stored.room.startedAt && attempt.durationMs == null) {
        attempt.durationMs = finishedAt - stored.room.startedAt;
      }
      if (p.status === "PLAYING") p.status = "ONLINE";
    }
  },
};

const POLLS_MODE: LiveModeDefinition = {
  mode: "polls",
  ranking: "polls",
  usesQuestions: false,
  usesJigsawAsset: false,
  persistQuizAnswers: false,
  normalizeCreatePayload: (payload) => {
    if (payload.mode !== "polls") return payload;
    return normalizePollPayload(payload);
  },
  toPublicPayload: (payload) => {
    if (payload.mode !== "polls") return payload;
    return normalizePollPayload(payload);
  },
  computeLeaderboard: (stored) => {
    const rows = [...stored.participants.values()]
      .map((participant) => {
        const attempt = stored.attempts.get(participant.id);
        const completed = Boolean(attempt?.completed);
        return {
          participant,
          attempt,
          completed,
          completedAt: attempt?.completedAt ?? Number.MAX_SAFE_INTEGER,
        };
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? -1 : 1;
        if (a.completedAt !== b.completedAt) return a.completedAt - b.completedAt;
        return a.participant.displayName.localeCompare(b.participant.displayName);
      });

    return rows.map(({ participant, attempt, completed }, index) => ({
      rank: index + 1,
      participantId: participant.id,
      displayName: participant.displayName,
      primaryMetric: attempt?.correctCount ?? 0,
      primaryLabel: "responses",
      secondaryMetric: attempt?.durationMs ?? null,
      secondaryLabel: "time",
      status: completed
        ? "completed"
        : attempt && attempt.progress > 0
          ? "in_progress"
          : "incomplete",
      detail: completed ? "Submitted" : attempt && attempt.progress > 0 ? "Started" : "Waiting",
      performanceText: completed
        ? `${attempt?.correctCount ?? 0} answered`
        : attempt && attempt.progress > 0
          ? `${Math.round((attempt.progress ?? 0) * 100)}%`
          : "No response",
    }));
  },
  isStudentFinished: ({ attemptCompleted }) => attemptCompleted,
  finalizeIncompleteAttempts: (stored, finishedAt) => {
    for (const p of stored.participants.values()) {
      const attempt = stored.attempts.get(p.id);
      if (!attempt || attempt.completed) continue;
      if (stored.room.startedAt && attempt.durationMs == null) {
        attempt.durationMs = finishedAt - stored.room.startedAt;
      }
      if (p.status === "PLAYING") p.status = "ONLINE";
    }
  },
};

/** Extended mode — shares quiz ranking + jigsaw asset patterns. */
const QUIZ_JIGSAW_MODE: LiveModeDefinition = {
  mode: "quiz_jigsaw",
  ranking: "quiz",
  usesQuestions: true,
  usesJigsawAsset: true,
  persistQuizAnswers: true,
  normalizeCreatePayload: (payload) => {
    if (payload.mode !== "quiz_jigsaw") return payload;
    return {
      ...payload,
      jigsaw: {
        ...payload.jigsaw,
        cols: GAME_CONFIG.quiz_jigsaw.cols,
        rows: GAME_CONFIG.quiz_jigsaw.rows,
      },
      rewardCode: payload.rewardCode.trim(),
      timeLimitSeconds: payload.timeLimitSeconds ?? null,
    };
  },
  toPublicPayload: (payload, opts) => {
    if (payload.mode !== "quiz_jigsaw") return payload;
    if (opts?.includeSecrets) return payload;
    return {
      mode: "quiz_jigsaw",
      questions: toPublicQuizQuestions(payload.questions),
      jigsaw: {
        imageUrl: payload.jigsaw.imageUrl,
        imageMime: payload.jigsaw.imageMime,
        cols: payload.jigsaw.cols,
        rows: payload.jigsaw.rows,
      },
      rewardCode: "",
      timeLimitSeconds: payload.timeLimitSeconds,
    };
  },
  computeLeaderboard: (stored) => quizLeaderboard(stored, GAME_CONFIG.quiz_jigsaw.questionCount),
  isStudentFinished: ({ attemptCompleted }) => attemptCompleted,
  finalizeIncompleteAttempts: (stored) =>
    finalizeQuizAttempts(stored, GAME_CONFIG.quiz_jigsaw.questionCount, false),
};

const REGISTRY: Record<GameMode, LiveModeDefinition | undefined> = {
  quiz: QUIZ_MODE,
  jigsaw: JIGSAW_MODE,
  connect_dots: CONNECT_DOTS_MODE,
  quiz_jigsaw: QUIZ_JIGSAW_MODE,
  polls: POLLS_MODE,
};

export function getLiveModeDefinition(mode: GameMode): LiveModeDefinition {
  const def = REGISTRY[mode];
  if (!def) throw new Error(`Unsupported live game mode: ${mode}`);
  return def;
}

export function isCoreLiveMode(mode: GameMode): mode is CoreLiveGameMode {
  return (CORE_LIVE_GAME_MODES as readonly string[]).includes(mode);
}

export function modeUsesQuestions(mode: GameMode): boolean {
  return getLiveModeDefinition(mode).usesQuestions;
}

export function normalizeCreatePayload(mode: GameMode, payload: GamePayload): GamePayload {
  return getLiveModeDefinition(mode).normalizeCreatePayload(payload);
}

export function toPublicGamePayload(
  mode: GameMode,
  payload: GamePayload,
  opts?: { includeSecrets?: boolean },
): GamePayload {
  return getLiveModeDefinition(mode).toPublicPayload(payload, opts);
}

export function computeModeLeaderboard(stored: StoredRoom): LeaderboardRow[] {
  return getLiveModeDefinition(stored.room.mode).computeLeaderboard(stored);
}

export function isStudentSessionFinished(input: {
  room: Room;
  answeredCount: number;
  attemptCompleted: boolean;
}): boolean {
  const def = getLiveModeDefinition(input.room.mode);
  const questionTotal =
    input.room.payload.mode === "quiz"
      ? input.room.payload.questions.length
      : input.room.payload.mode === "quiz_jigsaw"
        ? input.room.payload.questions.length
        : input.room.payload.mode === "jigsaw"
          ? input.room.payload.questions.length
          : input.room.payload.mode === "polls"
            ? input.room.payload.questions.length
            : 0;
  return def.isStudentFinished({
    room: input.room,
    answeredCount: input.answeredCount,
    questionTotal,
    attemptCompleted: input.attemptCompleted,
  });
}

export function finalizeModeIncompleteAttempts(stored: StoredRoom, finishedAt: number) {
  getLiveModeDefinition(stored.room.mode).finalizeIncompleteAttempts(stored, finishedAt);
}

export function modeNeedsJigsawUpload(mode: GameMode): boolean {
  return getLiveModeDefinition(mode).usesJigsawAsset;
}

export function modePersistsQuizAnswers(mode: GameMode): boolean {
  return getLiveModeDefinition(mode).persistQuizAnswers;
}

/** Type guard for connect-dots board config in author wizard. */
export function isConnectDotsPayload(
  payload: GamePayload,
): payload is Extract<GamePayload, { mode: "connect_dots" }> {
  return payload.mode === "connect_dots";
}

export type { ConnectDotsBoardConfig };
