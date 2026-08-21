import { Link } from "@/lib/navigation";
import { BookOpen, Check, ChevronLeft, ChevronRight, Copy, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { QuestionSetDeleteDialog } from "@/components/author/QuestionSetDeleteDialog";
import { AuthorShell } from "@/components/layout/AuthorShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GAME_CONFIG } from "@shared/game/config";
import {
  deleteQuestionSet,
  duplicateQuestionSet,
  listQuestionSets,
  saveQuestionSet,
  type QuestionBankSet,
} from "@/lib/question-bank";
import { emptyQuizQuestions } from "@shared/game/validation";
import type { QuizQuestionDraft } from "@shared/game/types";
import type { QuizOptionId } from "@shared/game/types";
import { cn } from "@/lib/utils";

const QUIZ_OPTIONS: QuizOptionId[] = ["A", "B", "C", "D"];

function isQuestionComplete(item: QuizQuestionDraft) {
  return Boolean(
    item.prompt.trim() &&
    item.correctOption &&
    item.options.A.trim() &&
    item.options.B.trim() &&
    item.options.C.trim() &&
    item.options.D.trim(),
  );
}

export default function QuestionBankPage() {
  const [sets, setSets] = useState<QuestionBankSet[]>(() => listQuestionSets());
  const [editing, setEditing] = useState<QuestionBankSet | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [questions, setQuestions] = useState<QuizQuestionDraft[]>(() =>
    emptyQuizQuestions("quiz_jigsaw"),
  );
  const [activeQ, setActiveQ] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<QuestionBankSet | null>(null);

  const refresh = useCallback(() => setSets(listQuestionSets()), []);

  const startNew = () => {
    setEditing(null);
    setName("");
    setSubject("");
    setQuestions(emptyQuizQuestions("quiz_jigsaw"));
    setActiveQ(0);
  };

  const startEdit = (set: QuestionBankSet) => {
    setEditing(set);
    setName(set.name);
    setSubject(set.subject);
    setQuestions(set.questions);
    setActiveQ(0);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Enter a name for this question set.");
      return;
    }
    saveQuestionSet({
      id: editing?.id,
      name,
      subject,
      questions,
    });
    toast.success("Question set saved.");
    refresh();
    startNew();
  };

  const handleDelete = (set: QuestionBankSet) => {
    deleteQuestionSet(set.id);
    refresh();
    if (editing?.id === set.id) startNew();
    setDeleteTarget(null);
    toast.success("Question set deleted.");
  };

  const q = questions[activeQ]!;
  const currentComplete = isQuestionComplete(q);
  const hasNext = activeQ < questions.length - 1;
  const hasPrev = activeQ > 0;

  const update = (patch: Partial<QuizQuestionDraft>) => {
    setQuestions((prev) => prev.map((item, i) => (i === activeQ ? { ...item, ...patch } : item)));
  };

  return (
    <AuthorShell>
      <div className="mx-auto max-w-5xl pb-8">
        <Link to="/author" className="text-sm font-medium text-[#525252] hover:text-[#111111]">
          ← Home
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-[#111111]">Question Bank</h1>
            <p className="mt-1 text-sm text-[#525252]">
              Save question sets with correct answers. Reuse them when creating Puzzle Quest
              sessions.
            </p>
          </div>
          <Button onClick={startNew} className="rounded-xl bg-[#111111] hover:bg-black">
            <Plus className="mr-2 size-4" />
            New set
          </Button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[#737373]">Saved sets</p>
            {sets.length === 0 ? (
              <p className="mt-4 text-sm text-[#737373]">No saved sets yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {sets.map((set) => (
                  <li key={set.id}>
                    <button
                      type="button"
                      onClick={() => startEdit(set)}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left transition-colors",
                        editing?.id === set.id
                          ? "bg-[#EDE9FE] text-[#5B21B6]"
                          : "hover:bg-[#F9FAFB]",
                      )}
                    >
                      <BookOpen className="mt-0.5 size-4 shrink-0" />
                      <span>
                        <span className="block text-sm font-semibold">{set.name}</span>
                        <span className="text-xs text-[#737373]">
                          {set.questions.length} questions · {set.subject}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Set name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Biology Unit 3"
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label>Subject</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Biology, Math…"
                  className="rounded-xl"
                />
              </div>
            </div>

            <p className="mt-4 text-xs text-[#737373]">
              {GAME_CONFIG.quiz_jigsaw.questionCount} questions recommended for Puzzle Quest (one
              piece per correct answer).
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {questions.map((item, i) => {
                const done = isQuestionComplete(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveQ(i)}
                    className={cn(
                      "grid size-9 place-items-center rounded-xl text-xs font-bold",
                      i === activeQ
                        ? "bg-[#111111] text-white"
                        : done
                          ? "bg-green-100 text-green-700"
                          : "bg-[#F3F4F6] text-[#737373]",
                    )}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-xl border border-[#E5E7EB] p-4">
              <Label className="text-xs uppercase tracking-wider text-[#737373]">
                Question {activeQ + 1}
              </Label>
              <Input
                value={q.prompt}
                onChange={(e) => update({ prompt: e.target.value })}
                placeholder="Question prompt"
                className="mt-2 rounded-xl"
              />
              <p className="mt-3 text-xs font-medium text-[#525252]">
                Tap the letter or row to mark the correct answer — it turns green.
              </p>
              <div className="mt-3 grid gap-2">
                {QUIZ_OPTIONS.map((opt) => {
                  const isCorrect = q.correctOption === opt;
                  return (
                    <div
                      key={opt}
                      role="button"
                      tabIndex={0}
                      onClick={() => update({ correctOption: opt })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          update({ correctOption: opt });
                        }
                      }}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-xl border-2 p-2 transition-all",
                        isCorrect
                          ? "border-green-500 bg-green-50 shadow-[0_0_0_1px_rgba(34,197,94,0.2)]"
                          : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB] hover:bg-[#F9FAFB]",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-10 shrink-0 place-items-center rounded-xl text-xs font-bold transition-all",
                          isCorrect
                            ? "bg-green-600 text-white ring-2 ring-green-200"
                            : "border border-[#E5E7EB] bg-[#F9FAFB] text-[#525252]",
                        )}
                        aria-hidden
                      >
                        {isCorrect ? <Check className="size-4" /> : opt}
                      </span>
                      <Input
                        value={q.options[opt]}
                        onChange={(e) =>
                          update({ options: { ...q.options, [opt]: e.target.value } })
                        }
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        placeholder={`Choice ${opt}`}
                        className={cn(
                          "rounded-xl border-0 bg-transparent shadow-none focus-visible:ring-0",
                          isCorrect && "font-medium text-green-900",
                        )}
                      />
                      {isCorrect && (
                        <span className="shrink-0 pr-1 text-[10px] font-bold uppercase tracking-wide text-green-600">
                          Correct
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E7EB] pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl"
                  disabled={!hasPrev}
                  onClick={() => setActiveQ(activeQ - 1)}
                >
                  <ChevronLeft className="mr-1 size-4" />
                  Previous
                </Button>
                <p className="text-center text-xs text-[#737373]">
                  Question {activeQ + 1} of {questions.length}
                  {currentComplete ? " · Ready" : ""}
                </p>
                <Button
                  type="button"
                  className="h-11 rounded-xl bg-[#111111] hover:bg-black"
                  disabled={!hasNext}
                  onClick={() => setActiveQ(activeQ + 1)}
                >
                  Next question
                  <ChevronRight className="ml-1 size-4" />
                </Button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={handleSave} className="rounded-xl bg-[#111111] hover:bg-black">
                Save set
              </Button>
              {editing && (
                <>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => {
                      const copy = duplicateQuestionSet(editing.id);
                      if (copy) {
                        refresh();
                        startEdit(copy);
                        toast.success("Duplicated.");
                      }
                    }}
                  >
                    <Copy className="mr-2 size-4" />
                    Duplicate
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl text-red-600 hover:text-red-700"
                    onClick={() => setDeleteTarget(editing)}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </Button>
                </>
              )}
              <Button asChild variant="outline" className="rounded-xl">
                <Link to="/author/create">Use in new session →</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <QuestionSetDeleteDialog
        open={deleteTarget !== null}
        setName={deleteTarget?.name}
        questionCount={deleteTarget?.questions.length}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
        }}
      />
    </AuthorShell>
  );
}
