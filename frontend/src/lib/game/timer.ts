import { GAME_CONFIG, type GameMode } from "@/lib/game/config";
import type { GamePayload } from "@/lib/game/types";

export type TimerPreset = {
  id: string;
  label: string;
  seconds: number | null;
};

export const TIMER_PRESETS: Record<GameMode, TimerPreset[]> = {
  quiz: [
    { id: "open", label: "No limit", seconds: null },
    { id: "3m", label: "3 min", seconds: 180 },
    { id: "5m", label: "5 min", seconds: 300 },
    { id: "10m", label: "10 min", seconds: 600 },
    { id: "15m", label: "15 min", seconds: 900 },
  ],
  quiz_jigsaw: [
    { id: "open", label: "No limit", seconds: null },
    { id: "5m", label: "5 min", seconds: 300 },
    { id: "10m", label: "10 min", seconds: 600 },
    { id: "15m", label: "15 min", seconds: 900 },
    { id: "20m", label: "20 min", seconds: 1200 },
  ],
  jigsaw: [
    { id: "open", label: "No limit", seconds: null },
    { id: "60", label: "1 min", seconds: 60 },
    { id: "90", label: "1:30", seconds: 90 },
    { id: "120", label: "2 min", seconds: 120 },
    { id: "180", label: "3 min", seconds: 180 },
  ],
  connect_dots: [
    { id: "open", label: "No limit", seconds: null },
    { id: "45", label: "45 sec", seconds: 45 },
    { id: "60", label: "1 min", seconds: 60 },
    { id: "90", label: "1:30", seconds: 90 },
    { id: "120", label: "2 min", seconds: 120 },
  ],
  visual_point: [
    { id: "open", label: "No limit", seconds: null },
    { id: "60", label: "1 min", seconds: 60 },
    { id: "3m", label: "3 min", seconds: 180 },
    { id: "5m", label: "5 min", seconds: 300 },
    { id: "10m", label: "10 min", seconds: 600 },
  ],
  polls: [
    { id: "open", label: "No limit", seconds: null },
    { id: "60", label: "1 min", seconds: 60 },
    { id: "3m", label: "3 min", seconds: 180 },
    { id: "5m", label: "5 min", seconds: 300 },
    { id: "10m", label: "10 min", seconds: 600 },
  ],
};

export const TIMER_BOUNDS: Record<GameMode, { min: number; max: number; step: number }> = {
  quiz: { min: 60, max: 900, step: 30 },
  quiz_jigsaw: { min: 120, max: 1200, step: 60 },
  jigsaw: { min: 30, max: 300, step: 15 },
  connect_dots: { min: 30, max: 180, step: 15 },
  visual_point: { min: 30, max: 900, step: 30 },
  polls: { min: 30, max: 900, step: 30 },
};

export function defaultTimerSeconds(mode: GameMode): number | null {
  if (mode === "quiz") return GAME_CONFIG.quiz.timeLimitSeconds;
  if (mode === "quiz_jigsaw") return GAME_CONFIG.quiz_jigsaw.timeLimitSeconds;
  if (mode === "jigsaw") return GAME_CONFIG.jigsaw.timeLimitSeconds;
  if (mode === "visual_point") return GAME_CONFIG.visual_point.timeLimitSeconds;
  if (mode === "polls") return GAME_CONFIG.polls.timeLimitSeconds;
  return GAME_CONFIG.connect_dots.timeLimitSeconds;
}

export function formatTimerSeconds(total: number | null): string {
  if (total == null) return "No limit";
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (seconds === 0) return `${minutes} min`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatTimerLong(total: number | null): string {
  if (total == null) return "Open-ended";
  if (total < 60) return `${total} seconds`;
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (seconds === 0) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  return `${minutes}m ${seconds}s`;
}

export function clampTimer(mode: GameMode, value: number | null): number | null {
  if (value == null) return null;
  const bounds = TIMER_BOUNDS[mode];
  return Math.min(bounds.max, Math.max(bounds.min, value));
}

export function isTimerValid(mode: GameMode, value: number | null): boolean {
  if (value == null) return true;
  const clamped = clampTimer(mode, value);
  return clamped === value;
}

export function resolvePayloadTimeLimit(payload: GamePayload): number | null {
  return payload.timeLimitSeconds ?? null;
}

export function gameInstruction(
  mode: GameMode,
  timeLimitSeconds: number | null,
  questionCount?: number,
): string {
  if (mode === "quiz") {
    const count = questionCount ?? GAME_CONFIG.quiz.defaultQuestionCount;
    return timeLimitSeconds == null
      ? `Answer all ${count} questions. One attempt per question. Results appear after completion.`
      : `Answer all ${count} questions within ${formatTimerLong(timeLimitSeconds)}. One attempt per question.`;
  }
  if (mode === "quiz_jigsaw") {
    const count = GAME_CONFIG.quiz_jigsaw.questionCount;
    return timeLimitSeconds == null
      ? `Answer ${count} questions correctly to unlock puzzle pieces. Wrong answers retry until correct.`
      : `Unlock all ${count} puzzle pieces within ${formatTimerLong(timeLimitSeconds)}. Wrong answers retry.`;
  }
  if (mode === "jigsaw") {
    return timeLimitSeconds == null
      ? "Answer questions to unlock pieces. Missed questions return in retry rounds until every piece is earned, then rebuild the image."
      : `Answer questions to unlock pieces. Missed questions return in retry rounds until every piece is earned, then rebuild the image before ${formatTimerLong(timeLimitSeconds)} runs out.`;
  }
  if (mode === "polls") {
    return timeLimitSeconds == null
      ? "Answer the poll or survey. Results update live as responses arrive."
      : `Answer the poll or survey within ${formatTimerLong(timeLimitSeconds)}. Results update live as responses arrive.`;
  }
  if (mode === "visual_point") {
    return timeLimitSeconds == null
      ? "Select one target on each image. Labels stay hidden while the host validates answers."
      : `Select the correct target on each image within ${formatTimerLong(timeLimitSeconds)}.`;
  }
  return timeLimitSeconds == null
    ? "Connect each question dot to its matching answer dot. Complete all pairs to finish."
    : `Connect each question dot to its matching answer dot within ${formatTimerLong(timeLimitSeconds)}.`;
}
