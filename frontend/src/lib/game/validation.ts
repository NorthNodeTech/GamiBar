import { CONNECT_DOTS_CONFIG, type ConnectDotsDifficulty } from "@/lib/connect-dots";
import { GAME_CONFIG, type GameMode } from "@/lib/game/config";
import {
  DEFAULT_JIGSAW_TEMPLATE_ID,
  defaultQuestionCountForTemplate,
  jigsawTemplateById,
  minQuestionCountForTemplate,
} from "@/lib/game/jigsaw-grid";
import {
  connectDotsPairsProgress,
  isConnectDotsPairComplete,
} from "@/lib/game/connect-dots-content";
import { validatePollQuestions } from "@/lib/game/polls";
import { validatePieceUnlockAt, resolvePieceUnlockAt } from "@/lib/game/jigsaw-tile-rewards";
import type { GamePayload, QuizOptionId, QuizQuestionDraft } from "@/lib/game/types";
import { isTimerValid } from "@/lib/game/timer";

const OPTIONS: QuizOptionId[] = ["A", "B", "C", "D"];

export function questionCountForMode(mode: GameMode): number {
  if (mode === "polls") return GAME_CONFIG.polls.minQuestions;
  if (mode === "quiz_jigsaw") return GAME_CONFIG.quiz_jigsaw.questionCount;
  if (mode === "jigsaw") {
    return defaultQuestionCountForTemplate(jigsawTemplateById(DEFAULT_JIGSAW_TEMPLATE_ID));
  }
  return GAME_CONFIG.quiz.defaultQuestionCount;
}

export function emptyQuizQuestionsWithCount(count: number): QuizQuestionDraft[] {
  const safeCount = Math.max(1, count);
  return Array.from({ length: safeCount }, (_, i) => ({
    id: `q-${i + 1}`,
    prompt: "",
    options: { A: "", B: "", C: "", D: "" },
    correctOption: null,
  }));
}

export function emptyQuizQuestions(mode: GameMode = "quiz"): QuizQuestionDraft[] {
  return emptyQuizQuestionsWithCount(questionCountForMode(mode));
}

export function isQuizQuestionComplete(q: QuizQuestionDraft): boolean {
  if (!q.prompt.trim()) return false;
  if (!OPTIONS.every((k) => q.options[k].trim())) return false;
  if (!q.correctOption || !OPTIONS.includes(q.correctOption)) return false;
  return true;
}

export function quizCompletionCount(
  questions: QuizQuestionDraft[],
  mode: GameMode = "quiz",
): {
  done: number;
  total: number;
  complete: boolean;
} {
  const total =
    mode === "jigsaw" || mode === "quiz" ? questions.length : questionCountForMode(mode);
  const done = questions.slice(0, total).filter(isQuizQuestionComplete).length;
  const minTotal =
    mode === "jigsaw"
      ? GAME_CONFIG.jigsaw.minQuestions
      : mode === "quiz"
        ? GAME_CONFIG.quiz.minQuestions
        : 1;
  return { done, total, complete: done === total && total >= minTotal };
}

export { connectDotsPairsProgress, isConnectDotsPairComplete };

export function isConnectDotsDifficulty(value: string): value is ConnectDotsDifficulty {
  return value === "easy" || value === "medium" || value === "hard";
}

export function validateJigsawFile(file: File): { ok: true } | { ok: false; error: string } {
  const allowed = GAME_CONFIG.jigsaw.allowedMimeTypes as readonly string[];
  if (!allowed.includes(file.type)) {
    return { ok: false, error: "Use JPG, PNG, or WEBP images only." };
  }
  if (file.size > GAME_CONFIG.jigsaw.maxUploadBytes) {
    return { ok: false, error: "Image must be 8 MB or smaller." };
  }
  if (!file.name || file.size < 32) {
    return { ok: false, error: "That file does not look like a valid image." };
  }
  return { ok: true };
}

