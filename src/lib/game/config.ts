/**
 * Central game timing & difficulty knobs.
 * Change values here - do not hardcode timers in UI components.
 */
import {
  CONNECT_DOTS_CONFIG,
  type ConnectDotsDifficulty,
} from "@/lib/connect-dots";

export const GAME_CONFIG = {
  quiz: {
    questionCount: 10,
    /** Soft UI hint only; Quiz ranking is accuracy-first, then completion time. */
    recommendedSecondsPerQuestion: 20,
    timeLimitSeconds: null as number | null, // untimed until all 10 submitted
  },
  quiz_jigsaw: {
    questionCount: 9,
    recommendedSecondsPerQuestion: 30,
    timeLimitSeconds: null as number | null,
    cols: 3,
    rows: 3,
    maxUploadBytes: 8 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  },
  jigsaw: {
    minQuestions: 1,
    maxQuestions: 16,
    defaultQuestionCount: 9,
    timeLimitSeconds: 99,
    /** Legacy default grid when no questions stored (older rooms). */
    cols: 3,
    rows: 3,
    difficulty: "medium" as "easy" | "medium" | "hard",
    maxUploadBytes: 8 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] as const,
    minDimension: 256,
    maxDimension: 4096,
  },
  connect_dots: {
    minPairs: 2,
    maxPairs: 10,
    defaultPairCount: 4,
    difficulties: CONNECT_DOTS_CONFIG,
    defaultDifficulty: "medium" as ConnectDotsDifficulty,
    timeLimitSeconds: CONNECT_DOTS_CONFIG.medium.timeLimitSeconds,
  },
  room: {
    codeLength: 6,
    /** 0 means unlimited players per room. */
    unlimitedParticipants: 0,
    lobbyIdleExpireMs: 1000 * 60 * 60 * 4, // 4h
  },
} as const;

export function isRoomCapacityUnlimited(maxParticipants: number): boolean {
  return maxParticipants <= 0;
}

export function isRoomFull(participantCount: number, maxParticipants: number): boolean {
  if (isRoomCapacityUnlimited(maxParticipants)) return false;
  return participantCount >= maxParticipants;
}

/** Always 3×3 (9 pieces) - single source of truth for live jigsaw grids. */
export const JIGSAW_GRID = {
  cols: GAME_CONFIG.jigsaw.cols,
  rows: GAME_CONFIG.jigsaw.rows,
  pieceCount: GAME_CONFIG.jigsaw.cols * GAME_CONFIG.jigsaw.rows,
} as const;

export type GameMode = "quiz" | "quiz_jigsaw" | "jigsaw" | "connect_dots";

export const PUZZLE_QUEST_GRID = {
  cols: GAME_CONFIG.quiz_jigsaw.cols,
  rows: GAME_CONFIG.quiz_jigsaw.rows,
  pieceCount: GAME_CONFIG.quiz_jigsaw.cols * GAME_CONFIG.quiz_jigsaw.rows,
} as const;

export const GAME_MODE_META: Record<
  GameMode,
  { title: string; shortInstruction: string }
> = {
  quiz: {
    title: "Quiz Challenge",
    shortInstruction:
      "Answer all 10 questions. One attempt per question. Results appear after completion.",
  },
  quiz_jigsaw: {
    title: "Puzzle Quest",
    shortInstruction:
      "Answer 9 questions correctly to unlock puzzle pieces. Wrong answers retry until correct.",
  },
  jigsaw: {
    title: "Jigsaw Mission",
    shortInstruction:
      "Answer questions to unlock puzzle pieces, then rebuild the image and submit before time runs out.",
  },
  connect_dots: {
    title: "Connect Dots",
    shortInstruction:
      "Connect each question dot to its matching answer dot by drawing paths on the grid.",
  },
};
