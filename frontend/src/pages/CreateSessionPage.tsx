import { useSearch } from "@/lib/navigation";
import { Link, useNavigate } from "@/lib/navigation";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Crosshair,
  Plus,
  Rocket,
  Trash2,
  Upload,
  Loader2,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from "react";
import { toast } from "sonner";

import { AiGenerateOptionsButton } from "@/components/author/ai/AiGenerateOptionsButton";
import { AiGenerateQuestionsPanel } from "@/components/author/ai/AiGenerateQuestionsPanel";
import { AuthorWizardSteps } from "@/components/author/AuthorWizardSteps";
import { ConnectDotsLayoutWarning } from "@/components/author/ConnectDotsLayoutWarning";
import { GameModePicker } from "@/components/author/GameModePicker";
import { GameTimerSettings } from "@/components/author/GameTimerSettings";
import { ConnectDots } from "@/components/games/quizes/maze/ConnectDots";
import {
  JigsawImageSourceSelector,
  type JigsawImageSource,
} from "@/components/games/quizes/puzzle/JigsawImageSourceSelector";
import { JigsawLibrary } from "@/components/games/quizes/puzzle/JigsawLibrary";
import { AuthorShell } from "@/components/layout/AuthorShell";
import { SessionFilesPicker } from "@/components/sharing-files/SessionFilesPicker";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
} from "@shared/game/connect-dots-content";
import { GAME_CONFIG, GAME_MODE_META, type GameMode } from "@shared/game/config";
import {
  DEFAULT_POLL_SETTINGS,
  POLL_TYPE_DESCRIPTIONS,
  POLL_TYPE_LABELS,
  emptyPollQuestions,
  newPollQuestion,
  pollCompletionCount,
} from "@shared/game/polls";
import {
  DEFAULT_JIGSAW_TEMPLATE_ID,
  JIGSAW_TEMPLATES,
  defaultQuestionCountForTemplate,
  jigsawTemplateById,
  layoutFromTemplate,
  minQuestionCountForTemplate,
  type JigsawTemplateId,
} from "@shared/game/jigsaw-grid";
import {
  describeTileUnlockSchedule,
  tileUnlockScheduleEntries,
} from "@shared/game/jigsaw-tile-rewards";
import { assessConnectDotsContentSolvability } from "@shared/game/connect-dots-solvability";
import { getModeCatalog, type GameModeCatalogItem } from "@/lib/game/mode-catalog";
import { modeUsesQuestions } from "@shared/game/mode-registry";
import { UpgradeToProDialog } from "@/components/billing/UpgradeToProDialog";
import { createRoomFn } from "@/lib/game/room.functions";
import {
  clampTimer,
  defaultTimerSeconds,
  formatTimerLong,
  gameInstruction,
} from "@shared/game/timer";
import type {
  ConnectDotsBoardConfig,
  ConnectDotsContentPair,
  GamePayload,
  PollQuestionDraft,
  PollSettings,
  PollQuestionType,
  QuizOptionId,
  QuizQuestionDraft,
  TimerMode,
  VisualPointQuestionDraft,
} from "@shared/game/types";
import { prepareJigsawImage } from "@/lib/game/jigsaw-image";
import {
  emptyQuizQuestions,
  emptyQuizQuestionsWithCount,
  emptyVisualPointQuestions,
  quizCompletionCount,
  validateGamePayload,
  visualPointCompletionCount,
} from "@shared/game/validation";
import {
  clampVisualCoordinate,
  createVisualPointId,
  prepareVisualPointImage,
} from "@shared/game/visual-point";
import { listQuestionSets } from "@/lib/question-bank";
import {
  SESSION_FILE_DEFAULT_RETENTION_DAYS,
  type SessionFileRetentionDays,
  uploadSessionFiles,
  validateSessionShareFiles,
} from "@/lib/sharing-files/session-files";
import { cn } from "@/lib/utils";
import type {
  AiGenerationContext,
  QuizQuestionGenerationResponse,
} from "@/lib/ai/option-generation";

