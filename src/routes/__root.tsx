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
import { reportLovableError } from "../lib/lovable-error-reporting";
import { themeInitScript } from "@/lib/theme-store";
import { AmbientBackground } from "@/components/layout/AmbientBackground";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SignatureIntroLoader } from "@/components/layout/SignatureIntroLoader";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { AuthProvider } from "@/lib/auth-store";
import { PlayerProvider } from "@/lib/player-store";
import { SessionProvider } from "@/lib/session-store";
import { ThemeProvider, useTheme } from "@/lib/theme-store";
import { Toaster } from "@/components/ui/sonner";

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
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="max-w-md text-center" role="alert">
        <h1 className="text-xl font-semibold tracking-tight">
          This page didn't load
        </h1>
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
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-border bg-secondary px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "GamiBar - Where Learning Becomes a Game" },
      {
        name: "description",
        content:
          "GamiBar is an award-winning gamified learning platform for schools, universities and corporate training.",
      },
      { name: "author", content: "GamiBar" },
      { property: "og:title", content: "GamiBar - Where Learning Becomes a Game" },
      {
        property: "og:description",
        content:
          "Interactive Quiz Challenge, Jigsaw Mission and Connect Dots - handcrafted learning experience.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@500;600;700&family=Outfit:wght@500;600;700;800;900&display=swap",
      },
      { rel: "icon", href: "/favicon.webp", type: "image/webp" },
      { rel: "apple-touch-icon", href: "/favicon.webp" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
      </head>
      <body className="bg-background font-sans text-foreground antialiased selection:bg-neutral-200 dark:selection:bg-neutral-700">
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
  const isAuthorApp = pathname === "/author" || pathname === "/author/" || pathname.startsWith("/author/");
  const isJoinFlow = pathname === "/join" || pathname === "/join/" || pathname.startsWith("/join/");
  const isPlayFlow = pathname === "/play" || pathname.startsWith("/play/");
  const hideChrome = isAuthPage || isAuthorApp || isJoinFlow || isPlayFlow;
  const showFloatingThemeToggle = isAuthPage || isJoinFlow || isPlayFlow;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <PlayerProvider>
            <SessionProvider>
              <SignatureIntroLoader />
              {!hideChrome && <AmbientBackground />}
              <div className="relative z-0 flex min-h-dvh-screen max-w-[100vw] flex-col overflow-x-clip text-foreground selection:bg-neutral-200 dark:selection:bg-neutral-700">
                {!hideChrome && <SiteHeader />}
                <main className="flex-1">
                  <Outlet />
                </main>
                {!hideChrome && <SiteFooter />}
              </div>
              {showFloatingThemeToggle && (
                <ThemeToggle className="safe-area-inset-top-right fixed z-[60] shadow-[var(--shadow-soft)]" />
              )}
              <ThemedToaster />
            </SessionProvider>
          </PlayerProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
