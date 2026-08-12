import {
  BarChart3,
  Blocks,
  CircleDot,
  MonitorSmartphone,
  Timer,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

import connectDotsPreview from "@/assets/game-connect-dots-preview.png";
import jigsawPreview from "@/assets/game-jigsaw-preview.webp";
import quizPreview from "@/assets/game-quiz-preview.webp";
import testimonialCorporate from "@/assets/testimonial-corporate-learning.webp";
import testimonialMath from "@/assets/testimonial-math-classroom.webp";
import testimonialPhysics from "@/assets/testimonial-physics-classroom.webp";
import { CONNECT_DOTS_CONFIG } from "@/lib/connect-dots";
import { GAME_CONFIG, GAME_MODE_META, JIGSAW_GRID, type GameMode } from "@/lib/game/config";

export const HOMEPAGE_SEO = {
  title: "GamiBAR - Live Classroom Game Lobby",
  description:
    "Run live Quiz Challenge, Jigsaw Mission, and Connect Dots sessions with a 6-digit room code - built for classrooms and training rooms.",
  ogTitle: "GamiBAR - Live Classroom Game Lobby",
  ogDescription:
    "Authors create a room, students join instantly, and everyone plays the same round with live rankings.",
} as const;

export const HOMEPAGE_HERO = {
  badge: "GamiBAR · Live Classroom Games",
  headlinePrefix: "Turn Any Lesson Into a",
  headlineAccent: "Live Game.",
  lede:
    "Create a room in minutes, share a 6-digit code, and run synchronized Quiz, Jigsaw, or Connect Dots rounds - with a live leaderboard everyone can see.",
  primaryCta: "Create Room",
  secondaryCta: "Join with Code",
  imageAlt:
    "GamiBAR live classroom - quiz questions, jigsaw puzzle, and connect-dots grid with a live leaderboard",
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
    tag: "Competitive",
    tint: "bg-[var(--game-quiz-soft)]",
    accent: "text-[var(--game-quiz)]",
    icon: Timer,
    preview: quizPreview,
    imageAlt: "Quiz Challenge - multiple-choice question with four answers and live ranking",
    cta: "Explore Quiz",
  },
  jigsaw: {
    tag: "Visual puzzle",
    tint: "bg-[var(--game-jigsaw-soft)]",
    accent: "text-[var(--game-jigsaw)]",
    icon: Blocks,
    preview: jigsawPreview,
    imageAlt: "Jigsaw Mission - draggable puzzle pieces forming a classroom image",
    cta: "Explore Jigsaw",
  },
  connect_dots: {
    tag: "Logic & speed",
    tint: "bg-[var(--game-connect-dots-soft)]",
    accent: "text-[var(--game-connect-dots)]",
    icon: CircleDot,
    preview: connectDotsPreview,
    imageAlt: "Connect Dots - coloured dot pairs linked by paths on a grid",
    cta: "Explore Connect Dots",
  },
};

function gameModeMetaLine(mode: GameMode): string {
  switch (mode) {
    case "quiz":
      return "Unlimited MCQs · Accuracy-first ranking";
    case "jigsaw":
      return `${JIGSAW_GRID.pieceCount} pieces · ${GAME_CONFIG.jigsaw.timeLimitSeconds}s timer`;
    case "connect_dots":
      return `${CONNECT_DOTS_CONFIG.medium.gridSize}×${CONNECT_DOTS_CONFIG.medium.gridSize} grid · ${CONNECT_DOTS_CONFIG.medium.pairCount} pairs`;
  }
}

function gameModeCopy(mode: GameMode): string {
  switch (mode) {
    case "quiz":
      return "Students answer your multiple-choice bank one question at a time. Rankings reward correct answers first, then faster completion.";
    case "jigsaw":
      return "Upload any classroom image. Students drag and rotate pieces to rebuild it before the countdown ends.";
    case "connect_dots":
      return "Everyone receives the same grid. Connect every colour pair without crossing paths - fastest valid finish wins.";
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
  eyebrow: "Game Modes",
  title: "Three ways classes play together",
  description:
    "Pick the activity that fits your lesson - competitive recall, visual reconstruction, or path-finding under time pressure.",
} as const;

export const HOMEPAGE_JOURNEY_SECTION = {
  eyebrow: "How a session works",
  title: "From room code to live results",
  description:
    "Every GamiBAR session follows the same simple loop - whether you are running a quick quiz or a full-class puzzle round.",
} as const;

export const HOMEPAGE_JOURNEY_MILESTONES = [
  {
    title: "01. Create a room & choose a mode",
    desc: "Authors name the session, pick Quiz Challenge, Jigsaw Mission, or Connect Dots, and attach the content students will play.",
    badge: "Author setup",
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
    title: "05. Review results & run again",
    desc: "End the session, discuss outcomes with the class, swap modes, or launch another round from the same lobby.",
    badge: "Session wrap-up",
    icon: Trophy,
  },
] as const;

export const HOMEPAGE_INFRASTRUCTURE_SECTION = {
  eyebrow: "Built for live teaching",
  title: "Everything you need in one lobby",
  description:
    "Room creation, synchronized gameplay, and live rankings - without installing apps or managing server setup.",
} as const;

export const HOMEPAGE_INFRASTRUCTURE_FEATURES = [
  {
    icon: Users,
    title: "Synchronized live sessions",
    copy: "Unlimited students can join each room with the code or QR. You control when the round starts and ends.",
  },
  {
    icon: BarChart3,
    title: "Real-time leaderboards",
    copy: "Quiz ranks by accuracy and speed. Jigsaw and Connect Dots rank by completion and time - visible to the whole class.",
  },
  {
    icon: MonitorSmartphone,
    title: "Works on any device",
    copy: "Students play from phones, tablets, or laptops. Touch and pointer interactions are supported across all three modes.",
  },
] as const;

export const HOMEPAGE_TESTIMONIALS_SECTION = {
  eyebrow: "Educator feedback",
  title: "Designed for real classrooms",
  description:
    "Teachers use GamiBAR for revision sessions, unit reviews, and energizers between lectures.",
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
    question: "Can I use my own questions and images?",
    answer: `Yes. Quiz Challenge uses your multiple-choice bank — add as many questions as you need. Jigsaw Mission uses an image you upload. Connect Dots generates a fair grid puzzle for the difficulty you choose.`,
  },
  {
    question: "Do students need an account to join?",
    answer:
      "No. Students join with the room code and a display name. Accounts are optional if you want learners to track XP and history over time.",
  },
  {
    question: "What does the author see during a session?",
    answer:
      "The author lobby shows who has joined, live leaderboard updates, timer status, and controls to start or end the round.",
  },
  {
    question: "Which devices are supported?",
    answer:
      "Any modern browser on desktop, tablet, or phone. Jigsaw dragging, Connect Dots path drawing, and quiz taps all work with touch and mouse.",
  },
] as const;

export const HOMEPAGE_CTA = {
  title: "Ready for your next live round?",
  description:
    "Create a room, pick a mode, and share the code - your class can be playing in under two minutes.",
  primaryCta: "Create Room",
  secondaryCta: "Join with Code",
} as const;
