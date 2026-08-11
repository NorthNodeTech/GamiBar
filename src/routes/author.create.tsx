import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Rocket,
  Upload,
  Loader2,
} from "lucide-react";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";

import { AuthorWizardSteps } from "@/components/author/AuthorWizardSteps";
import { ConnectDotsLayoutWarning } from "@/components/author/ConnectDotsLayoutWarning";
import { GameModePicker } from "@/components/author/GameModePicker";
import { GameTimerSettings } from "@/components/author/GameTimerSettings";
import { ConnectDotsMatchBoard } from "@/components/games/ConnectDotsMatchBoard";
import { AuthorShell } from "@/components/layout/AuthorShell";
import { Button } from "@/components/ui/button";
import { InlineErrorBanner } from "@/components/ui/async-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getStoredAuth, isAuthorAuthenticated, sanitizeAuthorRedirect, useAuth } from "@/lib/auth-store";
import { saveAuthorRoom } from "@/lib/game/client-session";
import {
  buildConnectDotsFromContentPairs,
  connectDotsPairsProgress,
  emptyConnectDotsPairs,
  isConnectDotsPairComplete,
  reorderConnectDotsPairs,
} from "@/lib/game/connect-dots-content";
import { GAME_CONFIG, GAME_MODE_META, type GameMode } from "@/lib/game/config";
import { computeJigsawGrid } from "@/lib/game/jigsaw-grid";
import { assessConnectDotsContentSolvability } from "@/lib/game/connect-dots-solvability";
import { getModeCatalog } from "@/lib/game/mode-catalog";
import { modeUsesQuestions } from "@/lib/game/mode-registry";
import { createRoomFn } from "@/lib/game/room.functions";
import { formatTimerLong, gameInstruction } from "@/lib/game/timer";
import type { ConnectDotsBoardConfig, ConnectDotsContentPair, GamePayload, QuizOptionId, QuizQuestionDraft } from "@/lib/game/types";
import {
  emptyQuizQuestions,
  quizCompletionCount,
  validateGamePayload,
  validateJigsawFile,
} from "@/lib/game/validation";
import { listQuestionSets } from "@/lib/question-bank";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/author/create")({
  beforeLoad: () => {
    const auth = getStoredAuth();
    if (!isAuthorAuthenticated(auth)) {
      throw redirect({
        to: "/author/login",
        search: { redirect: sanitizeAuthorRedirect("/author/create") },
      });
    }
  },
  head: () => ({
    meta: [{ title: "Create Session - GamiBAR" }],
  }),
  component: CreateRoomWizard,
});

type Step = "details" | "mode" | "configure" | "review";

function CreateRoomWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [mode, setMode] = useState<GameMode | null>(null);
  const [questions, setQuestions] = useState<QuizQuestionDraft[]>(() => emptyQuizQuestions("quiz"));
  const [rewardCode, setRewardCode] = useState("");
  const [connectDotsPairs, setConnectDotsPairs] = useState<ConnectDotsContentPair[]>(() =>
    emptyConnectDotsPairs(),
  );
  const [connectDotsSeed, setConnectDotsSeed] = useState(() => `cd-${Date.now()}`);
  const [jigsawUrl, setJigsawUrl] = useState<string | null>(null);
  const [jigsawMime, setJigsawMime] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [activeQ, setActiveQ] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const quizProgress = quizCompletionCount(questions, mode ?? "quiz");
  const connectDotsProgress = connectDotsPairsProgress(connectDotsPairs);
  const modeCatalog = getModeCatalog(mode);

  const connectDotsLayout = useMemo(() => {
    if (connectDotsPairs.length === 0) return null;
    const stubs = connectDotsPairs.map((p) => ({ ...p, question: " ", answer: " " }));
    return buildConnectDotsFromContentPairs(stubs, connectDotsSeed).boardConfig;
  }, [connectDotsPairs.length, connectDotsSeed, connectDotsPairs.map((p) => p.id).join(",")]);

  const connectDotsBoard = useMemo((): ConnectDotsBoardConfig | null => {
    if (!connectDotsLayout) return null;
    return {
      ...connectDotsLayout,
      pairs: connectDotsLayout.pairs.map((p, i) => ({
        ...p,
        question: connectDotsPairs[i]?.question ?? "",
        answer: connectDotsPairs[i]?.answer ?? "",
      })),
      contentPairs: connectDotsPairs,
    };
  }, [connectDotsLayout, connectDotsPairs]);

  const connectDotsSolvability = useMemo(() => {
    if (mode !== "connect_dots" || connectDotsProgress.total === 0) return null;
    return assessConnectDotsContentSolvability(connectDotsPairs, connectDotsSeed);
  }, [mode, connectDotsPairs, connectDotsSeed, connectDotsProgress.total]);

  const payload: GamePayload | null = useMemo(() => {
    if (!mode) return null;
    if (mode === "quiz") {
      return { mode: "quiz", questions, timeLimitSeconds: timerSeconds };
    }
    if (mode === "quiz_jigsaw") {
      return {
        mode: "quiz_jigsaw",
        questions,
        jigsaw: {
          imageUrl: jigsawUrl,
          imageMime: jigsawMime,
          cols: GAME_CONFIG.quiz_jigsaw.cols,
          rows: GAME_CONFIG.quiz_jigsaw.rows,
        },
        rewardCode: rewardCode.trim(),
        timeLimitSeconds: timerSeconds,
      };
    }
    if (mode === "jigsaw") {
      const grid = computeJigsawGrid(questions.length);
      return {
        mode: "jigsaw",
        questions,
        jigsaw: {
          imageUrl: jigsawUrl,
          imageMime: jigsawMime,
          cols: grid.cols,
          rows: grid.rows,
        },
        timeLimitSeconds: timerSeconds,
      };
    }
    if (!connectDotsBoard) return null;
    return {
      mode: "connect_dots",
      connectDots: connectDotsBoard,
      timeLimitSeconds: timerSeconds,
    };
  }, [mode, questions, connectDotsBoard, jigsawUrl, jigsawMime, timerSeconds, rewardCode]);

  const configValid = payload && mode ? validateGamePayload(mode, payload).ok : false;

  const configureHint = useMemo(() => {
    if (step !== "configure" || !mode || !payload) {
      return step === "configure" && !mode ? "Pick a game type before building content." : null;
    }
    const result = validateGamePayload(mode, payload);
    return result.ok ? null : result.error;
  }, [step, mode, payload]);

  const canContinue =
    !submitting &&
    (step === "details" ||
      (step === "mode" && Boolean(mode)) ||
      (step === "configure" && configValid));

  const goNext = () => {
    if (step === "details") {
      if (!name.trim()) {
        toast.error("Enter a room / session name.");
        return;
      }
      setStep("mode");
      return;
    }
    if (step === "mode") {
      if (!mode) {
        toast.error("Select a game type.");
        return;
      }
      setStep("configure");
      return;
    }
    if (step === "configure") {
      if (!mode || !payload) return;
      const v = validateGamePayload(mode, payload);
      if (!v.ok) {
        toast.error(v.error);
        return;
      }
      setStep("review");
    }
  };

  const goBack = () => {
    if (step === "mode") setStep("details");
    else if (step === "configure") setStep("mode");
    else if (step === "review") setStep("configure");
  };

  const handleModeSelect = (next: GameMode) => {
    setMode(next);
    setTimerSeconds(null);
    if (modeUsesQuestions(next)) {
      setQuestions(emptyQuizQuestions(next));
      setActiveQ(0);
    }
    if (next === "connect_dots") {
      setConnectDotsPairs(emptyConnectDotsPairs());
      setConnectDotsSeed(`cd-${Date.now()}`);
      setActiveQ(0);
    }
  };

  const handleImage = async (file: File | undefined) => {
    if (!file) return;
    setImageUploadError(null);
    const v = validateJigsawFile(file);
    if (!v.ok) {
      setImageUploadError(v.error);
      toast.error(v.error);
      return;
    }
    setImageUploading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          setJigsawUrl(String(reader.result));
          setJigsawMime(file.type);
          resolve();
        };
        reader.onerror = () => reject(new Error("Could not read that image. Try a different file."));
        reader.readAsDataURL(file);
      });
      toast.success("Puzzle image locked in.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed.";
      setImageUploadError(message);
      toast.error(message);
    } finally {
      setImageUploading(false);
    }
  };

  const addJigsawQuestion = () => {
    if (questions.length >= GAME_CONFIG.jigsaw.maxQuestions) {
      toast.error(`Maximum ${GAME_CONFIG.jigsaw.maxQuestions} questions.`);
      return;
    }
    setQuestions((prev) => [
      ...prev,
      {
        id: `q-${prev.length + 1}`,
        prompt: "",
        options: { A: "", B: "", C: "", D: "" },
        correctOption: null,
      },
    ]);
    setActiveQ(questions.length);
  };

  const removeJigsawQuestion = () => {
    if (questions.length <= GAME_CONFIG.jigsaw.minQuestions) {
      toast.error("Keep at least one question.");
      return;
    }
    setQuestions((prev) => prev.slice(0, -1));
    setActiveQ((i) => Math.min(i, questions.length - 2));
  };

  const addConnectDotsPair = () => {
    if (connectDotsPairs.length >= GAME_CONFIG.connect_dots.maxPairs) {
      toast.error(`Maximum ${GAME_CONFIG.connect_dots.maxPairs} pairs.`);
      return;
    }
    setConnectDotsPairs((prev) => [
      ...prev,
      { id: `pair-${prev.length + 1}`, question: "", answer: "" },
    ]);
    setActiveQ(connectDotsPairs.length);
  };

  const removeConnectDotsPair = () => {
    if (connectDotsPairs.length <= GAME_CONFIG.connect_dots.minPairs) {
      toast.error(`Keep at least ${GAME_CONFIG.connect_dots.minPairs} pairs.`);
      return;
    }
    setConnectDotsPairs((prev) => prev.slice(0, -1));
    setActiveQ((i) => Math.min(i, connectDotsPairs.length - 2));
  };

  const moveConnectDotsPair = (fromIndex: number, toIndex: number) => {
    setConnectDotsPairs((prev) => reorderConnectDotsPairs(prev, fromIndex, toIndex));
    setActiveQ(toIndex);
  };

  const jigsawGrid = useMemo(
    () => computeJigsawGrid(questions.length),
    [questions.length],
  );

  const handleCreate = async () => {
    if (!mode || !payload || !user || !isAuthorAuthenticated(user)) return;
    const v = validateGamePayload(mode, payload);
    if (!v.ok) {
      toast.error(v.error);
      return;
    }
    setSubmitting(true);
    setCreateError(null);
    try {
      const result = await createRoomFn({
        data: {
          name: name.trim(),
          subject: subject.trim() || "General",
          authorId: user.id,
          authorName: user.name,
          mode,
          payload,
        },
      });
      if (!result.ok) {
        setCreateError(result.error);
        toast.error(result.error);
        return;
      }
      saveAuthorRoom({
        roomId: result.room.id,
        code: result.room.code,
        authorToken: result.authorToken,
      });
      toast.success(`Room ${result.room.code} is ready.`);
      navigate({ to: "/author/room/$roomId", params: { roomId: result.room.id } });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not create room.";
      setCreateError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const isCompactStep = step === "details";

  return (
    <AuthorShell>
      <div
        className={cn(
          "mx-auto w-full pb-6 md:pb-8",
          isCompactStep ? "max-w-lg" : "max-w-5xl",
        )}
      >
        <Link
          to="/author"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#525252] transition-colors hover:text-[#111111]"
        >
          <ChevronLeft className="size-4" />
          Author home
        </Link>

        <div
          className={cn(
            "mt-3 rounded-2xl border border-[var(--gamibar-border)] bg-white shadow-[var(--shadow-soft)]",
            step === "mode" && "overflow-visible",
          )}
        >
          <div className="border-b border-[var(--gamibar-border)] px-4 py-3.5 sm:px-5 sm:py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gamibar-brand)]">
              Create session
            </p>
            <h1 className="mt-0.5 font-display text-xl font-extrabold text-[#111111] sm:text-2xl">
              {step === "details" && "Session details"}
              {step === "mode" && "Pick a game"}
              {step === "configure" && "Game content"}
              {step === "review" && "Launch preview"}
            </h1>
            {step === "details" && (
              <p className="mt-1 text-sm text-[#525252]">
                Name your room so students know they joined the right session.
              </p>
            )}
            {step === "mode" && (
              <p className="mt-1 text-sm text-[#525252]">
                Choose the game that fits this lesson.
              </p>
            )}
            {step === "configure" && mode && (
              <p className="mt-1 text-sm text-[#525252]">
                {mode === "quiz" &&
                  `Add ${GAME_CONFIG.quiz.questionCount} multiple-choice questions for your class.`}
                {mode === "quiz_jigsaw" &&
                  `Add ${GAME_CONFIG.quiz_jigsaw.questionCount} questions, upload a puzzle image, and set a reward code.`}
                {mode === "jigsaw" &&
                  "Add questions, upload the final puzzle image, and mark one correct answer per question."}
                {mode === "connect_dots" &&
                  "Add matching question/answer pairs. Each pair becomes two dots students connect on the grid."}
              </p>
            )}
            <AuthorWizardSteps current={step} compact className="mt-3 sm:mt-4" />
          </div>

          <div
            className={cn(
              "px-4 py-4 sm:px-5 sm:py-5",
              step === "mode" && "overflow-visible",
            )}
          >
            {step === "details" && (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="room-name">Room / session name</Label>
                  <Input
                    id="room-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Biology Battle - Period 3"
                    className="h-11 rounded-xl text-base"
                    autoFocus
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="subject">Subject / topic (optional)</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Biology, Algebra, History…"
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
            )}

            {step === "mode" && <GameModePicker value={mode} onChange={handleModeSelect} />}

            {step === "configure" && !mode && (
              <div className="rounded-2xl border border-dashed border-[var(--gamibar-border)] bg-[var(--gamibar-page)] p-6 text-center">
                <p className="text-sm font-medium text-[#111111]">No game selected</p>
                <p className="mt-1 text-sm text-[#525252]">
                  Go back and pick Quiz, Jigsaw, or Connect Dots.
                </p>
                <Button type="button" variant="outline" size="sm" className="mt-4 rounded-xl" onClick={goBack}>
                  Pick a game
                </Button>
              </div>
            )}

            {step === "configure" && mode && (
              <div className="grid gap-5">
                <GameTimerSettings mode={mode} value={timerSeconds} onChange={setTimerSeconds} />

                {mode === "quiz" && (
                  <QuizEditor
                    questions={questions}
                    activeQ={activeQ}
                    setActiveQ={setActiveQ}
                    setQuestions={setQuestions}
                    progress={quizProgress}
                  />
                )}

                {mode === "quiz_jigsaw" && (
                  <>
                    {listQuestionSets().length > 0 && (
                      <div className="rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] p-4">
                        <Label className="text-xs uppercase tracking-wider text-[#737373]">
                          Import from question bank
                        </Label>
                        <select
                          className="mt-2 h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm"
                          defaultValue=""
                          onChange={(e) => {
                            const set = listQuestionSets().find((s) => s.id === e.target.value);
                            if (!set) return;
                            const count = GAME_CONFIG.quiz_jigsaw.questionCount;
                            setQuestions(
                              set.questions.slice(0, count).map((q, i) => ({
                                ...q,
                                id: `q-${i + 1}`,
                              })),
                            );
                            if (set.subject) setSubject(set.subject);
                            toast.success(`Loaded "${set.name}" (${Math.min(set.questions.length, count)} questions).`);
                          }}
                        >
                          <option value="">Choose a saved set…</option>
                          {listQuestionSets().map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.questions.length} questions)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <QuizEditor
                      questions={questions}
                      activeQ={activeQ}
                      setActiveQ={setActiveQ}
                      setQuestions={setQuestions}
                      progress={quizProgress}
                      accent="purple"
                    />
                    <JigsawUploader
                      jigsawUrl={jigsawUrl}
                      timerLabel={formatTimerLong(timerSeconds)}
                      onFile={handleImage}
                      uploading={imageUploading}
                      uploadError={imageUploadError}
                      onDismissUploadError={() => setImageUploadError(null)}
                      label="Puzzle image"
                      hint="Students reveal this image piece by piece as they answer correctly."
                    />
                    <div className="grid gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-4 sm:p-5">
                      <Label htmlFor="reward-code">Reward code</Label>
                      <Input
                        id="reward-code"
                        value={rewardCode}
                        onChange={(e) => setRewardCode(e.target.value.toUpperCase())}
                        placeholder="e.g. BIO2026"
                        className="h-11 rounded-xl font-mono text-base uppercase tracking-widest"
                        maxLength={16}
                      />
                      <p className="text-xs text-[#737373]">
                        Shown to students when all 9 puzzle pieces are unlocked.
                      </p>
                    </div>
                  </>
                )}

                {mode === "jigsaw" && (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-[#111111]">
                          {questions.length} question{questions.length === 1 ? "" : "s"} ={" "}
                          {questions.length} puzzle piece{questions.length === 1 ? "" : "s"}
                        </p>
                        <p className="text-xs text-[#737373]">
                          Grid auto-splits into {jigsawGrid.cols}×{jigsawGrid.rows} · wrong answers retry at the end
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          disabled={questions.length <= GAME_CONFIG.jigsaw.minQuestions}
                          onClick={removeJigsawQuestion}
                        >
                          Remove
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          disabled={questions.length >= GAME_CONFIG.jigsaw.maxQuestions}
                          onClick={addJigsawQuestion}
                        >
                          Add question
                        </Button>
                      </div>
                    </div>
                    <QuizEditor
                      questions={questions}
                      activeQ={activeQ}
                      setActiveQ={setActiveQ}
                      setQuestions={setQuestions}
                      progress={quizProgress}
                      accent="jigsaw"
                    />
                    <JigsawUploader
                      jigsawUrl={jigsawUrl}
                      timerLabel={formatTimerLong(timerSeconds)}
                      onFile={handleImage}
                      uploading={imageUploading}
                      uploadError={imageUploadError}
                      onDismissUploadError={() => setImageUploadError(null)}
                      pieceCount={questions.length}
                      label="Final puzzle image"
                      hint={`Students reconstruct this image · ${questions.length} pieces · ${formatTimerLong(timerSeconds)} timer`}
                    />
                  </>
                )}

                {mode === "connect_dots" && connectDotsBoard && (
                  <>
                    <ConnectDotsLayoutWarning assessment={connectDotsSolvability} />
                    <ConnectDotsPairEditor
                    pairs={connectDotsPairs}
                    activePair={activeQ}
                    setActivePair={setActiveQ}
                    setPairs={setConnectDotsPairs}
                    progress={connectDotsProgress}
                    board={connectDotsBoard}
                    onAddPair={addConnectDotsPair}
                    onRemovePair={removeConnectDotsPair}
                    onMovePair={moveConnectDotsPair}
                    onShuffleLayout={() => {
                      setConnectDotsSeed(`cd-${Date.now()}`);
                      toast.success("Answer order shuffled.");
                    }}
                    timerLabel={formatTimerLong(timerSeconds)}
                  />
                  </>
                )}
              </div>
            )}

            {step === "review" && mode && modeCatalog && payload && (
              <div className="grid gap-4">
                {mode === "connect_dots" && (
                  <ConnectDotsLayoutWarning assessment={connectDotsSolvability} />
                )}
                <ReviewLaunchCard
                name={name}
                subject={subject}
                mode={mode}
                preview={modeCatalog.preview}
                accentClass={modeCatalog.accentClass}
                badgeClass={modeCatalog.badgeClass}
                timeLimitSeconds={payload.timeLimitSeconds}
              />
              </div>
            )}
          </div>

          <div className="sticky bottom-16 z-10 rounded-b-2xl border-t border-[var(--gamibar-border)] bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-5 md:bottom-0">
            {createError ? (
              <InlineErrorBanner
                className="mb-3"
                message={createError}
                onRetry={() => void handleCreate()}
                retrying={submitting}
                onDismiss={() => setCreateError(null)}
              />
            ) : null}
            {configureHint && (
              <p className="mb-2 text-center text-xs font-medium text-[var(--gamibar-brand)] sm:text-left">
                {configureHint}
              </p>
            )}
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={step === "details" || submitting}
                onClick={goBack}
              >
                Back
              </Button>

              {step !== "review" ? (
                <Button
                  type="button"
                  size="sm"
                  className="rounded-xl bg-[#111111] px-5 hover:bg-black"
                  disabled={!canContinue}
                  onClick={goNext}
                >
                  Continue
                  <ChevronRight className="ml-1 size-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className="rounded-xl bg-[#111111] px-5 hover:bg-black"
                  disabled={!configValid || submitting}
                  onClick={() => void handleCreate()}
                >
                  {submitting ? (
                    "Creating…"
                  ) : (
                    <>
                      <Rocket className="mr-2 size-4" />
                      Launch lobby
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthorShell>
  );
}

function QuizEditor({
  questions,
  activeQ,
  setActiveQ,
  setQuestions,
  progress,
  accent = "default",
}: {
  questions: QuizQuestionDraft[];
  activeQ: number;
  setActiveQ: (n: number) => void;
  setQuestions: Dispatch<SetStateAction<QuizQuestionDraft[]>>;
  progress: { done: number; total: number; complete: boolean };
  accent?: "default" | "purple" | "jigsaw";
}) {
  const q = questions[activeQ]!;
  const options: QuizOptionId[] = ["A", "B", "C", "D"];
  const pct = Math.round((progress.done / progress.total) * 100);
  const accentBadge =
    accent === "purple"
      ? "bg-[#EDE9FE] text-[#5B21B6]"
      : accent === "jigsaw"
        ? "bg-[var(--game-jigsaw-soft)] text-[var(--game-jigsaw-deep)]"
        : "bg-[var(--game-quiz-soft)] text-[var(--game-quiz-deep)]";
  const accentBar =
    accent === "purple"
      ? "bg-gradient-to-r from-[#7C3AED] to-[#5B21B6]"
      : accent === "jigsaw"
        ? "bg-gradient-to-r from-[var(--game-jigsaw)] to-[var(--game-jigsaw-deep)]"
        : "bg-gradient-to-r from-[var(--game-quiz)] to-[var(--game-quiz-deep)]";

  const update = (patch: Partial<QuizQuestionDraft>) => {
    setQuestions((prev) => prev.map((item, i) => (i === activeQ ? { ...item, ...patch } : item)));
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[#111111]">
            Question deck · {progress.done}/{progress.total}
          </p>
          <p className="text-xs text-[#737373]">Tap a number, fill the prompt and four choices, then mark the correct letter.</p>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-bold", accentBadge)}>
          {pct}% ready
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-[var(--gamibar-page)]">
        <div
          className={cn("h-full rounded-full transition-all duration-300", accentBar)}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {questions.map((item, i) => {
          const done = Boolean(
            item.prompt.trim() &&
              item.correctOption &&
              item.options.A.trim() &&
              item.options.B.trim() &&
              item.options.C.trim() &&
              item.options.D.trim(),
          );
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveQ(i)}
              className={cn(
                "grid size-9 place-items-center rounded-xl text-xs font-bold transition-colors",
                i === activeQ
                  ? "bg-[#111111] text-white"
                  : done
                    ? "bg-[var(--game-connect-dots-soft)] text-[var(--game-connect-dots-deep)]"
                    : "bg-[var(--gamibar-page)] text-[#737373]",
              )}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-[var(--gamibar-border)] bg-white p-4 sm:p-5">
        <Label className="text-xs uppercase tracking-wider text-[#737373]">Question {activeQ + 1}</Label>
        <Input
          value={q.prompt}
          onChange={(e) => update({ prompt: e.target.value })}
          placeholder="What should students answer?"
          className="mt-2 h-11 rounded-xl text-base"
        />

        <div className="mt-4 grid gap-2.5">
          <p className="text-xs font-medium text-[#525252]">
            Tap the letter or row to mark the correct answer — it turns green.
          </p>
          {options.map((opt) => {
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
                    : "border-transparent hover:border-[var(--gamibar-border)] hover:bg-[var(--gamibar-page)]",
                )}
              >
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-xl text-xs font-bold transition-all",
                    isCorrect
                      ? "bg-green-600 text-white ring-2 ring-green-200"
                      : "border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] text-[#525252]",
                  )}
                  aria-label={`Mark ${opt} as correct`}
                >
                  {isCorrect ? <Check className="size-4" /> : opt}
                </span>
                <Input
                  value={q.options[opt]}
                  onChange={(e) => update({ options: { ...q.options, [opt]: e.target.value } })}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder={`Answer choice ${opt}`}
                  className={cn(
                    "h-11 rounded-xl border-0 bg-transparent shadow-none focus-visible:ring-0",
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
      </div>
    </div>
  );
}

function JigsawUploader({
  jigsawUrl,
  timerLabel,
  onFile,
  uploading = false,
  uploadError,
  onDismissUploadError,
  label = "Upload your puzzle image",
  hint,
  pieceCount,
}: {
  jigsawUrl: string | null;
  timerLabel: string;
  onFile: (file: File | undefined) => void;
  uploading?: boolean;
  uploadError?: string | null;
  onDismissUploadError?: () => void;
  label?: string;
  hint?: string;
  pieceCount?: number;
}) {
  const pieces =
    pieceCount ??
    (hint ? GAME_CONFIG.quiz_jigsaw.questionCount : GAME_CONFIG.jigsaw.defaultQuestionCount);
  return (
    <div className="grid gap-4">
      <label
        className={cn(
          "group relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[var(--gamibar-border)] bg-[var(--gamibar-page)] p-6 text-center transition-colors hover:border-[var(--game-jigsaw)] sm:min-h-[200px]",
          uploading && "pointer-events-none opacity-80",
        )}
      >
        {uploading ? (
          <div className="relative z-10 flex flex-col items-center">
            <Loader2 className="size-8 animate-spin text-[var(--game-jigsaw)]" aria-hidden="true" />
            <p className="mt-4 text-sm font-semibold text-[#111111]">Uploading image…</p>
            <p className="mt-1 text-xs text-[#737373]">Preparing your puzzle preview</p>
          </div>
        ) : jigsawUrl ? (
          <>
            <img src={jigsawUrl} alt="Puzzle source" className="absolute inset-0 size-full object-cover opacity-90" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[size:20%_20%]" />
            <div className="relative rounded-2xl bg-black/50 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
              Tap to replace image
            </div>
          </>
        ) : (
          <>
            <span className="grid size-14 place-items-center rounded-2xl bg-[var(--game-jigsaw-soft)] text-[var(--game-jigsaw)]">
              <Upload className="size-6" />
            </span>
            <p className="mt-4 font-display text-lg font-bold text-[#111111]">{label}</p>
            <p className="mt-1 text-sm text-[#525252]">JPG, PNG, or WEBP · max 8 MB</p>
            <p className="mt-3 text-xs font-medium text-[#737373]">
              {hint ?? `Auto-splits into ${pieces} pieces · ${timerLabel} timer`}
            </p>
          </>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={uploading}
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      </label>
      {uploadError ? (
        <InlineErrorBanner message={uploadError} onDismiss={onDismissUploadError} />
      ) : null}
    </div>
  );
}

function ConnectDotsPairEditor({
  pairs,
  activePair,
  setActivePair,
  setPairs,
  progress,
  board,
  onAddPair,
  onRemovePair,
  onMovePair,
  onShuffleLayout,
  timerLabel,
}: {
  pairs: ConnectDotsContentPair[];
  activePair: number;
  setActivePair: (n: number) => void;
  setPairs: Dispatch<SetStateAction<ConnectDotsContentPair[]>>;
  progress: { done: number; total: number; complete: boolean };
  board: ConnectDotsBoardConfig;
  onAddPair: () => void;
  onRemovePair: () => void;
  onMovePair: (from: number, to: number) => void;
  onShuffleLayout: () => void;
  timerLabel: string;
}) {
  const pair = pairs[activePair]!;
  const pct = Math.round((progress.done / progress.total) * 100);

  const update = (patch: Partial<ConnectDotsContentPair>) => {
    setPairs((prev) => prev.map((item, i) => (i === activePair ? { ...item, ...patch } : item)));
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[#111111]">
            {pairs.length} pair{pairs.length === 1 ? "" : "s"}
          </p>
          <p className="text-xs text-[#737373]">
            Questions on the left, shuffled answers on the right. Timer: {timerLabel}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={pairs.length <= GAME_CONFIG.connect_dots.minPairs}
            onClick={onRemovePair}
          >
            Remove
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={pairs.length >= GAME_CONFIG.connect_dots.maxPairs}
            onClick={onAddPair}
          >
            Add pair
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[#111111]">
            Matching pairs · {progress.done}/{progress.total}
          </p>
          <p className="text-xs text-[#737373]">
            Tap a number, fill the question and answer, then use arrows to reorder.
          </p>
        </div>
        <span className="rounded-full bg-[var(--game-connect-dots-soft)] px-3 py-1 text-xs font-bold text-[var(--game-connect-dots-deep)]">
          {pct}% ready
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-[var(--gamibar-page)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--game-connect-dots)] to-[var(--game-connect-dots-deep)] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {pairs.map((item, i) => {
          const done = isConnectDotsPairComplete(item);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActivePair(i)}
              className={cn(
                "grid size-9 place-items-center rounded-xl text-xs font-bold transition-colors",
                i === activePair
                  ? "bg-[#111111] text-white"
                  : done
                    ? "bg-[var(--game-connect-dots-soft)] text-[var(--game-connect-dots-deep)]"
                    : "bg-[var(--gamibar-page)] text-[#737373]",
              )}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </button>
          );
        })}
        <div className="ml-auto flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 rounded-xl"
            disabled={activePair <= 0}
            onClick={() => onMovePair(activePair, activePair - 1)}
            aria-label="Move pair up"
          >
            <ChevronUp className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 rounded-xl"
            disabled={activePair >= pairs.length - 1}
            onClick={() => onMovePair(activePair, activePair + 1)}
            aria-label="Move pair down"
          >
            <ChevronDown className="size-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--gamibar-border)] bg-white p-4 sm:p-5">
        <Label className="text-xs uppercase tracking-wider text-[#737373]">Pair {activePair + 1}</Label>
        <div className="mt-3 grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="connect-dots-question">Question</Label>
            <Input
              id="connect-dots-question"
              value={pair.question}
              onChange={(e) => update({ question: e.target.value })}
              placeholder='e.g. "Capital of France"'
              className="h-11 rounded-xl text-base"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="connect-dots-answer">Answer</Label>
            <Input
              id="connect-dots-answer"
              value={pair.answer}
              onChange={(e) => update({ answer: e.target.value })}
              placeholder='e.g. "Paris"'
              className="h-11 rounded-xl text-base"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gamibar-text-tertiary)]">
            Student preview
          </p>
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-xl" onClick={onShuffleLayout}>
            Shuffle answers
          </Button>
        </div>
        <ConnectDotsMatchBoard pairs={pairs} shuffleSeed={board.seed} disabled />
        <p className="mt-2 text-center text-[11px] text-[var(--muted-foreground)]">
          Preview only — students draw paths between matching dots during the live game.
        </p>
      </div>
    </div>
  );
}

function ReviewLaunchCard({
  name,
  subject,
  mode,
  preview,
  accentClass,
  badgeClass,
  timeLimitSeconds,
}: {
  name: string;
  subject: string;
  mode: GameMode;
  preview: string;
  accentClass: string;
  badgeClass: string;
  timeLimitSeconds: number | null;
}) {
  const catalog = getModeCatalog(mode);
  const instruction = gameInstruction(mode, timeLimitSeconds);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#737373]">What happens next</p>
          <ul className="mt-3 space-y-2 text-sm text-[#525252]">
            <li className="flex gap-2">
              <ArrowRight className="mt-0.5 size-4 shrink-0 text-[#111111]" />6-digit room code generated
            </li>
            <li className="flex gap-2">
              <ArrowRight className="mt-0.5 size-4 shrink-0 text-[#111111]" />QR code ready for students to scan
            </li>
            <li className="flex gap-2">
              <ArrowRight className="mt-0.5 size-4 shrink-0 text-[#111111]" />
              Unlimited students can join with the room code or QR
            </li>
            <li className="flex gap-2">
              <ArrowRight className="mt-0.5 size-4 shrink-0 text-[#111111]" />You control Start from the live lobby
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-[var(--gamibar-border)] bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#737373]">Game rules</p>
          <p className="mt-2 text-sm leading-relaxed text-[#525252]">{instruction}</p>
          <p className="mt-3 inline-flex items-center rounded-full bg-[var(--gamibar-page)] px-3 py-1 text-[11px] font-semibold text-[#111111]">
            Timer · {formatTimerLong(timeLimitSeconds)}
          </p>
          {catalog && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {catalog.specs.map((spec) => (
                <span key={spec} className="rounded-full bg-[var(--gamibar-page)] px-2.5 py-0.5 text-[10px] font-semibold text-[#525252]">
                  {spec}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-[var(--gamibar-border)]">
        <div className="relative h-32 sm:h-36">
          <img src={preview} alt="" className="size-full object-cover" />
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent",
              accentClass,
              "mix-blend-multiply opacity-70",
            )}
          />
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <span
              className={cn(
                "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase",
                badgeClass,
              )}
            >
              {GAME_MODE_META[mode].title}
            </span>
            <h3 className="mt-1.5 font-display text-lg font-extrabold text-white sm:text-xl">{name}</h3>
            <p className="mt-0.5 text-xs text-white/75 sm:text-sm">{subject || "General"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
