import type { GameMode } from "@/lib/game/config";
import type { ParticipantStatus, RoomStatus } from "@/lib/game/state-machine";

export type { GameMode, ParticipantStatus, RoomStatus };

export type QuizOptionId = "A" | "B" | "C" | "D";

export type QuizQuestionDraft = {
  id: string;
  prompt: string;
  options: Record<QuizOptionId, string>;
  /** Author-only - never sent to students while LIVE. */
  correctOption: QuizOptionId | null;
};

export type QuizQuestionPublic = {
  id: string;
  prompt: string;
  options: Record<QuizOptionId, string>;
  order: number;
};

export type JigsawConfig = {
  /** Storage path or data URL during draft; server URL once persisted. */
  imageUrl: string | null;
  imageMime: string | null;
  cols: number;
  rows: number;
};

export type ConnectDotsDifficulty = "easy" | "medium" | "hard";

export type ConnectDotsEndpoint = { r: number; c: number };

export type ConnectDotsPair = {
  id: string;
  label: number;
  color: string;
  a: ConnectDotsEndpoint;
  b: ConnectDotsEndpoint;
};

export type ConnectDotsBoardConfig = {
  difficulty: ConnectDotsDifficulty;
  gridSize: number;
  pairCount: number;
  seed: string;
  pairs: ConnectDotsPair[];
  /** Author/trusted only - never sent to students in public snapshots. */
  solution?: Record<string, ConnectDotsEndpoint[]>;
};

export type GamePayload =
  | { mode: "quiz"; questions: QuizQuestionDraft[]; timeLimitSeconds: number | null }
  | {
      mode: "quiz_jigsaw";
      questions: QuizQuestionDraft[];
      jigsaw: JigsawConfig;
      /** Secret code revealed when all 9 pieces are unlocked. */
      rewardCode: string;
      timeLimitSeconds: number | null;
    }
  | { mode: "jigsaw"; jigsaw: JigsawConfig; timeLimitSeconds: number }
  | {
      mode: "connect_dots";
      connectDots: ConnectDotsBoardConfig;
      timeLimitSeconds: number;
    };

export type Room = {
  id: string;
  code: string;
  name: string;
  subject: string;
  authorId: string;
  authorName: string;
  status: RoomStatus;
  mode: GameMode;
  payload: GamePayload;
  maxParticipants: number;
  createdAt: number;
  startedAt: number | null;
  endsAt: number | null;
  finishedAt: number | null;
};

export type Participant = {
  id: string;
  roomId: string;
  displayName: string;
  status: ParticipantStatus;
  joinedAt: number;
  reconnectToken: string;
  connectionId: string | null;
};

export type QuizAnswerRecord = {
  questionId: string;
  selectedOption: QuizOptionId;
  submittedAt: number;
};

export type QuizAttempt = {
  participantId: string;
  roomId: string;
  answers: QuizAnswerRecord[];
  correctCount: number | null;
  wrongCount: number | null;
  accuracy: number | null;
  score: number | null;
  completedAt: number | null;
  durationMs: number | null;
};

export type LeaderboardRow = {
  rank: number;
  participantId: string;
  displayName: string;
  primaryMetric: number;
  primaryLabel: string;
  secondaryMetric: number | null;
  secondaryLabel: string | null;
  status: "completed" | "in_progress" | "incomplete";
  detail?: string;
};

/** Realtime event envelope (channel payloads stay small). */
export type RoomEvent =
  | { type: "participant_joined"; participant: Pick<Participant, "id" | "displayName" | "status" | "joinedAt"> }
  | { type: "participant_left"; participantId: string }
  | { type: "participant_status"; participantId: string; status: ParticipantStatus }
  | { type: "room_updated"; status: RoomStatus }
  | { type: "game_starting"; startsAt: number; countdownSeconds: number }
  | { type: "game_started"; startedAt: number; endsAt: number | null }
  | { type: "player_progress"; participantId: string; displayName: string; progress: number; detail?: string }
  | { type: "player_completed"; participantId: string; displayName: string; completedAt: number; durationMs: number }
  | { type: "leaderboard_updated"; rows: LeaderboardRow[] }
  | { type: "game_stopped"; finishedAt: number }
  | { type: "game_finished"; finishedAt: number; rows: LeaderboardRow[] };
