import { Link, useNavigate } from "@/lib/navigation";
import { useMutation, useQuery } from "@/lib/query";
import {
  ArrowRight,
  Blocks,
  CircleDot,
  ClipboardList,
  Crosshair,
  FileUp,
  Loader2,
  Plus,
  Radio,
  ScanLine,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import gameConnectDotsPreview from "@/assets/tool-connect-dots.webp";
import gameJigsawPreview from "@/assets/tool-jigsaw-mission.webp";
import gamePollsPreview from "@/assets/tool-polls-survey.webp";
import gameQuizPreview from "@/assets/tool-quiz-battle.webp";
import gameTargetHuntPreview from "@/assets/tool-target-hunt.webp";
import resourceDropPreview from "@/assets/tool-resource-drop.webp";
import { AuthorShell } from "@/components/layout/AuthorShell";
import { Button } from "@/components/ui/button";
import { InlineErrorBanner } from "@/components/ui/async-state";
import { useAuth } from "@/lib/auth-store";
import { saveAuthorRoom } from "@/lib/game/client-session";
import { GAME_MODE_META, type GameMode } from "@shared/game/config";
import { claimAuthorSessionFn } from "@/lib/game/room.functions";
import type { CoreLiveGameMode } from "@shared/game/session-flow";
import { fetchAuthorSessions, type AuthorSessionSummary } from "@/lib/supabase/author-sessions";
import { cn } from "@/lib/utils";

type DashboardTool = {
  id: string;
  title: string;
  description: string;
  image?: string;
  imageAlt: string;
  icon: LucideIcon;
  mode?: CoreLiveGameMode;
  to?: "/author/create" | "/qr-file";
};

const quickStartTools: DashboardTool[] = [
  {
    id: "quiz",
    title: "Quiz Battle",
    description: "Live MCQs and rankings.",
    image: gameQuizPreview,
    imageAlt: "Quiz Battle game artwork with quiz questions and competition UI",
    icon: ClipboardList,
    mode: "quiz",
  },
  {
    id: "polls",
    title: "Polls",
    description: "Votes, ratings, and feedback.",
    image: gamePollsPreview,
    imageAlt: "Polls game artwork with response cards and result bars",
    icon: Radio,
    mode: "polls",
  },
  {
    id: "jigsaw",
    title: "Jigsaw Mission",
    description: "Unlock pieces and rebuild images.",
    image: gameJigsawPreview,
    imageAlt: "Jigsaw Mission artwork with puzzle pieces and classroom image reconstruction",
    icon: Blocks,
    mode: "jigsaw",
  },
  {
    id: "connect_dots",
    title: "Connect Dots",
    description: "Match concepts with paths.",
    image: gameConnectDotsPreview,
    imageAlt: "Connect Dots artwork with connected nodes and matching paths",
    icon: CircleDot,
    mode: "connect_dots",
  },
  {
    id: "visual_point",
    title: "Target Hunt",
    description: "Find the right point on an image.",
    image: gameTargetHuntPreview,
    imageAlt: "Target Hunt image challenge with target points",
    icon: Crosshair,
    mode: "visual_point",
  },
  {
    id: "resource_drop",
    title: "Resource Drop",
    description: "Share files through a QR code.",
    image: resourceDropPreview,
    imageAlt: "Resource Drop artwork with documents and a QR sharing flow",
    icon: FileUp,
    to: "/qr-file",
  },
];

const modeVisuals: Record<
  GameMode,
  {
    title: string;
    image?: string;
    imageAlt: string;
    icon: LucideIcon;
  }
> = {
  quiz: {
    title: "Quiz Battle",
    image: gameQuizPreview,
    imageAlt: "Quiz Battle thumbnail",
    icon: ClipboardList,
  },
  quiz_jigsaw: {
    title: "Puzzle Quest",
    image: gameJigsawPreview,
    imageAlt: "Puzzle Quest thumbnail",
    icon: Blocks,
  },
  polls: {
    title: "Polls",
    image: gamePollsPreview,
    imageAlt: "Polls thumbnail",
    icon: Radio,
  },
  jigsaw: {
    title: "Jigsaw Mission",
    image: gameJigsawPreview,
    imageAlt: "Jigsaw Mission thumbnail",
    icon: Blocks,
  },
  connect_dots: {
    title: "Connect Dots",
    image: gameConnectDotsPreview,
    imageAlt: "Connect Dots thumbnail",
    icon: CircleDot,
  },
  visual_point: {
    title: "Target Hunt",
    image: gameTargetHuntPreview,
    imageAlt: "Target Hunt thumbnail",
    icon: Crosshair,
  },
};

const activeStatuses = new Set(["DRAFT", "LOBBY", "READY", "COUNTDOWN", "LIVE"]);

const statusLabel: Record<string, string> = {
  DRAFT: "Draft",
  LOBBY: "Lobby",
  READY: "Ready",
  COUNTDOWN: "Starting",
  LIVE: "Live",
  FINISHED: "Finished",
  CANCELLED: "Cancelled",
};

export default function AuthorHome() {
  const navigate = useNavigate();
  const { user, isAuthor, loading: authLoading } = useAuth();

  const sessionsQuery = useQuery({
    queryKey: ["author-home-sessions", user?.id],
    enabled: isAuthor && Boolean(user?.id),
    queryFn: () => fetchAuthorSessions(user!.id, 8),
    retry: false,
  });

  const openLiveMutation = useMutation({
    mutationFn: async (session: AuthorSessionSummary) => {
      const res = await claimAuthorSessionFn({
        data: { roomId: session.id, authorId: user!.id },
      });
      if (!res.ok) throw new Error(res.error);
      return { session, res };
    },
    onSuccess: ({ session, res }) => {
      saveAuthorRoom({
        roomId: session.id,
        code: res.room.code,
        authorToken: res.authorToken,
      });
      navigate({ to: "/author/room/$roomId", params: { roomId: session.id } });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);
  const activeRooms = useMemo(
    () => sessions.filter((session) => isActiveSession(session.status)).slice(0, 3),
    [sessions],
  );
  const recentSessions = sessions.slice(0, 5);
  const isLoadingSessions = authLoading || sessionsQuery.isLoading;
  const busyRoomId = openLiveMutation.isPending ? openLiveMutation.variables?.id : null;
  const activity = useMemo(
    () => getActivitySummary(sessions, activeRooms.length),
    [activeRooms.length, sessions],
  );

  const openCreateWithMode = (mode: CoreLiveGameMode) => {
    navigate({ to: "/author/create", search: { mode } });
  };

  return (
    <AuthorShell>
      <div className="mx-auto w-full max-w-[76rem] py-1 text-[#111111] sm:py-3">
        <div className="space-y-6 sm:space-y-10">
          <section>
            <SectionHeader
              eyebrow={activeRooms.length > 0 ? "Active rooms" : undefined}
              title="Active rooms"
              description="Continue a session that's currently running."
              live={activeRooms.length > 0}
            />

            <div className="mt-4">
              {isLoadingSessions ? (
                <DashboardLoadingCard label="Loading active rooms..." />
              ) : sessionsQuery.isError ? (
                <InlineErrorBanner
                  message={
                    sessionsQuery.error instanceof Error
                      ? sessionsQuery.error.message
                      : "Could not load your sessions."
                  }
                  onRetry={() => void sessionsQuery.refetch()}
                  retrying={sessionsQuery.isFetching}
                />
              ) : activeRooms.length > 0 ? (
                <div className="grid gap-3">
                  {activeRooms.map((session) => (
                    <ActiveRoomCard
                      key={session.id}
                      session={session}
                      busy={busyRoomId === session.id}
                      onContinue={() => openLiveMutation.mutate(session)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyActiveRooms onCreate={() => navigate({ to: "/author/create" })} />
              )}
            </div>
          </section>

          <section>
            <SectionHeader
              title="Start something"
              description="Choose a tool and launch your next session."
            />
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
              {quickStartTools.map((tool) => (
                <QuickStartCard key={tool.id} tool={tool} onMode={openCreateWithMode} />
              ))}
            </div>
          </section>

          <section>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <SectionHeader
                title="Recent sessions"
                description="Quickly access your recently created sessions."
              />
              <Link
                to="/author/sessions"
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#111111] transition-colors hover:text-[#FF3B30]"
              >
                View all
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="mt-4">
              {isLoadingSessions ? (
                <DashboardLoadingCard label="Loading recent sessions..." />
              ) : sessionsQuery.isError ? (
                <InlineErrorBanner
                  message="Could not load recent sessions."
                  onRetry={() => void sessionsQuery.refetch()}
                  retrying={sessionsQuery.isFetching}
                />
              ) : recentSessions.length > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-[#E7E9ED] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
                  {recentSessions.map((session, index) => (
                    <RecentSessionRow
                      key={session.id}
                      session={session}
                      last={index === recentSessions.length - 1}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#D9DDE3] bg-white px-5 py-8 text-sm text-[#5F6368]">
                  No sessions created yet.
                </div>
              )}
            </div>
          </section>

          {!isLoadingSessions && !sessionsQuery.isError && sessions.length > 0 ? (
            <section>
              <SectionHeader
                title="Your activity"
                description="Simple totals from your workspace."
              />
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
                {activity.map((item) => (
                  <StatCard key={item.label} label={item.label} value={item.value} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </AuthorShell>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  live = false,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  live?: boolean;
}) {
  return (
    <div>
      {eyebrow || live ? (
        <p className="mb-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase text-[#FF3B30]">
          {live ? <span className="size-2 rounded-full bg-[#FF3B30]" aria-hidden /> : null}
          {eyebrow}
        </p>
      ) : null}
      <h2 className="font-display text-[1.45rem] font-bold tracking-normal text-[#111111] sm:text-[1.6rem]">
        {title}
      </h2>
      <p className="mt-1 text-sm leading-6 text-[#5F6368]">{description}</p>
    </div>
  );
}

function ActiveRoomCard({
  session,
  busy,
  onContinue,
}: {
  session: AuthorSessionSummary;
  busy: boolean;
  onContinue: () => void;
}) {
  const isResourceDrop = session.subject === "Resource Drop";
  const visual = isResourceDrop
    ? {
        title: "Resource Drop",
        image: resourceDropPreview,
        imageAlt: "Resource Drop thumbnail",
        icon: FileUp,
      }
    : modeVisuals[session.mode];
  const status = statusLabel[session.status] ?? session.status;
  const isLive = session.status === "LIVE" || session.status === "COUNTDOWN";

  return (
    <article className="grid gap-4 rounded-2xl border border-[#E7E9ED] bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.04)] sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-center">
      <ToolImage
        image={visual.image}
        alt={visual.imageAlt}
        icon={visual.icon}
        title={visual.title}
        className="w-full sm:w-28"
      />

      <div className="min-w-0">
        <h3 className="truncate font-display text-[1.05rem] font-semibold tracking-normal text-[#111111]">
          {session.name}
        </h3>
        <p className="mt-1 text-sm font-medium text-[#5F6368]">
          {displayModeTitle(session.mode, session.subject)}
        </p>
        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#8A8F98]">
          <span>{formatParticipantCount(session.playerCount)}</span>
          <span>{formatQuestionCount(session)}</span>
          <span className="font-mono">{session.code}</span>
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:items-end">
        <span
          className={cn(
            "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase",
            isLive ? "bg-[#FFF1F0] text-[#FF3B30]" : "bg-[#EFF6FF] text-[#2563EB]",
          )}
        >
          <span
            className={cn("size-1.5 rounded-full", isLive ? "bg-[#FF3B30]" : "bg-[#2563EB]")}
            aria-hidden
          />
          {status}
        </span>
        <Button
          type="button"
          disabled={busy}
          onClick={onContinue}
          className="h-11 rounded-xl bg-[#111111] px-4 text-sm font-semibold text-white shadow-none transition-colors hover:bg-[#2A2A2A]"
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Opening...
            </>
          ) : (
            <>
              Continue room
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </article>
  );
}

function EmptyActiveRooms({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#E7E9ED] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.04)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#F1F3F5] text-[#5F6368]">
          <Radio className="size-5" />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold tracking-normal text-[#111111]">
            No active rooms
          </h3>
          <p className="mt-1 text-sm text-[#5F6368]">
            You don't have a live session running right now.
          </p>
        </div>
      </div>
      <Button
        type="button"
        onClick={onCreate}
        className="h-11 rounded-xl bg-[#111111] px-4 text-sm font-semibold text-white shadow-none hover:bg-[#2A2A2A]"
      >
        <Plus className="size-4" />
        Create room
      </Button>
    </div>
  );
}

function QuickStartCard({
  tool,
  onMode,
}: {
  tool: DashboardTool;
  onMode: (mode: CoreLiveGameMode) => void;
}) {
  const Icon = tool.icon;
  const content = (
    <div className="flex h-full flex-col">
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-xl border border-[#CBD5E1] bg-[#F4F5F7]">
        {tool.image ? (
          <img
            src={tool.image}
            alt={tool.imageAlt}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-[#5F6368]">
            <Icon className="size-5 sm:size-6" />
          </div>
        )}
      </div>

      <div className="mt-2.5 sm:mt-3.5 flex flex-1 flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="grid size-6 sm:size-8 shrink-0 place-items-center rounded-lg border border-[#CBD5E1] bg-[#F8F9FA] text-[#111111]">
              <Icon className="size-3 sm:size-4" aria-hidden />
            </span>
            <h3 className="font-display text-xs sm:text-base font-bold text-[#111111] transition-colors group-hover:text-[#FF3B30] truncate">
              {tool.title}
            </h3>
          </div>

          <p className="mt-1 sm:mt-2 text-[11px] sm:text-xs leading-snug text-[#5F6368] line-clamp-1 sm:line-clamp-2">
            {tool.description}
          </p>
        </div>

        <div className="mt-2 sm:mt-auto flex items-center justify-between pt-2 sm:pt-4 border-t border-[#F0F2F5] sm:border-0">
          <span className="inline-flex items-center text-[10.5px] sm:text-xs font-bold text-[#111111] transition-colors group-hover:text-[#FF3B30]">
            Launch
            <ArrowRight className="ml-1 size-3 sm:size-3.5 transition-transform duration-200 ease-out group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </div>
  );

  const className =
    "group flex h-full flex-col rounded-2xl sm:rounded-[20px] border border-[#CBD5E1] bg-white p-2.5 sm:p-4 text-left shadow-[0_1px_3px_rgba(16,24,40,0.04)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[#94A3B8] hover:shadow-[0_12px_28px_rgba(16,24,40,0.08)]";

  if (tool.mode) {
    return (
      <button type="button" onClick={() => onMode(tool.mode!)} className={className}>
        {content}
      </button>
    );
  }

  return (
    <Link to={tool.to ?? "/author/create"} className={className}>
      {content}
    </Link>
  );
}

function RecentSessionRow({ session, last }: { session: AuthorSessionSummary; last: boolean }) {
  const isResourceDrop = session.subject === "Resource Drop";
  const visual = isResourceDrop
    ? {
        title: "Resource Drop",
        image: resourceDropPreview,
        imageAlt: "Resource Drop thumbnail",
        icon: FileUp,
      }
    : modeVisuals[session.mode];

  return (
    <div
      className={cn(
        "flex min-h-[76px] items-center gap-3 px-3 py-3 sm:px-4",
        !last && "border-b border-[#EEF0F3]",
      )}
    >
      <ToolImage
        image={visual.image}
        alt={visual.imageAlt}
        icon={visual.icon}
        title={visual.title}
        className="h-10 w-14"
      />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-[#111111]">{session.name}</h3>
        <p className="mt-0.5 truncate text-xs text-[#5F6368]">
          {displayModeTitle(session.mode, session.subject)} |{" "}
          {formatParticipantCount(session.playerCount)} | {formatRecentDate(session.createdAt)}
        </p>
      </div>
      <Link
        to={isResourceDrop ? "/author/room/$roomId" : "/author/sessions/$roomId"}
        params={{ roomId: session.id }}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-[#111111] transition-colors hover:text-[#FF3B30]"
      >
        View
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E7E9ED] bg-white p-3 sm:p-4 shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
      <p className="truncate text-xs sm:text-sm font-medium text-[#5F6368]">{label}</p>
      <p className="mt-2 sm:mt-3 font-display text-xl sm:text-[1.9rem] font-bold leading-none tracking-normal text-[#111111]">
        {value}
      </p>
    </div>
  );
}

function DashboardLoadingCard({ label }: { label: string }) {
  return (
    <div className="flex min-h-[92px] items-center justify-center gap-2 rounded-2xl border border-[#E7E9ED] bg-white p-5 text-sm font-medium text-[#5F6368]">
      <Loader2 className="size-4 animate-spin text-[#FF3B30]" />
      {label}
    </div>
  );
}

function ToolImage({
  image,
  alt,
  icon: Icon,
  title,
  className,
  showFallbackLabel = false,
}: {
  image?: string;
  alt: string;
  icon: LucideIcon;
  title: string;
  className?: string;
  showFallbackLabel?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showFallback = !image || failed;

  return (
    <div
      className={cn(
        "relative aspect-video shrink-0 overflow-hidden rounded-xl border border-[#EEF0F3] bg-[#F1F3F5]",
        className,
      )}
      role={showFallback ? "img" : undefined}
      aria-label={showFallback ? title : undefined}
    >
      {showFallback ? (
        <div className="absolute inset-0 grid place-items-center text-[#5F6368]">
          <div className="flex flex-col items-center gap-1.5 px-2 text-center">
            <Icon className="size-5" aria-hidden />
            {showFallbackLabel ? (
              <span className="max-w-full truncate text-xs font-semibold">{title}</span>
            ) : null}
          </div>
        </div>
      ) : (
        <img
          src={image}
          alt={alt}
          loading="lazy"
          className="size-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

function firstDisplayName(name: string | undefined): string {
  const cleaned = name?.trim();
  if (!cleaned) return "Host";
  return cleaned.split(/\s+/)[0] ?? "Host";
}

function isActiveSession(status: string) {
  return activeStatuses.has(status);
}

function displayModeTitle(mode: GameMode, subject?: string | null): string {
  if (subject === "Resource Drop") return "Resource Drop";
  return modeVisuals[mode]?.title ?? GAME_MODE_META[mode]?.title ?? mode;
}

function formatParticipantCount(count: number): string {
  return `${count} ${count === 1 ? "participant" : "participants"}`;
}

function formatQuestionCount(session: AuthorSessionSummary): string {
  if (session.subject === "Resource Drop") {
    return "QR File Share";
  }
  if (session.mode === "connect_dots") {
    return `${session.questionCount} ${session.questionCount === 1 ? "pair" : "pairs"}`;
  }
  if (session.mode === "polls") {
    return `${session.questionCount} ${session.questionCount === 1 ? "prompt" : "prompts"}`;
  }
  return `${session.questionCount} ${session.questionCount === 1 ? "question" : "questions"}`;
}

function formatRecentDate(value: string): string {
  const date = new Date(Number.isFinite(Number(value)) ? Number(value) : value);
  if (Number.isNaN(date.getTime())) return "Recently";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.round((startOfToday - startOfDate) / 86_400_000);

  if (dayDiff === 0) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
  if (dayDiff === 1) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function getActivitySummary(sessions: AuthorSessionSummary[], activeCount: number) {
  const participants = sessions.reduce((total, session) => total + session.playerCount, 0);
  const toolTypes = new Set(sessions.map((session) => session.mode)).size;

  return [
    { label: "Sessions hosted", value: String(sessions.length) },
    { label: "Participants", value: new Intl.NumberFormat().format(participants) },
    { label: "Active rooms", value: String(activeCount) },
    { label: "Tool types used", value: String(toolTypes) },
  ];
}
