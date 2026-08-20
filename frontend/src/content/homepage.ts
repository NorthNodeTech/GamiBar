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


export const HOMEPAGE_TESTIMONIALS_SECTION = {
  eyebrow: "Testimonials",
  title: "What active sessions sound like.",
  description:
    "Representative host feedback for the classroom, workshop, and recap moments GamiBar is built to support.",
} as const;

export const HOMEPAGE_TESTIMONIALS = [
  {
    quote:
      "In a batch of 80 students, usually only the first bench answers. With GamiBar's Quiz Battle projected on screen, everyone joins on their phones and participates actively. The lecture energy is totally different now.",
    name: "Dr. Ramesh Kulkarni",
    role: "Professor, Engineering College (Pune)",
    tag: "Quiz Battle",
    initials: "RK",
  },
  {
    quote:
      "We replaced our boring post-lunch slides with Jigsaw and live Polls. Trainees don't need to download any app—just a quick QR scan from their seats and real-time responses show up on the main screen.",
    name: "Sneha Nambiar",
    role: "L&D Lead, Tech Mahindra (Bengaluru)",
    tag: "Polls & Jigsaw",
    initials: "SN",
  },
  {
    quote:
      "Earlier, sharing class slides and revision sheets via WhatsApp groups was chaotic. With Resource Drop, I keep the QR on the projector at the end of class and all students download the PDF notes instantly.",
    name: "Prof. Arvind Seshadri",
    role: "Faculty, Science & Math Academy (Chennai)",
    tag: "Resource Drop",
    initials: "AS",
  },
] as const;

export const HOMEPAGE_FAQ_SECTION = {
  eyebrow: "FAQ",
  title: "Common questions",
} as const;

export const HOMEPAGE_FAQ = [
  {
    question: "Is GamiBar only quizzes, or are there other activity modes?",
    answer:
      "GamiBar is a full interactive session platform with 6 distinct tool modes: Quiz Battle (rapid-fire timed trivia), Polls & Surveys (live feedback & opinion bars), Jigsaw Mission (gamified puzzle unlocking), Connect Dots (interactive concept matching), Target Hunt (visual diagram labeling & hot-spot discovery), and Resource Drop (instant QR-based lecture file sharing).",
  },
  {
    question: "Do students or participants need to install an app or create an account?",
    answer:
      "No. Participants do not need to download any app or create an account. They simply scan the host's room QR code or type the 6-digit room code into their phone's browser to join instantly with a nickname.",
  },
  {
    question: "How does live synchronization work between host and participants?",
    answer:
      "GamiBar uses high-performance real-time synchronization. When the host changes questions, reveals answers, or starts a puzzle round, all participant phones and the main projector screen update simultaneously with zero latency.",
  },
  {
    question: "Can I upload my own questions, diagrams, images, and lecture decks?",
    answer:
      "Yes. You have complete authoring control: create custom multiple-choice question banks with timers, upload custom images for Jigsaw puzzles, mark custom interactive coordinates for Target Hunt diagrams, set term-definition pairs for Connect Dots, and upload PDF/PPT decks for Resource Drop.",
  },
  {
    question: "How does Resource Drop file sharing work and how long are documents kept?",
    answer:
      "Resource Drop eliminates the hassle of emailing slides or sharing links after class. Hosts upload PDF, PPT, PPTX, DOC, or DOCX files once. Participants scan the room QR to download the files directly. Hosts select 7, 14, or 28-day retention periods, after which files are securely and automatically cleaned up.",
  },
  {
    question: "How do Jigsaw Mission, Connect Dots, and Target Hunt work in live sessions?",
    answer:
      "In Jigsaw Mission, correct answers unlock pieces of a hidden image until the full picture is solved. Connect Dots allows students to drag and connect matching terms on touchscreens. Target Hunt displays an anatomical, map, or mechanical diagram where participants must tap the exact coordinate to answer.",
  },
  {
    question: "Where are participant scores, rankings, and session histories saved?",
    answer:
      "During the activity, live leaderboards with streak bonuses and XP points display on the main screen. After the round ends, full session summaries, response distributions, and participant results are automatically saved in the host's Workspace dashboard for future review.",
  },
  {
    question: "Which devices and browsers are supported?",
    answer:
      "GamiBar is fully responsive and web-based. It runs on any modern browser (Chrome, Safari, Firefox, Edge) across iOS, Android, macOS, Windows, Linux, Chromebooks, and interactive smartboards with full touch and mouse support.",
  },
  {
    question: "How many participants can join a live room at once?",
    answer:
      "GamiBar's architecture is optimized for low-bandwidth environments and high concurrency. It handles everything from small group tutorials (10-20 students) to packed university lecture halls and corporate webinars (hundreds of live participants).",
  },
  {
    question: "Is GamiBar free for teachers, educators, and workshop facilitators?",
    answer:
      "Yes. Educators can register for a free account, create unlimited live rooms, build reusable question templates, and host interactive sessions immediately without any credit card required.",
  },
] as const;

export const HOMEPAGE_CTA = {
  title: "Turn the next session into a live room.",
  description:
    "Create a room, pick an activity, attach resources, and share the QR while the audience is ready to participate.",
  primaryCta: "Create a room",
  secondaryCta: "Join room",
} as const;
