import type { LucideIcon } from "lucide-react";
import { Blocks, CircleDot, Puzzle, Timer, Users, Zap } from "lucide-react";

import gameConnectDotsPreview from "@/assets/game-connect-dots-preview.png";
import gameJigsawPreview from "@/assets/game-jigsaw-preview.webp";
import gameQuizPreview from "@/assets/game-quiz-preview.webp";
import { CORE_LIVE_GAME_MODES, type CoreLiveGameMode } from "@/lib/game/session-flow";
import { GAME_CONFIG, GAME_MODE_META, type GameMode } from "@/lib/game/config";

export type GameModeCatalogItem = {
  mode: GameMode;
  preview: string;
  icon: LucideIcon;
  tagline: string;
  specs: string[];
  accentClass: string;
  glowClass: string;
  badgeClass: string;
};

export const GAME_MODE_CATALOG: GameModeCatalogItem[] = [
  {
    mode: "quiz_jigsaw",
    preview: gameJigsawPreview,
    icon: Puzzle,
    tagline: "Answer questions to unlock puzzle pieces — Slido-style live quiz",
    specs: [
      `${GAME_CONFIG.quiz_jigsaw.questionCount} MCQs`,
      `${GAME_CONFIG.quiz_jigsaw.questionCount} puzzle pieces`,
      "Retry until correct",
    ],
    accentClass: "from-[#7C3AED] to-[#5B21B6]",
    glowClass: "shadow-[0_20px_60px_rgba(124,58,237,0.25)]",
    badgeClass: "bg-[#EDE9FE] text-[#5B21B6]",
  },
  {
    mode: "quiz",
    preview: gameQuizPreview,
    icon: Zap,
    tagline: "Speed, accuracy, and live rankings",
    specs: [
      `${GAME_CONFIG.quiz.minQuestions}–${GAME_CONFIG.quiz.maxQuestions} MCQs`,
      "Live leaderboard",
      "One attempt per question",
    ],
    accentClass: "from-[var(--game-quiz)] to-[var(--game-quiz-deep)]",
    glowClass: "shadow-[0_20px_60px_rgba(239,68,68,0.25)]",
    badgeClass: "bg-[var(--game-quiz-soft)] text-[var(--game-quiz-deep)]",
  },
  {
    mode: "jigsaw",
    preview: gameJigsawPreview,
    icon: Blocks,
    tagline: "Answer questions to unlock pieces, then rebuild the image",
    specs: [
      "1–16 questions = puzzle pieces",
      "Retry wrong answers until correct",
      "Upload any classroom image",
    ],
    accentClass: "from-[var(--game-jigsaw)] to-[var(--game-jigsaw-deep)]",
    glowClass: "shadow-[0_20px_60px_rgba(59,130,246,0.25)]",
    badgeClass: "bg-[var(--game-jigsaw-soft)] text-[var(--game-jigsaw-deep)]",
  },
  {
    mode: "connect_dots",
    preview: gameConnectDotsPreview,
    icon: CircleDot,
    tagline: "Connect each question to its matching answer on the grid",
    specs: [
      "2–10 question/answer pairs",
      "Teacher writes every match",
      "Same board for every student",
    ],
    accentClass: "from-[var(--game-connect-dots)] to-[var(--game-connect-dots-deep)]",
    glowClass: "shadow-[0_20px_60px_rgba(16,185,129,0.25)]",
    badgeClass: "bg-[var(--game-connect-dots-soft)] text-[var(--game-connect-dots-deep)]",
  },
];

export function getModeCatalog(mode: GameMode | null) {
  if (!mode) return null;
  return GAME_MODE_CATALOG.find((item) => item.mode === mode) ?? null;
}

/** Catalog entries for the three core live games (Quiz, Jigsaw, Connect Dots). */
export function getCoreModeCatalog() {
  return GAME_MODE_CATALOG.filter((item): item is GameModeCatalogItem & { mode: CoreLiveGameMode } =>
    (CORE_LIVE_GAME_MODES as readonly string[]).includes(item.mode),
  );
}

export function getModeTitle(mode: GameMode | null) {
  if (!mode) return "Pick your game";
  return GAME_MODE_META[mode].title;
}

export const CREATE_STEP_COPY = {
  details: {
    title: "Name your session",
    hint: "Students will see this title when they join the lobby.",
  },
  mode: {
    title: "Choose a game mode",
    hint: "Each mode is built for a different classroom moment.",
  },
  configure: {
    title: "Build your content",
    hint: "This is what students will play once you hit Start.",
  },
  review: {
    title: "Ready to launch",
    hint: "We will generate a room code and QR for your class.",
  },
} as const;

export const SESSION_FACTS = [
  { icon: Users, label: "Up to 80 players" },
  { icon: Timer, label: "Instant lobby" },
] as const;
