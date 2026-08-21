import type { GameMode } from "@shared/game/config";
import type { ParticipantStatus, RoomStatus } from "@shared/game/state-machine";

export type { GameMode, ParticipantStatus, RoomStatus };

export type QuizOptionId = "A" | "B" | "C" | "D";

export type QuizQuestionDraft = {
  id: string;
  prompt: string;
  options: Record<QuizOptionId, string>;
  /** Author-only - never sent to students while LIVE. */
  correctOption?: QuizOptionId | null;
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
  /** Server-generated automatic unlock thresholds. Legacy custom values are ignored. */
  pieceUnlockAt?: number[] | undefined;
  /** Official library image id when the author used Auto Upload. */
  libraryImageId?: string | null | undefined;
};

export type ConnectDotsDifficulty = "easy" | "medium" | "hard";

export type ConnectDotsEndpoint = { r: number; c: number };

export type ConnectDotsPair = {
  id: string;
  label: number;
  color: string;
  a: ConnectDotsEndpoint;
  b: ConnectDotsEndpoint;
  /** Teacher content shown on endpoint A. */
  question?: string | undefined;
  /** Teacher content shown on endpoint B. */
  answer?: string | undefined;
};

/** Teacher-authored matching pair for Connect Dots. */
export type ConnectDotsContentPair = {
  id: string;
  question: string;
  answer: string;
};

export type ConnectDotsBoardConfig = {
  difficulty: ConnectDotsDifficulty;
  gridSize: number;
  pairCount: number;
  seed: string;
  pairs: ConnectDotsPair[];
  contentPairs: ConnectDotsContentPair[];
  /** Author/trusted only - never sent to students in public snapshots. */
  solution?: Record<string, ConnectDotsEndpoint[]> | undefined;
};

export type VisualPoint = {
  id: string;
  /** 0-100 image-relative coordinate. */
  x: number;
  /** 0-100 image-relative coordinate. */
  y: number;
  /** Author/trusted only - never sent to students. Absent on public snapshots. */
  isCorrect?: boolean;
  /** Author-only teacher reference. Never sent to students. */
  adminReference?: string | undefined;
  color?: string | undefined;
};

export type VisualPointPublic = Pick<VisualPoint, "id" | "x" | "y" | "color">;

export type VisualPointQuestionDraft = {
  id: string;
  prompt: string;
  /** Storage path or data URL during draft; server URL once persisted. */
  imageUrl: string | null;
  imageMime: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  points: VisualPoint[];
};

export type VisualPointQuestionPublic = {
  id: string;
  prompt: string;
  imageUrl: string | null;
  imageMime: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  points: VisualPointPublic[];
  order: number;
};

export type PollQuestionType =
  | "single_choice"
  | "multiple_choice"
  | "rating"
  | "short_text"
  | "long_text"
  | "yes_no";

export type PollOptionDraft = {
  id: string;
  label: string;
};

export type PollQuestionDraft = {
  id: string;
  prompt: string;
  type: PollQuestionType;
  required: boolean;
  options: PollOptionDraft[];
  min?: number;
  max?: number;
  lowLabel?: string;
  highLabel?: string;
};

export type PollSettings = {
  anonymous: boolean;
  allowResubmission: boolean;
  showLiveResults: boolean;
};

export type PollResponseValue = string | string[] | number | null;

export type PollQuestionResults = {
  questionId: string;
  prompt: string;
  type: PollQuestionType;
  required: boolean;
  responseCount: number;
  skippedCount: number;
  options?: Array<{
    id: string;
    label: string;
    count: number;
    percent: number;
  }>;
  rating?: {
    min: number;
    max: number;
    average: number | null;
    distribution: Array<{ value: number; count: number; percent: number }>;
  };
  textResponses?: Array<{
    participantId: string;
    displayName: string;
    value: string;
    submittedAt: number | null;
  }>;
};

export type PollResponseRow = {
  participantId: string;
  displayName: string;
  submittedAt: number | null;
  responses: Record<string, PollResponseValue>;
};

export type PollResults = {
  totalParticipants: number;
  submittedCount: number;
  completionRate: number;
  questions: PollQuestionResults[];
  responseRows: PollResponseRow[];
};

export type TimerMode = "overall" | "per_question";

