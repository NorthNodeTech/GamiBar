export const SITE_NAME = "GamiBar";
export const SITE_URL = "https://gamibar.com";
export const DEFAULT_SOCIAL_IMAGE = `${SITE_URL}/og-gamibar.jpg`;

export const DEFAULT_SEO_DESCRIPTION =
  "GamiBar is a live gamified learning platform for interactive classrooms and training sessions. Create quizzes, jigsaw missions, and connect-the-dots games that participants join with a room code.";

type RouteSeo = {
  title: string;
  description: string;
  noIndex: boolean;
};

const PRIVATE_ROUTE_SEO: Record<string, Omit<RouteSeo, "noIndex">> = {
  "/author": {
    title: "Author Dashboard | GamiBar",
    description:
      "Create and manage live GamiBar classroom games, sessions, questions, and results.",
  },
  "/author/achievements": {
    title: "Author Achievements | GamiBar",
    description: "View achievements earned while creating and hosting GamiBar learning sessions.",
  },
  "/author/create": {
    title: "Create a Live Classroom Game | GamiBar",
    description:
      "Build a GamiBar quiz, jigsaw mission, or connect-the-dots session for your class.",
  },
  "/author/login": {
    title: "Author Sign In | GamiBar",
    description: "Sign in to create, host, and review live GamiBar classroom sessions.",
  },
  "/author/participated": {
    title: "Participated Games | GamiBar",
    description: "Review the GamiBar sessions in which you have participated.",
  },
  "/author/questions": {
    title: "Question Bank | GamiBar",
    description: "Create and manage reusable question sets for GamiBar quiz sessions.",
  },
  "/author/register": {
    title: "Create an Author Account | GamiBar",
    description: "Create a GamiBar author account to build and host live classroom games.",
  },
  "/author/reports": {
    title: "Session Reports | GamiBar",
    description: "Review participation and performance reports from GamiBar sessions.",
  },
  "/author/sessions": {
    title: "My Games and Sessions | GamiBar",
    description: "Manage your saved GamiBar games, live sessions, and completed activities.",
  },
  "/author/templates": {
    title: "Classroom Game Templates | GamiBar",
    description:
      "Browse reusable GamiBar templates for quizzes, revision, and classroom activities.",
  },
  "/dashboard": {
    title: "Student Dashboard | GamiBar",
    description: "Track your GamiBar XP, progress, streaks, achievements, and recent games.",
  },
  "/forgot-password": {
    title: "Reset Password | GamiBar",
    description: "Request a secure password reset link for your GamiBar account.",
  },
  "/join/lobby": {
    title: "Game Lobby | GamiBar",
    description: "Wait in the GamiBar lobby until the session author starts the live game.",
  },
  "/join/name": {
    title: "Choose Your Player Name | GamiBar",
    description: "Choose the display name you will use in a live GamiBar classroom game.",
  },
  "/leaderboard": {
    title: "Player Leaderboard | GamiBar",
    description: "View player XP, levels, accuracy, and rankings in GamiBar.",
  },
  "/login": {
    title: "Sign In | GamiBar",
    description: "Sign in to your GamiBar account.",
  },
  "/profile": {
    title: "Player Profile | GamiBar",
    description: "View your GamiBar XP, level, accuracy, achievements, and game history.",
  },
  "/register": {
    title: "Create an Account | GamiBar",
    description: "Create a GamiBar account to track learning game progress.",
  },
  "/settings": {
    title: "Account Settings | GamiBar",
    description: "Manage your GamiBar account, appearance, audio, and gameplay preferences.",
  },
};

