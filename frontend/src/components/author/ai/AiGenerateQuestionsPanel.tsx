import { BookOpenCheck, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  generateAiQuestionsBatch,
  type QuizQuestionGenerationResponse,
} from "@/lib/ai/option-generation";
import type { GameMode } from "@shared/game/types";

const MAX_GENERATION_COUNT = 10;

const WORKING_MESSAGES = [
  "GamiBAR AI is planning like your teaching assistant.",
  "Matching every question to your learners' level.",
  "Writing believable distractors and checking the answer.",
  "Giving the quiz one last teacher-style review.",
] as const;

type QuizMode = Extract<GameMode, "quiz" | "quiz_jigsaw" | "jigsaw">;

type AiGenerateQuestionsPanelProps = {
  mode: QuizMode;
  initialTopic?: string;
  availableSlots: number;
  existingQuestions: string[];
  onApply: (questions: QuizQuestionGenerationResponse[]) => void;
};

export function AiGenerateQuestionsPanel({
  mode,
  initialTopic = "",
  availableSlots,
  existingQuestions,
  onApply,
}: AiGenerateQuestionsPanelProps) {
  const maxCount = Math.max(0, Math.min(MAX_GENERATION_COUNT, availableSlots));
  const [topic, setTopic] = useState(initialTopic);
  const [audience, setAudience] = useState("");
  const [guidance, setGuidance] = useState("");
  const [count, setCount] = useState(Math.max(1, Math.min(maxCount || 1, 5)));
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [generated, setGenerated] = useState<QuizQuestionGenerationResponse[]>([]);
  const cancelRequested = useRef(false);

  useEffect(() => {
    setCount((current) => Math.max(1, Math.min(current, maxCount || 1)));
  }, [maxCount]);

  const startGeneration = async () => {
    const cleanTopic = topic.trim();
    const cleanAudience = audience.trim();
    const requestedCount = Math.min(Math.max(1, Math.trunc(count)), maxCount);

    if (!cleanTopic) {
      toast.error("Enter the topic you want the questions to cover.");
      return;
    }
    if (!cleanAudience) {
      toast.error("Describe the target audience, such as Grade 6 students.");
      return;
    }
    if (maxCount < 1) {
      toast.error("There are no empty question slots available in this game.");
      return;
    }

    cancelRequested.current = false;
    setStopping(false);
    setGenerated([]);
    setOpen(true);
    setPending(true);

    const completed: QuizQuestionGenerationResponse[] = [];
    const BATCH_SIZE = 1;

    try {
      let remaining = requestedCount;
      let batchIndex = 0;

      while (remaining > 0 && !cancelRequested.current) {
        const currentBatchSize = Math.min(BATCH_SIZE, remaining);

        let retries = 2;
        let batchQuestions: QuizQuestionGenerationResponse[] | null = null;
        let lastErr: unknown = null;

        while (retries >= 0 && !cancelRequested.current) {
          try {
            batchQuestions = await generateAiQuestionsBatch({
              kind: "quiz_question",
              mode,
              topic: cleanTopic,
              audience: cleanAudience,
              guidance: guidance.trim(),
              count: currentBatchSize,
              questionNumber: batchIndex + 1,
              totalQuestions: requestedCount,
              avoidQuestions: [
                ...existingQuestions.filter((q) => q.trim()),
                ...completed.map((q) => q.question),
              ],
            });
            break;
          } catch (err) {
            lastErr = err;
            retries -= 1;
            if (retries >= 0 && !cancelRequested.current) {
              await new Promise((resolve) => setTimeout(resolve, 800));
            }
          }
        }

        if (cancelRequested.current) break;

        if (!batchQuestions || batchQuestions.length === 0) {
          throw lastErr || new Error("Could not generate questions for this topic.");
        }

        const sanitizedBatch = batchQuestions.map((q) => ({
          ...q,
          question: q.question.replace(/[`*_~]+/g, "").replace(/<[^>]*>/g, "").replace(/^["'`]+|["'`]+$/g, "").trim(),
          options: {
            A: q.options.A.replace(/[`*_~]+/g, "").replace(/<[^>]*>/g, "").replace(/^["'`]+|["'`]+$/g, "").trim(),
            B: q.options.B.replace(/[`*_~]+/g, "").replace(/<[^>]*>/g, "").replace(/^["'`]+|["'`]+$/g, "").trim(),
            C: q.options.C.replace(/[`*_~]+/g, "").replace(/<[^>]*>/g, "").replace(/^["'`]+|["'`]+$/g, "").trim(),
            D: q.options.D.replace(/[`*_~]+/g, "").replace(/<[^>]*>/g, "").replace(/^["'`]+|["'`]+$/g, "").trim(),
          },
        }));

        completed.push(...sanitizedBatch);
        setGenerated([...completed]);
        remaining -= batchQuestions.length;
        batchIndex += 1;
      }

      if (!cancelRequested.current && completed.length > 0) {
        toast.success(`${completed.length} questions are ready to review.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "GamiBAR AI could not finish the quiz.");
    } finally {
      setPending(false);
      setStopping(false);
    }
  };

  const requestStop = () => {
    cancelRequested.current = true;
    setStopping(true);
  };

  const applyGenerated = () => {
    if (generated.length === 0) return;
    onApply(generated);
    setOpen(false);
    setGenerated([]);
    toast.success(`${generated.length} AI question${generated.length === 1 ? "" : "s"} added.`);
  };

  const progress = count > 0 ? Math.round((generated.length / count) * 100) : 0;
  const workingMessage = WORKING_MESSAGES[generated.length % WORKING_MESSAGES.length];

  return (
    <>
      <section className="rounded-xl sm:rounded-2xl border border-[#D8D4FE] bg-gradient-to-br from-[#F8F7FF] via-white to-[#F2FAFF] p-3 sm:p-5">
        <div className="flex items-center sm:items-start gap-2.5 sm:gap-3">
          <span className="grid size-8 sm:size-10 shrink-0 place-items-center rounded-lg sm:rounded-xl bg-[#111111] text-white shadow-xs">
            <Sparkles className="size-4 sm:size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-xs sm:text-sm font-bold text-[#111111]">Generate quiz with AI</h3>
            <p className="mt-0.5 text-[11px] sm:text-xs leading-snug sm:leading-relaxed text-[#626262]">
              <span className="sm:hidden">Enter topic & audience to auto-generate questions.</span>
              <span className="hidden sm:inline">
                Give GamiBAR AI the topic, learner level, and teaching notes to create questions,
                options, and answers.
              </span>
            </p>
          </div>
        </div>

        <div className="mt-2.5 sm:mt-4 grid gap-2 sm:gap-3 sm:grid-cols-2">
          <div className="grid gap-1 sm:gap-1.5">
            <Label htmlFor={`ai-topic-${mode}`} className="text-[11px] sm:text-xs font-semibold">
              Topic name
            </Label>
            <Input
              id={`ai-topic-${mode}`}
              value={topic}
              maxLength={180}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="e.g. Solar System"
              className="h-9 sm:h-11 rounded-lg sm:rounded-xl text-xs sm:text-sm bg-white"
            />
          </div>
          <div className="grid gap-1 sm:gap-1.5">
            <Label htmlFor={`ai-audience-${mode}`} className="text-[11px] sm:text-xs font-semibold">
              Target audience
            </Label>
            <Input
              id={`ai-audience-${mode}`}
              value={audience}
              maxLength={180}
              onChange={(event) => setAudience(event.target.value)}
              placeholder="e.g. Grade 6 students"
              className="h-9 sm:h-11 rounded-lg sm:rounded-xl text-xs sm:text-sm bg-white"
            />
          </div>
        </div>

        <div className="mt-2 sm:mt-3 grid gap-1 sm:gap-1.5">
          <Label htmlFor={`ai-guidance-${mode}`} className="text-[11px] sm:text-xs font-semibold">
            Author notes <span className="font-normal text-[#737373]">(optional)</span>
          </Label>
          <Textarea
            id={`ai-guidance-${mode}`}
            value={guidance}
            maxLength={1000}
            onChange={(event) => setGuidance(event.target.value)}
            placeholder="e.g. Focus on concepts. Avoid calculations."
            className="min-h-12 sm:min-h-20 resize-y rounded-lg sm:rounded-xl py-1.5 sm:py-2 text-xs sm:text-sm bg-white"
          />
        </div>

        <div className="mt-2.5 sm:mt-3 grid grid-cols-[5.5rem_minmax(0,1fr)] sm:flex sm:items-end sm:justify-between items-end gap-2 sm:gap-3">
          <div className="grid gap-1 sm:gap-1.5 sm:w-44">
            <Label htmlFor={`ai-count-${mode}`} className="text-[11px] sm:text-xs font-semibold">
              Questions
            </Label>
            <Input
              id={`ai-count-${mode}`}
              type="number"
              min={1}
              max={maxCount || 1}
              value={count}
              disabled={maxCount < 1}
              onChange={(event) => {
                const next = Math.trunc(Number(event.target.value));
                setCount(Math.max(1, Math.min(Number.isFinite(next) ? next : 1, maxCount || 1)));
              }}
              className="h-9 sm:h-11 rounded-lg sm:rounded-xl text-xs sm:text-sm bg-white text-center sm:text-left"
            />
            <p className="hidden sm:block text-[11px] text-[#737373]">Maximum 10 at once.</p>
          </div>
          <Button
            type="button"
            className="h-9 sm:h-11 rounded-lg sm:rounded-xl bg-[#111111] px-3 sm:px-5 text-xs sm:text-sm font-bold hover:bg-black w-full sm:w-auto"
            disabled={pending || maxCount < 1}
            onClick={startGeneration}
          >
            <Sparkles className="size-3.5 sm:size-4" />
            <span>Generate questions</span>
          </Button>
        </div>

        {maxCount < 1 && (
          <p className="mt-2.5 sm:mt-3 rounded-lg sm:rounded-xl bg-white px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs text-[#737373]">
            No empty slots available in this game.
          </p>
        )}
      </section>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && pending) cancelRequested.current = true;
          setOpen(nextOpen);
        }}
      >
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {pending ? "GamiBAR AI is building your quiz" : "Review generated questions"}
            </DialogTitle>
            <DialogDescription>
              {pending
                ? `${generated.length}/${count} is done. ${workingMessage}`
                : `${generated.length} question${generated.length === 1 ? " is" : "s are"} ready. Check them before adding them to your deck.`}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] p-4">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold">
              <span className="flex items-center gap-2 text-[#525252]">
                {pending ? (
                  <Loader2 className="size-4 animate-spin text-[#6D5CE7]" />
                ) : (
                  <CheckCircle2 className="size-4 text-green-600" />
                )}
                {pending ? workingMessage : "Teacher review ready"}
              </span>
              <span className="tabular-nums text-[#111111]">
                {generated.length}/{count}
              </span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#E5E7EB]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9] transition-[width] duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            {pending && generated.length < count && (
              <p className="mt-2 text-[11px] text-[#737373]">
                Now preparing question {generated.length + 1} of {count}. Each answer is checked
                before the next question begins.
              </p>
            )}
          </div>

          <div className="grid gap-3">
            {generated.map((item, index) => (
              <article
                key={`${index}-${item.question}`}
                className="rounded-2xl border border-[var(--gamibar-border)] bg-white p-4"
              >
                <div className="flex gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#111111] text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-relaxed text-[#111111]">
                      {item.question}
                    </p>
                    <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                      {(["A", "B", "C", "D"] as const).map((id) => (
                        <p
                          key={id}
                          className={`rounded-lg px-2.5 py-2 text-xs ${
                            item.correctOption === id
                              ? "bg-green-50 font-semibold text-green-800 ring-1 ring-green-200"
                              : "bg-[#F5F5F5] text-[#525252]"
                          }`}
                        >
                          <span className="mr-1 font-bold">{id}.</span> {item.options[id]}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}

            {pending && (
              <div className="flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-[#D8D4FE] bg-[#FAF9FF] text-center">
                <div>
                  <BookOpenCheck className="mx-auto size-6 animate-pulse text-[#6D5CE7]" />
                  <p className="mt-2 text-xs font-medium text-[#626262]">
                    Thinking like a teacher, not filling a stuck screen.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:space-x-0">
            {pending ? (
              <Button type="button" variant="outline" className="rounded-xl" onClick={requestStop}>
                {stopping ? "Stopping after this question..." : "Stop generation"}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="rounded-xl bg-[#111111] hover:bg-black"
                  disabled={generated.length === 0}
                  onClick={applyGenerated}
                >
                  Add {generated.length || ""} question{generated.length === 1 ? "" : "s"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
