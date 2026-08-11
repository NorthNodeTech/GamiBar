import { CheckCircle2, Trophy } from "lucide-react";

import { UnifiedLeaderboard } from "@/components/author/UnifiedLeaderboard";
import { Confetti } from "@/components/games/Confetti";
import { Logo } from "@/components/layout/Logo";
import type { GameMode } from "@/lib/game/config";
import type { GameCompletionViewModel } from "@/lib/game/completion";
import type { LeaderboardRow } from "@/lib/game/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MODE_ACCENT: Record<
  GameMode,
  { badge: string; ring: string; metric: string; glow: string }
> = {
  quiz: {
    badge: "bg-[var(--game-quiz-soft)] text-[var(--game-quiz-deep)]",
    ring: "border-[var(--game-quiz)]/20",
    metric: "text-[var(--game-quiz-deep)]",
    glow: "shadow-[0_24px_60px_rgba(239,68,68,0.1)]",
  },
  quiz_jigsaw: {
    badge: "bg-[#EDE9FE] text-[#5B21B6]",
    ring: "border-[#7C3AED]/20",
    metric: "text-[#5B21B6]",
    glow: "shadow-[0_24px_60px_rgba(124,58,237,0.1)]",
  },
  jigsaw: {
    badge: "bg-[var(--game-jigsaw-soft)] text-[var(--game-jigsaw-deep)]",
    ring: "border-[var(--game-jigsaw)]/20",
    metric: "text-[var(--game-jigsaw-deep)]",
    glow: "shadow-[0_24px_60px_rgba(59,130,246,0.1)]",
  },
  connect_dots: {
    badge: "bg-[var(--game-connect-dots-soft)] text-[var(--game-connect-dots-deep)]",
    ring: "border-[var(--game-connect-dots)]/20",
    metric: "text-[var(--game-connect-dots-deep)]",
    glow: "shadow-[0_24px_60px_rgba(16,185,129,0.1)]",
  },
};

export function GameCompletionScreen({
  model,
  gameFinished,
  showLeaderboard = false,
  leaderboardRows = [],
  participantId,
  onHome,
  celebrate = true,
  children,
}: {
  model: GameCompletionViewModel;
  gameFinished: boolean;
  showLeaderboard?: boolean;
  leaderboardRows?: LeaderboardRow[];
  participantId?: string | null;
  onHome: () => void;
  celebrate?: boolean;
  children?: React.ReactNode;
}) {
  const accent = MODE_ACCENT[model.mode];
  const boardRows = leaderboardRows.map((row) => ({
    ...row,
    detail: row.detail ?? "",
  }));

  return (
    <div className="relative min-h-dvh-screen bg-[var(--gamibar-page)] px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-5">
      {celebrate && <Confetti />}

      <div className="relative z-10 mx-auto max-w-lg">
        <div className="flex justify-center">
          <Logo size={40} />
        </div>

        <div className="mt-6 text-center">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider",
              accent.badge,
            )}
          >
            <CheckCircle2 className="size-3.5" />
            {model.modeTitle}
          </span>
          <h1 className="mt-4 font-display text-[clamp(1.75rem,6vw,2.25rem)] font-extrabold tracking-tight text-[var(--foreground)]">
            Game completed
          </h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">{model.roomName}</p>
          <p className="mt-1 font-semibold text-[var(--foreground)]">{model.displayName}</p>
        </div>

        <section
          className={cn(
            "mt-6 overflow-hidden rounded-[24px] border bg-[var(--gamibar-surface)]",
            accent.ring,
            accent.glow,
          )}
        >
          {model.rank != null && (
            <div className="flex items-center justify-center gap-2 border-b border-[var(--gamibar-border)] bg-[var(--gamibar-page)]/60 px-5 py-3">
              <Trophy className={cn("size-4", accent.metric)} />
              <p className="text-sm text-[var(--muted-foreground)]">
                Your rank{" "}
                <span className={cn("font-display text-lg font-extrabold tabular-nums", accent.metric)}>
                  #{model.rank}
                </span>
              </p>
            </div>
          )}

          <div
            className={cn(
              "grid gap-3 p-5",
              model.metrics.length <= 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-2",
            )}
          >
            {model.metrics.map((metric) => (
              <div
                key={metric.label}
                className={cn(
                  "rounded-2xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)]/70 px-4 py-3.5 text-center",
                  metric.emphasis && "border-[var(--gamibar-border)] bg-white",
                )}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gamibar-text-tertiary)]">
                  {metric.label}
                </p>
                <p
                  className={cn(
                    "mt-1 font-display text-[clamp(1.25rem,4vw,1.75rem)] font-extrabold leading-tight tabular-nums",
                    metric.emphasis ? accent.metric : "text-[var(--foreground)]",
                  )}
                >
                  {metric.value}
                </p>
              </div>
            ))}
          </div>

          {!gameFinished && (
            <p className="border-t border-[var(--gamibar-border)] px-5 py-4 text-center text-sm text-[var(--muted-foreground)]">
              Waiting for the class to finish… Final rankings may update when the teacher ends the
              game.
            </p>
          )}
        </section>

        {children}

        {showLeaderboard && boardRows.length > 0 && (
          <div className="mt-6">
            <UnifiedLeaderboard
              mode={model.mode}
              rows={boardRows}
              finished={gameFinished}
              highlightParticipantId={participantId ?? undefined}
            />
          </div>
        )}

        <Button
          className="mt-6 w-full rounded-xl bg-[var(--foreground)] text-[var(--background)] hover:opacity-90"
          onClick={onHome}
        >
          Back home
        </Button>
      </div>
    </div>
  );
}
