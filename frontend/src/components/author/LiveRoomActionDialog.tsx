import { AlertTriangle, Play, Square } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export type LiveRoomAction = "start" | "stop";

type LiveRoomActionDialogProps = {
  action: LiveRoomAction | null;
  busy: boolean;
  joinedCount: number;
  roomCode: string;
  startWarning?: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function LiveRoomActionDialog({
  action,
  busy,
  joinedCount,
  roomCode,
  startWarning,
  onOpenChange,
  onConfirm,
}: LiveRoomActionDialogProps) {
  const isStopping = action === "stop";
  const isStarting = action === "start";

  return (
    <AlertDialog open={action !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-[24px] border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] p-0 shadow-[var(--shadow-lift)] sm:rounded-[28px]">
        <div className="overflow-hidden rounded-[inherit]">
          <div className="relative border-b border-[var(--gamibar-border)] bg-[var(--gamibar-brand-soft)] px-5 py-5 sm:px-6">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.2),transparent_55%)]"
            />
            <AlertDialogHeader className="relative space-y-3 text-left">
              <div className="grid size-11 place-items-center rounded-2xl bg-[var(--gamibar-surface)] text-[var(--gamibar-brand)] shadow-[var(--shadow-soft)]">
                {isStopping ? (
                  <Square className="size-5" />
                ) : startWarning ? (
                  <AlertTriangle className="size-5" />
                ) : (
                  <Play className="size-5" />
                )}
              </div>
              <div>
                <AlertDialogTitle className="font-display text-2xl font-extrabold tracking-tight text-[var(--foreground)]">
                  {isStopping ? "End this game?" : "Start live game?"}
                </AlertDialogTitle>
                <AlertDialogDescription className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {isStopping
                    ? "Participants will stop playing and the final leaderboard will be calculated."
                    : `${joinedCount} participant${joinedCount === 1 ? "" : "s"} will enter the game now.`}
                </AlertDialogDescription>
              </div>
            </AlertDialogHeader>
          </div>

          <div className="space-y-4 px-5 py-5 sm:px-6">
            {isStarting && startWarning ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100">
                {startWarning}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <DialogStat label="Room" value={roomCode} />
              <DialogStat label="Joined" value={joinedCount} />
            </div>

            <AlertDialogFooter className="gap-2 sm:space-x-0">
              <AlertDialogCancel
                disabled={busy}
                className="mt-0 h-11 rounded-xl border-[var(--gamibar-border)] bg-transparent px-5 text-[var(--foreground)] hover:bg-[var(--surface)]"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={busy}
                onClick={onConfirm}
                className={cn(
                  "h-11 rounded-xl px-5 font-bold text-white",
                  isStopping
                    ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-200"
                    : "bg-[var(--gamibar-brand)] hover:bg-[var(--gamibar-brand-hover)]",
                )}
              >
                {busy
                  ? isStopping
                    ? "Ending..."
                    : "Starting..."
                  : isStopping
                    ? "End game"
                    : "Start now"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DialogStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[var(--gamibar-border)] bg-[var(--surface)] px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--gamibar-text-tertiary)]">
        {label}
      </p>
      <p className="mt-1 font-display text-xl font-extrabold tabular-nums text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}
