import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Trophy } from "lucide-react";

import { AuthorShell } from "@/components/layout/AuthorShell";
import { InlineErrorBanner } from "@/components/ui/async-state";
import { GAME_MODE_META } from "@/lib/game/config";
import { useAuth } from "@/lib/auth-store";
import { fetchParticipatedGames } from "@/lib/supabase/participated-games";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/author/participated")({
  head: () => ({ meta: [{ title: "Participated Games - GamiBAR" }] }),
  component: ParticipatedGamesPage,
});

function formatPlayedDate(value: string): string {
  const ms = Number(value);
  const date = Number.isFinite(ms) ? new Date(ms) : new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function ParticipatedGamesPage() {
  const { user, isAuthor } = useAuth();

  const participatedQuery = useQuery({
    queryKey: ["participated-games", user?.id],
    enabled: isAuthor && Boolean(user?.id),
    queryFn: () => fetchParticipatedGames(user!.id),
  });

  const games = participatedQuery.data ?? [];

  return (
    <AuthorShell>
      <div className="mx-auto max-w-3xl px-2 py-8">
        <h1 className="font-display text-3xl font-extrabold text-[#111111]">Participated Games</h1>
        <p className="mt-2 text-sm text-[#525252]">Games you joined as a player.</p>

        <div className="mt-8">
          {participatedQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#737373]">
              <Loader2 className="size-4 animate-spin" />
              Loading…
            </div>
          ) : participatedQuery.isError ? (
            <InlineErrorBanner
              className="py-8 text-center"
              message="Could not load participated games. Check your connection and try again."
              onRetry={() => void participatedQuery.refetch()}
              retrying={participatedQuery.isFetching}
            />
          ) : games.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--gamibar-border)] bg-white px-6 py-12 text-center">
              <Trophy className="mx-auto size-8 text-[#737373]" />
              <p className="mt-4 text-sm text-[#525252]">No participated games yet.</p>
              <p className="mt-1 text-xs text-[#737373]">
                Join a live game with your account to see your scores here.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {games.map((game) => (
                <li
                  key={game.participantId}
                  className="rounded-2xl border border-[var(--gamibar-border)] bg-white px-4 py-4 shadow-[var(--shadow-soft)] sm:px-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#111111]">{game.gameName}</p>
                      <p className="mt-0.5 text-xs text-[#737373]">
                        {GAME_MODE_META[game.mode]?.title ?? game.mode}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                        game.completed
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-neutral-100 text-neutral-700",
                      )}
                    >
                      {game.completed ? "Completed" : "In progress"}
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-[#737373]">Date</dt>
                      <dd className="mt-0.5 text-sm font-medium text-[#111111]">
                        {formatPlayedDate(game.playedAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-[#737373]">Score</dt>
                      <dd className="mt-0.5 text-sm font-medium text-[#111111]">
                        {game.score != null ? game.score : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-[#737373]">Status</dt>
                      <dd className="mt-0.5 text-sm font-medium text-[#111111]">
                        {game.completed ? "Finished" : "Joined"}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AuthorShell>
  );
}
