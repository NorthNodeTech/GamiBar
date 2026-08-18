import {
  BarChart3,
  Blocks,
  CircleDot,
  Crosshair,
  MonitorSmartphone,
  QrCode,
  Radio,
  Timer,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

import connectDotsPreview from "@/assets/tool-connect-dots.webp";
import homeLiveRoom from "@/assets/home-live-room.webp";
import homeResourceShare from "@/assets/home-resource-share.webp";
import homeToolsHub from "@/assets/home-tools-hub.webp";
import jigsawPreview from "@/assets/tool-jigsaw-mission.webp";
import pollsPreview from "@/assets/tool-polls-survey.webp";
import quizPreview from "@/assets/tool-quiz-battle.webp";
import testimonialCorporate from "@/assets/testimonial-corporate-learning.webp";
import testimonialMath from "@/assets/testimonial-math-classroom.webp";
import testimonialPhysics from "@/assets/testimonial-physics-classroom.webp";
import { CONNECT_DOTS_CONFIG } from "@/lib/connect-dots";
import { GAME_CONFIG, GAME_MODE_META, JIGSAW_GRID, type GameMode } from "@/lib/game/config";

export const HOMEPAGE_SEO = {
  title: "GamiBar | Live Session Tools, Quizzes and Interactive Games",
  description:
    "Turn classrooms, workshops and sessions into interactive experiences with GamiBar. Run live quizzes, games, leaderboards, QR file sharing, and session history from one workspace.",
} as const;

export const HOMEPAGE_HERO = {
  badge: "No more boring classrooms, no more boring sessions",
  headlinePrefix: "GamiBar",
  headlineAccent: "Run the room. Keep them playing.",
  lede: "Create a room, pick a tool, share a QR, and keep everyone involved with quizzes, games, live rankings, and downloadable resources.",
  primaryCta: "Open workspace",
  secondaryCta: "Join room",
  image: homeLiveRoom,
  imageAlt:
    "GamiBar live room with a quiz dashboard, QR code, participants on phones, and leaderboard visuals",
} as const;

export const HOMEPAGE_HERO_STATS = [
  {
    icon: Users,
    label: "Active participants",
    value: 50000,
    suffix: "+",
  },
  {
    icon: Zap,
    label: "Rooms hosted",
    value: 12800,
    suffix: "+",
  },
  {
    icon: Trophy,
    label: "Host rating",
    value: 98,
    suffix: "%",
  },
] as const;

const MODE_PRESENTATION: Record<
  GameMode,
  {
    tag: string;
    tint: string;
    accent: string;
    icon: LucideIcon;
    preview: string;
    imageAlt: string;
    cta: string;
  }
> = {
  quiz: {
    tag: "Quick recall",
    tint: "bg-[var(--game-quiz-soft)]",
    accent: "text-[#b91c1c]",
    icon: Timer,
    preview: quizPreview,
    imageAlt: "Quiz Challenge - multiple-choice question with four answers and live ranking",
    cta: "Set Up Quiz",
  },
  quiz_jigsaw: {
    tag: "Puzzle quiz",
    tint: "bg-[#EDE9FE]",
    accent: "text-[#5B21B6]",
    icon: Blocks,
    preview: jigsawPreview,
    imageAlt: "Puzzle Quest - quiz questions unlocking puzzle pieces",
    cta: "Set Up Puzzle Quest",
  },
  polls: {
    tag: "Live feedback",
    tint: "bg-orange-100",
    accent: "text-orange-700",
    icon: Radio,
    preview: pollsPreview,
    imageAlt: "Polls and Surveys - live rating scale, vote bars, and QR response card",
    cta: "Set Up Poll",
  },
  jigsaw: {
    tag: "Visual puzzle",
    tint: "bg-[var(--game-jigsaw-soft)]",
    accent: "text-[#1d4ed8]",
    icon: Blocks,
    preview: jigsawPreview,
    imageAlt: "Jigsaw Mission - draggable puzzle pieces forming a classroom image",
    cta: "Set Up Jigsaw",
  },
  connect_dots: {
    tag: "Logic and speed",
    tint: "bg-[var(--game-connect-dots-soft)]",
    accent: "text-[#047857]",
    icon: CircleDot,
    preview: connectDotsPreview,
    imageAlt: "Connect Dots - colored dot pairs linked by paths on a grid",
    cta: "Set Up Connect Dots",
  },
  visual_point: {
    tag: "Image challenge",
    tint: "bg-[var(--game-visual-point-soft)]",
    accent: "text-[var(--game-visual-point-deep)]",
    icon: Crosshair,
    preview: jigsawPreview,
    imageAlt: "Target Hunt - image-based prompt with answer dots over a diagram",
    cta: "Set Up Target Hunt",
  },
};

function gameModeMetaLine(mode: GameMode): string {
  switch (mode) {
    case "quiz":
      return "Unlimited MCQs - accuracy-first ranking";
    case "quiz_jigsaw":
      return `${GAME_CONFIG.quiz_jigsaw.questionCount} MCQs - puzzle unlocks`;
    case "polls":
      return "Ratings, votes, and feedback - instant results";
    case "jigsaw":
      return `${JIGSAW_GRID.pieceCount} pieces - ${GAME_CONFIG.jigsaw.timeLimitSeconds}s timer`;
    case "connect_dots":
      return `${CONNECT_DOTS_CONFIG.medium.gridSize}x${CONNECT_DOTS_CONFIG.medium.gridSize} grid - ${CONNECT_DOTS_CONFIG.medium.pairCount} pairs`;
    case "visual_point":
      return `Images with ${GAME_CONFIG.visual_point.minPoints}-${GAME_CONFIG.visual_point.maxPoints} target dots`;
  }
}

function gameModeCopy(mode: GameMode): string {
  switch (mode) {
    case "quiz":
      return "Run normal quizzes for revision, recaps, checks for understanding, and leaderboard-based classroom energy.";
    case "quiz_jigsaw":
      return "Mix quiz questions with puzzle unlocks for a more visual recap round.";
    case "polls":
      return "Collect session ratings, quick votes, exit tickets, and survey feedback with live result bars.";
    case "jigsaw":
      return "Turn an image or concept into a puzzle mission where participants unlock and place pieces as they answer.";
    case "connect_dots":
      return "Make matching, definitions, formulas, or concepts more physical with a path-building challenge.";
    case "visual_point":
      return "Upload a diagram, map, or image and ask participants to hunt for the right unlabeled target.";
  }
}

export type HomepageGameModeCard = {
  id: GameMode;
  title: string;
  tag: string;
  copy: string;
  meta: string;
  image: string;
  imageAlt: string;
  icon: LucideIcon;
  tint: string;
  accent: string;
  cta: string;
};

export const HOMEPAGE_GAME_MODES = (
  ["quiz", "polls", "jigsaw", "connect_dots", "visual_point"] as const
).map((mode) => {
  const presentation = MODE_PRESENTATION[mode];
  return {
    id: mode,
    title: GAME_MODE_META[mode].title,
    tag: presentation.tag,
    copy: gameModeCopy(mode),
    meta: gameModeMetaLine(mode),
    image: presentation.preview,
    imageAlt: presentation.imageAlt,
    icon: presentation.icon,
    tint: presentation.tint,
    accent: presentation.accent,
    cta: presentation.cta,
  } satisfies HomepageGameModeCard;
});

export const HOMEPAGE_GAME_MODES_SECTION = {
  eyebrow: "Tools shelf",
  title: "Pick the right room tool",
  description:
    "Start fast with quiz battles, polls, visual puzzles, matching games, and QR file sharing.",
} as const;

export const HOMEPAGE_JOURNEY_SECTION = {
  eyebrow: "Room flow",
  title: "One room from launch to history",
  description:
    "Create the session, invite participants, run the activity, share resources, and review your created-room history.",
} as const;

export const HOMEPAGE_JOURNEY_MILESTONES = [
  {
    title: "01. Create a room",
    desc: "Name the session, pick a tool, attach your content, and prepare files participants can download by QR.",
    badge: "Host setup",
    icon: Zap,
  },
  {
    title: "02. Participants join",
    desc: `Share a ${GAME_CONFIG.room.codeLength}-digit code or QR link. People enter a nickname - no account required to play.`,
    badge: "Instant join",
    icon: Users,
  },
  {
    title: "03. Start the round together",
    desc: "When you press Start, every connected device enters the same game state. No one begins early or on a different puzzle.",
    badge: "Synchronized play",
    icon: Timer,
  },
  {
    title: "04. Watch the live leaderboard",
    desc: "Scores and completion times update in real time on the host screen and participant devices as the round progresses.",
    badge: "Live rankings",
    icon: BarChart3,
  },
  {
    title: "05. Share resources and review",
    desc: "Use Resource Drop for handouts, then review leaderboard and participation data after the session.",
    badge: "Follow-up",
    icon: Trophy,
  },
] as const;

export const HOMEPAGE_INFRASTRUCTURE_SECTION = {
  eyebrow: "Workspace",
  title: "Everything in one visual hub",
  description:
    "Tools, QR resources, live rooms, reports, and your created-room history live together.",
} as const;

export const HOMEPAGE_INFRASTRUCTURE_FEATURES = [
  {
    icon: Zap,
    title: "Launch live rooms",
    copy: "Pick a tool, share a code, and control the round from one screen.",
    image: homeLiveRoom,
    imageAlt: "Live GamiBar room with participants joining by phone and QR code",
  },
  {
    icon: MonitorSmartphone,
    title: "All tools together",
    copy: "Quiz Battle, Polls, Jigsaw, Connect Dots, Target Hunt, files, and reports sit in one place.",
    image: homeToolsHub,
    imageAlt: "GamiBar tool hub with compact cards for quizzes, polls, puzzles, files, and reports",
  },
  {
    icon: QrCode,
    title: "Files by QR",
    copy: "Upload PPT, PDF, and docs once. Share one QR and choose 7, 14, or 28 days.",
    image: homeResourceShare,
    imageAlt: "QR file sharing from a host tablet to participant phones",
  },
  {
    icon: BarChart3,
    title: "My sessions history",
    copy: "Every room you create stays in My sessions with status, participants, and results.",
    image: homeToolsHub,
    imageAlt: "GamiBar workspace dashboard with reports and session history cards",
  },
] as const;

export const HOMEPAGE_TESTIMONIALS_SECTION = {
  eyebrow: "Host feedback",
  title: "Designed for rooms with energy",
  description:
    "Use GamiBar for revision, workshops, training sessions, energizers, and cleaner follow-up.",
} as const;

export const HOMEPAGE_TESTIMONIALS = [
  {
    quote:
      "I share the room code and the whole cohort is in within a minute. The Connect Dots round keeps even quiet participants competing.",
    name: "Dr. Priya Nair",
    role: "Head of Physics, Ashford College",
    image: testimonialPhysics,
    imageAlt: "Physics classroom with participants playing a live Connect Dots session",
  },
  {
    quote:
      "It feels like software participants already understand - not a clunky add-on. The live leaderboard changes the energy in the room immediately.",
    name: "Marcus Feld",
    role: "L&D Lead, Northline Group",
    image: testimonialCorporate,
    imageAlt: "Corporate training room with a live leaderboard on display",
  },
  {
    quote:
      "Quiz results show me which questions slowed the class down. I know exactly what to re-teach before the next session.",
    name: "Sofia Almeida",
    role: "Mathematics Faculty, Vernay University",
    image: testimonialMath,
    imageAlt: "University mathematics classroom during a live quiz review",
  },
] as const;

export const HOMEPAGE_FAQ_SECTION = {
  eyebrow: "FAQ",
  title: "Common questions",
} as const;

export const HOMEPAGE_FAQ = [
  {
    question: "Is GamiBar only four games?",
    answer:
      "No. The current app starts with Quiz Challenge, Polls, Jigsaw Mission, Connect Dots, Target Hunt, and Resource Drop. The workspace is structured so more activity types and host utilities can be added cleanly.",
  },
  {
    question: "Can I use my own questions, images, and documents?",
    answer:
      "Yes. Quiz Challenge uses your multiple-choice bank, Jigsaw Mission uses an image you upload or choose, Target Hunt uses any image with answer dots, Connect Dots uses your matching pairs, and Resource Drop accepts PDF, PPT, PPTX, DOC, and DOCX files.",
  },
  {
    question: "Do participants need an account to join?",
    answer:
      "No. Participants join with the room code and a display name. Accounts are optional if they want to track XP and history over time.",
  },
  {
    question: "How long are Resource Drop documents kept?",
    answer:
      "Hosts choose 7, 14, or 28 days during upload. After expiry, the document is treated as inactive and the backend cleanup endpoint can remove the stored copy.",
  },
  {
    question: "Which devices are supported?",
    answer:
      "Any modern browser on desktop, tablet, or phone. Jigsaw dragging, Connect Dots path drawing, quiz taps, and QR downloads work with touch and mouse.",
  },
] as const;

export const HOMEPAGE_CTA = {
  title: "Build the next session from one place",
  description:
    "Create a room, pick an activity, attach resources, and share the QR before the room loses attention.",
  primaryCta: "Open workspace",
  secondaryCta: "Join room",
} as const;
