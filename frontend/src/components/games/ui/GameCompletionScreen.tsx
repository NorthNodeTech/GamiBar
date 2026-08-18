import { CheckCircle2, Trophy } from "lucide-react";

import { Confetti } from "@/components/games/ui/Confetti";
import type { GameCompletionViewModel } from "@/lib/game/completion";
import { formatDuration } from "@/lib/game/ranking";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MODE_ACCENT: Record<
  GameCompletionViewModel["mode"],
  { badge: string; metric: string; ring: string }
> = {
  quiz: {
    badge: "bg-[var(--game-quiz-soft)] text-[var(--game-quiz-deep)]",
    metric: "text-[var(--game-quiz-deep)]",
    ring: "border-[var(--game-quiz)]/20",
  },
  quiz_jigsaw: {
    badge: "bg-[#EDE9FE] text-[#5B21B6]",
    metric: "text-[#5B21B6]",
    ring: "border-[#7C3AED]/20",
  },
  jigsaw: {
    badge: "bg-[var(--game-jigsaw-soft)] text-[var(--game-jigsaw-deep)]",
    metric: "text-[var(--game-jigsaw-deep)]",
    ring: "border-[var(--game-jigsaw)]/20",
  },
  connect_dots: {
    badge: "bg-[var(--game-connect-dots-soft)] text-[var(--game-connect-dots-deep)]",
    metric: "text-[var(--game-connect-dots-deep)]",
    ring: "border-[var(--game-connect-dots)]/20",
  },
  visual_point: {
    badge: "bg-[var(--game-visual-point-soft)] text-[var(--game-visual-point-deep)]",
    metric: "text-[var(--game-visual-point-deep)]",
    ring: "border-[var(--game-visual-point)]/20",
  },
  polls: {
    badge: "bg-orange-100 text-orange-800",
    metric: "text-orange-700",
    ring: "border-orange-400/20",
  },
};

export function GameCompletionScreen({
  model,
  gameFinished,
  onHome,
  celebrate = true,
  children,
}: {
  model: GameCompletionViewModel;
  gameFinished: boolean;
  /** @deprecated Leaderboard is no longer shown on the completion screen. */
  showLeaderboard?: boolean;
  leaderboardRows?: unknown[];
  participantId?: string | null;
  onHome: () => void;
  celebrate?: boolean;
  children?: React.ReactNode;
}) {
  const accent = MODE_ACCENT[model.mode];
  const completionTime = formatDuration(model.durationMs);
  const isQuiz = model.mode === "quiz";
  const isPoll = model.mode === "polls";
  const primaryPollMetric = model.metrics[0]?.value ?? "Submitted";
  const rankDisplay = model.rank != null ? `#${model.rank}` : isQuiz ? "#1" : "-";

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[var(--gamibar-page)] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {celebrate && <Confetti />}

      <div className="relative z-10 mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col">
        <header className="shrink-0 text-center">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              accent.badge,
            )}
          >
            <CheckCircle2 className="size-3" />
            {model.modeTitle}
          </span>
          <h1 className="mt-2 font-display text-xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-2xl">
            {isPoll ? "Response submitted" : "Game completed"}
          </h1>
          <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">
            {model.roomName}
            <span className="mx-1.5 text-[var(--gamibar-border)]">-</span>
            <span className="font-medium text-[var(--foreground)]">{model.displayName}</span>
          </p>
        </header>

        {isQuiz ? (
          <>
            <div className="mt-3 shrink-0 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--gamibar-text-tertiary)]">
                Completion time
              </p>
              <p className="mt-0.5 font-display text-2xl font-extrabold tabular-nums leading-none text-[var(--foreground)]">
                {completionTime}
              </p>
            </div>

            <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-4">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--gamibar-text-tertiary)]">
                <Trophy className={cn("size-4", accent.metric)} aria-hidden />
                Your rank
              </p>
              <p
                className={cn(
                  "mt-2 font-display text-[clamp(4.5rem,22vw,7rem)] font-extrabold tabular-nums leading-none tracking-tight",
                  accent.metric,
                )}
                aria-live="polite"
              >
                {rankDisplay}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="mt-3 grid shrink-0 grid-cols-2 gap-2">
              <div
                className={cn(
                  "rounded-2xl border bg-[var(--gamibar-surface)] px-3 py-2.5 text-center",
                  accent.ring,
                )}
              >
                <p className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--gamibar-text-tertiary)]">
                  <Trophy className={cn("size-3", accent.metric)} />
                  {isPoll ? "Responses" : "Your rank"}
                </p>
                {isPoll && (
                  <p
                    className={cn(
                      "mt-0.5 font-display text-2xl font-extrabold tabular-nums leading-none",
                      accent.metric,
                    )}
                  >
                    {primaryPollMetric}
                  </p>
                )}
                <p
                  className={cn(
                    "mt-0.5 font-display text-2xl font-extrabold tabular-nums leading-none",
                    accent.metric,
                    isPoll && "hidden",
                  )}
                >
                  {model.rank != null ? `#${model.rank}` : "-"}
                </p>
              </div>

              <div
                className={cn(
                  "rounded-2xl border bg-[var(--gamibar-surface)] px-3 py-2.5 text-center",
                  accent.ring,
                )}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--gamibar-text-tertiary)]">
                  {isPoll ? "Submission time" : "Completion time"}
                </p>
                <p className="mt-0.5 font-display text-2xl font-extrabold tabular-nums leading-none text-[var(--foreground)]">
                  {completionTime}
                </p>
              </div>
            </div>

            {children ? (
              <div className="mt-3 flex min-h-0 flex-1 flex-col">{children}</div>
            ) : (
              <div className="mt-3 min-h-0 flex-1" />
            )}
          </>
        )}

        {!gameFinished && (
          <p className="mt-2 shrink-0 text-center text-[10px] leading-snug text-[var(--muted-foreground)]">
            {isPoll
              ? "Responses update live on the host screen."
              : "Waiting for the class to finish..."}
          </p>
        )}

        <Button
          className="mt-2 h-11 shrink-0 rounded-xl bg-[var(--foreground)] text-[var(--background)] hover:opacity-90"
          onClick={onHome}
        >
          Back home
        </Button>
      </div>
    </div>
  );
}
