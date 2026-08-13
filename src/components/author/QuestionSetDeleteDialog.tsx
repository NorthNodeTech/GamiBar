import { Trash2 } from "lucide-react";

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

type QuestionSetDeleteDialogProps = {
  open: boolean;
  setName?: string;
  questionCount?: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function QuestionSetDeleteDialog({
  open,
  setName,
  questionCount,
  onOpenChange,
  onConfirm,
}: QuestionSetDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-[24px] border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] p-0 shadow-[var(--shadow-lift)] sm:rounded-[28px]">
        <div className="overflow-hidden rounded-[inherit]">
          <div className="relative border-b border-[var(--gamibar-border)] bg-red-50 px-5 py-5 sm:px-6">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.18),transparent_55%)]"
            />
            <AlertDialogHeader className="relative space-y-3 text-left">
              <div className="grid size-11 place-items-center rounded-2xl bg-white text-red-600 shadow-[var(--shadow-soft)]">
                <Trash2 className="size-5" />
              </div>
              <div>
                <AlertDialogTitle className="font-display text-2xl font-extrabold tracking-tight text-[var(--foreground)]">
                  Delete question set?
                </AlertDialogTitle>
                <AlertDialogDescription className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                  This removes the saved set from your question bank. Existing live rooms will not
                  be changed.
                </AlertDialogDescription>
              </div>
            </AlertDialogHeader>
          </div>

          <div className="space-y-4 px-5 py-5 sm:px-6">
            <div className="rounded-2xl border border-[var(--gamibar-border)] bg-[var(--surface)] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--gamibar-text-tertiary)]">
                Set
              </p>
              <p className="mt-1 truncate font-semibold text-[var(--foreground)]">
                {setName || "Untitled set"}
              </p>
              {questionCount != null ? (
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {questionCount} question{questionCount === 1 ? "" : "s"}
                </p>
              ) : null}
            </div>

            <AlertDialogFooter className="gap-2 sm:space-x-0">
              <AlertDialogCancel className="mt-0 h-11 rounded-xl border-[var(--gamibar-border)] bg-transparent px-5 text-[var(--foreground)] hover:bg-[var(--surface)]">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onConfirm}
                className="h-11 rounded-xl bg-red-600 px-5 font-bold text-white hover:bg-red-700"
              >
                Delete set
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
