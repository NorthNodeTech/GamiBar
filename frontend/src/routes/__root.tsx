import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { themeInitScript } from "@/lib/theme-store";
import { AmbientBackground } from "@/components/layout/AmbientBackground";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ScrollManager } from "@/components/layout/ScrollManager";
import { SignatureIntroLoader } from "@/components/layout/SignatureIntroLoader";
import { AuthProvider } from "@/lib/auth-store";
import { PlayerProvider } from "@/lib/player-store";
import { SessionProvider } from "@/lib/session-store";
import { ThemeProvider, useTheme } from "@/lib/theme-store";
import { Toaster } from "@/components/ui/sonner";
import { AnalyticsHeadScripts, AnalyticsPageView } from "@/components/analytics/Analytics";
import { googleAnalyticsId, microsoftClarityId } from "@/lib/analytics-config";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE, getRouteSeo } from "@/lib/seo";

const verificationToken = (value: string | undefined) => {
  const token = value?.trim();
  return token && /^[A-Za-z0-9_-]+$/.test(token) ? token : undefined;
};

const googleSiteVerification = verificationToken(import.meta.env.VITE_GOOGLE_SITE_VERIFICATION);
const bingSiteVerification = verificationToken(import.meta.env.VITE_BING_SITE_VERIFICATION);

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-[#111111] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#000000]"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="max-w-md text-center" role="alert">
        <h1 className="text-xl font-semibold tracking-tight">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-[#111111] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#000000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
          >
            Try again
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full border border-border bg-secondary px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: ({ matches }) => {
    const pathname = matches.at(-1)?.pathname ?? "/";
    const seo = getRouteSeo(pathname);
    const canonicalUrl = absoluteUrl(pathname);
    const robots = seo.noIndex
      ? "noindex, nofollow, noarchive"
      : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
        { title: seo.title },
        { name: "description", content: seo.description },
        { name: "author", content: "GamiBar" },
        { name: "application-name", content: "GamiBar" },
        { name: "theme-color", content: "#ef4444" },
        { name: "format-detection", content: "telephone=no" },
        { name: "robots", content: robots },
        { name: "googlebot", content: robots },
        { property: "og:site_name", content: "GamiBar" },
        { property: "og:locale", content: "en_US" },
        { property: "og:title", content: seo.title },
        { property: "og:description", content: seo.description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonicalUrl },
        { property: "og:image", content: DEFAULT_SOCIAL_IMAGE },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        {
          property: "og:image:alt",
          content:
            "GamiBar live classroom games with quizzes, puzzles, and real-time participation",
        },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: seo.title },
        { name: "twitter:description", content: seo.description },
        { name: "twitter:image", content: DEFAULT_SOCIAL_IMAGE },
        {
          name: "twitter:image:alt",
          content:
            "GamiBar live classroom games with quizzes, puzzles, and real-time participation",
        },
        ...(googleSiteVerification
          ? [{ name: "google-site-verification", content: googleSiteVerification }]
          : []),
        ...(bingSiteVerification ? [{ name: "msvalidate.01", content: bingSiteVerification }] : []),
      ],
      links: [
        {
          rel: "stylesheet",
          href: appCss,
        },
        { rel: "dns-prefetch", href: "https://twluyjazkesmrnvlcvtd.supabase.co" },
        ...(googleAnalyticsId
          ? [
              { rel: "preconnect", href: "https://www.googletagmanager.com" },
              { rel: "dns-prefetch", href: "https://www.google-analytics.com" },
            ]
          : []),
        ...(microsoftClarityId ? [{ rel: "dns-prefetch", href: "https://www.clarity.ms" }] : []),
        { rel: "icon", href: "/favicon.ico", sizes: "any" },
        { rel: "icon", href: "/favicon.webp", type: "image/webp" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
        { rel: "manifest", href: "/site.webmanifest" },
        { rel: "canonical", href: canonicalUrl },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const combinedHeadScript = `${themeInitScript};if("scrollRestoration" in history){try{history.scrollRestoration="manual";}catch(e){}}if(!location.hash){try{window.scrollTo(0,0);}catch(e){}}`;

  return (
    <html lang="en" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: combinedHeadScript }}
        />
        <AnalyticsHeadScripts />
        <HeadContent />
      </head>
      <body
        suppressHydrationWarning
        className="bg-background font-sans text-foreground antialiased selection:bg-neutral-200 dark:selection:bg-neutral-700"
      >
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme} />;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/author/login" ||
    pathname === "/author/register";
  const isAuthorApp =
    pathname === "/author" || pathname === "/author/" || pathname.startsWith("/author/");
  const isJoinFlow = pathname === "/join" || pathname === "/join/" || pathname.startsWith("/join/");
  const isPlayFlow = pathname === "/play" || pathname.startsWith("/play/");
  const isShareFlow = pathname === "/share" || pathname.startsWith("/share/");
  const hideChrome = isAuthPage || isAuthorApp || isJoinFlow || isPlayFlow || isShareFlow;
  const needsRemoteAuth =
    isAuthPage ||
    isAuthorApp ||
    pathname === "/dashboard" ||
    pathname === "/profile" ||
    pathname === "/settings";

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider syncRemote={needsRemoteAuth}>
          <PlayerProvider>
            <SessionProvider>
              <ScrollManager />
              <AnalyticsPageView />
              <SignatureIntroLoader />
              {!hideChrome && <AmbientBackground />}
              <div className="relative z-0 flex min-h-dvh-screen max-w-[100vw] flex-col overflow-x-clip text-foreground selection:bg-neutral-200 dark:selection:bg-neutral-700">
                {!hideChrome && <SiteHeader />}
                <main className="flex-1">
                  <Outlet />
                </main>
                {!hideChrome && <SiteFooter />}
              </div>
              <ThemedToaster />
            </SessionProvider>
          </PlayerProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
