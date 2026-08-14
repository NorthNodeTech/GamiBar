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
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AuthorWizardSteps } from "@/components/author/AuthorWizardSteps";
import { ConnectDotsLayoutWarning } from "@/components/author/ConnectDotsLayoutWarning";
import { GameModePicker } from "@/components/author/GameModePicker";
import { GameTimerSettings } from "@/components/author/GameTimerSettings";
import { ConnectDots } from "@/components/games/ConnectDots";
import { AuthorShell } from "@/components/layout/AuthorShell";
import { Button } from "@/components/ui/button";
import { InlineErrorBanner } from "@/components/ui/async-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getStoredAuth,
  isAuthorAuthenticated,
  sanitizeAuthorRedirect,
  useAuth,
} from "@/lib/auth-store";
import { saveAuthorRoom } from "@/lib/game/client-session";
import {
  buildConnectDotsFromContentPairs,
  connectDotsPairsProgress,
  emptyConnectDotsPairs,
  isConnectDotsPairComplete,
  reorderConnectDotsPairs,
} from "@/lib/game/connect-dots-content";
import { GAME_CONFIG, GAME_MODE_META, type GameMode } from "@/lib/game/config";
import {
  DEFAULT_JIGSAW_TEMPLATE_ID,
  JIGSAW_TEMPLATES,
  defaultQuestionCountForTemplate,
  jigsawTemplateById,
  layoutFromTemplate,
  minQuestionCountForTemplate,
  type JigsawTemplateId,
} from "@/lib/game/jigsaw-grid";
import {
  defaultPieceUnlockAt,
  describeTileUnlockSchedule,
  normalizePieceUnlockAt,
  pieceUnlockAtOptions,
  tileUnlockScheduleEntries,
} from "@/lib/game/jigsaw-tile-rewards";
import { assessConnectDotsContentSolvability } from "@/lib/game/connect-dots-solvability";
import { getModeCatalog, type GameModeCatalogItem } from "@/lib/game/mode-catalog";
import { modeUsesQuestions } from "@/lib/game/mode-registry";
import { createRoomFn } from "@/lib/game/room.functions";
import { formatTimerLong, gameInstruction } from "@/lib/game/timer";
import type {
  ConnectDotsBoardConfig,
  ConnectDotsContentPair,
  GamePayload,
  QuizOptionId,
  QuizQuestionDraft,
} from "@/lib/game/types";
import { prepareJigsawImage } from "@/lib/game/jigsaw-image";
import {
  emptyQuizQuestions,
  emptyQuizQuestionsWithCount,
  quizCompletionCount,
  validateGamePayload,
} from "@/lib/game/validation";
import { listQuestionSets } from "@/lib/question-bank";
import { cn } from "@/lib/utils";

const createSearchSchema = z.object({
  mode: z.enum(["quiz", "jigsaw", "connect_dots"]).optional(),
});

