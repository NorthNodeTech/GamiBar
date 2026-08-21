import { Link } from "@/lib/navigation";
import { useQuery } from "@/lib/query";
import { CheckCircle2, Circle, Loader2, Trophy } from "lucide-react";

import { GameModeMiniPreview } from "@/components/author/GameModeMiniPreview";
import { AuthorPageFrame } from "@/components/author/AuthorPageFrame";
import { AuthorPageHeader } from "@/components/author/AuthorPageHeader";
import { AuthorShell } from "@/components/layout/AuthorShell";
import { Button } from "@/components/ui/button";
import { InlineErrorBanner } from "@/components/ui/async-state";
import { GAME_MODE_META } from "@shared/game/config";
import { useAuth } from "@/lib/auth-store";
import { fetchParticipatedGames } from "@/lib/supabase/participated-games";
import { cn } from "@/lib/utils";

function formatPlayedDate(value: string): string {
  const ms = Number(value);
  const date = Number.isFinite(ms) ? new Date(ms) : new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function ParticipatedGamesPage() {
  const { user, isAuthor } = useAuth();

  const participatedQuery = useQuery({
    queryKey: ["participated-games", user?.id],
    enabled: isAuthor && Boolean(user?.id),
    queryFn: () => fetchParticipatedGames(user!.id),
  });

  const games = participatedQuery.data ?? [];

  return (
    <AuthorShell>
      <AuthorPageFrame width="md">
        <AuthorPageHeader title="Participated Games" />

        <div className="mt-5 sm:mt-6">
          {participatedQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--muted-foreground)]">
              <Loader2 className="size-4 animate-spin" />
              Loading participated games...
            </div>
          ) : participatedQuery.isError ? (
            <InlineErrorBanner
              className="py-8 text-center"
              message="Could not load participated games. Check your connection and try again."
              onRetry={() => void participatedQuery.refetch()}
              retrying={participatedQuery.isFetching}
            />
          ) : games.length === 0 ? (
            <div className="author-card border-dashed px-6 py-12 text-center">
              <Trophy className="mx-auto size-8 text-[var(--muted-foreground)]" />
              <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                No participated games yet
              </p>
              <Button
                asChild
                className="mt-4 h-11 rounded-xl bg-[var(--gamibar-brand)] hover:bg-[var(--gamibar-brand-hover)]"
              >
                <Link to="/join">Join a game</Link>
              </Button>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-3">
              {games.map((game) => (
                <li
                  key={game.participantId}
                  className={cn(
                    "author-card overflow-hidden",
                    game.completed && "ring-1 ring-emerald-500/20",
                  )}
                >
                  <div className="flex items-center gap-3 p-3 sm:p-3.5">
                    <GameModeMiniPreview mode={game.mode} size="sm" className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                        {game.gameName}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-[var(--muted-foreground)]">
                        {GAME_MODE_META[game.mode]?.title ?? game.mode}
                      </p>
                    </div>
                    <div className="shrink-0 pl-1 text-right">
                      <p className="font-display text-lg font-bold tabular-nums leading-none text-[var(--foreground)] sm:text-xl">
                        {game.score != null ? game.score : "-"}
                      </p>
                      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                        Score
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-[var(--gamibar-border)] bg-[var(--gamibar-page)]/40 px-3 py-2 text-xs sm:px-3.5">
                    <span className="truncate text-[var(--muted-foreground)]">
                      {formatPlayedDate(game.playedAt)}
                    </span>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                        game.completed
                          ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
                          : "bg-[var(--gamibar-surface)] text-[var(--muted-foreground)]",
                      )}
                    >
                      {game.completed ? (
                        <>
                          <CheckCircle2 className="size-3" />
                          Completed
                        </>
                      ) : (
                        <>
                          <Circle className="size-3" />
                          Joined
                        </>
                      )}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </AuthorPageFrame>
    </AuthorShell>
  );
}
