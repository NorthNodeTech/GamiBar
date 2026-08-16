import { Crown, Medal, Trophy } from "lucide-react";

import { formatDuration } from "@/lib/game/ranking";
import { cn } from "@/lib/utils";

type LeaderboardRow = {
  participantId: string;
  rank: number;
  displayName: string;
  detail: string;
  secondaryMetric?: number | null;
};

export function LiveLeaderboard({
  rows,
  finished,
  highlightParticipantId,
  className,
}: {
  rows: LeaderboardRow[];
  finished?: boolean;
  highlightParticipantId?: string;
  className?: string;
}) {
  const topThree = rows.filter((r) => r.rank <= 3).sort((a, b) => a.rank - b.rank);
  const rest = rows.filter((r) => r.rank > 3);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[24px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      <div className="border-b border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--foreground)] text-[var(--background)]">
            <Trophy className="size-4" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-[var(--foreground)]">
              {finished ? "Final standings" : "Live leaderboard"}
            </h2>
            <p className="text-xs text-[var(--muted-foreground)]">
              Top performers update in real time
            </p>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[var(--gamibar-page)] text-[var(--muted-foreground)]">
            <Medal className="size-7" />
          </div>
          <p className="mt-4 text-sm font-medium text-[var(--foreground)]">No scores yet</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Rankings appear once participants start playing.
          </p>
        </div>
      ) : (
        <>
          {topThree.length > 0 && (
            <>
              <div className="flex flex-col gap-3 border-b border-[var(--gamibar-border)] bg-[var(--gamibar-page)]/50 px-4 py-4 sm:hidden">
                {topThree
                  .slice()
                  .sort((a, b) => a.rank - b.rank)
                  .map((row) => (
                    <PodiumSpot
                      key={row.participantId}
                      row={row}
                      rank={row.rank}
                      highlighted={row.participantId === highlightParticipantId}
                      compact
                    />
                  ))}
              </div>
              <div className="hidden grid-cols-3 items-end gap-2 border-b border-[var(--gamibar-border)] bg-[var(--gamibar-page)]/50 px-4 pb-4 pt-8 sm:grid sm:px-8">
                {[2, 1, 3].map((rank) => {
                  const row = topThree.find((r) => r.rank === rank);
                  if (!row) {
                    return <div key={rank} className="min-h-[88px]" />;
                  }
                  return (
                    <PodiumSpot
                      key={row.participantId}
                      row={row}
                      rank={rank}
                      highlighted={row.participantId === highlightParticipantId}
                    />
                  );
                })}
              </div>
            </>
          )}

          {rest.length > 0 && (
            <ol className="max-h-72 space-y-1 overflow-y-auto p-3 sm:p-4">
              {rest.map((row) => (
                <li
                  key={row.participantId}
                  className={cn(
                    "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-3 py-3 transition-colors hover:bg-[var(--gamibar-page)] sm:flex-nowrap sm:py-2.5",
                    row.participantId === highlightParticipantId &&
                      "bg-[var(--gamibar-brand-soft)] ring-1 ring-[var(--gamibar-brand)]/30",
                  )}
                >
                  <span className="w-7 shrink-0 font-mono text-sm font-bold text-[var(--muted-foreground)]">
                    {row.rank}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-[var(--foreground)]">
                    {row.displayName}
                  </span>
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">
                    {row.detail}
                  </span>
                  {row.secondaryMetric != null && (
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {formatDuration(row.secondaryMetric)}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}

function PodiumSpot({
  row,
  rank,
  highlighted,
  compact,
}: {
  row: LeaderboardRow;
  rank: number;
  highlighted?: boolean;
  compact?: boolean;
}) {
  const heights = { 1: "h-28", 2: "h-20", 3: "h-16" } as const;
  const colors = {
    1: "from-amber-300 to-amber-500 text-amber-950",
    2: "from-slate-200 to-slate-400 text-slate-800",
    3: "from-orange-200 to-orange-400 text-orange-900",
  } as const;

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] px-3 py-3",
          highlighted &&
            "bg-[var(--gamibar-brand-soft)] ring-1 ring-[var(--gamibar-brand)]/30 ring-offset-2 ring-offset-[var(--gamibar-page)]",
        )}
      >
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold",
            rank === 1 && "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300",
            rank === 2 && "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
            rank === 3 &&
              "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
          )}
        >
          {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[var(--foreground)]">{row.displayName}</p>
          <p className="text-xs text-[var(--muted-foreground)]">{row.detail}</p>
        </div>
        {row.secondaryMetric != null && (
          <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
            {formatDuration(row.secondaryMetric)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative mb-2">
        {rank === 1 && (
          <Crown className="absolute -top-5 left-1/2 size-5 -translate-x-1/2 text-amber-500" />
        )}
        <span
          className={cn(
            "grid size-11 place-items-center rounded-full border-2 border-[var(--gamibar-surface)] text-sm font-bold shadow-md",
            rank === 1 &&
              "size-12 bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300",
            rank === 2 && "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
            rank === 3 &&
              "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
            highlighted &&
              "ring-2 ring-[var(--gamibar-brand)] ring-offset-2 ring-offset-[var(--gamibar-page)]",
          )}
        >
          {row.displayName.slice(0, 1).toUpperCase()}
        </span>
      </div>
      <p className="line-clamp-1 max-w-[88px] text-xs font-semibold text-[var(--foreground)]">
        {row.displayName}
      </p>
      <p className="mt-0.5 text-[10px] font-medium text-[var(--muted-foreground)]">{row.detail}</p>
      <div
        className={cn(
          "mt-3 flex w-full items-end justify-center rounded-t-2xl bg-gradient-to-t px-2 pb-2 pt-4",
          heights[rank as 1 | 2 | 3],
          colors[rank as 1 | 2 | 3],
        )}
      >
        <span className="font-display text-2xl font-extrabold">{rank}</span>
      </div>
    </div>
  );
}

export function CompletionTimeline({
  items,
  className,
}: {
  items: { key: string; displayName: string; durationMs?: number | null }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] p-5 shadow-[var(--shadow-soft)] sm:p-6",
        className,
      )}
    >
      <h2 className="font-display text-lg font-bold text-[var(--foreground)]">Completion feed</h2>
      <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
        Latest finishes across the room
      </p>

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[var(--gamibar-border)] bg-[var(--gamibar-page)] px-4 py-10 text-center text-sm text-[var(--muted-foreground)]">
          Finishes will stream in here during the game.
        </div>
      ) : (
        <ul className="relative mt-6 space-y-0">
          {items.map((item, i) => (
            <li key={item.key} className="relative flex gap-4 pb-6 last:pb-0">
              {i < items.length - 1 && (
                <span className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-[var(--gamibar-border)]" />
              )}
              <span className="relative z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[var(--game-connect-dots-soft)] text-[10px]">
                🏁
              </span>
              <div className="min-w-0 flex-1 rounded-xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] px-3 py-2.5">
                <p className="text-sm text-[var(--muted-foreground)]">
                  <span className="font-semibold text-[var(--foreground)]">{item.displayName}</span>{" "}
                  completed
                  {item.durationMs != null ? (
                    <span className="ml-1 font-medium text-[var(--game-connect-dots-deep)]">
                      in {formatDuration(item.durationMs)}
                    </span>
                  ) : null}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
