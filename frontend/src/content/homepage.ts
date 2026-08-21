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
import audienceEducators from "@/assets/audience-educators.webp";
import audienceLearners from "@/assets/audience-learners.webp";
import flowStep1 from "@/assets/flow-step-1.webp";
import flowStep2 from "@/assets/flow-step-2.webp";
import flowStep4 from "@/assets/flow-step-4.webp";
import flowStep5 from "@/assets/flow-step-5.webp";
import { CONNECT_DOTS_CONFIG } from "@shared/game/connect-dots";
import { GAME_CONFIG, GAME_MODE_META, JIGSAW_GRID, type GameMode } from "@shared/game/config";

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
  secondaryCta: "Join with scanner",
  image: heroSessionPoster,
  imageAlt:
    "Teacher leading an interactive GamiBar session while participants join and answer from their phones",
} as const;

export const HOMEPAGE_PROBLEM_SECTION = {
  eyebrow: "The problem",
  title: "People are listening. But are they participating?",
  description:
    "Keeping a room engaged is hard. Some people answer, some stay quiet, and some are already checking their phones. GamiBar gives the whole room a way to take part.",
} as const;

export const HOMEPAGE_PROBLEM_POINTS = [
  {
    title: "Questions get lost",
    description: "Not everyone wants to raise their hand. Ask the room and get answers instantly.",
    icon: Users,
  },
  {
    title: "Phones can help",
    description:
      "Instead of asking people to put their phones away, give them something useful to do with them.",
    icon: MonitorSmartphone,
  },
  {
    title: "Sharing takes too many steps",
    description:
      "Skip the links, emails and WhatsApp messages. Show one QR and let everyone download what they need.",
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
    image: flowStep1,
    imageAlt: "Educator setting up a live interactive session on laptop",
  },
  {
    title: "Participants join",
    desc: `Share a ${GAME_CONFIG.room.codeLength}-digit code or QR link. People enter a nickname - no account, subscription, or payment required to play.`,
    badge: "Instant join",
    icon: Users,
    image: flowStep2,
    imageAlt: "Students in classroom scanning QR code to join live room",
  },
  {
    title: "Watch the live leaderboard",
    desc: "Scores and completion times update in real time on the host screen and participant devices as the round progresses.",
    badge: "Live rankings",
    icon: BarChart3,
    image: flowStep4,
    imageAlt: "Live ranking board on auditorium screen with cheering students",
  },
  {
    title: "Celebrate winners & podium",
    desc: "Crown top performers on the live podium, award XP bonuses for streaks, and review final game stats.",
    badge: "Winners podium",
    icon: Trophy,
    image: flowStep5,
    imageAlt: "Celebration podium stage with trophies and confetti",
  },
] as const;

export const HOMEPAGE_AUDIENCE_SECTION = {
  eyebrow: "For the whole room",
  title: "For the person running the room. And everyone in it.",
  description:
    "Whether you're teaching a class, running a workshop, or speaking to a room, GamiBar gives the host the tools to keep everyone involved.",
} as const;

export const HOMEPAGE_AUDIENCES = [
  {
    eyebrow: "For educators and facilitators",
    title: "Keep the room involved.",
    description:
      "GamiBar gives you simple ways to ask questions, run games, collect feedback, and share resources — without jumping between different tools.",
    image: audienceEducators,
    imageAlt: "Educator leading a classroom through an interactive GamiBar session",
    points: [
      "Start a quiz, poll, game, or file share from one place.",
      "Let everyone join with a room code or QR.",
      "See answers and results while the session is still going.",
    ],
  },
  {
    eyebrow: "For learners and participants",
    title: "Just scan. Join. Play.",
    description:
      "No app, account, subscription, or payment is needed. Participants join from the phone already in their hand and can answer, vote, play, and get the resources they need.",
    image: audienceLearners,
    imageAlt: "Students participating in a live GamiBar quiz from their devices",
    points: [
      "Join with a room code, nickname, or QR.",
      "Answer questions, vote, connect, and play from your phone.",
      "Get shared files before you leave the room.",
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
      "GamiBar is a complete interactive session platform with 6 distinct tool modes: Quiz Battle (timed multiple-choice), Live Polls (real-time opinion distributions), Jigsaw Mission (gamified image puzzle challenges), Connect Dots (interactive concept matching), Target Hunt (visual hotspot discovery), and QRFile (instant QR-based lecture file sharing).",
  },
  {
    question: "Do students or participants need to install an app or create an account?",
    answer:
      "No. Joining and playing are always free. Participants do not need an app, account, or login. They simply scan your room QR code or enter the 6-digit room code on their phone browser to join instantly with a nickname.",
  },
  {
    question: "Can I upload my own questions, diagrams, images, and lecture files?",
    answer:
      "Yes. You have full authoring control: create multiple-choice question banks with timers, upload diagrams for Target Hunt and Jigsaw puzzles, configure term pairs for Connect Dots, and upload PDF or PPT slide decks for QR downloads.",
  },
  {
    question: "How does QRFile file sharing work and how long are documents kept?",
    answer:
      "QRFile lets you upload presentations, worksheets, or lecture handouts once. A live QR code is generated so your audience can download files instantly. You can choose retention periods from 7 to 28 days, after which files are securely cleaned up.",
  },
  {
    question: "Which devices and browsers are supported?",
    answer:
      "GamiBar is 100% web-based and responsive. It works seamlessly across iOS, Android, macOS, Windows, Linux, Chromebooks, and interactive touch smartboards on all modern browsers (Chrome, Safari, Edge, Firefox).",
  },
  {
    question: "Is GamiBar free for teachers, educators, and workshop facilitators?",
    answer:
      "Yes. You can register for a free account, create live rooms, build custom question templates, and host interactive sessions immediately without a credit card.",
  },
] as const;

export const HOMEPAGE_CTA = {
  title: "Turn the next session into a live room.",
  description:
    "Create a room, pick an activity, attach resources, and share the QR while the audience is ready to participate.",
  primaryCta: "Create a room",
  secondaryCta: "Join room",
} as const;
