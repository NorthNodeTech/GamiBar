import { GAME_CONFIG, type GameMode } from "@shared/game/config";
import type { GamePayload, TimerMode } from "@shared/game/types";

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

export const PER_QUESTION_TIMER_PRESETS: TimerPreset[] = [
  { id: "open", label: "No limit", seconds: null },
  { id: "10s", label: "10 sec", seconds: 10 },
  { id: "15s", label: "15 sec", seconds: 15 },
  { id: "30s", label: "30 sec", seconds: 30 },
  { id: "45s", label: "45 sec", seconds: 45 },
  { id: "60s", label: "1 min", seconds: 60 },
];

export const PER_QUESTION_TIMER_BOUNDS = { min: 5, max: 300, step: 5 } as const;

export function timerPresets(mode: GameMode, timerMode: TimerMode): TimerPreset[] {
  return timerMode === "per_question" ? PER_QUESTION_TIMER_PRESETS : TIMER_PRESETS[mode];
}

export function timerBounds(
  mode: GameMode,
  timerMode: TimerMode,
): { min: number; max: number; step: number } {
  return timerMode === "per_question" ? PER_QUESTION_TIMER_BOUNDS : TIMER_BOUNDS[mode];
}

export function defaultTimerSeconds(mode: GameMode, timerMode: TimerMode = "overall"): number | null {
  if (timerMode === "per_question") return 15;
  if (mode === "quiz") return 180;
  if (mode === "quiz_jigsaw") return 300;
  if (mode === "jigsaw") return 180;
  if (mode === "visual_point") return 180;
  if (mode === "polls") return 180;
  return GAME_CONFIG.connect_dots.timeLimitSeconds ?? 60;
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

export function clampTimer(
  mode: GameMode,
  value: number | null,
  timerMode: TimerMode = "overall",
): number | null {
  if (value == null) return null;
  const bounds = timerBounds(mode, timerMode);
  return Math.min(bounds.max, Math.max(bounds.min, value));
}

export function isTimerValid(
  mode: GameMode,
  value: number | null,
  timerMode: TimerMode = "overall",
): boolean {
  if (value == null) return true;
  const clamped = clampTimer(mode, value, timerMode);
  return clamped === value;
}

export function resolvePayloadTimeLimit(payload: GamePayload): number | null {
  return payload.timeLimitSeconds ?? null;
}

export function resolvePayloadTimerMode(payload: GamePayload): TimerMode {
  return payload.timerMode === "per_question" ? "per_question" : "overall";
}

export function isTimerMode(value: unknown): value is TimerMode {
  return value === "overall" || value === "per_question";
}

export function gameInstruction(
  mode: GameMode,
  timeLimitSeconds: number | null,
  questionCount?: number,
  timerMode: TimerMode = "overall",
): string {
  const perQuestion = timerMode === "per_question";
  if (mode === "quiz") {
    const count = questionCount ?? GAME_CONFIG.quiz.defaultQuestionCount;
    return timeLimitSeconds == null
      ? `Answer all ${count} questions. One attempt per question. Results appear after completion.`
      : perQuestion
        ? `Answer all ${count} questions. You have ${formatTimerLong(timeLimitSeconds)} for each question and one attempt per question.`
        : `Answer all ${count} questions within ${formatTimerLong(timeLimitSeconds)}. One attempt per question.`;
  }
  if (mode === "quiz_jigsaw") {
    const count = GAME_CONFIG.quiz_jigsaw.questionCount;
    return timeLimitSeconds == null
      ? `Answer ${count} questions correctly to unlock puzzle pieces. Wrong answers retry until correct.`
      : perQuestion
        ? `Unlock all ${count} puzzle pieces. Each question gets ${formatTimerLong(timeLimitSeconds)} and wrong answers retry.`
        : `Unlock all ${count} puzzle pieces within ${formatTimerLong(timeLimitSeconds)}. Wrong answers retry.`;
  }
  if (mode === "jigsaw") {
    return timeLimitSeconds == null
      ? "Answer questions to unlock pieces. Missed questions return in retry rounds until every piece is earned, then rebuild the image."
      : perQuestion
        ? `You have ${formatTimerLong(timeLimitSeconds)} for each question. Missed questions return in retry rounds; after earning every piece, rebuild the image without a question countdown.`
        : `Answer questions to unlock pieces. Missed questions return in retry rounds until every piece is earned, then rebuild the image before ${formatTimerLong(timeLimitSeconds)} runs out.`;
  }
  if (mode === "polls") {
    return timeLimitSeconds == null
      ? "Answer the poll or survey. Results update live as responses arrive."
      : perQuestion
        ? `Answer one survey question at a time with ${formatTimerLong(timeLimitSeconds)} for each. Results update live as responses arrive.`
        : `Answer the poll or survey within ${formatTimerLong(timeLimitSeconds)}. Results update live as responses arrive.`;
  }
  if (mode === "visual_point") {
    return timeLimitSeconds == null
      ? "Select one target on each image. Labels stay hidden while the host validates answers."
      : perQuestion
        ? `Select one target on each image. Every image gets a fresh ${formatTimerLong(timeLimitSeconds)} countdown.`
        : `Select the correct target on each image within ${formatTimerLong(timeLimitSeconds)}.`;
  }
  return timeLimitSeconds == null
    ? "Connect each question dot to its matching answer dot. Complete all pairs to finish."
    : perQuestion
      ? `Connect every question dot to its answer. Each completed pair starts a fresh ${formatTimerLong(timeLimitSeconds)} countdown.`
      : `Connect each question dot to its matching answer dot within ${formatTimerLong(timeLimitSeconds)}.`;
}
