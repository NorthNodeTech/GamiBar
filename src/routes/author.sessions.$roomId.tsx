import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Play, Trophy } from "lucide-react";
import { toast } from "sonner";

import { CompletionTimeline } from "@/components/author/LiveLeaderboard";
import { RoomCodeDisplay } from "@/components/author/RoomCodeDisplay";
import { UnifiedLeaderboard } from "@/components/author/UnifiedLeaderboard";
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
      <div className="mx-auto max-w-5xl px-2 py-8">
        <Link
          to="/author/sessions"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#525252] transition-colors hover:text-[#111111]"
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
            <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                      data.room.status === "LIVE"
                        ? "bg-emerald-100 text-emerald-800"
                        : data.room.status === "FINISHED"
                          ? "bg-neutral-100 text-neutral-700"
                          : "bg-amber-100 text-amber-900",
                    )}
                  >
                    {statusLabel[data.room.status] ?? data.room.status}
                  </span>
                  <span className="text-xs font-medium text-[#737373]">
                    {GAME_MODE_META[data.room.mode].title}
                  </span>
                </div>
                <h1 className="mt-2 font-display text-3xl font-extrabold text-[#111111]">
                  {data.room.name}
                </h1>
                <p className="mt-1 text-sm text-[#525252]">
                  {data.room.subject} · Created {formatCreatedDate(String(data.room.createdAt))}
                </p>
              </div>
              <RoomCodeDisplay code={data.room.code} size="default" />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <StatChip label="Questions / pairs" value={String(data.questionCount)} />
              <StatChip label="Participants" value={String(data.participantCount)} />
              <StatChip
                label="Status"
                value={statusLabel[data.room.status] ?? data.room.status}
              />
            </div>

            {data.leaderboard.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-dashed border-[var(--gamibar-border)] bg-white px-6 py-14 text-center">
                <Trophy className="mx-auto size-8 text-[#737373]" />
                <p className="mt-4 text-sm font-medium text-[#111111]">No results yet</p>
                <p className="mt-1 text-xs text-[#737373]">
                  Rankings appear once students join and play.
                </p>
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
              <div className="mt-6 rounded-2xl border border-[var(--gamibar-brand)]/25 bg-[var(--gamibar-brand-soft)] px-5 py-4">
                <p className="text-sm text-[var(--muted-foreground)]">
                  This game is still active. Open live control to start the session, share the join
                  code, and monitor players in real time.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-xl bg-[#111111] hover:bg-black"
                    disabled={openLiveMutation.isPending}
                    onClick={() => openLiveMutation.mutate()}
                  >
                    <Play className="mr-1.5 size-3.5 fill-current" />
                    {openLiveMutation.isPending ? "Opening…" : "Open live control"}
                  </Button>
                  <Button asChild size="sm" variant="outline" className="rounded-xl">
                    <Link to="/author/sessions">Back to My Games</Link>
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AuthorShell>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--gamibar-border)] bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#737373]">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-[#111111]">{value}</p>
    </div>
  );
}
