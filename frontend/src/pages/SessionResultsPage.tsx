import { useParams } from "@/lib/navigation";
import { Link, useNavigate } from "@/lib/navigation";
import { useMutation, useQuery } from "@/lib/query";
import { ArrowLeft, Play, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { RoomCodeDisplay } from "@/components/author/RoomCodeDisplay";
import { UnifiedLeaderboard } from "@/components/author/UnifiedLeaderboard";
import { AuthorPageFrame } from "@/components/author/AuthorPageFrame";
import { AuthorShell } from "@/components/layout/AuthorShell";
import { Button } from "@/components/ui/button";
import { InlineErrorBanner, PageLoader } from "@/components/ui/async-state";
import { GAME_MODE_META } from "@shared/game/config";
import { saveAuthorRoom } from "@/lib/game/client-session";
import { claimAuthorSessionFn, getAuthorRoomResultsFn } from "@/lib/game/room.functions";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

const statusLabel: Record<string, string> = {
  DRAFT: "Draft",
  LOBBY: "Lobby",
  READY: "Ready",
  COUNTDOWN: "Starting",
  LIVE: "Live",
  FINISHED: "Finished",
  CANCELLED: "Cancelled",
};

function formatCreatedDate(value: string): string {
  const ms = Number(value);
  const date = Number.isFinite(ms) ? new Date(ms) : new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function SessionResultsPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthor } = useAuth();
  const [selectedRound, setSelectedRound] = useState<number | "latest">("latest");

  const resultsQuery = useQuery({
    queryKey: ["author-session-results", user?.id, roomId],
    enabled: isAuthor && Boolean(user?.id),
    queryFn: async () => {
      const res = await getAuthorRoomResultsFn({
        data: { roomId, authorId: user!.id },
      });
      if (!res.ok) throw new Error(res.error);
      return res;
    },
    retry: false,
  });

  const openLiveMutation = useMutation({
    mutationFn: async () => {
      const res = await claimAuthorSessionFn({
        data: { roomId, authorId: user!.id },
      });
      if (!res.ok) throw new Error(res.error);
      return res;
    },
    onSuccess: (res) => {
      saveAuthorRoom({
        roomId: res.room.id,
        code: res.room.code,
        authorToken: res.authorToken,
      });
      navigate({ to: "/author/room/$roomId", params: { roomId: res.room.id } });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const data = resultsQuery.data;
  const roundHistory = data?.room?.roundHistory ?? [];

  let displayedLeaderboard = data?.leaderboard ?? [];
  let displayedTitle = "Final standings";
  let displayedSubtitle: string | undefined = undefined;

  if (selectedRound !== "latest") {
    const pastRound = roundHistory.find((r) => r.roundNumber === selectedRound);
    if (pastRound) {
      displayedLeaderboard = pastRound.leaderboard;
      displayedTitle = `Round ${pastRound.roundNumber} Standings`;
      displayedSubtitle = `${pastRound.participantCount} participants · Finished at ${new Date(pastRound.finishedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
  }

  const roundTabs =
    roundHistory.length > 0 ? (
      <div className="flex flex-wrap items-center gap-1 rounded-xl bg-[var(--gamibar-page)] p-1">
        <button
          type="button"
          onClick={() => setSelectedRound("latest")}
          className={cn(
            "rounded-lg px-2.5 py-1 text-xs font-bold transition-all",
            selectedRound === "latest"
              ? "bg-[var(--foreground)] text-[var(--background)] shadow-sm"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
          )}
        >
          Latest Round ({roundHistory.length + (data?.room.status === "FINISHED" ? 0 : 1)})
        </button>
        {roundHistory.map((r) => (
          <button
            key={r.roundNumber}
            type="button"
            onClick={() => setSelectedRound(r.roundNumber)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-bold transition-all",
              selectedRound === r.roundNumber
                ? "bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
            )}
          >
            Round {r.roundNumber}
          </button>
        ))}
      </div>
    ) : null;

  useEffect(() => {
    const payload = data?.room?.payload as { isResourceDrop?: unknown } | undefined;
    if (data?.room && (data.room.subject === "Resource Drop" || payload?.isResourceDrop === true)) {
      if (user?.id && roomId) {
        void (async () => {
          try {
            const res = await claimAuthorSessionFn({
              data: { roomId, authorId: user.id },
            });
            if (res.ok) {
              saveAuthorRoom({
                roomId: res.room.id,
                code: res.room.code,
                authorToken: res.authorToken,
              });
            }
          } catch {
            // ignore
          } finally {
            navigate({ to: "/author/room/$roomId", params: { roomId } });
          }
        })();
      } else if (roomId) {
        navigate({ to: "/author/room/$roomId", params: { roomId } });
      }
    }
  }, [data?.room, roomId, user?.id, navigate]);

  return (
    <AuthorShell>
      <AuthorPageFrame width="xl">
        <Link
          to="/author/sessions"
          className="inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="size-4" />
          Back to My sessions
        </Link>

        {resultsQuery.isLoading ? (
          <PageLoader
            message="Loading session results..."
            description="Fetching room history, leaderboard, and completion data."
            fullScreen={false}
            className="py-20"
          />
        ) : resultsQuery.isError || !data ? (
          <InlineErrorBanner
            className="mt-6"
            message={
              resultsQuery.error instanceof Error
                ? resultsQuery.error.message
                : "Could not load session results."
            }
            onRetry={() => void resultsQuery.refetch()}
            retrying={resultsQuery.isFetching}
          />
        ) : (
          <>
            {/* 1. TOP: Leaderboard */}
            {displayedLeaderboard.length === 0 ? (
              <div className="author-card mt-5 border-dashed px-6 py-14 text-center">
                <Trophy className="mx-auto size-8 text-[var(--muted-foreground)]" />
                <p className="mt-4 text-sm font-medium text-[var(--foreground)]">No results yet</p>
              </div>
            ) : (
              <div className="mt-5">
                <UnifiedLeaderboard
                  mode={data.room.mode}
                  rows={displayedLeaderboard}
                  finished={data.room.status === "FINISHED" || data.room.status === "CANCELLED"}
                  title={displayedTitle}
                  subtitle={displayedSubtitle}
                  headerExtra={roundTabs}
                />
              </div>
            )}

            {/* 2. AFTER THAT: Session Card with Details and Stats */}
            <div className="author-hero-panel mt-5 p-4 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                        data.room.status === "LIVE"
                          ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
                          : data.room.status === "FINISHED"
                            ? "bg-[var(--gamibar-page)] text-[var(--muted-foreground)]"
                            : "bg-amber-500/12 text-amber-800 dark:text-amber-400",
                      )}
                    >
                      {statusLabel[data.room.status] ?? data.room.status}
                    </span>
                    <span className="text-xs font-medium text-[var(--muted-foreground)]">
                      {GAME_MODE_META[data.room.mode]?.title ?? data.room.mode}
                    </span>
                  </div>
                  <h1 className="mt-2 font-display text-[clamp(1.5rem,4vw,2rem)] font-extrabold text-[var(--foreground)]">
                    {data.room.name}
                  </h1>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {data.room.subject} · {formatCreatedDate(String(data.room.createdAt))}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-3 sm:items-end">
                  <RoomCodeDisplay
                    code={data.room.code}
                    size="default"
                    className="w-full sm:w-auto"
                  />
                  <Button
                    type="button"
                    className="w-full rounded-xl bg-[var(--gamibar-brand)] font-semibold text-white shadow-sm hover:bg-[var(--gamibar-brand-hover)] sm:w-auto"
                    disabled={openLiveMutation.isPending}
                    onClick={() => openLiveMutation.mutate()}
                  >
                    <Play className="mr-1.5 size-3.5 fill-current" />
                    {openLiveMutation.isPending ? "Opening..." : "Open room"}
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-6 sm:grid-cols-3 sm:gap-3">
                <StatChip label="Questions / pairs" value={String(data.questionCount)} />
                <StatChip label="Participants" value={String(data.participantCount)} />
                <StatChip
                  label="Status"
                  value={statusLabel[data.room.status] ?? data.room.status}
                />
              </div>
            </div>
          </>
        )}
      </AuthorPageFrame>
    </AuthorShell>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="author-card px-3 py-2.5 sm:px-4 sm:py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-0.5 font-display text-lg font-bold text-[var(--foreground)] sm:mt-1 sm:text-xl">
        {value}
      </p>
    </div>
  );
}