const POINTER_COLORS = [
  { label: "Dark Gray", value: "#111111" },
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Yellow", value: "#eab308" },
  { label: "Green", value: "#22c55e" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Purple", value: "#a855f7" },
  { label: "Pink", value: "#ec4899" },
];

type Step = "details" | "mode" | "configure" | "review";
const QUIZ_OPTION_IDS: QuizOptionId[] = ["A", "B", "C", "D"];
const POLL_TYPE_IDS: PollQuestionType[] = [
  "rating",
  "single_choice",
  "multiple_choice",
  "short_text",
  "long_text",
  "yes_no",
];

export default function CreateRoomWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mode: requestedMode } = useSearch();
  const presetMode: GameMode | undefined =
    requestedMode && requestedMode in GAME_MODE_META ? (requestedMode as GameMode) : undefined;
  const skipModeStep = useRef(Boolean(presetMode));
  const [step, setStep] = useState<Step>("mode");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [mode, setMode] = useState<GameMode | null>(presetMode ?? "quiz");
  const [questions, setQuestions] = useState<QuizQuestionDraft[]>(() => emptyQuizQuestions("quiz"));
  const [pollQuestions, setPollQuestions] = useState<PollQuestionDraft[]>(() =>
    emptyPollQuestions(),
  );
  const [pollSettings, setPollSettings] = useState(DEFAULT_POLL_SETTINGS);
  const [visualQuestions, setVisualQuestions] = useState<VisualPointQuestionDraft[]>(() =>
    emptyVisualPointQuestions(),
  );
  const [rewardCode, setRewardCode] = useState("");
  const [connectDotsPairs, setConnectDotsPairs] = useState<ConnectDotsContentPair[]>(() =>
    emptyConnectDotsPairs(),
  );
  const [connectDotsSeed, setConnectDotsSeed] = useState(() => `cd-${Date.now()}`);
  const [jigsawUrl, setJigsawUrl] = useState<string | null>(null);
  const [jigsawMime, setJigsawMime] = useState<string | null>(null);
  const [jigsawImageSource, setJigsawImageSource] = useState<JigsawImageSource | null>(null);
  const [jigsawLibraryImageId, setJigsawLibraryImageId] = useState<string | null>(null);
  const [jigsawTemplateId, setJigsawTemplateId] = useState<JigsawTemplateId>(
    DEFAULT_JIGSAW_TEMPLATE_ID,
  );
  const [timerSeconds, setTimerSeconds] = useState<number | null>(() =>
    defaultTimerSeconds("quiz", "overall"),
  );
  const [timerMode, setTimerMode] = useState<TimerMode>("overall");
  const timerDisplayLabel = `${formatTimerLong(timerSeconds)}${
    timerMode === "per_question" && timerSeconds != null
      ? mode === "connect_dots"
        ? " per pair"
        : " per question"
      : ""
  }`;
  const [activeQ, setActiveQ] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [visualImageBusyId, setVisualImageBusyId] = useState<string | null>(null);
  const [visualImageError, setVisualImageError] = useState<string | null>(null);
  const aiGenerationContext = useMemo<AiGenerationContext>(
    () => ({
      roomName: name.trim(),
      subject: subject.trim() || "General",
      modeLabel: mode ? GAME_MODE_META[mode].title : "",
    }),
    [mode, name, subject],
  );
  const [createError, setCreateError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [sessionFiles, setSessionFiles] = useState<File[]>([]);
  const [sessionFileRetentionDays, setSessionFileRetentionDays] =
    useState<SessionFileRetentionDays>(SESSION_FILE_DEFAULT_RETENTION_DAYS);

  const quizProgress = quizCompletionCount(questions, mode ?? "quiz");
  const pollProgress = pollCompletionCount(pollQuestions);
  const visualProgress = visualPointCompletionCount(visualQuestions);
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
      return { mode: "quiz", questions, timeLimitSeconds: timerSeconds, timerMode };
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
        timerMode,
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
          libraryImageId: jigsawLibraryImageId,
        },
        timeLimitSeconds: timerSeconds,
        timerMode,
      };
    }
    if (mode === "polls") {
      return {
        mode: "polls",
        questions: pollQuestions,
        settings: pollSettings,
        timeLimitSeconds: timerSeconds,
        timerMode,
      };
    }
    if (mode === "visual_point") {
      return {
        mode: "visual_point",
        questions: visualQuestions,
        timeLimitSeconds: timerSeconds,
        timerMode,
      };
    }
    if (!connectDotsBoard) return null;
    return {
      mode: "connect_dots",
      connectDots: connectDotsBoard,
      timeLimitSeconds: timerSeconds,
      timerMode,
    };
  }, [
    mode,
    questions,
    connectDotsBoard,
    jigsawUrl,
    jigsawMime,
    jigsawLibraryImageId,
    jigsawTemplateId,
    timerSeconds,
    timerMode,
    rewardCode,
    pollQuestions,
    pollSettings,
    visualQuestions,
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
    setTimerSeconds(defaultTimerSeconds(next, "overall"));
    setTimerMode("overall");
    if (modeUsesQuestions(next)) {
      setQuestions(emptyQuizQuestions(next));
      setActiveQ(0);
    }
    if (next === "connect_dots") {
      setConnectDotsPairs(emptyConnectDotsPairs());
      setConnectDotsSeed(`cd-${Date.now()}`);
      setActiveQ(0);
    }
    if (next === "polls") {
      setPollQuestions(emptyPollQuestions());
      setPollSettings(DEFAULT_POLL_SETTINGS);
      setActiveQ(0);
    }
    if (next === "visual_point") {
      setVisualQuestions(emptyVisualPointQuestions());
      setVisualImageBusyId(null);
      setVisualImageError(null);
      setActiveQ(0);
    }
    if (next === "jigsaw") {
      setJigsawImageSource(null);
      setJigsawLibraryImageId(null);
      setJigsawUrl(null);
      setJigsawMime(null);
      const template = jigsawTemplateById(DEFAULT_JIGSAW_TEMPLATE_ID);
      setJigsawTemplateId(DEFAULT_JIGSAW_TEMPLATE_ID);
      setQuestions(emptyQuizQuestionsWithCount(defaultQuestionCountForTemplate(template)));
    }
  };

  const handleJigsawTemplateChange = (nextTemplateId: JigsawTemplateId) => {
    const template = jigsawTemplateById(nextTemplateId);
    setJigsawTemplateId(nextTemplateId);
    const minQuestions = minQuestionCountForTemplate(template);
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
      setJigsawLibraryImageId(null);
      setJigsawImageSource("upload");
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

  const handleVisualImage = async (questionId: string, file: File | undefined) => {
    if (!file) return;
    setVisualImageError(null);
    setVisualImageBusyId(questionId);
    try {
      const result = await prepareVisualPointImage(file);
      if (!result.ok) {
        setVisualImageError(result.error);
        toast.error(result.error);
        return;
      }
      setVisualQuestions((prev) =>
        prev.map((question) =>
          question.id === questionId
            ? {
                ...question,
                imageUrl: result.dataUrl,
                imageMime: result.mime,
                imageWidth: result.width,
                imageHeight: result.height,
                points: [],
              }
            : question,
        ),
      );
      toast.success("Image ready. Place dots on the visual.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed.";
      setVisualImageError(message);
      toast.error(message);
    } finally {
      setVisualImageBusyId(null);
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

  const addVisualQuestion = () => {
    if (visualQuestions.length >= GAME_CONFIG.visual_point.maxQuestions) {
      toast.error(`Maximum ${GAME_CONFIG.visual_point.maxQuestions} Target Hunt rounds.`);
      return;
    }
    setVisualQuestions((prev) => [
      ...prev,
      {
        id: `vp-q-${prev.length + 1}`,
        prompt: "",
        imageUrl: null,
        imageMime: null,
        imageWidth: null,
        imageHeight: null,
        points: [],
      },
    ]);
    setActiveQ(visualQuestions.length);
  };

  const removeVisualQuestion = () => {
    if (visualQuestions.length <= GAME_CONFIG.visual_point.minQuestions) {
      toast.error("Keep at least one Target Hunt round.");
      return;
    }
    setVisualQuestions((prev) => prev.slice(0, -1));
    setActiveQ((i) => Math.min(i, visualQuestions.length - 2));
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
    () => describeTileUnlockSchedule(questions.length, jigsawGrid.tileCount),
    [questions.length, jigsawGrid.tileCount],
  );
  const jigsawUnlockSchedule = useMemo(
    () => tileUnlockScheduleEntries(questions.length, jigsawGrid.tileCount),
    [questions.length, jigsawGrid.tileCount],
  );

  const handleCreate = async () => {
    if (!mode || !payload || !user || !isAuthorAuthenticated(user)) return;
    const v = validateGamePayload(mode, payload);
    if (!v.ok) {
      toast.error(v.error);
      return;
    }
    const fileValidation = validateSessionShareFiles(sessionFiles);
    if (!fileValidation.ok) {
      const message = fileValidation.errors[0] ?? "Some session files cannot be uploaded.";
      setCreateError(message);
      toast.error(message);
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
        if (
          result.error.includes("1 active room") ||
          result.error.includes("Upgrade to GamiBar Pro") ||
          result.error.includes("Free accounts")
        ) {
          setShowUpgrade(true);
        } else {
          setCreateError(result.error);
          toast.error(result.error);
        }
        return;
      }
      saveAuthorRoom({
        roomId: result.room.id,
        code: result.room.code,
        authorToken: result.authorToken,
      });
      if (sessionFiles.length > 0) {
        try {
          await uploadSessionFiles(
            result.room.id,
            result.authorToken,
            sessionFiles,
            sessionFileRetentionDays,
          );
          toast.success(`Room ${result.room.code} is ready with a Resource Drop.`);
        } catch (uploadError) {
          const message =
            uploadError instanceof Error ? uploadError.message : "Could not upload session files.";
          toast.error(`Room is ready, but files were not uploaded. ${message}`);
        }
      } else {
        toast.success(`Room ${result.room.code} is ready.`);
      }
      navigate({ to: "/author/room/$roomId", params: { roomId: result.room.id } });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not create room.";
      if (
        message.includes("1 active room") ||
        message.includes("Upgrade to GamiBar Pro") ||
        message.includes("Free accounts")
      ) {
        setShowUpgrade(true);
      } else {
        setCreateError(message);
        toast.error(message);
      }
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
              {step === "mode" && (skipModeStep.current ? "Your tool" : "Pick a tool")}
              {step === "details" && "Session details"}
              {step === "configure" && (mode === "polls" ? "Poll content" : "Game content")}
              {step === "review" && "Launch preview"}
            </h1>
            {step === "mode" && skipModeStep.current && (
              <p className="mt-1 text-sm text-[#525252]">
                You chose this tool from the catalog. Continue to name your session.
              </p>
            )}
            {step === "mode" && !skipModeStep.current && (
              <p className="mt-1 hidden text-sm text-[#525252] sm:block">
                Choose what you want to run.
              </p>
            )}
            {step === "details" && (
              <p className="mt-1 hidden text-sm text-[#525252] sm:block">
                Name your room so participants know they joined the right session.
              </p>
            )}
            {step === "configure" && mode && (
              <p className="mt-1 hidden text-sm text-[#525252] sm:block">
                {mode === "quiz" &&
                  "Add multiple-choice questions for your class. Use Add or Remove to set how many you need."}
                {mode === "polls" &&
                  "Build ratings, votes, text feedback, and survey questions. Results update live."}
                {mode === "quiz_jigsaw" &&
                  `Add ${GAME_CONFIG.quiz_jigsaw.questionCount} questions, upload a puzzle image, and set a reward code.`}
                {mode === "jigsaw" &&
                  "In Puzzle setup, choose 2×2, 3×3, or 4×4 first, then add questions and upload the image."}
                {mode === "connect_dots" &&
                  "Add matching question/answer pairs. Each pair becomes two dots participants connect on the grid."}
                {mode === "visual_point" &&
                  "Upload an image, write a prompt, place answer dots, and mark the correct dot."}
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
                    placeholder="Biology, Algebra, Civics..."
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
            )}

            {step === "mode" && skipModeStep.current && (
              <p className="mt-4 text-center text-xs text-[#737373]">
                Want a different game?{" "}
                <Link
                  to="/author/tools"
                  className="font-semibold text-[#111111] underline-offset-2 hover:underline"
                >
                  Browse tools
                </Link>
              </p>
            )}

            {step === "configure" && !mode && (
              <div className="rounded-2xl border border-dashed border-[var(--gamibar-border)] bg-[var(--gamibar-page)] p-6 text-center">
                <p className="text-sm font-medium text-[#111111]">No game selected</p>
                <p className="mt-1 text-sm text-[#525252]">
                  Go back and pick Quiz, Polls, Jigsaw, Connect Dots, or Target Hunt.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-xl"
                  onClick={goBack}
                >
                  Pick a tool
                </Button>
              </div>
            )}

            {step === "configure" && mode && (
              <div className="grid gap-5">
                {mode !== "quiz" && mode !== "quiz_jigsaw" && mode !== "jigsaw" && (
                  <GameTimerSettings
                    mode={mode}
                    timerMode={timerMode}
                    value={timerSeconds}
                    onTimerModeChange={(nextTimerMode) => {
                      setTimerMode(nextTimerMode);
                      setTimerSeconds(defaultTimerSeconds(mode, nextTimerMode));
                    }}
                    onChange={setTimerSeconds}
                  />
                )}

                {mode === "quiz" && (
                  <QuizEditor
                    mode="quiz"
                    questions={questions}
                    activeQ={activeQ}
                    setActiveQ={setActiveQ}
                    setQuestions={setQuestions}
                    progress={quizProgress}
                    generationContext={aiGenerationContext}
                    timerNode={
                      <GameTimerSettings
                        mode={mode}
                        timerMode={timerMode}
                        value={timerSeconds}
                        onTimerModeChange={(nextTimerMode) => {
                          setTimerMode(nextTimerMode);
                          setTimerSeconds(defaultTimerSeconds(mode, nextTimerMode));
                        }}
                        onChange={setTimerSeconds}
                      />
                    }
                  />
                )}

                {mode === "polls" && (
                  <PollBuilder
                    questions={pollQuestions}
                    activeQ={activeQ}
                    setActiveQ={setActiveQ}
                    setQuestions={setPollQuestions}
                    settings={pollSettings}
                    setSettings={setPollSettings}
                    progress={pollProgress}
                    generationContext={aiGenerationContext}
                  />
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
                      mode="quiz_jigsaw"
                      questions={questions}
                      activeQ={activeQ}
                      setActiveQ={setActiveQ}
                      setQuestions={setQuestions}
                      progress={quizProgress}
                      accent="purple"
                      generationContext={aiGenerationContext}
                      timerNode={
                        <GameTimerSettings
                          mode={mode}
                          timerMode={timerMode}
                          value={timerSeconds}
                          onTimerModeChange={(nextTimerMode) => {
                            setTimerMode(nextTimerMode);
                            setTimerSeconds(defaultTimerSeconds(mode, nextTimerMode));
                          }}
                          onChange={setTimerSeconds}
                        />
                      }
                    />
                    <JigsawUploader
                      jigsawUrl={jigsawUrl}
                      timerLabel={timerDisplayLabel}
                      onFile={handleImage}
                      uploading={imageUploading}
                      uploadError={imageUploadError}
                      onDismissUploadError={() => setImageUploadError(null)}
                      gridCols={GAME_CONFIG.quiz_jigsaw.cols}
                      gridRows={GAME_CONFIG.quiz_jigsaw.rows}
                      label="Puzzle image"
                      hint="Participants reveal this image piece by piece as they answer correctly."
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
                        Shown to participants when all 9 puzzle pieces are unlocked.
                      </p>
                    </div>
                  </>
                )}

                {mode === "jigsaw" && (
                  <>
                    <div className="rounded-2xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] p-4 sm:p-5">
                      <p className="text-sm font-semibold text-[#111111]">Puzzle setup</p>
                      <p className="mt-1 text-xs text-[#737373]">
                        Choose the grid and add questions. Piece progress is calculated
                        automatically from the question total.
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
                              <span className="block text-[11px] font-semibold uppercase tracking-wide">
                                {template.id === "2x2"
                                  ? "Easy"
                                  : template.id === "3x3"
                                    ? "Medium"
                                    : "Hard"}
                              </span>
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
                          Automatic piece progress
                        </p>
                        <p className="mt-1 text-xs font-medium text-[var(--game-jigsaw-deep)]">
                          {jigsawUnlockHint}
                        </p>
                        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                          {jigsawUnlockSchedule.map((entry) => (
                            <li
                              key={entry.piece}
                              className="flex items-center justify-between gap-2 rounded-lg bg-[var(--gamibar-page)] px-2.5 py-2 text-xs"
                            >
                              <span className="font-semibold text-[#111111]">
                                Piece {entry.piece}
                              </span>
                              <span className="text-[#525252]">
                                {entry.questionsForPiece} question
                                {entry.questionsForPiece === 1 ? "" : "s"}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 text-[11px] leading-relaxed text-[#737373]">
                          Each correct answer colors part of the current piece. The piece becomes
                          usable only when it reaches 100%.
                        </p>
                      </div>
                    </div>
                    <QuizEditor
                      mode="jigsaw"
                      questions={questions}
                      activeQ={activeQ}
                      setActiveQ={setActiveQ}
                      setQuestions={setQuestions}
                      progress={quizProgress}
                      accent="jigsaw"
                      generationContext={aiGenerationContext}
                      timerNode={
                        <GameTimerSettings
                          mode={mode}
                          timerMode={timerMode}
                          value={timerSeconds}
                          onTimerModeChange={(nextTimerMode) => {
                            setTimerMode(nextTimerMode);
                            setTimerSeconds(defaultTimerSeconds(mode, nextTimerMode));
                          }}
                          onChange={setTimerSeconds}
                        />
                      }
                    />
                    {!jigsawImageSource ? (
                      <JigsawImageSourceSelector onSelect={setJigsawImageSource} />
                    ) : jigsawImageSource === "library" && !jigsawUrl ? (
                      <JigsawLibrary
                        selectedImageId={jigsawLibraryImageId}
                        selectedTemplateId={jigsawTemplateId}
                        onBack={() => setJigsawImageSource(null)}
                        onUploadDevice={() => {
                          setJigsawUrl(null);
                          setJigsawMime(null);
                          setJigsawLibraryImageId(null);
                          setJigsawImageSource("upload");
                        }}
                        onUseImage={(image, templateId) => {
                          setJigsawUrl(image.imageUrl);
                          setJigsawMime("image/webp");
                          setJigsawLibraryImageId(image.id);
                          handleJigsawTemplateChange(templateId);
                          toast.success("Library image locked in.");
                        }}
                      />
                    ) : (
                      <div className="grid gap-3">
                        <JigsawUploader
                          jigsawUrl={jigsawUrl}
                          timerLabel={timerDisplayLabel}
                          onFile={handleImage}
                          uploading={imageUploading}
                          uploadError={imageUploadError}
                          onDismissUploadError={() => setImageUploadError(null)}
                          pieceCount={jigsawGrid.tileCount}
                          gridCols={jigsawGrid.cols}
                          gridRows={jigsawGrid.rows}
                          label="Final puzzle image"
                          hint={`Participants reconstruct this ${jigsawGrid.cols}x${jigsawGrid.rows} image - ${jigsawGrid.tileCount} pieces - ${formatTimerLong(timerSeconds)} timer`}
                        />
                        <div className="flex flex-wrap justify-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => {
                              setJigsawUrl(null);
                              setJigsawMime(null);
                              setJigsawLibraryImageId(null);
                              setJigsawImageSource(null);
                              setImageUploadError(null);
                            }}
                          >
                            Change image source
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => {
                              setJigsawUrl(null);
                              setJigsawMime(null);
                              setJigsawLibraryImageId(null);
                              setJigsawImageSource("library");
                              setImageUploadError(null);
                            }}
                          >
                            Browse library
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {mode === "visual_point" && (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-[#111111]">
                          {visualQuestions.length} Target Hunt round
                          {visualQuestions.length === 1 ? "" : "s"}
                        </p>
                        <p className="text-xs text-[#737373]">
                          Students see only the image, prompt, and unlabeled dots.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          disabled={visualQuestions.length <= GAME_CONFIG.visual_point.minQuestions}
                          onClick={removeVisualQuestion}
                        >
                          Remove
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          disabled={visualQuestions.length >= GAME_CONFIG.visual_point.maxQuestions}
                          onClick={addVisualQuestion}
                        >
                          Add question
                        </Button>
                      </div>
                    </div>
                    <VisualPointQuestionEditor
                      questions={visualQuestions}
                      activeQuestion={activeQ}
                      setActiveQuestion={setActiveQ}
                      setQuestions={setVisualQuestions}
                      progress={visualProgress}
                      imageBusyId={visualImageBusyId}
                      uploadError={visualImageError}
                      onDismissUploadError={() => setVisualImageError(null)}
                      onFile={handleVisualImage}
                      timerLabel={timerDisplayLabel}
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
                      generationContext={aiGenerationContext}
                      onAddPair={addConnectDotsPair}
                      onRemovePair={removeConnectDotsPair}
                      onMovePair={moveConnectDotsPair}
                      onShuffleLayout={() => {
                        setConnectDotsSeed(`cd-${Date.now()}`);
                        toast.success("Answer order shuffled.");
                      }}
                      timerLabel={timerDisplayLabel}
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
                  timerMode={payload.timerMode ?? "overall"}
                  {...((mode === "quiz" && payload.mode === "quiz") ||
                  (mode === "polls" && payload.mode === "polls") ||
                  (mode === "visual_point" && payload.mode === "visual_point")
                    ? { questionCount: payload.questions.length }
                    : {})}
                />
                <SessionFilesPicker
                  files={sessionFiles}
                  onChange={setSessionFiles}
                  retentionDays={sessionFileRetentionDays}
                  onRetentionDaysChange={setSessionFileRetentionDays}
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
                    "Creating..."
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

      <UpgradeToProDialog
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        featureTitle="Active Room Limit Reached"
        featureDescription="Free accounts can run 1 active room at a time. Upgrade to GamiBar Pro for ₹49/month to run unlimited simultaneous active rooms!"
      />
    </AuthorShell>
  );
}

function SelectedGamePreview({ mode, catalog }: { mode: GameMode; catalog: GameModeCatalogItem }) {
  const Icon = catalog.icon;
  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] shadow-[var(--shadow-soft)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-[var(--gamibar-page)]">
        <FittedPreviewImage src={catalog.preview} alt="" />
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

function isQuizQuestionBlank(item: QuizQuestionDraft): boolean {
  return Boolean(
    !item.prompt.trim() &&
    !item.correctOption &&
    !item.options.A.trim() &&
    !item.options.B.trim() &&
    !item.options.C.trim() &&
    !item.options.D.trim(),
  );
}

function QuizEditor({
  mode,
  questions,
  activeQ,
  setActiveQ,
  setQuestions,
  progress,
  generationContext,
  accent = "default",
  timerNode,
}: {
  mode: Extract<GameMode, "quiz" | "quiz_jigsaw" | "jigsaw">;
  questions: QuizQuestionDraft[];
  activeQ: number;
  setActiveQ: (n: number) => void;
  setQuestions: Dispatch<SetStateAction<QuizQuestionDraft[]>>;
  progress: { done: number; total: number; complete: boolean };
  generationContext: AiGenerationContext;
  accent?: "default" | "purple" | "jigsaw";
  timerNode?: ReactNode;
}) {
  const q = questions[activeQ]!;
  const options = QUIZ_OPTION_IDS;
  const currentComplete = isQuizQuestionComplete(q);
  const hasNext = activeQ < questions.length - 1;
  const hasPrev = activeQ > 0;
  const maxQuestionCount =
    mode === "quiz"
      ? GAME_CONFIG.quiz.maxQuestions
      : mode === "quiz_jigsaw"
        ? GAME_CONFIG.quiz_jigsaw.questionCount
        : GAME_CONFIG.jigsaw.maxQuestions;
  const blankQuestionCount = questions.filter(isQuizQuestionBlank).length;
  const appendableQuestionCount =
    maxQuestionCount === 0 ? 10 : Math.max(0, maxQuestionCount - questions.length);
  const availableAiSlots = Math.min(10, blankQuestionCount + appendableQuestionCount);

  const update = (patch: Partial<QuizQuestionDraft>) => {
    setQuestions((prev) => prev.map((item, i) => (i === activeQ ? { ...item, ...patch } : item)));
  };

  const addQuestion = () => {
    if (maxQuestionCount > 0 && questions.length >= maxQuestionCount) {
      toast.error(`Maximum ${maxQuestionCount} questions.`);
      return;
    }
    const nextQuestionId = `q-${Date.now()}`;
    const nextQuestion: QuizQuestionDraft = {
      id: nextQuestionId,
      prompt: "",
      options: { A: "", B: "", C: "", D: "" },
      correctOption: null,
    };
    setQuestions((prev) => [...prev, nextQuestion]);
    setActiveQ(questions.length);
  };

  const deleteQuestion = () => {
    const minCount =
      mode === "quiz_jigsaw"
        ? GAME_CONFIG.quiz_jigsaw.questionCount
        : GAME_CONFIG.quiz.minQuestions;
    if (questions.length <= minCount) {
      toast.error(`Keep at least ${minCount} question${minCount === 1 ? "" : "s"}.`);
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== activeQ));
    setActiveQ(Math.max(0, activeQ - 1));
  };

  const applyGeneratedQuestions = (generated: QuizQuestionGenerationResponse[]) => {
    if (generated.length === 0) return;
    const firstBlankIndex = questions.findIndex(isQuizQuestionBlank);
    const firstAppliedIndex = firstBlankIndex >= 0 ? firstBlankIndex : questions.length;

    setQuestions((previous) => {
      const remaining = [...generated];
      const next = previous.map((question) => {
        if (!isQuizQuestionBlank(question) || remaining.length === 0) return question;
        const generatedQuestion = remaining.shift()!;
        return {
          id: question.id,
          prompt: generatedQuestion.question,
          options: generatedQuestion.options,
          correctOption: generatedQuestion.correctOption,
        };
      });

      while (remaining.length > 0 && (maxQuestionCount === 0 || next.length < maxQuestionCount)) {
        const generatedQuestion = remaining.shift()!;
        next.push({
          id: `q-ai-${Date.now()}-${next.length + 1}`,
          prompt: generatedQuestion.question,
          options: generatedQuestion.options,
          correctOption: generatedQuestion.correctOption,
        });
      }
      return next;
    });
    setActiveQ(firstAppliedIndex);
  };

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
        {timerNode && <div className="flex flex-col lg:col-span-4 xl:col-span-4">{timerNode}</div>}
        <div className={timerNode ? "flex flex-col lg:col-span-8 xl:col-span-8" : "col-span-12"}>
          <AiGenerateQuestionsPanel
            mode={mode}
            initialTopic={generationContext.subject}
            availableSlots={availableAiSlots}
            existingQuestions={questions.map((question) => question.prompt)}
            onApply={applyGeneratedQuestions}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
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

        {(maxQuestionCount === 0 || questions.length < maxQuestionCount) && (
          <button
            type="button"
            title="Add question"
            aria-label="Add question"
            onClick={addQuestion}
            className="grid size-9 place-items-center rounded-xl border border-dashed border-[#CBD5E1] bg-white text-[#111111] transition-all hover:border-[#111111] hover:bg-[#F8F9FA] active:scale-95 shadow-sm"
          >
            <Plus className="size-4" />
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--gamibar-border)] bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-wider text-[#737373]">
            Question {activeQ + 1} of {questions.length}
          </Label>
          {questions.length >
            (mode === "quiz_jigsaw"
              ? GAME_CONFIG.quiz_jigsaw.questionCount
              : GAME_CONFIG.quiz.minQuestions) && (
            <button
              type="button"
              onClick={deleteQuestion}
              title="Delete this question"
              aria-label="Delete this question"
              className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#737373] transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="size-3.5 text-[#737373] transition-colors group-hover:text-red-600" />
              <span>Delete</span>
            </button>
          )}
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            value={q.prompt}
            onChange={(e) => update({ prompt: e.target.value })}
            placeholder="What should participants answer?"
            className="h-11 rounded-xl text-base"
          />
          <AiGenerateOptionsButton
            request={{
              kind: "quiz_options",
              mode,
              question: q.prompt,
              context: {
                ...generationContext,
                existingOptions: q.options,
                correctOption: q.correctOption,
              },
            }}
            disabled={!q.prompt.trim()}
            buttonLabel="Generate options"
            onApply={(response) => {
              if (response.kind !== "quiz_options") return;
              update({ options: response.options, correctOption: response.correctOption });
            }}
          />
        </div>

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

function PollBuilder({
  questions,
  activeQ,
  setActiveQ,
  setQuestions,
  settings,
  setSettings,
  progress,
  generationContext,
}: {
  questions: PollQuestionDraft[];
  activeQ: number;
  setActiveQ: (n: number) => void;
  setQuestions: Dispatch<SetStateAction<PollQuestionDraft[]>>;
  settings: PollSettings;
  setSettings: Dispatch<SetStateAction<PollSettings>>;
  progress: { done: number; total: number; complete: boolean };
  generationContext: AiGenerationContext;
}) {
  const activeIndex = Math.min(activeQ, Math.max(0, questions.length - 1));
  const q = questions[activeIndex] ?? questions[0] ?? emptyPollQuestions()[0];
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  const update = (patch: Partial<PollQuestionDraft>) => {
    setQuestions((prev) =>
      prev.map((item, index) => (index === activeIndex ? { ...item, ...patch } : item)),
    );
  };

  const changeType = (type: PollQuestionType) => {
    const next = newPollQuestion(type, activeIndex);
    update({
      ...next,
      id: q.id,
      prompt: q.prompt.trim() ? q.prompt : next.prompt,
      required: q.required,
    });
  };

  const addQuestion = (type: PollQuestionType = "single_choice") => {
    if (questions.length >= GAME_CONFIG.polls.maxQuestions) {
      toast.error(`Maximum ${GAME_CONFIG.polls.maxQuestions} questions.`);
      return;
    }
    const next = newPollQuestion(type, questions.length);
    setQuestions((prev) => [...prev, next]);
    setActiveQ(questions.length);
  };

  const removeQuestion = () => {
    if (questions.length <= GAME_CONFIG.polls.minQuestions) {
      toast.error("Keep at least one poll question.");
      return;
    }
    setQuestions((prev) => prev.filter((_, index) => index !== activeIndex));
    setActiveQ(Math.max(0, activeIndex - 1));
  };

  const addOption = () => {
    if (q.options.length >= GAME_CONFIG.polls.maxOptions) {
      toast.error(`Use at most ${GAME_CONFIG.polls.maxOptions} options.`);
      return;
    }
    update({
      options: [
        ...q.options,
        {
          id: `option-${q.options.length + 1}`,
          label: `Option ${q.options.length + 1}`,
        },
      ],
    });
  };

  const updateOption = (optionId: string, label: string) => {
    update({
      options: q.options.map((option) => (option.id === optionId ? { ...option, label } : option)),
    });
  };

  const removeOption = (optionId: string) => {
    if (q.options.length <= 2) {
      toast.error("Keep at least two options.");
      return;
    }
    update({ options: q.options.filter((option) => option.id !== optionId) });
  };

  const setScale = (min: number, max: number) => {
    update({ min, max });
  };
  const pollOptionType = q.type === "single_choice" || q.type === "multiple_choice" ? q.type : null;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-2xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#111111]">
            {questions.length} question{questions.length === 1 ? "" : "s"} - {progress.done}/
            {progress.total} ready
          </p>
          <p className="mt-0.5 text-xs text-[#737373]">
            Ratings, choices, text feedback, and yes/no checks.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl"
            disabled={questions.length <= GAME_CONFIG.polls.minQuestions}
            onClick={removeQuestion}
          >
            <Trash2 className="mr-1 size-3.5" />
            Remove
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9 rounded-xl bg-[#111111] hover:bg-black"
            disabled={questions.length >= GAME_CONFIG.polls.maxQuestions}
            onClick={() => addQuestion()}
          >
            <Plus className="mr-1 size-3.5" />
            Add
          </Button>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-[var(--gamibar-page)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-400 to-[var(--gamibar-brand)] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {questions.map((question, index) => {
          const done = progress.done > index && question.prompt.trim();
          return (
            <button
              key={question.id}
              type="button"
              onClick={() => setActiveQ(index)}
              className={cn(
                "grid size-9 place-items-center rounded-xl text-xs font-bold transition-colors",
                index === activeIndex
                  ? "bg-[#111111] text-white"
                  : done
                    ? "bg-orange-100 text-orange-800"
                    : "bg-[var(--gamibar-page)] text-[#737373]",
              )}
            >
              {done ? <Check className="size-3.5" /> : index + 1}
            </button>
          );
        })}

        {questions.length < GAME_CONFIG.polls.maxQuestions && (
          <button
            type="button"
            title="Add question"
            aria-label="Add question"
            onClick={() => addQuestion()}
            className="grid size-9 place-items-center rounded-xl border border-dashed border-[#CBD5E1] bg-white text-[#111111] transition-all hover:border-[#111111] hover:bg-[#F8F9FA] active:scale-95 shadow-sm"
          >
            <Plus className="size-4" />
          </button>
        )}
      </div>

      <div className="grid gap-4 rounded-2xl border border-[var(--gamibar-border)] bg-white p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_13rem] md:items-end">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="poll-question-prompt"
                className="text-xs uppercase tracking-wider text-[#737373]"
              >
                Question {activeIndex + 1} of {questions.length}
              </Label>
              {questions.length > GAME_CONFIG.polls.minQuestions && (
                <button
                  type="button"
                  onClick={removeQuestion}
                  title="Delete this question"
                  aria-label="Delete this question"
                  className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#737373] transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="size-3.5 text-[#737373] transition-colors group-hover:text-red-600" />
                  <span>Delete</span>
                </button>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                id="poll-question-prompt"
                value={q.prompt}
                onChange={(e) => update({ prompt: e.target.value })}
                placeholder="Ask anything"
                className="h-11 rounded-xl text-base"
              />
              {pollOptionType && (
                <AiGenerateOptionsButton
                  request={{
                    kind: "poll_options",
                    mode: "polls",
                    pollType: pollOptionType,
                    question: q.prompt,
                    context: {
                      ...generationContext,
                      existingOptions: q.options.map((option) => option.label),
                    },
                  }}
                  disabled={!q.prompt.trim()}
                  buttonLabel="Generate choices"
                  onApply={(response) => {
                    if (response.kind !== "poll_options") return;
                    update({
                      options: response.options.map((label, index) => ({
                        id: q.options[index]?.id ?? `option-${index + 1}`,
                        label,
                      })),
                    });
                  }}
                />
              )}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="poll-question-type">Type</Label>
            <Select value={q.type} onValueChange={(value) => changeType(value as PollQuestionType)}>
              <SelectTrigger id="poll-question-type" className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POLL_TYPE_IDS.map((type) => (
                  <SelectItem key={type} value={type}>
                    {POLL_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-full border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] px-3 py-1.5 text-xs font-semibold text-[#525252]">
            <Switch
              checked={q.required}
              onCheckedChange={(checked) => update({ required: checked })}
            />
            Required
          </label>
          <span className="rounded-full bg-orange-100 px-3 py-1.5 text-xs font-bold text-orange-800">
            {POLL_TYPE_DESCRIPTIONS[q.type]}
          </span>
        </div>

        {(q.type === "single_choice" || q.type === "multiple_choice") && (
          <div className="grid gap-2">
            {q.options.map((option, index) => (
              <div
                key={option.id}
                className="grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center gap-2 rounded-xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] p-2"
              >
                <span className="grid size-8 place-items-center rounded-lg bg-white text-xs font-bold text-[#525252]">
                  {index + 1}
                </span>
                <Input
                  value={option.label}
                  onChange={(e) => updateOption(option.id, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="h-9 rounded-lg border-0 bg-transparent shadow-none focus-visible:ring-0"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-lg text-[#737373]"
                  disabled={q.options.length <= 2}
                  onClick={() => removeOption(option.id)}
                  aria-label="Remove option"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-fit rounded-xl"
              disabled={q.options.length >= GAME_CONFIG.polls.maxOptions}
              onClick={addOption}
            >
              <Plus className="mr-1 size-3.5" />
              Add option
            </Button>
          </div>
        )}

        {q.type === "rating" && (
          <div className="grid gap-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "0-5", min: 0, max: 5 },
                { label: "1-5", min: 1, max: 5 },
                { label: "1-10", min: 1, max: 10 },
              ].map((scale) => {
                const active = q.min === scale.min && q.max === scale.max;
                return (
                  <button
                    key={scale.label}
                    type="button"
                    onClick={() => setScale(scale.min, scale.max)}
                    className={cn(
                      "h-10 rounded-xl border text-sm font-bold transition-colors",
                      active
                        ? "border-orange-400 bg-orange-100 text-orange-900"
                        : "border-[var(--gamibar-border)] bg-[var(--gamibar-page)] text-[#525252]",
                    )}
                  >
                    {scale.label}
                  </button>
                );
              })}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={q.lowLabel ?? ""}
                onChange={(e) => update({ lowLabel: e.target.value })}
                placeholder="Low label"
                className="h-10 rounded-xl"
              />
              <Input
                value={q.highLabel ?? ""}
                onChange={(e) => update({ highLabel: e.target.value })}
                placeholder="High label"
                className="h-10 rounded-xl"
              />
            </div>
          </div>
        )}

        {(q.type === "short_text" || q.type === "long_text") && (
          <div className="rounded-xl border border-dashed border-[var(--gamibar-border)] bg-[var(--gamibar-page)] p-3">
            <Textarea
              value=""
              readOnly
              placeholder={
                q.type === "long_text" ? "Participant paragraph answer" : "Participant short answer"
              }
              className="min-h-20 resize-none rounded-xl bg-white text-sm"
            />
          </div>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <PollSettingToggle
          label="Anonymous"
          checked={settings.anonymous}
          onChange={(checked) => setSettings((prev) => ({ ...prev, anonymous: checked }))}
        />
        <PollSettingToggle
          label="Allow edits"
          checked={settings.allowResubmission}
          onChange={(checked) => setSettings((prev) => ({ ...prev, allowResubmission: checked }))}
        />
        <PollSettingToggle
          label="Live results"
          checked={settings.showLiveResults}
          onChange={(checked) => setSettings((prev) => ({ ...prev, showLiveResults: checked }))}
        />
      </div>
    </div>
  );
}

function PollSettingToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] px-3 py-2 text-sm font-semibold text-[#111111]">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
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
        <InlineErrorBanner
          message={uploadError}
          {...(onDismissUploadError ? { onDismiss: onDismissUploadError } : {})}
        />
      ) : null}
    </div>
  );
}

function VisualPointQuestionEditor({
  questions,
  activeQuestion,
  setActiveQuestion,
  setQuestions,
  progress,
  imageBusyId,
  uploadError,
  onDismissUploadError,
  onFile,
  timerLabel,
}: {
  questions: VisualPointQuestionDraft[];
  activeQuestion: number;
  setActiveQuestion: (n: number) => void;
  setQuestions: Dispatch<SetStateAction<VisualPointQuestionDraft[]>>;
  progress: { done: number; total: number; complete: boolean };
  imageBusyId: string | null;
  uploadError: string | null;
  onDismissUploadError: () => void;
  onFile: (questionId: string, file: File | undefined) => void;
  timerLabel: string;
}) {
  const safeIndex = Math.min(activeQuestion, Math.max(0, questions.length - 1));
  const question = questions[safeIndex];
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  useEffect(() => {
    if (activeQuestion !== safeIndex) setActiveQuestion(safeIndex);
  }, [activeQuestion, safeIndex, setActiveQuestion]);

  useEffect(() => {
    setSelectedPointId(null);
  }, [question?.id]);

  if (!question) return null;

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  const updateQuestion = (patch: Partial<VisualPointQuestionDraft>) => {
    setQuestions((prev) =>
      prev.map((item, index) => (index === safeIndex ? { ...item, ...patch } : item)),
    );
  };

  const updatePoint = (
    pointId: string,
    patch: Partial<VisualPointQuestionDraft["points"][number]>,
  ) => {
    setQuestions((prev) =>
      prev.map((item, index) =>
        index === safeIndex
          ? {
              ...item,
              points: item.points.map((point) =>
                point.id === pointId ? { ...point, ...patch } : point,
              ),
            }
          : item,
      ),
    );
  };

  const addPoint = (x: number, y: number) => {
    if (question.points.length >= GAME_CONFIG.visual_point.maxPoints) {
      toast.error(`Maximum ${GAME_CONFIG.visual_point.maxPoints} dots per question.`);
      return;
    }

    const id = createVisualPointId(question.points);
    setSelectedPointId(id);
    setQuestions((prev) =>
      prev.map((item, index) =>
        index === safeIndex
          ? {
              ...item,
              points: [
                ...item.points,
                {
                  id,
                  x: clampVisualCoordinate(x),
                  y: clampVisualCoordinate(y),
                  isCorrect: item.points.length === 0,
                  adminReference: "",
                  color: "#111111",
                },
              ],
            }
          : item,
      ),
    );
  };

  const movePoint = (pointId: string, x: number, y: number) => {
    updatePoint(pointId, {
      x: clampVisualCoordinate(x),
      y: clampVisualCoordinate(y),
    });
  };

  const deletePoint = (pointId: string) => {
    setQuestions((prev) =>
      prev.map((item, index) => {
        if (index !== safeIndex) return item;
        const wasCorrect = item.points.find((point) => point.id === pointId)?.isCorrect;
        const nextPoints = item.points.filter((point) => point.id !== pointId);
        if (wasCorrect && nextPoints.length > 0 && !nextPoints.some((point) => point.isCorrect)) {
          const firstPoint = nextPoints[0];
          if (firstPoint) {
            nextPoints[0] = { ...firstPoint, isCorrect: true };
          }
        }
        return { ...item, points: nextPoints };
      }),
    );
    setSelectedPointId((current) => (current === pointId ? null : current));
  };

  const markCorrect = (pointId: string) => {
    setQuestions((prev) =>
      prev.map((item, index) =>
        index === safeIndex
          ? {
              ...item,
              points: item.points.map((point) => ({
                ...point,
                isCorrect: point.id === pointId,
              })),
            }
          : item,
      ),
    );
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[#111111]">
            Target Hunt rounds - {progress.done}/{progress.total}
          </p>
          <p className="text-xs text-[#737373]">
            Timer: {timerLabel}. Correctness and references are host-only.
          </p>
        </div>
        <span className="rounded-full bg-[var(--game-visual-point-soft)] px-3 py-1 text-xs font-bold text-[var(--game-visual-point-deep)]">
          {pct}% ready
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-[var(--gamibar-page)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--game-visual-point)] to-[var(--game-visual-point-deep)] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {questions.map((item, index) => {
          const done = visualPointCompletionCount([item]).complete;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveQuestion(index)}
              className={cn(
                "grid size-9 place-items-center rounded-xl text-xs font-bold transition-colors",
                index === safeIndex
                  ? "bg-[#111111] text-white"
                  : done
                    ? "bg-[var(--game-visual-point-soft)] text-[var(--game-visual-point-deep)]"
                    : "bg-[var(--gamibar-page)] text-[#737373]",
              )}
            >
              {done ? <Check className="size-3.5" /> : index + 1}
            </button>
          );
        })}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <div className="grid content-start gap-4 rounded-2xl border border-[var(--gamibar-border)] bg-white p-4 sm:p-5">
          <div className="grid gap-2">
            <Label htmlFor={`visual-point-prompt-${question.id}`}>Question</Label>
            <Textarea
              id={`visual-point-prompt-${question.id}`}
              value={question.prompt}
              onChange={(e) => updateQuestion({ prompt: e.target.value })}
              placeholder="e.g. Identify the state located in the northeastern region."
              className="min-h-24 resize-none rounded-xl text-base"
            />
          </div>

          {question.imageUrl ? (
            <VisualPointCanvas
              question={question}
              selectedPointId={selectedPointId}
              onSelectPoint={setSelectedPointId}
              onAddPoint={addPoint}
              onMovePoint={movePoint}
            />
          ) : (
            <label className="grid min-h-64 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-[var(--gamibar-border)] bg-[var(--gamibar-page)] px-5 py-8 text-center transition-colors hover:border-[var(--game-visual-point)]">
              {imageBusyId === question.id ? (
                <span className="grid gap-2 text-sm font-semibold text-[#111111]">
                  <Loader2 className="mx-auto size-7 animate-spin text-[var(--game-visual-point)]" />
                  Preparing image...
                </span>
              ) : (
                <span>
                  <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--game-visual-point-soft)] text-[var(--game-visual-point-deep)]">
                    <Upload className="size-6" />
                  </span>
                  <span className="mt-4 block font-display text-lg font-bold text-[#111111]">
                    Upload image
                  </span>
                  <span className="mt-1 block text-sm text-[#525252]">
                    JPG, PNG, or WEBP - max 8 MB
                  </span>
                </span>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={imageBusyId === question.id}
                onChange={(e) => void onFile(question.id, e.target.files?.[0])}
              />
            </label>
          )}

          {uploadError && imageBusyId !== question.id ? (
            <InlineErrorBanner
              message={uploadError}
              {...(onDismissUploadError ? { onDismiss: onDismissUploadError } : {})}
            />
          ) : null}

          {question.imageUrl ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-[#737373]">
                {question.points.length}/{GAME_CONFIG.visual_point.maxPoints} dots placed
              </p>
              <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--gamibar-border)] bg-white px-3 text-xs font-semibold text-[#111111] hover:bg-[var(--gamibar-page)]">
                Replace image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={imageBusyId === question.id}
                  onChange={(e) => void onFile(question.id, e.target.files?.[0])}
                />
              </label>
            </div>
          ) : null}
        </div>

        <div className="grid content-start gap-4">
          <div className="rounded-2xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] p-4">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-[var(--game-visual-point-soft)] text-[var(--game-visual-point-deep)]">
                <Crosshair className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#111111]">Dot controls</p>
                <p className="text-xs text-[#737373]">Drag dots on the image to move them.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              {question.points.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--gamibar-border)] bg-white px-3 py-4 text-center text-xs text-[#737373]">
                  Place at least {GAME_CONFIG.visual_point.minPoints} dots.
                </p>
              ) : (
                question.points.map((point, index) => (
                  <div
                    key={point.id}
                    className={cn(
                      "grid gap-2 rounded-xl border bg-white p-3",
                      selectedPointId === point.id
                        ? "border-[var(--game-visual-point)] ring-2 ring-[var(--game-visual-point)]/15"
                        : "border-[var(--gamibar-border)]",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPointId(point.id)}
                        className="grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white transition-colors"
                        style={{ backgroundColor: point.color || "#111111" }}
                      >
                        {index + 1}
                      </button>
                      <Input
                        value={point.adminReference ?? ""}
                        onChange={(e) => updatePoint(point.id, { adminReference: e.target.value })}
                        placeholder="Host reference"
                        className="h-9 min-w-0 rounded-lg text-sm"
                      />
                    </div>
                    {selectedPointId === point.id && (
                      <div className="flex flex-col gap-1.5 mt-1 border-t border-[var(--gamibar-border)] pt-2">
                        <span className="text-[10px] font-semibold text-[#737373] uppercase tracking-wider">
                          Pointer Color
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {POINTER_COLORS.map((c) => (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => updatePoint(point.id, { color: c.value })}
                              className={cn(
                                "size-6 rounded-full border border-black/10 transition-transform active:scale-90",
                                (point.color || "#111111") === c.value
                                  ? "ring-2 ring-[var(--game-visual-point)] ring-offset-1"
                                  : "hover:scale-105",
                              )}
                              style={{ backgroundColor: c.value }}
                              title={c.label}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Button
                        type="button"
                        variant={point.isCorrect ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "h-8 rounded-lg",
                          point.isCorrect && "bg-emerald-600 text-white hover:bg-emerald-700",
                        )}
                        onClick={() => markCorrect(point.id)}
                      >
                        {point.isCorrect ? "Correct" : "Mark correct"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8 rounded-lg text-red-600 hover:text-red-700"
                        onClick={() => deletePoint(point.id)}
                        aria-label={`Delete dot ${index + 1}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VisualPointCanvas({
  question,
  selectedPointId,
  preview = false,
  onSelectPoint,
  onAddPoint,
  onMovePoint,
}: {
  question: VisualPointQuestionDraft;
  selectedPointId?: string | null;
  preview?: boolean;
  onSelectPoint?: (pointId: string) => void;
  onAddPoint?: (x: number, y: number) => void;
  onMovePoint?: (pointId: string, x: number, y: number) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const readPosition = (event: ReactPointerEvent): { x: number; y: number } | null => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: clampVisualCoordinate(((event.clientX - rect.left) / rect.width) * 100),
      y: clampVisualCoordinate(((event.clientY - rect.top) / rect.height) * 100),
    };
  };

  const handleCanvasPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (preview || !onAddPoint) return;
    if ((event.target as HTMLElement).closest("[data-vp-dot]")) return;
    const position = readPosition(event);
    if (!position) return;
    onAddPoint(position.x, position.y);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (preview || !draggingId || !onMovePoint) return;
    const position = readPosition(event);
    if (!position) return;
    onMovePoint(draggingId, position.x, position.y);
  };

  const stopDragging = () => setDraggingId(null);

  if (!question.imageUrl) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "relative isolate mx-auto w-full max-w-3xl touch-none overflow-hidden rounded-2xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)]",
        !preview && "cursor-crosshair",
      )}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
    >
      <img
        src={question.imageUrl}
        alt=""
        draggable={false}
        className="block h-auto w-full select-none"
      />
      {question.points.map((point, index) => {
        const selected = selectedPointId === point.id;
        return (
          <button
            key={point.id}
            type="button"
            data-vp-dot
            disabled={preview}
            aria-label={`Dot ${index + 1}`}
            onClick={(event) => {
              event.stopPropagation();
              onSelectPoint?.(point.id);
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
              if (preview) return;
              onSelectPoint?.(point.id);
              setDraggingId(point.id);
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            className={cn(
              "absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2",
              preview ? "cursor-default" : "cursor-grab active:cursor-grabbing",
            )}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
          >
            <span
              className={cn(
                "block size-4 rounded-full border-2 shadow-[0_2px_10px_rgba(0,0,0,0.35)] transition-all",
                !preview && point.isCorrect
                  ? "border-emerald-500 ring-2 ring-emerald-500/50"
                  : "border-white",
                !preview && selected && "ring-4 ring-[var(--game-visual-point)]/35",
              )}
              style={{ backgroundColor: point.color || "#111111" }}
            />
          </button>
        );
      })}
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
  generationContext,
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
  generationContext: AiGenerationContext;
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="connect-dots-answer">Answer</Label>
              <AiGenerateOptionsButton
                request={{
                  kind: "connect_dots_answer",
                  mode: "connect_dots",
                  question: pair.question,
                  context: {
                    ...generationContext,
                    existingAnswer: pair.answer,
                  },
                }}
                disabled={!pair.question.trim()}
                buttonLabel="Generate answer"
                className="h-9"
                onApply={(response) => {
                  if (response.kind !== "connect_dots_answer") return;
                  update({ answer: response.answer });
                }}
              />
            </div>
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
            Participant preview
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
          Preview only - participants hover dots to read text, then drag between matching pairs.
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
  timerMode,
  questionCount,
}: {
  name: string;
  subject: string;
  mode: GameMode;
  preview: string;
  accentClass: string;
  badgeClass: string;
  timeLimitSeconds: number | null;
  timerMode: TimerMode;
  questionCount?: number;
}) {
  const catalog = getModeCatalog(mode);
  const instruction = gameInstruction(mode, timeLimitSeconds, questionCount, timerMode);

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
              QR code ready for participants to scan
            </li>
            <li className="flex gap-2">
              <ArrowRight className="mt-0.5 size-4 shrink-0 text-[#111111]" />
              Unlimited participants can join with the room code or QR
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
            Timer - {formatTimerLong(timeLimitSeconds)}
            {timerMode === "per_question" && timeLimitSeconds != null ? " each" : ""}
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
        <div className="relative aspect-video">
          <FittedPreviewImage src={preview} alt="" />
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

function FittedPreviewImage({ src, alt }: { src: string; alt: string }) {
  return (
    <img src={src} alt={alt} className="size-full object-cover object-center" loading="lazy" />
  );
}