export const Route = createFileRoute("/author/create")({
  validateSearch: createSearchSchema,
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
const QUIZ_OPTION_IDS: QuizOptionId[] = ["A", "B", "C", "D"];

function CreateRoomWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mode: presetMode } = Route.useSearch();
  const skipModeStep = useRef(Boolean(presetMode));
  const [step, setStep] = useState<Step>("mode");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [mode, setMode] = useState<GameMode | null>(presetMode ?? "quiz");
  const [questions, setQuestions] = useState<QuizQuestionDraft[]>(() => emptyQuizQuestions("quiz"));
  const [rewardCode, setRewardCode] = useState("");
  const [connectDotsPairs, setConnectDotsPairs] = useState<ConnectDotsContentPair[]>(() =>
    emptyConnectDotsPairs(),
  );
  const [connectDotsSeed, setConnectDotsSeed] = useState(() => `cd-${Date.now()}`);
  const [jigsawUrl, setJigsawUrl] = useState<string | null>(null);
  const [jigsawMime, setJigsawMime] = useState<string | null>(null);
  const [jigsawTemplateId, setJigsawTemplateId] = useState<JigsawTemplateId>(
    DEFAULT_JIGSAW_TEMPLATE_ID,
  );
  const [jigsawPieceUnlockAt, setJigsawPieceUnlockAt] = useState<number[]>(() => {
    const template = jigsawTemplateById(DEFAULT_JIGSAW_TEMPLATE_ID);
    const questionCount = defaultQuestionCountForTemplate(template);
    const tileCount = layoutFromTemplate(template).tileCount;
    return defaultPieceUnlockAt(questionCount, tileCount);
  });
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
  }, [connectDotsPairs, connectDotsSeed]);

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
      const grid = layoutFromTemplate(jigsawTemplateById(jigsawTemplateId));
      return {
        mode: "jigsaw",
        questions,
        jigsaw: {
          imageUrl: jigsawUrl,
          imageMime: jigsawMime,
          cols: grid.cols,
          rows: grid.rows,
          pieceUnlockAt: jigsawPieceUnlockAt,
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
  }, [
    mode,
    questions,
    connectDotsBoard,
    jigsawUrl,
    jigsawMime,
    jigsawTemplateId,
    jigsawPieceUnlockAt,
    timerSeconds,
    rewardCode,
  ]);

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
    ((step === "mode" && Boolean(mode)) ||
      (step === "details" && Boolean(name.trim())) ||
      (step === "configure" && configValid));

  const goNext = () => {
    if (step === "mode") {
      if (!mode) {
        toast.error("Select a game type.");
        return;
      }
      setStep("details");
      return;
    }
    if (step === "details") {
      if (!name.trim()) {
        toast.error("Enter a room / session name.");
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
    if (step === "details") setStep("mode");
    else if (step === "configure") setStep("details");
    else if (step === "review") setStep("configure");
  };

  const handleModeSelect = (next: GameMode, options?: { preserveSkip?: boolean }) => {
    if (!options?.preserveSkip) {
      skipModeStep.current = false;
    }
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
    if (next === "jigsaw") {
      const template = jigsawTemplateById(DEFAULT_JIGSAW_TEMPLATE_ID);
      setJigsawTemplateId(DEFAULT_JIGSAW_TEMPLATE_ID);
      setJigsawPieceUnlockAt(
        defaultPieceUnlockAt(
          defaultQuestionCountForTemplate(template),
          layoutFromTemplate(template).tileCount,
        ),
      );
    }
  };

  const handleJigsawTemplateChange = (nextTemplateId: JigsawTemplateId) => {
    const template = jigsawTemplateById(nextTemplateId);
    setJigsawTemplateId(nextTemplateId);
    const minQuestions = minQuestionCountForTemplate(template);
    const tileCount = layoutFromTemplate(template).tileCount;
    setQuestions((prev) => {
      if (prev.length >= minQuestions) return prev;
      const next = [...prev];
      while (next.length < minQuestions) {
        next.push({
          id: `q-${next.length + 1}`,
          prompt: "",
          options: { A: "", B: "", C: "", D: "" },
          correctOption: null,
        });
      }
      return next;
    });
    setJigsawPieceUnlockAt((prev) => {
      const questionCount = Math.max(questions.length, minQuestions);
      if (prev.length === tileCount) {
        return normalizePieceUnlockAt(prev, questionCount, tileCount);
      }
      return defaultPieceUnlockAt(questionCount, tileCount);
    });
    setActiveQ(0);
  };

  useEffect(() => {
    if (presetMode) {
      handleModeSelect(presetMode, { preserveSkip: true });
    }
    // Apply home-page preset once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImage = async (file: File | undefined) => {
    if (!file) return;
    setImageUploadError(null);
    setImageUploading(true);
    try {
      const result = await prepareJigsawImage(file);
      if (!result.ok) {
        setImageUploadError(result.error);
        toast.error(result.error);
        return;
      }
      setJigsawUrl(result.dataUrl);
      setJigsawMime(result.mime);
      toast.success(
        result.cropped
          ? "Image cropped to a square so pieces fit the puzzle grid."
          : "Square puzzle image locked in.",
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed.";
      setImageUploadError(message);
      toast.error(message);
    } finally {
      setImageUploading(false);
    }
  };

  const addQuestion = (limits: { minQuestions: number; maxQuestions: number }) => {
    if (limits.maxQuestions > 0 && questions.length >= limits.maxQuestions) {
      toast.error(`Maximum ${limits.maxQuestions} questions.`);
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

  const removeQuestion = (limits: { minQuestions: number; maxQuestions: number }) => {
    if (questions.length <= limits.minQuestions) {
      toast.error("Keep at least one question.");
      return;
    }
    setQuestions((prev) => prev.slice(0, -1));
    setActiveQ((i) => Math.min(i, questions.length - 2));
  };

  const addJigsawQuestion = () =>
    addQuestion({
      minQuestions: jigsawMinQuestions,
      maxQuestions: GAME_CONFIG.jigsaw.maxQuestions,
    });
  const removeJigsawQuestion = () =>
    removeQuestion({
      minQuestions: jigsawMinQuestions,
      maxQuestions: GAME_CONFIG.jigsaw.maxQuestions,
    });
  const addQuizQuestion = () => addQuestion(GAME_CONFIG.quiz);
  const removeQuizQuestion = () => removeQuestion(GAME_CONFIG.quiz);

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

  const jigsawTemplate = useMemo(() => jigsawTemplateById(jigsawTemplateId), [jigsawTemplateId]);
  const jigsawGrid = useMemo(() => layoutFromTemplate(jigsawTemplate), [jigsawTemplate]);
  const jigsawMinQuestions = useMemo(
    () => minQuestionCountForTemplate(jigsawTemplate),
    [jigsawTemplate],
  );
  const jigsawUnlockHint = useMemo(
    () => describeTileUnlockSchedule(questions.length, jigsawGrid.tileCount, jigsawPieceUnlockAt),
    [questions.length, jigsawGrid.tileCount, jigsawPieceUnlockAt],
  );
  const jigsawUnlockSchedule = useMemo(
    () => tileUnlockScheduleEntries(questions.length, jigsawGrid.tileCount, jigsawPieceUnlockAt),
    [questions.length, jigsawGrid.tileCount, jigsawPieceUnlockAt],
  );

  useEffect(() => {
    if (mode !== "jigsaw") return;
    setJigsawPieceUnlockAt((prev) =>
      normalizePieceUnlockAt(prev, questions.length, jigsawGrid.tileCount),
    );
  }, [mode, questions.length, jigsawGrid.tileCount]);

  const handlePieceUnlockChange = (pieceIndex: number, value: string) => {
    const nextValue = Number.parseInt(value, 10);
    if (!Number.isFinite(nextValue)) return;
    setJigsawPieceUnlockAt((prev) => {
      const next = [...prev];
      next[pieceIndex] = nextValue;
      return normalizePieceUnlockAt(next, questions.length, jigsawGrid.tileCount);
    });
  };

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

  return (
    <AuthorShell>
      <div className="author-page mx-auto w-full max-w-5xl min-w-0 pb-6 md:pb-8">
        <Link
          to="/author"
          className="inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
        >
          <ChevronLeft className="size-4" />
          Home
        </Link>

        <div className="author-card relative mt-3 flex flex-col overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--gamibar-brand)]/45 to-transparent"
          />
          <div className="border-b border-[var(--gamibar-border)] bg-[var(--gamibar-page)]/50 px-4 py-3.5 sm:px-5 sm:py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gamibar-brand)]">
              Create session
            </p>
            <h1 className="mt-0.5 font-display text-xl font-extrabold text-[var(--foreground)] sm:text-2xl">
              {step === "mode" && (skipModeStep.current ? "Your game" : "Pick a game")}
              {step === "details" && "Session details"}
              {step === "configure" && "Game content"}
              {step === "review" && "Launch preview"}
            </h1>
            {step === "mode" && skipModeStep.current && (
              <p className="mt-1 text-sm text-[#525252]">
                You chose this game from home. Continue to name your session.
              </p>
            )}
            {step === "mode" && !skipModeStep.current && (
              <p className="mt-1 hidden text-sm text-[#525252] sm:block">
                Choose the game that fits this lesson.
              </p>
            )}
            {step === "details" && (
              <p className="mt-1 hidden text-sm text-[#525252] sm:block">
                Name your room so students know they joined the right session.
              </p>
            )}
            {step === "configure" && mode && (
              <p className="mt-1 hidden text-sm text-[#525252] sm:block">
                {mode === "quiz" &&
                  "Add multiple-choice questions for your class. Use Add or Remove to set how many you need."}
                {mode === "quiz_jigsaw" &&
                  `Add ${GAME_CONFIG.quiz_jigsaw.questionCount} questions, upload a puzzle image, and set a reward code.`}
                {mode === "jigsaw" &&
                  "In Puzzle setup, choose 2×2, 3×3, or 4×4 first, then add questions and upload the image."}
                {mode === "connect_dots" &&
                  "Add matching question/answer pairs. Each pair becomes two dots students connect on the grid."}
              </p>
            )}
            <AuthorWizardSteps current={step} compact className="mt-3 sm:mt-4" />
          </div>

          <div className={cn("wizard-sticky-content px-4 py-4 sm:px-5 sm:py-5")}>
            {step === "mode" && skipModeStep.current && mode && modeCatalog && (
              <SelectedGamePreview mode={mode} catalog={modeCatalog} />
            )}

            {step === "mode" && !skipModeStep.current && (
              <GameModePicker value={mode} onChange={handleModeSelect} />
            )}

            {step === "details" && (
              <div className="mx-auto grid w-full max-w-xl gap-4 py-1 sm:py-3">
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

            {step === "mode" && skipModeStep.current && (
              <p className="mt-4 text-center text-xs text-[#737373]">
                Want a different game?{" "}
                <Link
                  to="/author"
                  className="font-semibold text-[#111111] underline-offset-2 hover:underline"
                >
                  Go back home
                </Link>
              </p>
            )}

            {step === "configure" && !mode && (
              <div className="rounded-2xl border border-dashed border-[var(--gamibar-border)] bg-[var(--gamibar-page)] p-6 text-center">
                <p className="text-sm font-medium text-[#111111]">No game selected</p>
                <p className="mt-1 text-sm text-[#525252]">
                  Go back and pick Quiz, Jigsaw, or Connect Dots.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-xl"
                  onClick={goBack}
                >
                  Pick a game
                </Button>
              </div>
            )}

            {step === "configure" && mode && (
              <div className="grid gap-5">
                <GameTimerSettings mode={mode} value={timerSeconds} onChange={setTimerSeconds} />

                {mode === "quiz" && (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-[#111111]">
                          {questions.length} question{questions.length === 1 ? "" : "s"}
                        </p>
                        <p className="text-xs text-[#737373]">
                          One attempt per question · accuracy-first ranking
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          disabled={questions.length <= GAME_CONFIG.quiz.minQuestions}
                          onClick={removeQuizQuestion}
                        >
                          Remove
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          disabled={
                            GAME_CONFIG.quiz.maxQuestions > 0 &&
                            questions.length >= GAME_CONFIG.quiz.maxQuestions
                          }
                          onClick={addQuizQuestion}
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
                    />
                  </>
                )}

                {mode === "quiz_jigsaw" && (
                  <>
                    {listQuestionSets().length > 0 && (
                      <div className="rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] p-4">
                        <Label
                          htmlFor="question-bank-import"
                          className="text-xs uppercase tracking-wider text-[#737373]"
                        >
                          Import from question bank
                        </Label>
                        <select
                          id="question-bank-import"
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
                            toast.success(
                              `Loaded "${set.name}" (${Math.min(set.questions.length, count)} questions).`,
                            );
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
                      gridCols={GAME_CONFIG.quiz_jigsaw.cols}
                      gridRows={GAME_CONFIG.quiz_jigsaw.rows}
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
                    <div className="rounded-2xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] p-4 sm:p-5">
                      <p className="text-sm font-semibold text-[#111111]">Puzzle setup</p>
                      <p className="mt-1 text-xs text-[#737373]">
                        Choose the grid first, then set questions and when each piece unlocks.
                      </p>

                      <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--game-jigsaw-deep)]">
                        Step 1 · Grid template
                      </p>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {JIGSAW_TEMPLATES.map((template) => {
                          const active = template.id === jigsawTemplateId;
                          return (
                            <button
                              key={template.id}
                              type="button"
                              onClick={() => handleJigsawTemplateChange(template.id)}
                              className={cn(
                                "rounded-xl border px-3 py-3 text-center transition-colors",
                                active
                                  ? "border-[var(--game-jigsaw)] bg-[var(--game-jigsaw-soft)] text-[var(--game-jigsaw-deep)] ring-2 ring-[var(--game-jigsaw)]/25"
                                  : "border-[var(--gamibar-border)] bg-white text-[#525252] hover:border-[var(--game-jigsaw)]/40",
                              )}
                            >
                              <span className="block font-display text-lg font-bold">
                                {template.label}
                              </span>
                              <span className="mt-0.5 block text-[11px] font-medium">
                                {template.tileCount} piece{template.tileCount === 1 ? "" : "s"}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--game-jigsaw-deep)]">
                            Step 2 · Questions
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[#111111]">
                            {questions.length} question{questions.length === 1 ? "" : "s"} ·{" "}
                            {jigsawGrid.cols}×{jigsawGrid.rows} grid ({jigsawGrid.tileCount} pieces)
                          </p>
                          <p className="mt-0.5 text-xs text-[#737373]">
                            Minimum {jigsawMinQuestions} questions for this grid · wrong answers
                            retry at the end
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-xl"
                            disabled={questions.length <= jigsawMinQuestions}
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

                      <div className="mt-4 rounded-xl border border-[var(--gamibar-border)] bg-white px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
                          Piece reward schedule
                        </p>
                        <p className="mt-1 text-xs font-medium text-[var(--game-jigsaw-deep)]">
                          {jigsawUnlockHint}
                        </p>
                        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                          {jigsawUnlockSchedule.map((entry, index) => {
                            const options = pieceUnlockAtOptions(
                              index,
                              questions.length,
                              jigsawGrid.tileCount,
                              jigsawPieceUnlockAt,
                            );
                            return (
                              <li
                                key={entry.piece}
                                className="flex items-center justify-between gap-2 rounded-lg bg-[var(--gamibar-page)] px-2.5 py-1.5 text-xs"
                              >
                                <span className="shrink-0 font-semibold text-[#111111]">
                                  Piece {entry.piece}
                                </span>
                                <div className="flex min-w-0 items-center gap-1.5 text-[#525252]">
                                  <span className="shrink-0">after</span>
                                  <Select
                                    value={String(entry.afterCorrect)}
                                    onValueChange={(value) => handlePieceUnlockChange(index, value)}
                                  >
                                    <SelectTrigger className="h-7 w-[4.5rem] rounded-lg border-[var(--gamibar-border)] bg-white px-2 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {options.map((option) => (
                                        <SelectItem key={option} value={String(option)}>
                                          {option}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <span className="shrink-0">correct</span>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
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
                      pieceCount={jigsawGrid.tileCount}
                      gridCols={jigsawGrid.cols}
                      gridRows={jigsawGrid.rows}
                      label="Final puzzle image"
                      hint={`Students reconstruct this ${jigsawGrid.cols}×${jigsawGrid.rows} image · ${jigsawGrid.tileCount} pieces · ${formatTimerLong(timerSeconds)} timer`}
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
                  questionCount={
                    mode === "quiz" && payload.mode === "quiz"
                      ? payload.questions.length
                      : undefined
                  }
                />
              </div>
            )}
          </div>

          <div className="wizard-sticky-footer rounded-b-[1.25rem] px-4 py-3 sm:px-5">
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 min-h-[2.75rem] min-w-[5.5rem] flex-1 rounded-xl sm:h-9 sm:min-w-0 sm:flex-none sm:px-3 sm:text-sm"
                disabled={step === "mode" || submitting}
                onClick={goBack}
              >
                Back
              </Button>

              {step !== "review" ? (
                <Button
                  type="button"
                  className="h-11 min-h-[2.75rem] flex-1 rounded-xl bg-[#111111] px-5 hover:bg-black sm:h-9 sm:flex-none sm:px-4 sm:text-sm"
                  disabled={!canContinue}
                  onClick={goNext}
                >
                  Continue
                  <ChevronRight className="ml-1 size-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  className="h-11 min-h-[2.75rem] flex-1 rounded-xl bg-[#111111] px-5 hover:bg-black sm:h-9 sm:flex-none sm:px-4 sm:text-sm"
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

function SelectedGamePreview({ mode, catalog }: { mode: GameMode; catalog: GameModeCatalogItem }) {
  const Icon = catalog.icon;
  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] shadow-[var(--shadow-soft)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-[var(--gamibar-page)]">
        <img src={catalog.preview} alt="" className="size-full object-cover" />
        <span
          className={cn(
            "absolute left-3 top-3 grid size-10 place-items-center rounded-xl backdrop-blur-sm",
            catalog.badgeClass,
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
      <div className="p-4 sm:p-5">
        <p className="font-display text-lg font-bold text-[#111111]">
          {GAME_MODE_META[mode].title}
        </p>
        <p className="mt-1 text-sm text-[#525252]">{catalog.tagline}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {catalog.specs.map((spec) => (
            <span
              key={spec}
              className="rounded-full bg-[var(--gamibar-page)] px-2 py-0.5 text-[10px] font-semibold text-[#737373]"
            >
              {spec}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function isQuizQuestionComplete(item: QuizQuestionDraft): boolean {
  return Boolean(
    item.prompt.trim() &&
    item.correctOption &&
    item.options.A.trim() &&
    item.options.B.trim() &&
    item.options.C.trim() &&
    item.options.D.trim(),
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
  const options = QUIZ_OPTION_IDS;
  const currentComplete = isQuizQuestionComplete(q);
  const hasNext = activeQ < questions.length - 1;
  const hasPrev = activeQ > 0;
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
          <p className="text-xs text-[#737373]">
            Tap a number, fill the prompt and four choices, then mark the correct letter.
          </p>
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
          const done = isQuizQuestionComplete(item);
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
        <Label className="text-xs uppercase tracking-wider text-[#737373]">
          Question {activeQ + 1}
        </Label>
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

        <div className="mt-5 space-y-3 border-t border-[var(--gamibar-border)] pt-4">
          <p className="text-center text-xs text-[#737373]">
            Question {activeQ + 1} of {questions.length}
            {currentComplete ? " · Ready" : ""}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-[2.75rem] w-full rounded-xl"
              disabled={!hasPrev}
              onClick={() => setActiveQ(activeQ - 1)}
            >
              <ChevronLeft className="mr-1 size-4" />
              Previous
            </Button>
            <Button
              type="button"
              className="h-11 min-h-[2.75rem] w-full rounded-xl bg-[#111111] hover:bg-black"
              disabled={!hasNext}
              onClick={() => setActiveQ(activeQ + 1)}
            >
              Next question
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
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
  gridCols = 3,
  gridRows = 3,
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
  gridCols?: number;
  gridRows?: number;
}) {
  const pieces =
    pieceCount ??
    (hint ? GAME_CONFIG.quiz_jigsaw.questionCount : GAME_CONFIG.jigsaw.defaultQuestionCount);
  const gridLineStyle = {
    backgroundImage: [
      "linear-gradient(rgba(255,255,255,0.22) 1px, transparent 1px)",
      "linear-gradient(90deg, rgba(255,255,255,0.22) 1px, transparent 1px)",
    ].join(", "),
    backgroundSize: `${100 / gridCols}% ${100 / gridRows}%`,
  };

  return (
    <div className="grid gap-4">
      <div className="mx-auto w-full max-w-[320px]">
        <label
          className={cn(
            "group relative block aspect-square w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-[var(--gamibar-border)] bg-[#111111] transition-colors hover:border-[var(--game-jigsaw)]",
            uploading && "pointer-events-none opacity-80",
          )}
        >
          {uploading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--gamibar-page)] px-6 text-center">
              <Loader2
                className="size-8 animate-spin text-[var(--game-jigsaw)]"
                aria-hidden="true"
              />
              <p className="mt-4 text-sm font-semibold text-[#111111]">Preparing image…</p>
              <p className="mt-1 text-xs text-[#737373]">Cropping to a square puzzle canvas</p>
            </div>
          ) : jigsawUrl ? (
            <>
              <img
                src={jigsawUrl}
                alt="Puzzle source"
                className="absolute inset-0 size-full object-cover"
              />
              <div className="absolute inset-0" style={gridLineStyle} aria-hidden />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-10 text-center">
                <span className="inline-block rounded-full bg-black/55 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
                  Tap to replace · {gridCols}×{gridRows} square
                </span>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--gamibar-page)] px-6 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-[var(--game-jigsaw-soft)] text-[var(--game-jigsaw)]">
                <Upload className="size-6" />
              </span>
              <p className="mt-4 font-display text-lg font-bold text-[#111111]">{label}</p>
              <p className="mt-1 text-sm text-[#525252]">JPG, PNG, or WEBP · max 8 MB</p>
              <p className="mt-2 text-xs font-semibold text-[var(--game-jigsaw-deep)]">
                Square 1:1 · center-cropped to fit {gridCols}×{gridRows}
              </p>
              <p className="mt-3 text-xs font-medium text-[#737373]">
                {hint ?? `Splits into ${pieces} pieces · ${timerLabel} timer`}
              </p>
            </div>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </label>
      </div>
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
            Colored dots on the grid — one per question and answer. Timer: {timerLabel}.
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
        <Label className="text-xs uppercase tracking-wider text-[#737373]">
          Pair {activePair + 1}
        </Label>
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-xl"
            onClick={onShuffleLayout}
          >
            Shuffle answers
          </Button>
        </div>
        <ConnectDots
          board={{
            gridSize: board.gridSize,
            difficulty: board.difficulty,
            pairs: board.pairs,
            seed: board.seed,
          }}
          solution={board.solution}
          showControls={false}
          disabled
        />
        <p className="mt-2 text-center text-[11px] text-[var(--muted-foreground)]">
          Preview only — students hover dots to read text, then drag between matching pairs.
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
  questionCount,
}: {
  name: string;
  subject: string;
  mode: GameMode;
  preview: string;
  accentClass: string;
  badgeClass: string;
  timeLimitSeconds: number | null;
  questionCount?: number;
}) {
  const catalog = getModeCatalog(mode);
  const instruction = gameInstruction(mode, timeLimitSeconds, questionCount);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#737373]">
            What happens next
          </p>
          <ul className="mt-3 space-y-2 text-sm text-[#525252]">
            <li className="flex gap-2">
              <ArrowRight className="mt-0.5 size-4 shrink-0 text-[#111111]" />
              6-digit room code generated
            </li>
            <li className="flex gap-2">
              <ArrowRight className="mt-0.5 size-4 shrink-0 text-[#111111]" />
              QR code ready for students to scan
            </li>
            <li className="flex gap-2">
              <ArrowRight className="mt-0.5 size-4 shrink-0 text-[#111111]" />
              Unlimited students can join with the room code or QR
            </li>
            <li className="flex gap-2">
              <ArrowRight className="mt-0.5 size-4 shrink-0 text-[#111111]" />
              You control Start from the live lobby
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-[var(--gamibar-border)] bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#737373]">
            Game rules
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#525252]">{instruction}</p>
          <p className="mt-3 inline-flex items-center rounded-full bg-[var(--gamibar-page)] px-3 py-1 text-[11px] font-semibold text-[#111111]">
            Timer · {formatTimerLong(timeLimitSeconds)}
          </p>
          {catalog && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {catalog.specs.map((spec) => (
                <span
                  key={spec}
                  className="rounded-full bg-[var(--gamibar-page)] px-2.5 py-0.5 text-[10px] font-semibold text-[#525252]"
                >
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
            <h3 className="mt-1.5 font-display text-lg font-extrabold text-white sm:text-xl">
              {name}
            </h3>
            <p className="mt-0.5 text-xs text-white/75 sm:text-sm">{subject || "General"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
