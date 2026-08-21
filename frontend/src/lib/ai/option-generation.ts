import { apiFetch } from "@/lib/api-client";
import type { GameMode, PollQuestionType, QuizOptionId } from "@shared/game/types";

const AI_REQUEST_TIMEOUT_MS = 180_000;

export type AiGenerationContext = {
  roomName?: string;
  subject?: string;
  modeLabel?: string;
  existingOptions?: Record<QuizOptionId, string> | string[];
  correctOption?: QuizOptionId | null;
  existingAnswer?: string;
};

export type QuizOptionsGenerationRequest = {
  kind: "quiz_options";
  mode: Extract<GameMode, "quiz" | "quiz_jigsaw" | "jigsaw">;
  question: string;
  context: AiGenerationContext;
};

export type PollOptionsGenerationRequest = {
  kind: "poll_options";
  mode: "polls";
  pollType: Extract<PollQuestionType, "single_choice" | "multiple_choice">;
  question: string;
  context: AiGenerationContext;
};

export type ConnectDotsAnswerGenerationRequest = {
  kind: "connect_dots_answer";
  mode: "connect_dots";
  question: string;
  context: AiGenerationContext;
};

export type AiGenerationRequest =
  QuizOptionsGenerationRequest | PollOptionsGenerationRequest | ConnectDotsAnswerGenerationRequest;

export type QuizOptionsGenerationResponse = {
  kind: "quiz_options";
  options: Record<QuizOptionId, string>;
  correctOption: QuizOptionId;
};

export type PollOptionsGenerationResponse = {
  kind: "poll_options";
  options: string[];
};

export type ConnectDotsAnswerGenerationResponse = {
  kind: "connect_dots_answer";
  answer: string;
};

export type AiGenerationResponse =
  | QuizOptionsGenerationResponse
  | PollOptionsGenerationResponse
  | ConnectDotsAnswerGenerationResponse;

export type QuizQuestionGenerationRequest = {
  kind: "quiz_question";
  mode: Extract<GameMode, "quiz" | "quiz_jigsaw" | "jigsaw">;
  topic: string;
  audience: string;
  guidance?: string;
  count?: number;
  questionNumber?: number;
  totalQuestions?: number;
  avoidQuestions?: string[];
};

export type QuizQuestionGenerationResponse = {
  kind: "quiz_question";
  question: string;
  options: Record<QuizOptionId, string>;
  correctOption: QuizOptionId;
};

export type QuizQuestionsBatchGenerationResponse = {
  kind: "quiz_questions_batch";
  questions: QuizQuestionGenerationResponse[];
};

export function generateAiOptions(request: AiGenerationRequest): Promise<AiGenerationResponse> {
  return apiFetch<AiGenerationResponse>("/api/ai/generate-options", {
    method: "POST",
    json: request,
    timeoutMs: AI_REQUEST_TIMEOUT_MS,
  });
}

export function generateAiQuestion(
  request: QuizQuestionGenerationRequest,
): Promise<QuizQuestionGenerationResponse | QuizQuestionsBatchGenerationResponse> {
  return apiFetch<QuizQuestionGenerationResponse | QuizQuestionsBatchGenerationResponse>(
    "/api/ai/generate-question",
    {
      method: "POST",
      json: request,
      timeoutMs: AI_REQUEST_TIMEOUT_MS,
    },
  );
}

export async function generateAiQuestionsBatch(
  request: QuizQuestionGenerationRequest,
): Promise<QuizQuestionGenerationResponse[]> {
  const response = await generateAiQuestion(request);
  if (response.kind === "quiz_questions_batch") {
    return response.questions;
  }
  return [response as QuizQuestionGenerationResponse];
}