export function validateGamePayload(
  mode: GameMode,
  payload: GamePayload,
): { ok: true } | { ok: false; error: string } {
  if (payload.mode !== mode) {
    return { ok: false, error: "Game payload does not match the selected mode." };
  }
  if (mode === "quiz" && payload.mode === "quiz") {
    if (payload.questions.length < GAME_CONFIG.quiz.minQuestions) {
      return { ok: false, error: "Add at least one question." };
    }
    if (
      payload.questions.length > GAME_CONFIG.quiz.maxQuestions &&
      GAME_CONFIG.quiz.maxQuestions > 0
    ) {
      return {
        ok: false,
        error: `Use at most ${GAME_CONFIG.quiz.maxQuestions} questions.`,
      };
    }
    const { complete, done, total } = quizCompletionCount(payload.questions, "quiz");
    if (!complete) {
      return { ok: false, error: `Complete all quiz questions (${done}/${total}).` };
    }
    return { ok: true };
  }
  if (mode === "quiz_jigsaw" && payload.mode === "quiz_jigsaw") {
    const { complete, done, total } = quizCompletionCount(payload.questions, "quiz_jigsaw");
    if (!complete) {
      return { ok: false, error: `Complete all ${total} questions (${done}/${total}).` };
    }
    if (!payload.jigsaw.imageUrl) {
      return { ok: false, error: "Upload a puzzle image for participants to reveal." };
    }
    if (!payload.rewardCode.trim()) {
      return {
        ok: false,
        error: "Set a reward code participants unlock when the puzzle is complete.",
      };
    }
    return { ok: true };
  }
  if (mode === "jigsaw" && payload.mode === "jigsaw") {
    const tileCount = payload.jigsaw.cols * payload.jigsaw.rows;
    const minQuestions = minQuestionCountForTemplate(payload.jigsaw);
    if (payload.questions.length < minQuestions) {
      return {
        ok: false,
        error: `Add at least ${minQuestions} questions for a ${payload.jigsaw.cols}x${payload.jigsaw.rows} puzzle (${tileCount} pieces).`,
      };
    }
    if (payload.questions.length > GAME_CONFIG.jigsaw.maxQuestions) {
      return {
        ok: false,
        error: `Use at most ${GAME_CONFIG.jigsaw.maxQuestions} questions.`,
      };
    }
    const { complete, done, total } = quizCompletionCount(payload.questions, "jigsaw");
    if (!complete) {
      return {
        ok: false,
        error: `Complete every question with one correct answer (${done}/${total}).`,
      };
    }
    if (!payload.jigsaw.imageUrl) {
      return { ok: false, error: "Upload one puzzle image for participants to reconstruct." };
    }
    const unlockValidation = validatePieceUnlockAt(
      resolvePieceUnlockAt(payload.questions.length, tileCount, payload.jigsaw.pieceUnlockAt),
      payload.questions.length,
      tileCount,
    );
    if (!unlockValidation.ok) {
      return unlockValidation;
    }
    if (!isTimerValid("jigsaw", payload.timeLimitSeconds)) {
      return {
        ok: false,
        error: "Choose a jigsaw timer between 30 seconds and 5 minutes, or no limit.",
      };
    }
    return { ok: true };
  }
  if (mode === "connect_dots" && payload.mode === "connect_dots") {
    const contentPairs = payload.connectDots.contentPairs ?? [];
    if (contentPairs.length > 0) {
      const minPairs = GAME_CONFIG.connect_dots.minPairs;
      const maxPairs = GAME_CONFIG.connect_dots.maxPairs;
      if (contentPairs.length < minPairs) {
        return { ok: false, error: `Add at least ${minPairs} matching pairs.` };
      }
      if (contentPairs.length > maxPairs) {
        return { ok: false, error: `Use at most ${maxPairs} pairs.` };
      }
      const { complete, done, total } = connectDotsPairsProgress(contentPairs);
      if (!complete) {
        return {
          ok: false,
          error: `Complete every pair with a question and answer (${done}/${total}).`,
        };
      }
      if (!payload.connectDots.seed || payload.connectDots.pairs.length !== contentPairs.length) {
        return { ok: false, error: "Generate the Connect Dots board before creating the room." };
      }
    } else {
      const d = payload.connectDots.difficulty;
      if (!isConnectDotsDifficulty(d)) {
        return { ok: false, error: "Choose Easy, Medium, or Hard for Connect Dots." };
      }
      const expected = CONNECT_DOTS_CONFIG[d];
      if (
        !payload.connectDots.seed ||
        payload.connectDots.pairs.length !== expected.pairCount ||
        payload.connectDots.gridSize !== expected.gridSize
      ) {
        return { ok: false, error: "Generate a Connect Dots puzzle before creating the room." };
      }
    }
    if (!isTimerValid("connect_dots", payload.timeLimitSeconds)) {
      return {
        ok: false,
        error: "Choose a Connect Dots timer between 30 seconds and 3 minutes, or no limit.",
      };
    }
    return { ok: true };
  }
  if (mode === "polls" && payload.mode === "polls") {
    const questionsValid = validatePollQuestions(payload.questions);
    if (!questionsValid.ok) return questionsValid;
    if (!isTimerValid("polls", payload.timeLimitSeconds)) {
      return {
        ok: false,
        error: "Choose a poll timer between 30 seconds and 15 minutes, or no limit.",
      };
    }
    return { ok: true };
  }
  return { ok: false, error: "Invalid game configuration." };
}

/** Strip secrets before sending quiz content to student clients. */
export function toPublicQuizQuestions(questions: QuizQuestionDraft[]) {
  return questions.map((q, order) => ({
    id: q.id,
    prompt: q.prompt,
    options: { ...q.options },
    order,
  }));
}

export function sanitizeDisplayName(raw: string): string {
  return raw.trim().slice(0, 32);
}

export function sanitizeRoomText(raw: string, max = 80): string {
  return raw.trim().slice(0, max);
}
