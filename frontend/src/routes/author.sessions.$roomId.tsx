import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Play, Trophy } from "lucide-react";
import { toast } from "sonner";

import { CompletionTimeline } from "@/components/author/LiveLeaderboard";
import { RoomCodeDisplay } from "@/components/author/RoomCodeDisplay";
import { UnifiedLeaderboard } from "@/components/author/UnifiedLeaderboard";
import { AuthorPageFrame } from "@/components/author/AuthorPageFrame";
import { AuthorShell } from "@/components/layout/AuthorShell";
import { Button } from "@/components/ui/button";
import { InlineErrorBanner, PageLoader } from "@/components/ui/async-state";
import { GAME_MODE_META } from "@/lib/game/config";
import { saveAuthorRoom } from "@/lib/game/client-session";
import { claimAuthorSessionFn, getAuthorRoomResultsFn } from "@/lib/game/room.functions";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/author/sessions/$roomId")({
  head: () => ({ meta: [{ title: "Game Results - GamiBAR" }] }),
  component: SessionResultsPage,
});

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

function SessionResultsPage() {
  const { roomId } = Route.useParams();
  const navigate = useNavigate();
  const { user, isAuthor } = useAuth();

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

  return (
    <AuthorShell>
      <AuthorPageFrame width="xl">
        <Link
          to="/author/sessions"
          className="inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="size-4" />
          Back to My Games
        </Link>

        {resultsQuery.isLoading ? (
          <PageLoader
            message="Loading results…"
            description="Fetching leaderboard and completion data."
            fullScreen={false}
            className="py-20"
          />
        ) : resultsQuery.isError || !data ? (
          <InlineErrorBanner
            className="mt-6"
            message={
              resultsQuery.error instanceof Error
                ? resultsQuery.error.message
                : "Could not load game results."
            }
            onRetry={() => void resultsQuery.refetch()}
            retrying={resultsQuery.isFetching}
          />
        ) : (
          <>
            <div className="author-hero-panel mt-5 p-4 sm:mt-6 sm:p-6">
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
                      {GAME_MODE_META[data.room.mode].title}
                    </span>
                  </div>
                  <h1 className="mt-2 font-display text-[clamp(1.5rem,4vw,2rem)] font-extrabold text-[var(--foreground)]">
                    {data.room.name}
                  </h1>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {data.room.subject} · {formatCreatedDate(String(data.room.createdAt))}
                  </p>
                </div>
                <RoomCodeDisplay code={data.room.code} size="default" className="w-full sm:w-auto" />
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

            {data.leaderboard.length === 0 ? (
              <div className="author-card mt-8 border-dashed px-6 py-14 text-center">
                <Trophy className="mx-auto size-8 text-[var(--muted-foreground)]" />
                <p className="mt-4 text-sm font-medium text-[var(--foreground)]">No results yet</p>
              </div>
            ) : (
              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <UnifiedLeaderboard
                  mode={data.room.mode}
                  rows={data.leaderboard}
                  finished={data.room.status === "FINISHED" || data.room.status === "CANCELLED"}
                />
                <CompletionTimeline items={data.completions} />
              </div>
            )}

            {(data.room.status === "LOBBY" ||
              data.room.status === "LIVE" ||
              data.room.status === "COUNTDOWN" ||
              data.room.status === "READY" ||
              data.room.status === "DRAFT") && (
              <div className="author-card mt-6 border-[var(--gamibar-brand)]/25 bg-[var(--gamibar-brand-soft)]/35 px-5 py-4">
                <p className="text-sm text-[var(--muted-foreground)]">This session is still active.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    type="button"
                    className="h-11 rounded-xl bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 sm:h-9 sm:px-3 sm:text-sm"
                    disabled={openLiveMutation.isPending}
                    onClick={() => openLiveMutation.mutate()}
                  >
                    <Play className="mr-1.5 size-3.5 fill-current" />
                    {openLiveMutation.isPending ? "Opening…" : "Open live control"}
                  </Button>
                  <Button asChild variant="outline" className="h-11 rounded-xl sm:h-9 sm:px-3 sm:text-sm">
                    <Link to="/author/sessions">Back to My Games</Link>
                  </Button>
                </div>
              </div>
            )}
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
      <p className="mt-0.5 font-display text-lg font-bold text-[var(--foreground)] sm:mt-1 sm:text-xl">{value}</p>
    </div>
  );
}
