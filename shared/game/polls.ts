import { GAME_CONFIG } from "@shared/game/config";
import type {
  GamePayload,
  PollQuestionDraft,
  PollQuestionResults,
  PollQuestionType,
  PollResponseValue,
  PollResults,
  PollSettings,
} from "@shared/game/types";

export type PollsPayload = Extract<GamePayload, { mode: "polls" }>;

export const DEFAULT_POLL_SETTINGS: PollSettings = {
  anonymous: false,
  allowResubmission: false,
  showLiveResults: true,
};

export const POLL_TYPE_LABELS: Record<PollQuestionType, string> = {
  single_choice: "Single choice",
  multiple_choice: "Multi select",
  rating: "Rating",
  short_text: "Short answer",
  long_text: "Paragraph",
  yes_no: "Yes / No",
};

export const POLL_TYPE_DESCRIPTIONS: Record<PollQuestionType, string> = {
  single_choice: "One answer",
  multiple_choice: "Many answers",
  rating: "0-5 or 1-10 scale",
  short_text: "Brief feedback",
  long_text: "Detailed feedback",
  yes_no: "Fast decision",
};

const CHOICE_TYPES = new Set<PollQuestionType>(["single_choice", "multiple_choice"]);

function optionId(index: number) {
  return `option-${index + 1}`;
}

export function newPollQuestion(type: PollQuestionType, index: number): PollQuestionDraft {
  const base = {
    id: `poll-q-${Date.now()}-${index + 1}`,
    prompt: "",
    type,
    required: true,
    options: [],
  } satisfies PollQuestionDraft;

  if (type === "rating") {
    return {
      ...base,
      prompt: "How would you rate this session?",
      min: GAME_CONFIG.polls.defaultRatingMin,
      max: GAME_CONFIG.polls.defaultRatingMax,
      lowLabel: "Needs work",
      highLabel: "Excellent",
    };
  }

  if (type === "yes_no") {
    return { ...base, prompt: "Would you recommend this session?" };
  }

  if (type === "short_text") {
    return { ...base, prompt: "What should we improve?", required: false };
  }

  if (type === "long_text") {
    return { ...base, prompt: "Share your feedback", required: false };
  }

  return {
    ...base,
    options: [
      { id: optionId(0), label: "Option 1" },
      { id: optionId(1), label: "Option 2" },
    ],
  };
}

export function emptyPollQuestions(): PollQuestionDraft[] {
  return [
    {
      id: "poll-q-1",
      prompt: "How would you rate this session?",
      type: "rating",
      required: true,
      options: [],
      min: GAME_CONFIG.polls.defaultRatingMin,
      max: GAME_CONFIG.polls.defaultRatingMax,
      lowLabel: "Needs work",
      highLabel: "Excellent",
    },
  ];
}

export function normalizePollPayload(payload: PollsPayload): PollsPayload {
  return {
    mode: "polls",
    questions: payload.questions.map((question, questionIndex) => {
      const type = normalizePollType(question.type);
      const options = CHOICE_TYPES.has(type)
        ? question.options
            .map((option, optionIndex) => ({
              id: option.id?.trim() || optionId(optionIndex),
              label: option.label.trim(),
            }))
            .filter((option) => option.label)
        : [];
      const min = Number.isInteger(question.min)
        ? Number(question.min)
        : GAME_CONFIG.polls.defaultRatingMin;
      const max = Number.isInteger(question.max)
        ? Number(question.max)
        : GAME_CONFIG.polls.defaultRatingMax;
      return {
        id: question.id?.trim() || `poll-q-${questionIndex + 1}`,
        prompt: question.prompt.trim(),
        type,
        required: question.required !== false,
        options,
        ...(type === "rating"
          ? {
              min: Math.min(min, max - 1),
              max: Math.max(max, min + 1),
              lowLabel: question.lowLabel?.trim() || "",
              highLabel: question.highLabel?.trim() || "",
            }
          : {}),
      };
    }),
    settings: {
      ...DEFAULT_POLL_SETTINGS,
      ...(payload.settings ?? {}),
    },
    timeLimitSeconds: payload.timeLimitSeconds ?? null,
    timerMode: payload.timerMode === "per_question" ? "per_question" : "overall",
  };
}