export type GamePayload =
  | {
      mode: "quiz";
      questions: QuizQuestionDraft[];
      timeLimitSeconds: number | null;
      /** Missing on legacy rooms and treated as `overall`. */
      timerMode?: TimerMode;
    }
  | {
      mode: "quiz_jigsaw";
      questions: QuizQuestionDraft[];
      jigsaw: JigsawConfig;
      /** Secret code revealed when all 9 pieces are unlocked. */
      rewardCode: string;
      timeLimitSeconds: number | null;
      timerMode?: TimerMode;
    }
  | {
      mode: "jigsaw";
      questions: QuizQuestionDraft[];
      jigsaw: JigsawConfig;
      timeLimitSeconds: number | null;
      timerMode?: TimerMode;
    }
  | {
      mode: "connect_dots";
      connectDots: ConnectDotsBoardConfig;
      timeLimitSeconds: number | null;
      timerMode?: TimerMode;
    }
  | {
      mode: "visual_point";
      questions: VisualPointQuestionDraft[];
      timeLimitSeconds: number | null;
      timerMode?: TimerMode;
    }
  | {
      mode: "polls";
      questions: PollQuestionDraft[];
      settings: PollSettings;
      timeLimitSeconds: number | null;
      timerMode?: TimerMode;
    };

export type Room = {
  id: string;
  code: string;
  name: string;
  subject?: string;
  authorId: string;
  authorName: string;
  status: RoomStatus;
  mode: GameMode;
  payload: GamePayload;
  maxParticipants: number;
  createdAt: number;
  /** Access lifetime for the room. Null means the paid unlimited lifespan. */
  expiresAt: number | null;
  startedAt: number | null;
  endsAt: number | null;
  finishedAt: number | null;
  /** When true during LIVE quiz, students see the live leaderboard. Default false. */
  showLeaderboardToStudents: boolean;
  /** Author-only label — not shown to students. */
  duplicatedFromName?: string | null;
  /** Past completed session rounds and standings history. */
  roundHistory?: RoomRoundRecord[];
};

export type RoomRoundRecord = {
  roundNumber: number;
  startedAt: number;
  finishedAt: number;
  participantCount: number;
  leaderboard: LeaderboardRow[];
};

export type Participant = {
  id: string;
  roomId: string;
  displayName: string;
  status: ParticipantStatus;
  joinedAt: number;
  reconnectToken: string;
  connectionId: string | null;
  /** Linked GamiBAR account — used for Participated Games history. */
  userId?: string | null;
};

export type QuizAnswerRecord = {
  questionId: string;
  selectedOption: QuizOptionId;
  submittedAt: number;
};

export type VisualPointAnswerRecord = {
  questionId: string;
  selectedPointId: string;
  submittedAt: number;
  isCorrect?: boolean;
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

/** Author-only live dashboard row (never sent to students). */
export type LiveParticipantProgress = {
  participantId: string;
  displayName: string;
  status: ParticipantStatus;
  completed: boolean;
  progressText: string;
  progressPercent: number;
  score?: number | null;
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
  /** Mode-specific performance label (score, incorrect count, pairs, etc.). */
  performanceText?: string;
  /** Wrong answers (jigsaw) or failed connections (connect dots). */
  incorrectAttempts?: number;
  /** Quiz Challenge: points earned (correct × 100). */
  score?: number;
  /** Quiz Challenge: correct answers ÷ total questions (0–100). */
  accuracyPercent?: number | null;
};

/** Realtime event envelope (channel payloads stay small). */
export type RoomEvent =
  | {
      type: "participant_joined";
      participant: Pick<
        Participant,
        "id" | "displayName" | "status" | "joinedAt"
      >;
    }
  | { type: "participant_left"; participantId: string }
  | {
      type: "participant_status";
      participantId: string;
      status: ParticipantStatus;
    }
  | { type: "room_updated"; status: RoomStatus }
  | { type: "game_starting"; startsAt: number; countdownSeconds: number }
  | { type: "game_started"; startedAt: number; endsAt: number | null }
  | {
      type: "player_progress";
      participantId: string;
      displayName: string;
      progress: number;
      detail?: string;
    }
  | {
      type: "player_completed";
      participantId: string;
      displayName: string;
      completedAt: number;
      durationMs: number;
    }
  | {
      type: "poll_results_updated";
      submittedCount: number;
      totalParticipants: number;
    }
  | { type: "leaderboard_updated"; rows: LeaderboardRow[] }
  | { type: "game_stopped"; finishedAt: number }
  | { type: "game_finished"; finishedAt: number; rows: LeaderboardRow[] };
