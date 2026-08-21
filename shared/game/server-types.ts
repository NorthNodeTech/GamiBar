import type {
  Participant,
  Room,
  RoomEvent,
  VisualPointAnswerRecord,
} from "@shared/game/types";

export type StoredQuizAnswer = {
  questionId: string;
  selectedOption: "A" | "B" | "C" | "D";
  isCorrect: boolean;
  submittedAt: number;
};

export type StoredAttempt = {
  id: string;
  participantId: string;
  progress: number;
  correctCount: number;
  wrongCount: number;
  durationMs: number | null;
  completed: boolean;
  completedAt: number | null;
  score: number | null;
  payload: Record<string, unknown>;
};

export type StoredRoom = {
  room: Room;
  participants: Map<string, Participant>;
  quizAnswers: Map<string, Map<string, StoredQuizAnswer>>;
  visualPointAnswers: Map<
    string,
    Map<string, VisualPointAnswerRecord & { isCorrect: boolean }>
  >;
  attempts: Map<string, StoredAttempt>;
  events: RoomEvent[];
  authorToken: string;
  authorTokenHash: string;
};