export function pollQuestionReady(question: PollQuestionDraft): boolean {
  if (!question.prompt.trim()) return false;
  if (CHOICE_TYPES.has(question.type)) {
    return (
      question.options.length >= 2 &&
      question.options.length <= GAME_CONFIG.polls.maxOptions &&
      question.options.every((option) => option.label.trim())
    );
  }
  if (question.type === "rating") {
    const min = question.min ?? GAME_CONFIG.polls.defaultRatingMin;
    const max = question.max ?? GAME_CONFIG.polls.defaultRatingMax;
    return Number.isInteger(min) && Number.isInteger(max) && max > min && max - min <= 10;
  }
  return true;
}

export function pollCompletionCount(questions: PollQuestionDraft[]): {
  done: number;
  total: number;
  complete: boolean;
} {
  const total = questions.length;
  const done = questions.filter(pollQuestionReady).length;
  return { done, total, complete: total >= GAME_CONFIG.polls.minQuestions && done === total };
}

export function validatePollQuestions(
  questions: PollQuestionDraft[],
): { ok: true } | { ok: false; error: string } {
  if (questions.length < GAME_CONFIG.polls.minQuestions) {
    return { ok: false, error: "Add at least one poll question." };
  }
  if (questions.length > GAME_CONFIG.polls.maxQuestions) {
    return { ok: false, error: `Use at most ${GAME_CONFIG.polls.maxQuestions} questions.` };
  }
  const { complete, done, total } = pollCompletionCount(questions);
  if (!complete) {
    return { ok: false, error: `Complete every poll question (${done}/${total}).` };
  }
  return { ok: true };
}

export function sanitizePollResponses(
  payload: PollsPayload,
  rawResponses: Record<string, unknown>,
):
  | {
      ok: true;
      responses: Record<string, PollResponseValue>;
      answeredCount: number;
      requiredAnswered: number;
      requiredTotal: number;
    }
  | { ok: false; error: string } {
  const responses: Record<string, PollResponseValue> = {};
  let answeredCount = 0;
  let requiredAnswered = 0;
  const requiredTotal = payload.questions.filter((question) => question.required).length;

  for (const question of payload.questions) {
    const raw = rawResponses[question.id];
    const value = sanitizePollValue(question, raw);
    if (!value.ok) return value;

    const answered = hasPollResponseValue(value.value);
    if (question.required && !answered) {
      return { ok: false, error: "Answer every required question before submitting." };
    }
    if (answered) {
      responses[question.id] = value.value;
      answeredCount += 1;
      if (question.required) requiredAnswered += 1;
    }
  }

  return { ok: true, responses, answeredCount, requiredAnswered, requiredTotal };
}

export function sanitizePollQuestionResponse(
  question: PollQuestionDraft,
  rawValue: unknown,
): { ok: true; value?: PollResponseValue } | { ok: false; error: string } {
  const parsed = sanitizePollValue(question, rawValue);
  if (!parsed.ok) return parsed;
  const answered = hasPollResponseValue(parsed.value);
  if (question.required && !answered) {
    return { ok: false, error: "Answer this required question before continuing." };
  }
  if (rawValue != null && !answered && hasPollResponseValue(rawValue as PollResponseValue)) {
    return { ok: false, error: "Choose a valid response before continuing." };
  }
  return answered ? { ok: true, value: parsed.value } : { ok: true };
}

export function readPollResponses(payload: Record<string, unknown> | undefined | null) {
  const raw = payload?.responses;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, PollResponseValue>;
}

export function buildPollResults(
  payload: PollsPayload,
  entries: Array<{
    participantId: string;
    displayName: string;
    payload: Record<string, unknown>;
    completed: boolean;
    completedAt: number | null;
  }>,
): PollResults {
  const submitted = entries.filter((entry) => {
    const responses = readPollResponses(entry.payload);
    return entry.completed || Object.keys(responses).length > 0;
  });
  const submittedCount = submitted.length;
  const responseRows = submitted.map((entry, index) => ({
    participantId: entry.participantId,
    displayName: payload.settings.anonymous ? `Response ${index + 1}` : entry.displayName,
    submittedAt: entry.completedAt,
    responses: readPollResponses(entry.payload),
  }));

  return {
    totalParticipants: entries.length,
    submittedCount,
    completionRate: entries.length ? Math.round((submittedCount / entries.length) * 100) : 0,
    questions: payload.questions.map((question) =>
      buildQuestionResults(question, submitted, payload.settings.anonymous),
    ),
    responseRows,
  };
}

