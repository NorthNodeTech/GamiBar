import { lazy, Suspense, useEffect, type ErrorInfo, type ReactNode } from "react";
import React from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";

import { AnalyticsHeadScripts, AnalyticsPageView } from "@/components/analytics/Analytics";
import { AmbientBackground } from "@/components/layout/AmbientBackground";
import { ScrollManager } from "@/components/layout/ScrollManager";
import { SignatureIntroLoader } from "@/components/layout/SignatureIntroLoader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PageLoader } from "@/components/ui/async-state";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, sanitizeAuthorRedirect, useAuth } from "@/lib/auth-store";
import { warmApi } from "@/lib/api-client";
import { Link } from "@/lib/navigation";
import { PlayerProvider } from "@/lib/player-store";
import { QueryProvider } from "@/lib/query";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE, getRouteSeo } from "@/lib/seo";
import { ThemeProvider, useTheme } from "@/lib/theme-store";

const HomePage = lazy(() => import("@/pages/HomePage"));
const GamesPage = lazy(() => import("@/pages/GamesPage"));
const QuizGamePage = lazy(() => import("@/pages/QuizGamePage"));
const JigsawGamePage = lazy(() => import("@/pages/JigsawGamePage"));
const ConnectDotsGamePage = lazy(() => import("@/pages/ConnectDotsGamePage"));
const JoinPage = lazy(() => import("@/pages/JoinPage"));
const PlayerNamePage = lazy(() => import("@/pages/PlayerNamePage"));
const PlayerLobbyPage = lazy(() => import("@/pages/PlayerLobbyPage"));
const PlayerGamePage = lazy(() => import("@/pages/PlayerGamePage"));
const SharedFilesPage = lazy(() => import("@/pages/SharedFilesPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const UpdatePasswordPage = lazy(() => import("@/pages/UpdatePasswordPage"));
const TeacherLoginPage = lazy(() => import("@/pages/TeacherLoginPage"));
const TeacherRegisterPage = lazy(() => import("@/pages/TeacherRegisterPage"));
const TeacherDashboardPage = lazy(() => import("@/pages/TeacherDashboardPage"));
const CreateSessionPage = lazy(() => import("@/pages/CreateSessionPage"));
const TeacherToolsPage = lazy(() => import("@/pages/TeacherToolsPage"));
const TeacherSessionsPage = lazy(() => import("@/pages/TeacherSessionsPage"));
const SessionResultsPage = lazy(() => import("@/pages/SessionResultsPage"));
const LiveSessionPage = lazy(() => import("@/pages/LiveSessionPage"));
const QuestionBankPage = lazy(() => import("@/pages/QuestionBankPage"));
const ParticipatedGamesPage = lazy(() => import("@/pages/ParticipatedGamesPage"));
const AchievementsPage = lazy(() => import("@/pages/AchievementsPage"));
const TemplatesPage = lazy(() => import("@/pages/TemplatesPage"));
const QRFilePage = lazy(() => import("@/pages/QRFilePage"));
const PricingPage = lazy(() => import("@/pages/PricingPage"));
const BillingPage = lazy(() => import("@/pages/BillingPage"));
const TermsPage = lazy(() => import("@/pages/legal/TermsPage"));
const PrivacyPage = lazy(() => import("@/pages/legal/PrivacyPage"));
const RefundPolicyPage = lazy(() => import("@/pages/legal/RefundPolicyPage"));
const ContactPage = lazy(() => import("@/pages/legal/ContactPage"));
const PlayerPortalLayout = lazy(() => import("@/layouts/PlayerPortalLayout"));

export default function App() {
  return (
    <BrowserRouter>
      <AnalyticsHeadScripts />
      <AppErrorReset>
        <AppProviders>
          <AppRoutes />
        </AppProviders>
      </AppErrorReset>
    </BrowserRouter>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader message="Loading GamiBar..." />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="games" element={<GamesPage />} />
          <Route path="games/quiz" element={<QuizGamePage />} />
          <Route path="games/jigsaw" element={<JigsawGamePage />} />
          <Route path="games/connect-dots" element={<ConnectDotsGamePage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="refund-policy" element={<RefundPolicyPage />} />
          <Route path="contact" element={<ContactPage />} />
        </Route>

        <Route path="qr-file" element={<Navigate to="/author/qr-file" replace />} />

        <Route path="join" element={<PlayerPortalLayout />}>
          <Route index element={<JoinPage />} />
          <Route path="name" element={<PlayerNamePage />} />
          <Route path="lobby" element={<PlayerLobbyPage />} />
        </Route>
        <Route path="play/:roomId" element={<PlayerGamePage />} />
        <Route path="share/:shareSlug" element={<SharedFilesPage />} />
        <Route path="resource-drop" element={<Navigate to="/qr-file" replace />} />

        <Route element={<RequireSignedOutAuthor />}>
          <Route path="author/login" element={<TeacherLoginPage />} />
          <Route path="author/register" element={<TeacherRegisterPage />} />
        </Route>
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="update-password" element={<UpdatePasswordPage />} />
        <Route path="author" element={<RequireAuthor />}>
          <Route index element={<TeacherDashboardPage />} />
          <Route path="create" element={<CreateSessionPage />} />
          <Route path="tools" element={<TeacherToolsPage />} />
          <Route path="qr-file" element={<QRFilePage />} />
          <Route path="sessions" element={<TeacherSessionsPage />} />
          <Route path="sessions/:roomId" element={<SessionResultsPage />} />
          <Route path="room/:roomId" element={<LiveSessionPage />} />
          <Route path="questions" element={<QuestionBankPage />} />
          <Route path="participated" element={<ParticipatedGamesPage />} />
          <Route path="achievements" element={<AchievementsPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="billing" element={<BillingPage />} />
        </Route>

        <Route path="login" element={<Navigate to="/author/login" replace />} />
        <Route path="register" element={<Navigate to="/join" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

function AppProviders({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const syncRemote =
    pathname === "/forgot-password" ||
    pathname === "/update-password" ||
    pathname === "/author/login" ||
    pathname === "/author/register" ||
    pathname === "/author" ||
    pathname.startsWith("/author/");
  const needsApi =
    syncRemote ||
    pathname === "/join" ||
    pathname.startsWith("/join/") ||
    pathname.startsWith("/play/") ||
    pathname.startsWith("/share/");

  useEffect(() => {
    if (needsApi) void warmApi();
  }, [needsApi]);

  return (
    <QueryProvider>
      <ThemeProvider>
        <AuthProvider key={syncRemote ? "trusted" : "local"} syncRemote={syncRemote}>
          <PlayerProvider>
            <RouteMetadata />
            <ScrollManager />
            <AnalyticsPageView />
            <SignatureIntroLoader />
            {children}
            <ThemedToaster />
          </PlayerProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}

function PublicLayout() {
  return (
    <>
      <AmbientBackground />
      <div className="relative z-0 flex min-h-dvh-screen max-w-[100vw] flex-col overflow-x-clip text-foreground selection:bg-neutral-200 dark:selection:bg-neutral-700">
        <SiteHeader />
        <main className="flex-1">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
    </>
  );
}

function RequireAuthor() {
  const location = useLocation();
  const { isAuthor, loading } = useAuth();
  if (loading) return <PageLoader message="Checking your secure session..." />;
  if (isAuthor) return <Outlet />;
  const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
  return <Navigate to={`/author/login?redirect=${redirect}`} replace />;
}

function RequireSignedOutAuthor() {
  const location = useLocation();
  const { isAuthor, loading } = useAuth();
  if (loading) return <PageLoader message="Checking your secure session..." />;
  if (!isAuthor) return <Outlet />;
  const redirect = new URLSearchParams(location.search).get("redirect") ?? undefined;
  return <Navigate to={sanitizeAuthorRedirect(redirect)} replace />;
}

function RouteMetadata() {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = getRouteSeo(pathname);
    const canonical = absoluteUrl(pathname);
    const robots = seo.noIndex
      ? "noindex, nofollow, noarchive"
      : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

    document.title = seo.title;
    setMeta("name", "description", seo.description);
    setMeta("name", "robots", robots);
    setMeta("name", "googlebot", robots);
    setMeta("property", "og:title", seo.title);
    setMeta("property", "og:description", seo.description);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:url", canonical);
    setMeta("property", "og:image", DEFAULT_SOCIAL_IMAGE);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", seo.title);
    setMeta("name", "twitter:description", seo.description);
    setMeta("name", "twitter:image", DEFAULT_SOCIAL_IMAGE);
    setLink("canonical", canonical);
  }, [pathname]);

  return null;
}

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.append(element);
  }
  element.content = content;
}

function setLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    document.head.append(element);
  }
  element.href = href;
}

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme} />;
}

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-[#111111] px-5 py-2 text-sm font-semibold text-white"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

class AppErrorBoundary extends React.Component<{ children: ReactNode }, { error: Error | null }> {
  override state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="max-w-md text-center" role="alert">
          <h1 className="text-xl font-semibold">This page didn't load</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Something went wrong. Refresh this page or return home.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full bg-[#111111] px-5 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
            <a href="/" className="rounded-full border border-border px-5 py-2 text-sm font-medium">
              Go home
            </a>
          </div>
        </div>
      </div>
    );
  }
}

function AppErrorReset({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <AppErrorBoundary key={`${location.pathname}${location.search}`}>{children}</AppErrorBoundary>
  );
}
