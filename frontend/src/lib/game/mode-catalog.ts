import type { LucideIcon } from "lucide-react";
import { Blocks, CircleDot, Crosshair, Puzzle, Radio, Timer, Users, Zap } from "lucide-react";

import gameConnectDotsPreview from "@/assets/tool-connect-dots.webp";
import gameJigsawPreview from "@/assets/tool-jigsaw-mission.webp";
import gamePollsPreview from "@/assets/tool-polls-survey.webp";
import gameQuizPreview from "@/assets/tool-quiz-battle.webp";
import gameVisualPointPreview from "@/assets/tool-jigsaw-mission.webp";
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
    tagline: "Answer questions to unlock puzzle pieces in a live quiz",
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
    specs: ["Unlimited MCQs", "Live leaderboard", "One attempt per question"],
    accentClass: "from-[var(--game-quiz)] to-[var(--game-quiz-deep)]",
    glowClass: "shadow-[0_20px_60px_rgba(239,68,68,0.25)]",
    badgeClass: "bg-[var(--game-quiz-soft)] text-[var(--game-quiz-deep)]",
  },
  {
    mode: "polls",
    preview: gamePollsPreview,
    icon: Radio,
    tagline: "Live polls, ratings, and surveys with instant results",
    specs: ["Rating scales", "Choice polls", "Text feedback"],
    accentClass: "from-[#F97316] to-[#EF4444]",
    glowClass: "shadow-[0_20px_60px_rgba(249,115,22,0.24)]",
    badgeClass: "bg-orange-100 text-orange-800",
  },
  {
    mode: "jigsaw",
    preview: gameJigsawPreview,
    icon: Blocks,
    tagline: "Answer questions to unlock pieces, then rebuild the image",
    specs: [
      "Pick a puzzle grid, add questions, upload the image",
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
      "2-10 question/answer pairs",
      "Host writes every match",
      "Same board for every participant",
    ],
    accentClass: "from-[var(--game-connect-dots)] to-[var(--game-connect-dots-deep)]",
    glowClass: "shadow-[0_20px_60px_rgba(16,185,129,0.25)]",
    badgeClass: "bg-[var(--game-connect-dots-soft)] text-[var(--game-connect-dots-deep)]",
  },
  {
    mode: "visual_point",
    preview: gameVisualPointPreview,
    icon: Crosshair,
    tagline: "Upload any image and ask participants to hunt for the correct target",
    specs: [
      "Image-based questions",
      "Student sees dots only",
      "Server-validated answer",
    ],
    accentClass: "from-[var(--game-visual-point)] to-[var(--game-visual-point-deep)]",
    glowClass: "shadow-[0_20px_60px_rgba(14,165,233,0.24)]",
    badgeClass: "bg-[var(--game-visual-point-soft)] text-[var(--game-visual-point-deep)]",
  },
];

export function getModeCatalog(mode: GameMode | null) {
  if (!mode) return null;
  return GAME_MODE_CATALOG.find((item) => item.mode === mode) ?? null;
}

/** Catalog entries for the core live room modes shown in Create. */
export function getCoreModeCatalog() {
  return GAME_MODE_CATALOG.filter(
    (item): item is GameModeCatalogItem & { mode: CoreLiveGameMode } =>
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
    hint: "Participants see this title when they join the lobby.",
  },
  mode: {
    title: "Choose a game mode",
    hint: "Each mode is built for a different live-session moment.",
  },
  configure: {
    title: "Build your content",
    hint: "This is what participants play once you hit Start.",
  },
  review: {
    title: "Ready to launch",
    hint: "We will generate a room code and QR for your audience.",
  },
} as const;

export const SESSION_FACTS = [
  { icon: Users, label: "Up to 80 players" },
  { icon: Timer, label: "Instant lobby" },
] as const;
