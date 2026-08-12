import { useEffect, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";

import type { QuizOptionId } from "@/lib/game/types";
import { cn } from "@/lib/utils";

const OPTION_COLORS: Record<QuizOptionId, string> = {
  A: "bg-[#E74C3C] hover:bg-[#C0392B]",
  B: "bg-[#3498DB] hover:bg-[#2980B9]",
  C: "bg-[#F1C40F] hover:bg-[#D4AC0D] text-[#111111]",
  D: "bg-[#2ECC71] hover:bg-[#27AE60]",
};

const OPTION_LABELS: Record<QuizOptionId, string> = {
  A: "A",
  B: "B",
  C: "C",
  D: "D",
};

type SlidoQuizPanelProps = {
  question: {
    id: string;
    prompt: string;
    options: Record<QuizOptionId, string>;
    order: number;
  };
  questionIndex: number;
  totalQuestions: number;
  selected: QuizOptionId | null;
  feedback: "correct" | "wrong" | null;
  submitting: boolean;
  disabled?: boolean;
  onSelect: (opt: QuizOptionId) => void;
  onSubmit: () => void;
  /** Anchor for reward fly-out animations (correct feedback banner). */
  feedbackRef?: RefObject<HTMLDivElement | null>;
};

export function SlidoQuizPanel({
  question,
  questionIndex,
  totalQuestions,
  selected,
  feedback,
  submitting,
  disabled = false,
  onSelect,
  onSubmit,
  feedbackRef,
}: SlidoQuizPanelProps) {
  const options: QuizOptionId[] = ["A", "B", "C", "D"];

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="w-fit rounded-full bg-[#EDE9FE] px-3 py-1 text-xs font-bold text-[#5B21B6]">
          Question {questionIndex + 1} of {totalQuestions}
        </span>
        <div
          className="flex max-w-full flex-wrap gap-1 sm:flex-nowrap sm:overflow-visible"
          aria-hidden="true"
        >
          {Array.from({ length: totalQuestions }, (_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 w-3 shrink-0 rounded-full transition-colors sm:w-4",
                i < questionIndex
                  ? "bg-[#7C3AED]"
                  : i === questionIndex
                    ? "bg-[#A78BFA]"
                    : "bg-[#E5E7EB]",
              )}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          <h2
            id={`quiz-question-${question.id}`}
            className="font-display text-[clamp(1.0625rem,4.2vw,1.5rem)] font-bold leading-snug text-[#111111]"
          >
            {question.prompt}
          </h2>
        </motion.div>
      </AnimatePresence>

      <fieldset className="mt-4 border-0 p-0 md:mt-6">
        <legend className="sr-only">
          Answer choices for question {questionIndex + 1} of {totalQuestions}
        </legend>
        <div className="grid gap-3 sm:gap-2.5">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              disabled={submitting || feedback !== null || disabled}
              onClick={() => onSelect(opt)}
              aria-pressed={selected === opt}
              aria-label={`Option ${opt}: ${question.options[opt]}`}
              className={cn(
                "flex min-h-14 w-full touch-manipulation items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-semibold text-white transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 sm:min-h-14 sm:py-3",
                OPTION_COLORS[opt],
                selected === opt && "scale-[1.02] ring-4 ring-white/40",
                feedback !== null && selected !== opt && "opacity-50",
              )}
            >
              <span
                className="grid size-9 shrink-0 place-items-center rounded-lg bg-black/15 text-xs font-bold sm:size-8"
                aria-hidden="true"
              >
                {OPTION_LABELS[opt]}
              </span>
              <span className="min-w-0 flex-1">{question.options[opt]}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <AnimatePresence>
        {feedback && (
          <motion.div
            ref={feedback === "correct" ? feedbackRef : undefined}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            role="status"
            aria-live="polite"
            className={cn(
              "mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold",
              feedback === "correct"
                ? "bg-[#ECFDF5] text-[#059669]"
                : "bg-[#FEF2F2] text-[#DC2626]",
            )}
          >
            {feedback === "correct" ? (
              <>
                <Check className="size-4 shrink-0" aria-hidden="true" />
                Correct! Puzzle piece unlocked.
              </>
            ) : (
              <>
                <X className="size-4 shrink-0" aria-hidden="true" />
                Not quite — try again to unlock this piece.
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!feedback && (
        <button
          type="button"
          disabled={!selected || submitting || disabled}
          onClick={onSubmit}
          aria-label={submitting ? "Checking answer" : "Submit answer"}
          className="mt-4 flex h-12 min-h-12 w-full touch-manipulation items-center justify-center rounded-xl bg-[#111111] text-sm font-bold text-white transition-colors hover:bg-black active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 disabled:opacity-40 md:mt-6 md:h-14"
        >
          {submitting ? "Checking…" : "Submit answer"}
        </button>
      )}
    </div>
  );
}

export function SlidoProgressHeader({
  piecesUnlocked,
  totalPieces,
  endsAt,
  onTimedOut,
}: {
  piecesUnlocked: number;
  totalPieces: number;
  endsAt: number | null;
  onTimedOut?: (timedOut: boolean) => void;
}) {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  const timedOutRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (left == null) return;
    const next = left === 0;
    if (timedOutRef.current === next) return;
    timedOutRef.current = next;
    onTimedOut?.(next);
  }, [left, onTimedOut]);

  return (
    <div className="flex min-w-0 items-center justify-between gap-2 border-b border-[#E5E7EB] bg-white px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-top))] sm:gap-3 sm:px-6 sm:py-3">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7C3AED] sm:text-xs">
          Jigsaw Mission
        </p>
        <p className="truncate text-xs font-semibold text-[#111111] sm:text-sm">
          {piecesUnlocked} / {totalPieces} pieces unlocked
        </p>
      </div>
      {left != null && (
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-bold tabular-nums",
            left === 0 ? "bg-red-100 text-red-800" : "bg-[#EDE9FE] text-[#5B21B6]",
          )}
        >
          {left === 0 ? "Time's up" : `${left}s`}
        </span>
      )}
    </div>
  );
}