const PUBLIC_ROUTE_SEO: Record<string, Omit<RouteSeo, "noIndex">> = {
  "/": {
    title: "GamiBar | Live Classroom Games, Quizzes & Activities",
    description:
      "Create interactive classroom games with GamiBar. Run live quizzes, jigsaw missions, and connect-the-dots activities that students join with a room code.",
  },
  "/games": {
    title: "Interactive Classroom Game Modes | GamiBar",
    description:
      "Explore GamiBar live classroom games: Quiz Challenge for recall, Jigsaw Mission for visual learning, and Connect Dots for logic and speed.",
  },
  "/games/connect-dots": {
    title: "Connect Dots Classroom Game | GamiBar",
    description:
      "Challenge a class with the same live connect-the-dots logic board. Participants connect matching colors and race for a valid finish in GamiBar.",
  },
  "/games/jigsaw": {
    title: "Jigsaw Classroom Game | GamiBar",
    description:
      "Turn a classroom image into a live timed jigsaw mission. Students answer, reconstruct the visual puzzle, and compare results in GamiBar.",
  },
  "/games/quiz": {
    title: "Live Classroom Quiz Game | GamiBar",
    description:
      "Run a live multiple-choice classroom quiz with instant feedback, streaks, and rankings. Create a GamiBar room and let students join by code.",
  },
  "/join": {
    title: "Join a Live Classroom Game | GamiBar",
    description:
      "Join a GamiBar classroom game from any phone, tablet, or computer. Enter the six-digit room code or scan the session QR code to begin.",
  },
};

export function getRouteSeo(pathname: string): RouteSeo {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  const publicRoute = PUBLIC_ROUTE_SEO[normalizedPath];
  if (publicRoute) return { ...publicRoute, noIndex: false };

  const privateRoute = PRIVATE_ROUTE_SEO[normalizedPath];
  if (privateRoute) return { ...privateRoute, noIndex: true };

  if (/^\/author\/room\/[^/]+$/.test(normalizedPath)) {
    return {
      title: "Live Author Room | GamiBar",
      description: "Host and control a live GamiBar classroom game.",
      noIndex: true,
    };
  }
  if (/^\/author\/sessions\/[^/]+$/.test(normalizedPath)) {
    return {
      title: "Session Results | GamiBar",
      description: "Review results for a completed GamiBar classroom game.",
      noIndex: true,
    };
  }
  if (/^\/play\/[^/]+$/.test(normalizedPath)) {
    return {
      title: "Live Game | GamiBar",
      description: "Play a live GamiBar classroom activity from your connected device.",
      noIndex: true,
    };
  }

  return {
    title: "Page Not Found | GamiBar",
    description: "The requested GamiBar page could not be found.",
    noIndex: true,
  };
}

type SeoOptions = {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
  image?: string;
  type?: "website" | "article";
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
};

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path === "/" ? "" : `/${path.replace(/^\/+|\/+$/g, "")}`;
  return `${SITE_URL}${normalizedPath}`;
}

export function createSeoHead({
  title,
  description,
  path,
  noIndex = false,
  image = DEFAULT_SOCIAL_IMAGE,
  type = "website",
  jsonLd,
}: SeoOptions) {
  const canonicalUrl = absoluteUrl(path);
  const socialImage = absoluteUrl(image);
  const robots = noIndex
    ? "noindex, nofollow, noarchive"
    : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: robots },
      { name: "googlebot", content: robots },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:locale", content: "en_US" },
      { property: "og:type", content: type },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: canonicalUrl },
      { property: "og:image", content: socialImage },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "GamiBar live classroom games with quizzes, puzzles, and real-time participation",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: socialImage },
      {
        name: "twitter:image:alt",
        content: "GamiBar live classroom games with quizzes, puzzles, and real-time participation",
      },
      ...(jsonLd ? [{ "script:ld+json": jsonLd }] : []),
    ],
  };
}

export function createNoIndexHead(title: string, description: string, path: string) {
  return createSeoHead({ title, description, path, noIndex: true });
}

export function createBreadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function createWebPageJsonLd({
  title,
  description,
  path,
  breadcrumbs,
}: {
  title: string;
  description: string;
  path: string;
  breadcrumbs: Array<{ name: string; path: string }>;
}) {
  const url = absoluteUrl(path);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: title,
        description,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#software` },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        inLanguage: "en-US",
      },
      {
        ...createBreadcrumbJsonLd(breadcrumbs),
        "@id": `${url}#breadcrumb`,
      },
    ],
  };
}
