import { useEffect, useState } from "react";
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
  onSelect: (opt: QuizOptionId) => void;
  onSubmit: () => void;
};

export function SlidoQuizPanel({
  question,
  questionIndex,
  totalQuestions,
  selected,
  feedback,
  submitting,
  onSelect,
  onSubmit,
}: SlidoQuizPanelProps) {
  const options: QuizOptionId[] = ["A", "B", "C", "D"];

  return (
    <div className="flex flex-col">
      <div className="mb-4 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="rounded-full bg-[#EDE9FE] px-3 py-1 text-xs font-bold text-[#5B21B6]">
          Question {questionIndex + 1} of {totalQuestions}
        </span>
        <div
          className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 sm:mx-0 sm:overflow-visible sm:px-0"
          aria-hidden="true"
        >
          {Array.from({ length: totalQuestions }, (_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 w-4 rounded-full transition-colors",
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
            className="font-display text-[clamp(1.125rem,3.5vw,1.5rem)] font-bold leading-snug text-[#111111]"
          >
            {question.prompt}
          </h2>
        </motion.div>
      </AnimatePresence>

      <fieldset className="mt-6 border-0 p-0">
        <legend className="sr-only">
          Answer choices for question {questionIndex + 1} of {totalQuestions}
        </legend>
        <div className="grid gap-3 sm:gap-2.5">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              disabled={submitting || feedback !== null}
              onClick={() => onSelect(opt)}
              aria-pressed={selected === opt}
              aria-label={`Option ${opt}: ${question.options[opt]}`}
              className={cn(
                "flex min-h-[3.25rem] w-full touch-manipulation items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-semibold text-white transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 sm:min-h-14 sm:py-3",
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
          disabled={!selected || submitting}
          onClick={onSubmit}
          aria-label={submitting ? "Checking answer" : "Submit answer"}
          className="mt-6 flex h-12 w-full touch-manipulation items-center justify-center rounded-xl bg-[#111111] text-sm font-bold text-white transition-colors hover:bg-black active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 disabled:opacity-40 sm:h-14"
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
}: {
  piecesUnlocked: number;
  totalPieces: number;
  endsAt: number | null;
}) {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#E5E7EB] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#7C3AED]">Puzzle Quest</p>
        <p className="text-sm font-semibold text-[#111111]">
          {piecesUnlocked} / {totalPieces} pieces unlocked
        </p>
      </div>
      {left != null && (
        <span className="rounded-full bg-[#EDE9FE] px-3 py-1 text-xs font-bold tabular-nums text-[#5B21B6]">
          {left}s
        </span>
      )}
    </div>
  );
}
