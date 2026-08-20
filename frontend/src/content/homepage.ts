import {
  BarChart3,
  Blocks,
  CircleDot,
  Crosshair,
  FileDown,
  GraduationCap,
  MonitorSmartphone,
  QrCode,
  Radio,
  Timer,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

import heroSessionPoster from "@/assets/auth-live-session.webp";
import connectDotsPreview from "@/assets/tool-connect-dots.webp";
import jigsawPreview from "@/assets/tool-jigsaw-mission.webp";
import pollsPreview from "@/assets/tool-polls-survey.webp";
import quizPreview from "@/assets/tool-quiz-battle.webp";
import resourceDropPreview from "@/assets/tool-resource-drop.webp";
import targetHuntPreview from "@/assets/tool-target-hunt.webp";
import testimonialCorporate from "@/assets/testimonial-corporate-learning.webp";
import testimonialMath from "@/assets/testimonial-math-classroom.webp";
import testimonialPhysics from "@/assets/testimonial-physics-classroom.webp";
import { CONNECT_DOTS_CONFIG } from "@/lib/connect-dots";
import { GAME_CONFIG, GAME_MODE_META, JIGSAW_GRID, type GameMode } from "@/lib/game/config";

export const HOMEPAGE_SEO = {
  title: "GamiBar | Make Classrooms and Live Sessions Interactive",
  description:
    "Turn classrooms, workshops, and presentations into interactive live sessions with GamiBar. Create rooms, share a QR, run games and polls, and keep participants involved.",
} as const;

export const HOMEPAGE_HERO = {
  badge: "Play. Learn. Win.",
  participantPrompt: "Joining as a participant?",
  codePlaceholder: "Enter room code",
  headlinePrefix: "Make every session interactive.",
  headlineAccent: "Turn listeners into participants.",
  lede: "Create a room, share a QR, and bring your classroom, workshop, or presentation to life with games, polls, live answers, rankings, and resources.",
  primaryCta: "Create a room",
  secondaryCta: "Join room",
  image: heroSessionPoster,
  imageAlt:
    "Teacher leading an interactive GamiBar session while participants join and answer from their phones",
} as const;

export const HOMEPAGE_HERO_PROOFS = [
  {
    icon: QrCode,
    value: "QR or code",
    label: "People join in seconds",
  },
  {
    icon: Radio,
    value: "Live answers",
    label: "Quizzes, polls, and games",
  },
  {
    icon: MonitorSmartphone,
    value: "Any device",
    label: "No account needed to play",
  },
] as const;

export const HOMEPAGE_PROBLEM_SECTION = {
  eyebrow: "The problem",
  title: "Passive rooms lose energy fast.",
  description:
    "When a session is only slides and speech, the host cannot see who is following, phones become distractions, and useful feedback arrives too late.",
} as const;

export const HOMEPAGE_PROBLEM_POINTS = [
  {
    title: "Questions wait until the end",
    description: "By the time confusion surfaces, the class or workshop has already moved on.",
    icon: Timer,
  },
  {
    title: "Phones pull attention away",
    description:
      "GamiBar turns the same device into the controller for the activity in front of the room.",
    icon: MonitorSmartphone,
  },
  {
    title: "Resources scatter after the session",
    description:
      "One room QR can carry the game, the feedback moment, and the files participants need later.",
    icon: FileDown,
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
    href: string;
  }
> = {
  quiz: {
    tag: "Quick recall",
    tint: "bg-[var(--game-quiz-soft)]",
    accent: "text-[#B91C1C]",
    icon: Timer,
    preview: quizPreview,
    imageAlt: "Quiz Challenge multiple-choice question with four answers and live ranking",
    cta: "Set up quiz",
    href: "/author/create?mode=quiz",
  },
  quiz_jigsaw: {
    tag: "Puzzle quiz",
    tint: "bg-[#EDE9FE]",
    accent: "text-[#5B21B6]",
    icon: Blocks,
    preview: jigsawPreview,
    imageAlt: "Puzzle Quest quiz questions unlocking puzzle pieces",
    cta: "Set up Puzzle Quest",
    href: "/author/create",
  },
  polls: {
    tag: "Live feedback",
    tint: "bg-orange-100",
    accent: "text-orange-700",
    icon: Radio,
    preview: pollsPreview,
    imageAlt: "Polls and Surveys with live rating scale, vote bars, and QR response card",
    cta: "Set up poll",
    href: "/author/create?mode=polls",
  },
  jigsaw: {
    tag: "Visual puzzle",
    tint: "bg-[var(--game-jigsaw-soft)]",
    accent: "text-[#1D4ED8]",
    icon: Blocks,
    preview: jigsawPreview,
    imageAlt: "Jigsaw Mission with draggable puzzle pieces forming a classroom image",
    cta: "Set up jigsaw",
    href: "/author/create?mode=jigsaw",
  },
  connect_dots: {
    tag: "Logic and speed",
    tint: "bg-[var(--game-connect-dots-soft)]",
    accent: "text-[#047857]",
    icon: CircleDot,
    preview: connectDotsPreview,
    imageAlt: "Connect Dots with colored dot pairs linked by paths on a grid",
    cta: "Set up Connect Dots",
    href: "/author/create?mode=connect_dots",
  },
  visual_point: {
    tag: "Image challenge",
    tint: "bg-[var(--game-visual-point-soft)]",
    accent: "text-[var(--game-visual-point-deep)]",
    icon: Crosshair,
    preview: targetHuntPreview,
    imageAlt: "Target Hunt image-based prompt with answer dots over a diagram",
    cta: "Set up Target Hunt",
    href: "/author/create?mode=visual_point",
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

export type HomepageToolCard = {
  id: GameMode | "resource_drop";
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
  href: string;
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
    href: presentation.href,
  } satisfies HomepageToolCard;
});

export const HOMEPAGE_TOOL_WALL: HomepageToolCard[] = [
  ...HOMEPAGE_GAME_MODES,
  {
    id: "resource_drop",
    title: "Resource Drop",
    tag: "QR sharing",
    copy: "Upload presentations, PDFs, and documents once. Participants scan one QR and download the right resource before they leave.",
    meta: "PPT, PDF, DOC - 7, 14, or 28 days",
    image: resourceDropPreview,
    imageAlt: "Resource Drop QR file sharing from a host screen to participant phones",
    icon: FileDown,
    tint: "bg-[#F0FDFA]",
    accent: "text-[#0F766E]",
    cta: "Share resources",
    href: "/author/create",
  },
];

export const HOMEPAGE_GAME_MODES_SECTION = {
  eyebrow: "Play with GamiBar",
  title: "Pick the moment. Launch the right activity.",
  description:
    "Use one room for recall, feedback, visual challenges, matching practice, image hunts, and QR-based resource sharing.",
} as const;

export const HOMEPAGE_JOURNEY_SECTION = {
  eyebrow: "How it works",
  title: "Create, share, play, review.",
  description:
    "The whole flow is built for hosts who need people joining, answering, voting, playing, and leaving with the right materials.",
} as const;

export const HOMEPAGE_JOURNEY_MILESTONES = [
  {
    title: "Create a room",
    desc: "Name the session, pick a tool, attach your content, and prepare files participants can download by QR.",
    badge: "Host setup",
    icon: Zap,
  },
  {
    title: "Participants join",
    desc: `Share a ${GAME_CONFIG.room.codeLength}-digit code or QR link. People enter a nickname - no account required to play.`,
    badge: "Instant join",
    icon: Users,
  },
  {
    title: "Start the round together",
    desc: "When you press Start, every connected device enters the same game state. No one begins early or on a different puzzle.",
    badge: "Synchronized play",
    icon: Timer,
  },
  {
    title: "Watch the live leaderboard",
    desc: "Scores and completion times update in real time on the host screen and participant devices as the round progresses.",
    badge: "Live rankings",
    icon: BarChart3,
  },
  {
    title: "Share resources and review",
    desc: "Use Resource Drop for handouts, then review leaderboard and participation data after the session.",
    badge: "Follow-up",
    icon: Trophy,
  },
] as const;

export const HOMEPAGE_AUDIENCE_SECTION = {
  eyebrow: "For the whole room",
  title: "Built for hosts and participants.",
  description:
    "The host gets control and visibility. Participants get a simple way to join, answer, compete, and leave with the right resources.",
} as const;

export const HOMEPAGE_AUDIENCES = [
  {
    eyebrow: "For educators and facilitators",
    title: "Run the room without fighting the room.",
    description:
      "GamiBar keeps setup lightweight while giving you multiple ways to check understanding, collect feedback, and turn a quiet audience into an active one.",
    image: testimonialPhysics,
    imageAlt: "Educator leading a classroom through an interactive GamiBar session",
    points: [
      "Launch quizzes, polls, puzzles, image hunts, and resource sharing from one workspace.",
      "Use room codes and QR joins instead of account setup during the session.",
      "Watch live answers and rankings while the activity is still happening.",
    ],
  },
  {
    eyebrow: "For learners and participants",
    title: "Join from the phone already in hand.",
    description:
      "Participants do not need a heavy app or long setup. They join, answer, play, see progress, and download the files they need from the same room.",
    image: testimonialMath,
    imageAlt: "Students participating in a live GamiBar quiz from their devices",
    points: [
      "Enter with a code, nickname, or QR link.",
      "Answer, vote, drag, connect, and tap through activities built for touch.",
      "Download shared resources before leaving the room.",
    ],
  },
] as const;

export const HOMEPAGE_FEATURE_SECTION = {
  eyebrow: "Why GamiBar",
  title: "Interactive enough for games. Simple enough for class.",
  description:
    "GamiBar keeps the product story focused: teacher to screen, screen to phones, phones back to live participation.",
} as const;

export const HOMEPAGE_FEATURES = [
  {
    title: "Fast room setup",
    description:
      "Pick a tool, attach your content, and get a shareable room code without building a whole course.",
    icon: QrCode,
  },
  {
    title: "Live participation",
    description: "Answers, votes, progress, and rankings update while the room is still active.",
    icon: Radio,
  },
  {
    title: "Multiple formats",
    description:
      "Switch between quizzes, feedback, matching, image hunts, puzzles, and resource sharing.",
    icon: Blocks,
  },
  {
    title: "Education-first flow",
    description:
      "Designed for classrooms, workshops, and training rooms rather than generic meeting software.",
    icon: GraduationCap,
  },
] as const;

export const HOMEPAGE_TESTIMONIALS_SECTION = {
  eyebrow: "Testimonials",
  title: "What active sessions sound like.",
  description:
    "Representative host feedback for the classroom, workshop, and recap moments GamiBar is built to support.",
} as const;

export const HOMEPAGE_TESTIMONIALS = [
  {
    quote:
      "When I launch a quick quiz, the quiet students join from their phones and I can see where the class is stuck before moving on.",
    name: "Biology instructor",
    role: "Quiz Challenge",
    image: testimonialPhysics,
    imageAlt: "Physics classroom with participants playing a live GamiBar session",
  },
  {
    quote:
      "Polls make the room easier to read. I can change the pace while people are still engaged instead of waiting for feedback later.",
    name: "Training facilitator",
    role: "Polls and Surveys",
    image: testimonialCorporate,
    imageAlt: "Corporate training room with live audience feedback on display",
  },
  {
    quote:
      "Resource Drop solves the end-of-session file chase. The QR stays on the screen, and everyone leaves with the deck.",
    name: "Math lecturer",
    role: "Resource Drop",
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
    question: "Is GamiBar only quizzes?",
    answer:
      "No. The current app includes Quiz Challenge, Polls and Surveys, Jigsaw Mission, Connect Dots, Target Hunt, and Resource Drop for QR-based file sharing.",
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
  title: "Turn the next session into a live room.",
  description:
    "Create a room, pick an activity, attach resources, and share the QR while the audience is ready to participate.",
  primaryCta: "Create a room",
  secondaryCta: "Join room",
} as const;
