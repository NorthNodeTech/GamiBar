import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import type { Question } from "@/data/questions";

export function QuestionCard({
  question,
  selected,
  locked,
  onSelect,
  index,
  total,
}: {
  question: Question;
  selected: number | null;
  locked: boolean;
  onSelect: (i: number) => void;
  index: number;
  total: number;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Question {index + 1} of {total}
      </p>
      <h3 className="mt-3 text-xl font-semibold leading-snug">{question.prompt}</h3>
      <div className="mt-5 grid gap-2.5">
        {question.options.map((opt, i) => {
          const isCorrect = locked && i === question.answer;
          const isWrong = locked && selected === i && i !== question.answer;
          return (
            <motion.button
              key={opt}
              data-opt={i}
              whileTap={{ scale: locked ? 1 : 0.985 }}
              disabled={locked}
              onClick={() => onSelect(i)}
              className={cn(
                "group flex min-h-[3rem] touch-manipulation items-center gap-3 rounded-lg border border-border bg-secondary/40 px-4 py-3.5 text-left text-sm transition-all active:scale-[0.99] sm:min-h-0 sm:py-3",
                !locked && "hover:border-divider hover:bg-secondary",
                selected === i && !locked && "border-foreground/40 bg-secondary",
                isCorrect && "border-success/60 bg-success/10",
                isWrong && "border-destructive/60 bg-destructive/10",
              )}
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-md border border-border text-[11px] text-muted-foreground">
                {String.fromCharCode(65 + i)}
              </span>
              <span>{opt}</span>
            </motion.button>
          );
        })}
      </div>
      {locked && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-lg border border-border bg-elevated px-4 py-3 text-sm text-muted-foreground"
        >
          <span className="font-medium text-foreground">Explanation. </span>
          {question.explanation}
        </motion.p>
      )}
    </div>
  );
}
