import {
  BarChart3,
  Blocks,
  CircleDot,
  Crosshair,
  FileDown,
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
  badge: "No more boring classrooms. No more boring sessions.",
  headlinePrefix: "Make every session interactive.",
  headlineAccent: "Turn listeners into participants.",
  lede: "Create a room, share a QR, and bring your classroom, workshop, or presentation to life with games, polls, live answers, rankings, and resources.",
  primaryCta: "Create a room",
  secondaryCta: "Join room",
  image: "",
  video: "",
  imageAlt:
    "Teacher leading an interactive session while participants join and answer from their phones",
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
    accent: "text-[#b91c1c]",
    icon: Timer,
    preview: quizPreview,
    imageAlt: "Quiz Challenge - multiple-choice question with four answers and live ranking",
    cta: "Set Up Quiz",
    href: "/author/create?mode=quiz",
  },
  quiz_jigsaw: {
    tag: "Puzzle quiz",
    tint: "bg-[#EDE9FE]",
    accent: "text-[#5B21B6]",
    icon: Blocks,
    preview: jigsawPreview,
    imageAlt: "Puzzle Quest - quiz questions unlocking puzzle pieces",
    cta: "Set Up Puzzle Quest",
    href: "/author/create",
  },
  polls: {
    tag: "Live feedback",
    tint: "bg-orange-100",
    accent: "text-orange-700",
    icon: Radio,
    preview: pollsPreview,
    imageAlt: "Polls and Surveys - live rating scale, vote bars, and QR response card",
    cta: "Set Up Poll",
    href: "/author/create?mode=polls",
  },
  jigsaw: {
    tag: "Visual puzzle",
    tint: "bg-[var(--game-jigsaw-soft)]",
    accent: "text-[#1d4ed8]",
    icon: Blocks,
    preview: jigsawPreview,
    imageAlt: "Jigsaw Mission - draggable puzzle pieces forming a classroom image",
    cta: "Set Up Jigsaw",
    href: "/author/create?mode=jigsaw",
  },
  connect_dots: {
    tag: "Logic and speed",
    tint: "bg-[var(--game-connect-dots-soft)]",
    accent: "text-[#047857]",
    icon: CircleDot,
    preview: connectDotsPreview,
    imageAlt: "Connect Dots - colored dot pairs linked by paths on a grid",
    cta: "Set Up Connect Dots",
    href: "/author/create?mode=connect_dots",
  },
  visual_point: {
    tag: "Image challenge",
    tint: "bg-[var(--game-visual-point-soft)]",
    accent: "text-[var(--game-visual-point-deep)]",
    icon: Crosshair,
    preview: targetHuntPreview,
    imageAlt: "Target Hunt - image-based prompt with answer dots over a diagram",
    cta: "Set Up Target Hunt",
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
    imageAlt: "Resource Drop - QR file sharing from a host screen to participant phones",
    icon: FileDown,
    tint: "bg-[#F0FDFA]",
    accent: "text-[#0F766E]",
    cta: "Share Resources",
    href: "/author/create",
  },
];

export const HOMEPAGE_GAME_MODES_SECTION = {
  eyebrow: "Live room tools",
  title: "Pick the moment. Launch the right activity.",
  description:
    "Use one room for recall, feedback, visual challenges, matching practice, image hunts, and QR-based resource sharing.",
} as const;

export const HOMEPAGE_JOURNEY_SECTION = {
  eyebrow: "Room flow",
  title: "From quiet room to live participation",
  description:
    "The whole flow is built for hosts who need people joining, answering, voting, playing, and leaving with the right materials.",
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



export const HOMEPAGE_TESTIMONIALS_SECTION = {
  eyebrow: "Session moments",
  title: "Designed for rooms with energy",
  description: "Use GamiBar when the room needs a reason to look up, join in, and respond.",
} as const;

export const HOMEPAGE_TESTIMONIALS = [
  {
    quote:
      "Open a review class with a matching challenge, then use the live leaderboard to see which concepts need another explanation.",
    name: "University review",
    role: "Connect Dots + live ranking",
    image: testimonialPhysics,
    imageAlt: "Physics classroom with participants playing a live Connect Dots session",
  },
  {
    quote:
      "Run a workshop pulse check, let people answer from their phones, and adjust the room before attention starts dropping.",
    name: "Training workshop",
    role: "Polls & Surveys",
    image: testimonialCorporate,
    imageAlt: "Corporate training room with a live leaderboard on display",
  },
  {
    quote:
      "Turn a recap into a quick quiz battle, then share the follow-up slides through the same room QR.",
    name: "Class recap",
    role: "Quiz Challenge + Resource Drop",
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
      "No. The current app includes Quiz Challenge, Polls & Surveys, Jigsaw Mission, Connect Dots, Target Hunt, and Resource Drop for QR-based file sharing.",
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
  title: "Build the next session before the room loses attention",
  description:
    "Create a room, pick an activity, attach resources, and share the QR while the audience is ready to participate.",
  primaryCta: "Create a room",
  secondaryCta: "Join room",
} as const;
