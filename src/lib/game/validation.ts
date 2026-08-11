import { CONNECT_DOTS_CONFIG, type ConnectDotsDifficulty } from "@/lib/connect-dots";
import { GAME_CONFIG, type GameMode } from "@/lib/game/config";
import {
  connectDotsPairsProgress,
  isConnectDotsPairComplete,
} from "@/lib/game/connect-dots-content";
import type { GamePayload, QuizOptionId, QuizQuestionDraft } from "@/lib/game/types";
import { isTimerValid } from "@/lib/game/timer";

const OPTIONS: QuizOptionId[] = ["A", "B", "C", "D"];

export function questionCountForMode(mode: GameMode): number {
  if (mode === "quiz_jigsaw") return GAME_CONFIG.quiz_jigsaw.questionCount;
  if (mode === "jigsaw") return GAME_CONFIG.jigsaw.defaultQuestionCount;
  return GAME_CONFIG.quiz.questionCount;
}

export function emptyQuizQuestions(mode: GameMode = "quiz"): QuizQuestionDraft[] {
  const count = questionCountForMode(mode);
  return Array.from({ length: count }, (_, i) => ({
    id: `q-${i + 1}`,
    prompt: "",
    options: { A: "", B: "", C: "", D: "" },
    correctOption: null,
  }));
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
  const total = mode === "jigsaw" ? questions.length : questionCountForMode(mode);
  const done = questions.slice(0, total).filter(isQuizQuestionComplete).length;
  return { done, total, complete: done === total && total >= (mode === "jigsaw" ? GAME_CONFIG.jigsaw.minQuestions : 1) };
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
      return { ok: false, error: "Upload a puzzle image for students to reveal." };
    }
    if (!payload.rewardCode.trim()) {
      return { ok: false, error: "Set a reward code students unlock when the puzzle is complete." };
    }
    return { ok: true };
  }
  if (mode === "jigsaw" && payload.mode === "jigsaw") {
    if (payload.questions.length < GAME_CONFIG.jigsaw.minQuestions) {
      return { ok: false, error: "Add at least one question." };
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
      return { ok: false, error: "Upload one puzzle image for students to reconstruct." };
    }
    if (!isTimerValid("jigsaw", payload.timeLimitSeconds)) {
      return { ok: false, error: "Choose a jigsaw timer between 30 seconds and 5 minutes, or no limit." };
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
      if (
        !payload.connectDots.seed ||
        payload.connectDots.pairs.length !== contentPairs.length
      ) {
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
      return { ok: false, error: "Choose a Connect Dots timer between 30 seconds and 3 minutes, or no limit." };
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