function buildQuestionResults(
  question: PollQuestionDraft,
  entries: Array<{
    participantId: string;
    displayName: string;
    payload: Record<string, unknown>;
    completedAt: number | null;
  }>,
  anonymous: boolean,
): PollQuestionResults {
  const values = entries
    .map((entry, index) => ({
      participantId: entry.participantId,
      displayName: anonymous ? `Response ${index + 1}` : entry.displayName,
      submittedAt: entry.completedAt,
      value: readPollResponses(entry.payload)[question.id],
    }))
    .filter((entry) => hasPollResponseValue(entry.value));

  const base = {
    questionId: question.id,
    prompt: question.prompt,
    type: question.type,
    required: question.required,
    responseCount: values.length,
    skippedCount: Math.max(0, entries.length - values.length),
  };

  if (question.type === "single_choice" || question.type === "multiple_choice") {
    const counts = new Map(question.options.map((option) => [option.id, 0]));
    for (const entry of values) {
      const selected = Array.isArray(entry.value) ? entry.value : [entry.value];
      for (const id of selected) {
        if (typeof id === "string" && counts.has(id)) {
          counts.set(id, (counts.get(id) ?? 0) + 1);
        }
      }
    }
    return {
      ...base,
      options: question.options.map((option) => {
        const count = counts.get(option.id) ?? 0;
        return {
          id: option.id,
          label: option.label,
          count,
          percent: percent(count, values.length),
        };
      }),
    };
  }

  if (question.type === "yes_no") {
    const yes = values.filter((entry) => entry.value === "yes").length;
    const no = values.filter((entry) => entry.value === "no").length;
    return {
      ...base,
      options: [
        { id: "yes", label: "Yes", count: yes, percent: percent(yes, values.length) },
        { id: "no", label: "No", count: no, percent: percent(no, values.length) },
      ],
    };
  }

  if (question.type === "rating") {
    const min = question.min ?? GAME_CONFIG.polls.defaultRatingMin;
    const max = question.max ?? GAME_CONFIG.polls.defaultRatingMax;
    const numeric = values
      .map((entry) => entry.value)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const sum = numeric.reduce((total, value) => total + value, 0);
    const distribution = Array.from({ length: max - min + 1 }, (_, index) => {
      const value = min + index;
      const count = numeric.filter((item) => item === value).length;
      return { value, count, percent: percent(count, numeric.length) };
    });
    return {
      ...base,
      rating: {
        min,
        max,
        average: numeric.length ? Number((sum / numeric.length).toFixed(1)) : null,
        distribution,
      },
    };
  }

  return {
    ...base,
    textResponses: values
      .map((entry) => ({
        participantId: entry.participantId,
        displayName: entry.displayName,
        value: String(entry.value),
        submittedAt: entry.submittedAt,
      }))
      .slice(-20)
      .reverse(),
  };
}

function sanitizePollValue(
  question: PollQuestionDraft,
  raw: unknown,
): { ok: true; value: PollResponseValue } | { ok: false; error: string } {
  if (raw == null || raw === "") return { ok: true, value: null };

  if (question.type === "single_choice") {
    if (typeof raw !== "string") return { ok: false, error: "Choose one option." };
    return optionExists(question, raw)
      ? { ok: true, value: raw }
      : { ok: false, error: "That option is not available." };
  }

  if (question.type === "multiple_choice") {
    if (!Array.isArray(raw)) return { ok: false, error: "Choose one or more options." };
    const selected = [
      ...new Set(raw.filter((value): value is string => typeof value === "string")),
    ].filter((id) => optionExists(question, id));
    return { ok: true, value: selected.length ? selected : null };
  }

  if (question.type === "rating") {
    const value = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
    const min = question.min ?? GAME_CONFIG.polls.defaultRatingMin;
    const max = question.max ?? GAME_CONFIG.polls.defaultRatingMax;
    if (!Number.isInteger(value) || value < min || value > max) {
      return { ok: false, error: `Choose a rating from ${min} to ${max}.` };
    }
    return { ok: true, value };
  }

  if (question.type === "yes_no") {
    if (raw === true) return { ok: true, value: "yes" };
    if (raw === false) return { ok: true, value: "no" };
    if (raw === "yes" || raw === "no") return { ok: true, value: raw };
    return { ok: false, error: "Choose Yes or No." };
  }

  const maxLength = question.type === "long_text" ? 1200 : 280;
  const value = String(raw).trim().slice(0, maxLength);
  return { ok: true, value: value || null };
}

function normalizePollType(type: PollQuestionType): PollQuestionType {
  return POLL_TYPE_LABELS[type] ? type : "single_choice";
}

function optionExists(question: PollQuestionDraft, optionIdValue: string): boolean {
  return question.options.some((option) => option.id === optionIdValue);
}

function hasPollResponseValue(value: PollResponseValue | undefined): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return Number.isFinite(value);
}

function percent(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}
