import { CheckCircle2, CircleDashed, Loader2, Users } from "lucide-react";

import { GAME_MODE_META, type GameMode } from "@shared/game/config";
import type { LiveParticipantProgress, ParticipantStatus } from "@shared/game/types";
import { cn } from "@/lib/utils";

function statusLabel(status: ParticipantStatus, completed: boolean): string {
  if (completed) return "Completed";
  if (status === "PLAYING") return "Playing";
  if (status === "DISCONNECTED") return "Disconnected";
  return "Joined";
}

function statusTone(status: ParticipantStatus, completed: boolean): string {
  if (completed) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (status === "PLAYING")
    return "text-[var(--gamibar-brand)] bg-[var(--gamibar-brand-soft)] border-[var(--gamibar-brand)]/20";
  if (status === "DISCONNECTED")
    return "text-[var(--muted-foreground)] bg-[var(--gamibar-page)] border-[var(--gamibar-border)]";
  return "text-[#525252] bg-white border-[var(--gamibar-border)]";
}

function progressColumnLabel(mode: GameMode): string {
  if (mode === "quiz") return "Progress / score";
  if (mode === "jigsaw") return "Pieces earned";
  if (mode === "connect_dots") return "Connections";
  if (mode === "visual_point") return "Targets selected";
  if (mode === "polls") return "Responses";
  return "Progress";
}

const DASHBOARD_ACCENT_CLASS: Record<GameMode, string> = {
  quiz: "bg-gradient-to-br from-[var(--game-quiz)] to-[var(--game-quiz-deep)]",
  quiz_jigsaw: "bg-gradient-to-br from-[#7C3AED] to-[#5B21B6]",
  jigsaw: "bg-gradient-to-br from-[var(--game-jigsaw)] to-[var(--game-jigsaw-deep)]",
  connect_dots:
    "bg-gradient-to-br from-[var(--game-connect-dots)] to-[var(--game-connect-dots-deep)]",
  visual_point:
    "bg-gradient-to-br from-[var(--game-visual-point)] to-[var(--game-visual-point-deep)]",
  polls: "bg-gradient-to-br from-orange-500 to-red-500",
};

export function LiveGameDashboard({
  mode,
  rows,
  joined,
  playing,
  completed,
  className,
}: {
  mode: GameMode;
  rows: LiveParticipantProgress[];
  joined: number;
  playing: number;
  completed: number;
  className?: string;
}) {
  const meta = GAME_MODE_META[mode];
  const showScore = mode === "quiz" || mode === "quiz_jigsaw" || mode === "visual_point";

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[24px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      <div className="border-b border-[var(--gamibar-border)] px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "grid size-10 place-items-center rounded-xl text-white",
                DASHBOARD_ACCENT_CLASS[mode],
              )}
            >
              <Users className="size-4" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-[var(--foreground)]">
                Live game dashboard
              </h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                Track every participant in real time - answers stay hidden from participants.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <SummaryChip label="Joined" value={joined} />
            <SummaryChip label="Playing" value={playing} accent="brand" />
            <SummaryChip label="Completed" value={completed} accent="success" />
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-[var(--muted-foreground)]">
          Waiting for participants to join...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--gamibar-border)] bg-[var(--gamibar-page)]/60 text-[11px] font-semibold uppercase tracking-wider text-[var(--gamibar-text-tertiary)]">
                <th className="px-5 py-3 sm:px-6">Participant</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">{progressColumnLabel(mode)}</th>
                <th className="hidden px-3 py-3 sm:table-cell">Activity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.participantId}
                  className="border-b border-[var(--gamibar-border)]/70 last:border-b-0"
                >
                  <td className="px-5 py-3.5 font-medium text-[var(--foreground)] sm:px-6">
                    {row.displayName}
                  </td>
                  <td className="px-3 py-3.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                        statusTone(row.status, row.completed),
                      )}
                    >
                      {row.completed ? (
                        <CheckCircle2 className="size-3.5" />
                      ) : row.status === "PLAYING" ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <CircleDashed className="size-3.5" />
                      )}
                      {statusLabel(row.status, row.completed)}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold tabular-nums text-[var(--foreground)]">
                          {row.progressText}
                        </span>
                        {showScore && row.score != null && (
                          <span className="rounded-full bg-[var(--gamibar-page)] px-2 py-0.5 text-[11px] font-bold tabular-nums text-[var(--foreground)]">
                            {row.score} pts
                          </span>
                        )}
                      </div>
                      <ProgressBar value={row.progressPercent} completed={row.completed} />
                    </div>
                  </td>
                  <td className="hidden px-3 py-3.5 text-[var(--muted-foreground)] sm:table-cell">
                    {row.completed
                      ? "Finished"
                      : row.progressPercent > 0
                        ? "In progress"
                        : "Not started"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SummaryChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "brand" | "success";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2 text-center",
        accent === "brand" && "border-[var(--gamibar-brand)]/20 bg-[var(--gamibar-brand-soft)]",
        accent === "success" && "border-emerald-200 bg-emerald-50",
        !accent && "border-[var(--gamibar-border)] bg-white",
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-0.5 font-display text-xl font-extrabold tabular-nums text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function ProgressBar({ value, completed }: { value: number; completed: boolean }) {
  return (
    <div className="h-1.5 w-full min-w-[120px] max-w-[220px] overflow-hidden rounded-full bg-[var(--gamibar-page)]">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-300",
          completed ? "bg-emerald-500" : "bg-[var(--gamibar-brand)]",
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
