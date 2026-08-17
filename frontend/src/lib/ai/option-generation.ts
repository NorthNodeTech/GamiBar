import { apiPost } from "@/lib/api-client";
import type { GameMode, PollQuestionType, QuizOptionId } from "@/lib/game/types";

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

export function generateAiOptions(request: AiGenerationRequest): Promise<AiGenerationResponse> {
  return apiPost<AiGenerationResponse>("/api/ai/generate-options", request);
}
