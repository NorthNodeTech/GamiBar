import {
  BarChart3,
  Blocks,
  CircleDot,
  FileText,
  MonitorSmartphone,
  QrCode,
  Timer,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

import connectDotsPreview from "@/assets/tool-connect-dots.webp";
import jigsawPreview from "@/assets/tool-jigsaw-mission.webp";
import quizPreview from "@/assets/tool-quiz-battle.webp";
import testimonialCorporate from "@/assets/testimonial-corporate-learning.webp";
import testimonialMath from "@/assets/testimonial-math-classroom.webp";
import testimonialPhysics from "@/assets/testimonial-physics-classroom.webp";
import { CONNECT_DOTS_CONFIG } from "@/lib/connect-dots";
import { GAME_CONFIG, GAME_MODE_META, JIGSAW_GRID, type GameMode } from "@/lib/game/config";

export const HOMEPAGE_SEO = {
  title: "GamiBar | Classroom Games, Quizzes and Teacher Tools",
  description:
    "Turn classrooms and sessions into interactive experiences with GamiBar. Run live quizzes, classroom games, leaderboards, and QR-based resource drops from one teacher workspace.",
} as const;

export const HOMEPAGE_HERO = {
  badge: "No more boring classrooms, no more boring sessions",
  headlinePrefix: "Turn Every Session Into an",
  headlineAccent: "Interactive Experience.",
  lede: "Create a room, choose an activity, share a QR, and keep students involved with quizzes, games, live rankings, and downloadable class resources.",
  primaryCta: "Open Teacher Workspace",
  secondaryCta: "Join with Code",
  imageAlt:
    "GamiBar teacher workspace with classroom activities, resource sharing, and live leaderboard",
} as const;

export const HOMEPAGE_HERO_STATS = [
  {
    icon: Users,
    label: "Active learners",
    value: 50000,
    suffix: "+",
  },
  {
    icon: Zap,
    label: "Live sessions hosted",
    value: 12800,
    suffix: "+",
  },
  {
    icon: Trophy,
    label: "Educator satisfaction",
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
};

function gameModeMetaLine(mode: GameMode): string {
  switch (mode) {
    case "quiz":
      return "Unlimited MCQs - accuracy-first ranking";
    case "jigsaw":
      return `${JIGSAW_GRID.pieceCount} pieces - ${GAME_CONFIG.jigsaw.timeLimitSeconds}s timer`;
    case "connect_dots":
      return `${CONNECT_DOTS_CONFIG.medium.gridSize}x${CONNECT_DOTS_CONFIG.medium.gridSize} grid - ${CONNECT_DOTS_CONFIG.medium.pairCount} pairs`;
  }
}

function gameModeCopy(mode: GameMode): string {
  switch (mode) {
    case "quiz":
      return "Run normal quizzes for revision, recaps, checks for understanding, and leaderboard-based classroom energy.";
    case "jigsaw":
      return "Turn an image or concept into a puzzle mission where students unlock and place pieces as they answer.";
    case "connect_dots":
      return "Make matching, definitions, formulas, or concepts more physical with a path-building challenge.";
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

export const HOMEPAGE_GAME_MODES = (["quiz", "jigsaw", "connect_dots"] as const).map((mode) => {
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
  eyebrow: "Teacher toolkit",
  title: "Activities now, more classroom tools next",
  description:
    "Start with live quizzes and game-based activities. Add Resource Drops when students need documents from a QR instead of a chat group.",
} as const;

export const HOMEPAGE_JOURNEY_SECTION = {
  eyebrow: "Classroom flow",
  title: "One room for play, sharing, and follow-up",
  description:
    "GamiBar should feel like a teacher control room: create the session, invite students, run the activity, share resources, and review what happened.",
} as const;

export const HOMEPAGE_JOURNEY_MILESTONES = [
  {
    title: "01. Create a classroom room",
    desc: "Name the session, pick an activity, attach your content, and optionally prepare documents students can download by QR.",
    badge: "Teacher setup",
    icon: Zap,
  },
  {
    title: "02. Students join with a room code",
    desc: `Share a ${GAME_CONFIG.room.codeLength}-digit code or QR link. Learners enter a nickname - no account required to play.`,
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
    desc: "Scores and completion times update in real time on the author screen and student devices as the round progresses.",
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
  eyebrow: "Built for teachers",
  title: "A better home for session tools",
  description:
    "The workspace is structured around real classroom jobs: run activities, manage live rooms, share documents, and track outcomes.",
} as const;

export const HOMEPAGE_INFRASTRUCTURE_FEATURES = [
  {
    icon: Users,
    title: "Synchronized live sessions",
    copy: "Unlimited students can join each room with the code or QR. You control when the round starts and ends.",
  },
  {
    icon: QrCode,
    title: "Resource Drop",
    copy: "Upload documents once, choose 7, 14, or 28 days, and show a QR that students can scan to download.",
  },
  {
    icon: BarChart3,
    title: "Real-time leaderboards",
    copy: "Quiz ranks by accuracy and speed. Jigsaw and Connect Dots rank by completion and time - visible to the whole class.",
  },
  {
    icon: FileText,
    title: "Room for polls and more",
    copy: "Quizzes, polls, games, files, and reports belong together as teacher tools instead of scattered one-off pages.",
  },
  {
    icon: MonitorSmartphone,
    title: "Works on any device",
    copy: "Students play or download from phones, tablets, or laptops without installing an app.",
  },
] as const;

export const HOMEPAGE_TESTIMONIALS_SECTION = {
  eyebrow: "Educator feedback",
  title: "Designed for real classrooms",
  description:
    "Teachers use GamiBar for revision sessions, unit reviews, energizers between lectures, and cleaner session follow-up.",
} as const;

export const HOMEPAGE_TESTIMONIALS = [
  {
    quote:
      "I share the room code and the whole cohort is in within a minute. The Connect Dots round keeps even quiet students competing.",
    name: "Dr. Priya Nair",
    role: "Head of Physics, Ashford College",
    image: testimonialPhysics,
    imageAlt: "Physics classroom with students playing a live Connect Dots session",
  },
  {
    quote:
      "It feels like software students already use - not a clunky add-on. The live leaderboard changes the energy in the room immediately.",
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
    question: "Is GamiBar only three games?",
    answer:
      "No. The current app starts with Quiz Challenge, Jigsaw Mission, Connect Dots, and Resource Drop. The workspace is structured so polls, more activity types, and teacher utilities can be added cleanly.",
  },
  {
    question: "Can I use my own questions, images, and documents?",
    answer:
      "Yes. Quiz Challenge uses your multiple-choice bank, Jigsaw Mission uses an image you upload or choose, Connect Dots uses your matching pairs, and Resource Drop accepts PDF, PPT, PPTX, DOC, and DOCX files.",
  },
  {
    question: "Do students need an account to join?",
    answer:
      "No. Students join with the room code and a display name. Accounts are optional if you want learners to track XP and history over time.",
  },
  {
    question: "How long are Resource Drop documents kept?",
    answer:
      "Teachers choose 7, 14, or 28 days during upload. After expiry, the document is treated as inactive and the backend cleanup endpoint can remove the stored copy.",
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
    "Create a room, pick an activity, attach resources, and share the QR before the class loses attention.",
  primaryCta: "Open Teacher Workspace",
  secondaryCta: "Join with Code",
} as const;
