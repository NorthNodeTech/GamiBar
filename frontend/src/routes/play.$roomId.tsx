import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Check, Circle } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

import { friendlyGameError } from "@/lib/accessibility";
import { ConnectDots } from "@/components/games/quizes/maze/ConnectDots";
import { JigsawMissionAssembly } from "@/components/games/quizes/puzzle/JigsawMissionAssembly";
import { JigsawMissionFlyingTile } from "@/components/games/quizes/puzzle/JigsawMissionFlyingTile";
import { JigsawMissionSuccess } from "@/components/games/quizes/puzzle/JigsawMissionSuccess";
import {
  JigsawMissionRewardStack,
  tileRowLayoutRect,
  tileMetaFromId,
} from "@/components/games/quizes/puzzle/JigsawMissionRewardStack";
import { JigsawPuzzle } from "@/components/games/quizes/puzzle/JigsawPuzzle";
import { PuzzleQuestBoard } from "@/components/games/quizes/puzzle/PuzzleQuestBoard";
import { SlidoProgressHeader, SlidoQuizPanel } from "@/components/games/quizes/normal/SlidoQuizPanel";
import { GameCompletionScreen } from "@/components/games/ui/GameCompletionScreen";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import {
  ConnectionBanner,
  InlineErrorBanner,
  PageErrorState,
  PageLoader,
} from "@/components/ui/async-state";
import { GAME_CONFIG, GAME_MODE_META, JIGSAW_GRID, PUZZLE_QUEST_GRID } from "@/lib/game/config";
import { buildGameCompletionViewModel } from "@/lib/game/completion";
import { getModeCatalog } from "@/lib/game/mode-catalog";
import {
  isJigsawMissionRetryRound,
  mergeJigsawMissionPayload,
  nextRetryQuestionId,
  readJigsawMissionPayload,
  resolveJigsawMissionQuestionId,
  retryPoolQuestionIds,
} from "@/lib/game/jigsaw-mission-flow";
import {
  mergeTileLayoutsForNewTiles,
  mergeTileRotationsForNewTiles,
  newlyEarnedTileIds,
  nextClockwiseTileCardRotation,
  readEarnedTileIds,
  readTileLayouts,
  readTileRotations,
  resolvePieceUnlockAt,
} from "@/lib/game/jigsaw-tile-rewards";
import type { JigsawTileCardRotation } from "@/lib/game/jigsaw-tiles";
import { isStudentSessionFinished } from "@/lib/game/mode-registry";
import { useJigsawTouchLayout } from "@/lib/game/use-jigsaw-mobile-layout";
import { loadParticipantSession, saveParticipantSession } from "@/lib/game/client-session";
import {
  getRoomSnapshotFn,
  reconnectParticipantFn,
  submitConnectDotsPathsFn,
  recordConnectDotsIncorrectAttemptFn,
  submitJigsawMissionAnswerFn,
  submitJigsawMissionAssemblyFn,
  rotateJigsawMissionTileFn,
  submitJigsawProgressFn,
  submitQuizAnswerFn,
  submitQuizJigsawAnswerFn,
} from "@/lib/game/room.functions";
import type { ConnectDotsBoardConfig, QuizOptionId } from "@/lib/game/types";
import { useRoomSync } from "@/lib/game/useRoomSync";
import type { PathMap } from "@/lib/connect-dots";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/play/$roomId")({
  head: () => ({
    meta: [{ title: "Play - GamiBAR" }],
  }),
  component: StudentPlayPage,
});

const EMPTY_MISSION_PAYLOAD: Record<string, unknown> = {};

function StudentPlayPage() {
  const { roomId } = Route.useParams();
  const navigate = useNavigate();
  const [participant] = useState(() => loadParticipantSession());
  const reconnectToken =
    participant && participant.roomId === roomId ? participant.reconnectToken : undefined;
  const { snapshot, error, isInitialLoading, isReconnecting, retrying, retry } = useRoomSync({
    roomId,
    reconnectToken,
  });

  useEffect(() => {
    if (!reconnectToken) return;
    void reconnectParticipantFn({ data: { reconnectToken } }).then((res) => {
      if (res.ok && participant && res.reconnectToken !== participant.reconnectToken) {
        saveParticipantSession({
          ...participant,
          reconnectToken: res.reconnectToken,
        });
      }
    });
  }, [reconnectToken, participant]);

  if (!reconnectToken) {
    return <RejoinPrompt roomId={roomId} />;
  }

  if (isInitialLoading) {
    return <PageLoader message="Loading game…" description="Connecting to your session." />;
  }

  if (!snapshot) {
    return (
      <PageErrorState
        title="Connection problem"
        message={friendlyGameError(
          error,
          "Could not connect to the game. Check your network and try again.",
        )}
        onRetry={retry}
        retrying={retrying}
      />
    );
  }

  if (!snapshot.ok) {
    return (
      <PageErrorState
        title="Could not load game"
        message={friendlyGameError(
          snapshot.error,
          "This game may have ended or the link is invalid.",
        )}
        onRetry={retry}
        retrying={retrying}
      >
        <Button asChild variant="outline" className="rounded-xl">
          <Link to="/join">Enter room code</Link>
        </Button>
      </PageErrorState>
    );
  }

  const playShell = (node: ReactNode) => (
    <>
      {isReconnecting ? (
        <ConnectionBanner
          message="Connection interrupted. Your game is still open — we are retrying in the background."
          onRetry={retry}
          retrying={retrying}
        />
      ) : null}
      {node}
    </>
  );

  const room = snapshot.room;
  const gameFinished = room.status === "FINISHED" || room.status === "CANCELLED";
  const displayName = participant?.displayName ?? "Student";
  const studentFinished = isStudentSessionFinished({
    room,
    answeredCount: snapshot.myAnswers.length,
    attemptCompleted: Boolean(snapshot.myAttempt?.completed),
  });
  const isQuiz = room.mode === "quiz" && room.payload.mode === "quiz";
  const showLeaderboard =
    gameFinished || (isQuiz && studentFinished && room.showLeaderboardToStudents);

  const totalQuestions =
    room.payload.mode === "quiz" ||
    room.payload.mode === "quiz_jigsaw" ||
    room.payload.mode === "jigsaw"
      ? room.payload.questions.length
      : 0;
  const totalPairs = room.payload.mode === "connect_dots" ? room.payload.connectDots.pairCount : 0;

  if (studentFinished || gameFinished) {
    const model = buildGameCompletionViewModel({
      mode: room.mode,
      roomName: room.name,
      displayName,
      myAttempt: snapshot.myAttempt,
      myAnswers: snapshot.myAnswers,
      totalQuestions,
      totalPairs,
      leaderboard: snapshot.leaderboard,
      participantId: snapshot.participantId,
      myRank: snapshot.myRank,
    });

    return playShell(
      <GameCompletionScreen
        model={model}
        gameFinished={gameFinished}
        showLeaderboard={showLeaderboard}
        leaderboardRows={snapshot.leaderboard}
        participantId={snapshot.participantId}
        onHome={() => navigate({ to: "/" })}
      >
        {room.mode === "jigsaw" &&
          room.payload.mode === "jigsaw" &&
          room.payload.jigsaw.imageUrl && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] shadow-[var(--shadow-soft)]">
              <p className="shrink-0 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Your completed puzzle
              </p>
              <div className="min-h-0 flex-1 overflow-hidden px-2 pb-2">
                <img
                  src={room.payload.jigsaw.imageUrl}
                  alt="Your completed puzzle"
                  className="size-full rounded-xl object-contain"
                  draggable={false}
                />
              </div>
            </div>
          )}
        {room.mode === "connect_dots" && room.payload.mode === "connect_dots" && (
          <ConnectDotsCompletionCard
            board={room.payload.connectDots}
            attemptPayload={snapshot.myAttempt?.payload}
          />
        )}
        {room.mode === "quiz_jigsaw" &&
          typeof snapshot.myAttempt?.payload?.rewardCode === "string" &&
          snapshot.myAttempt.payload.rewardCode && (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#7C3AED] bg-[#EDE9FE] px-4 py-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5B21B6]">
                Your reward code
              </p>
              <p className="mt-1 font-display text-xl font-extrabold tracking-widest text-[#111111] sm:text-2xl">
                {String(snapshot.myAttempt.payload.rewardCode)}
              </p>
            </div>
          )}
      </GameCompletionScreen>,
    );
  }

  if (room.status !== "LIVE" && room.status !== "COUNTDOWN") {
    return playShell(
      <Centered>
        <p className="text-sm text-[#525252]">Waiting for the host to start…</p>
        <Button
          className="mt-4 rounded-xl"
          onClick={() => navigate({ to: "/join/lobby", search: { code: room.code } })}
        >
          Back to lobby
        </Button>
      </Centered>,
    );
  }

  if (room.mode === "quiz_jigsaw" && room.payload.mode === "quiz_jigsaw") {
    const correctCount = snapshot.myAnswers.length;
    return playShell(
      <QuizJigsawPlay
        roomId={roomId}
        reconnectToken={reconnectToken}
        questions={room.payload.questions}
        imageUrl={room.payload.jigsaw.imageUrl}
        correctCount={correctCount}
        endsAt={room.endsAt}
        completed={Boolean(snapshot.myAttempt?.completed)}
      />,
    );
  }

  if (room.mode === "quiz" && room.payload.mode === "quiz") {
    return playShell(
      <QuizPlay
        roomId={roomId}
        reconnectToken={reconnectToken}
        questions={room.payload.questions}
        answeredIds={new Set(snapshot.myAnswers.map((a) => a.questionId))}
        myAnswers={snapshot.myAnswers}
        instruction={room.instruction}
        endsAt={room.endsAt}
      />,
    );
  }

  if (room.mode === "connect_dots" && room.payload.mode === "connect_dots") {
    return playShell(
      <ConnectDotsPlay
        roomId={roomId}
        reconnectToken={reconnectToken}
        board={room.payload.connectDots}
        instruction={room.instruction}
        endsAt={room.endsAt}
        title={GAME_MODE_META.connect_dots.title}
        myAttempt={snapshot.myAttempt}
      />,
    );
  }

  if (room.mode === "jigsaw" && room.payload.mode === "jigsaw") {
    if (room.payload.questions.length > 0) {
      return playShell(
        <JigsawMissionPlay
          roomId={roomId}
          reconnectToken={reconnectToken}
          questions={room.payload.questions.map((q, order) => ({
            id: q.id,
            prompt: q.prompt,
            options: q.options,
            order,
          }))}
          imageUrl={room.payload.jigsaw.imageUrl}
          cols={room.payload.jigsaw.cols}
          rows={room.payload.jigsaw.rows}
          pieceUnlockAt={room.payload.jigsaw.pieceUnlockAt}
          correctQuestionIds={snapshot.myAnswers.map((a) => a.questionId)}
          missionPayload={snapshot.myAttempt?.payload ?? EMPTY_MISSION_PAYLOAD}
          endsAt={room.endsAt}
          completed={Boolean(snapshot.myAttempt?.completed)}
          wrongCount={snapshot.myAttempt?.wrongCount ?? 0}
          instruction={room.instruction}
        />,
      );
    }
    return playShell(
      <JigsawPlay
        roomId={roomId}
        reconnectToken={reconnectToken}
        imageUrl={room.payload.jigsaw.imageUrl}
        instruction={room.instruction}
        endsAt={room.endsAt}
        myAttempt={snapshot.myAttempt}
      />,
    );
  }

  return playShell(
    <PageErrorState
      title="Unsupported game"
      message="This game mode is not available in the player yet."
      fullScreen
    >
      <Button asChild variant="outline" className="rounded-xl">
        <Link to="/">Go home</Link>
      </Button>
    </PageErrorState>,
  );
}

function RejoinPrompt({ roomId }: { roomId: string }) {
  const [roomCode, setRoomCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getRoomSnapshotFn({ data: { roomId } }).then((snap) => {
      if (cancelled || !snap.ok) return;
      setRoomCode(snap.room.code);
    });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  return (
    <Centered>
      <p className="text-sm text-[#525252]">
        Your session was not found in this browser. Rejoin with the same room code and name to
        restore your progress.
      </p>
      {roomCode && (
        <p className="mt-2 font-display text-2xl font-extrabold tracking-widest text-[#111111]">
          {roomCode}
        </p>
      )}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button asChild className="rounded-xl">
          <Link to="/join">Enter room code</Link>
        </Button>
        {roomCode && (
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/join/name" search={{ code: roomCode }}>
              Rejoin with name
            </Link>
          </Button>
        )}
      </div>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh-screen flex-col items-center justify-center bg-white px-4 py-8 text-center sm:px-5">
      {children}
    </div>
  );
}

function TimerBar({
  endsAt,
  onTimedOut,
}: {
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
  if (left == null) return null;
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-bold tabular-nums",
        left === 0
          ? "bg-red-100 text-red-800"
          : "bg-[var(--gamibar-brand-soft)] text-[var(--gamibar-brand)]",
      )}
    >
      {left === 0 ? "Time's up" : `${left}s`}
    </span>
  );
}

function QuizPlay({
  roomId,
  reconnectToken,
  questions,
  answeredIds,
  myAnswers,
  instruction,
  endsAt,
}: {
  roomId: string;
  reconnectToken: string;
  questions: Array<{
    id: string;
    prompt: string;
    options: Record<QuizOptionId, string>;
    order: number;
  }>;
  answeredIds: Set<string>;
  myAnswers: Array<{ questionId: string; selectedOption: QuizOptionId }>;
  instruction: string;
  endsAt: number | null;
}) {
  const answerByQuestion = useMemo(
    () => new Map(myAnswers.map((a) => [a.questionId, a.selectedOption])),
    [myAnswers],
  );

  const [localAnsweredIds, setLocalAnsweredIds] = useState(() => new Set(answeredIds));
  const [localSelections, setLocalSelections] = useState<Map<string, QuizOptionId>>(
    () => new Map(answerByQuestion),
  );

  useEffect(() => {
    setLocalAnsweredIds(new Set(answeredIds));
  }, [answeredIds]);

  useEffect(() => {
    setLocalSelections(new Map(answerByQuestion));
  }, [answerByQuestion]);

  const answeredCount = localAnsweredIds.size;
  const firstUnansweredIndex = questions.findIndex((q) => !localAnsweredIds.has(q.id));
  const maxViewIndex =
    firstUnansweredIndex >= 0 ? firstUnansweredIndex : Math.max(0, questions.length - 1);

  const [viewIndex, setViewIndex] = useState(() => maxViewIndex);
  const prevAnsweredCountRef = useRef(answeredCount);

  useEffect(() => {
    if (answeredCount > prevAnsweredCountRef.current) {
      const activeIndex =
        firstUnansweredIndex >= 0 ? firstUnansweredIndex : Math.max(0, questions.length - 1);
      setViewIndex(activeIndex);
    }
    prevAnsweredCountRef.current = answeredCount;
  }, [answeredCount, firstUnansweredIndex, questions.length]);

  const current = questions[viewIndex] ?? null;
  const isAnswered = current ? localAnsweredIds.has(current.id) : false;
  const isActive = viewIndex === firstUnansweredIndex && firstUnansweredIndex >= 0;
  const storedAnswer = current ? (localSelections.get(current.id) ?? null) : null;

  const [selected, setSelected] = useState<QuizOptionId | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    setSelected(storedAnswer);
    setSubmitError(null);
  }, [current?.id, storedAnswer]);

  const submit = async () => {
    if (!current || !selected || timedOut || !isActive || isAnswered) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await submitQuizAnswerFn({
        data: {
          roomId,
          reconnectToken,
          questionId: current.id,
          selectedOption: selected,
        },
      });
      if (!res.ok) {
        const message = friendlyGameError(res.error, "Could not submit your answer. Try again.");
        setSubmitError(message);
        toast.error(message);
        return;
      }
      setLocalAnsweredIds((prev) => new Set([...prev, current.id]));
      setLocalSelections((prev) => new Map(prev).set(current.id, selected));
      setSelected(null);
      if (res.completed) toast.success("Quiz complete!");
    } catch {
      const message = "Could not save your answer. Check your connection and try again.";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!current) {
    return (
      <PageLoader
        message={submitting ? "Saving your answer…" : "Loading next question…"}
        description="Please wait a moment."
      />
    );
  }

  const options: QuizOptionId[] = ["A", "B", "C", "D"];
  const canGoBack = viewIndex > 0;
  const canGoForward = viewIndex < maxViewIndex;

  const goToQuestion = (index: number) => {
    if (index <= maxViewIndex) setViewIndex(index);
  };

  return (
    <div className="mx-auto flex min-h-dvh-screen w-full max-w-6xl flex-col px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-6 lg:flex-row lg:items-stretch lg:gap-0 lg:px-8 lg:py-8">
      {/* Main question area — ~75% on desktop */}
      <div className="flex min-w-0 flex-1 flex-col lg:w-[75%] lg:max-w-[75%] lg:pr-8">
        <div className="flex items-center justify-between gap-3">
          <Logo size={32} />
          <TimerBar endsAt={endsAt} onTimedOut={setTimedOut} />
        </div>

        {/* Mobile: compact progress above question */}
        <div
          className="mt-4 lg:hidden"
          aria-label={`Question ${viewIndex + 1} of ${questions.length}`}
        >
          <p className="text-center font-display text-lg font-bold tabular-nums text-[var(--foreground)]">
            {viewIndex + 1} / {questions.length}
          </p>
          <div
            className="mt-2.5 flex flex-wrap items-center justify-center gap-2.5"
            role="tablist"
            aria-label="Question progress"
          >
            {questions.map((q, i) => {
              const completed = localAnsweredIds.has(q.id);
              const isCurrent = firstUnansweredIndex >= 0 && i === firstUnansweredIndex;
              const reachable = i <= maxViewIndex;
              return (
                <button
                  key={q.id}
                  type="button"
                  role="tab"
                  aria-selected={i === viewIndex}
                  aria-label={`Question ${i + 1}${completed ? ", completed" : isCurrent ? ", current" : ""}`}
                  disabled={!reachable}
                  onClick={() => goToQuestion(i)}
                  className={cn(
                    "tap-target grid size-9 place-items-center rounded-full text-base leading-none transition-transform active:scale-95",
                    !reachable && "cursor-not-allowed opacity-35",
                    completed && "text-[var(--gamibar-brand)]",
                    isCurrent && !completed && "text-[var(--foreground)]",
                    !completed && !isCurrent && "text-[var(--gamibar-border)]",
                  )}
                >
                  {completed ? (
                    <span aria-hidden className="size-2.5 rounded-full bg-current" />
                  ) : isCurrent ? (
                    <span aria-hidden className="relative grid size-3.5 place-items-center">
                      <Circle className="size-3.5 fill-current stroke-current" strokeWidth={2.5} />
                      <span className="absolute size-1.5 rounded-full bg-[var(--gamibar-page)]" />
                    </span>
                  ) : (
                    <Circle className="size-3 stroke-current" strokeWidth={2} aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-[var(--gamibar-text-tertiary)] lg:mt-5">
          {instruction}
        </p>

        {timedOut && isActive ? (
          <p
            className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-800"
            role="status"
          >
            Time&apos;s up — no more answers can be submitted.
          </p>
        ) : null}

        <div className="mt-4 space-y-2 lg:mt-5">
          <p className="text-center text-xs font-semibold text-[var(--muted-foreground)]">
            {isAnswered ? "Reviewing your answer" : isActive ? "Your turn" : ""}
          </p>
          <div className="grid grid-cols-2 gap-2 lg:flex lg:items-center lg:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canGoBack}
              onClick={() => setViewIndex((i) => Math.max(0, i - 1))}
              className="h-11 min-h-[2.75rem] w-full rounded-xl px-3 lg:h-10 lg:min-h-0 lg:min-w-[5.5rem] lg:w-auto"
            >
              <ChevronLeft className="mr-1 size-4" />
              Back
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canGoForward}
              onClick={() => setViewIndex((i) => Math.min(maxViewIndex, i + 1))}
              className="h-11 min-h-[2.75rem] w-full rounded-xl px-3 lg:h-10 lg:min-h-0 lg:min-w-[5.5rem] lg:w-auto"
            >
              Next
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        </div>

        <h1
          id={`quiz-question-${current.id}`}
          className="mt-5 font-display text-[clamp(1.25rem,4.5vw,1.75rem)] font-bold leading-snug text-[#111111] lg:mt-6"
        >
          {current.prompt}
        </h1>

        <fieldset className="mt-5 border-0 p-0 lg:mt-6">
          <legend className="sr-only">
            Answer choices for question {viewIndex + 1} of {questions.length}
          </legend>
          <div className="grid gap-3 lg:max-w-3xl lg:gap-2.5">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  if (!isAnswered && isActive && !timedOut) setSelected(opt);
                }}
                disabled={isAnswered || !isActive || timedOut}
                aria-pressed={selected === opt}
                aria-label={`Option ${opt}: ${current.options[opt]}`}
                className={cn(
                  "flex min-h-[3.25rem] w-full touch-manipulation items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-colors active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 lg:min-h-12 lg:py-3",
                  selected === opt
                    ? "border-[#111111] bg-[#111111] text-white shadow-md ring-2 ring-[#111111]/20 ring-offset-2"
                    : "border-[var(--gamibar-border)] bg-white text-[#111111] hover:border-[#D1D5DB]",
                  (isAnswered || !isActive || timedOut) && "cursor-default",
                )}
              >
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-lg text-xs font-bold lg:size-9",
                    selected === opt
                      ? "bg-white text-[#111111]"
                      : "bg-[var(--gamibar-page)] text-[#111111]",
                  )}
                  aria-hidden="true"
                >
                  {selected === opt ? <Check className="size-4" strokeWidth={3} /> : opt}
                </span>
                <span className="min-w-0 flex-1">{current.options[opt]}</span>
                {selected === opt && !isAnswered && isActive && !timedOut && (
                  <span className="ml-auto flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-white/90">
                    <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                    Selected
                  </span>
                )}
              </button>
            ))}
          </div>
        </fieldset>

        {isAnswered ? (
          <p className="mt-6 text-center text-sm font-medium text-[var(--muted-foreground)] lg:max-w-3xl">
            You already answered this question. Use Back or Next to continue.
          </p>
        ) : isActive ? (
          <>
            <Button
              className="mt-6 h-12 w-full touch-manipulation rounded-xl bg-[#111111] hover:bg-black lg:max-w-3xl lg:h-12"
              disabled={!selected || submitting || timedOut}
              onClick={() => void submit()}
            >
              {submitting ? "Saving answer…" : "Submit answer"}
            </Button>
            {submitError ? (
              <InlineErrorBanner
                className="mt-4 text-left lg:max-w-3xl"
                message={submitError}
                onRetry={() => void submit()}
                retrying={submitting}
                onDismiss={() => setSubmitError(null)}
              />
            ) : null}
            <p className="mt-3 text-center text-xs text-[var(--gamibar-text-tertiary)] lg:max-w-3xl">
              One attempt — you cannot change this answer.
            </p>
          </>
        ) : null}
      </div>

      {/* Desktop: progress sidebar — ~25% */}
      <aside
        className="hidden min-h-0 lg:flex lg:w-[25%] lg:max-w-[25%] lg:flex-col lg:border-l lg:border-[var(--gamibar-border)] lg:pl-8"
        aria-label="Your progress"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
          Your progress
        </p>
        <ol className="mt-5 flex flex-1 flex-col gap-4">
          {questions.map((q, i) => {
            const completed = localAnsweredIds.has(q.id);
            const isCurrent = firstUnansweredIndex >= 0 && i === firstUnansweredIndex;
            const reachable = i <= maxViewIndex;
            const isViewing = i === viewIndex;

            return (
              <li key={q.id}>
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => goToQuestion(i)}
                  aria-current={isViewing ? "step" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg py-1.5 text-left transition-colors",
                    reachable && "hover:opacity-80",
                    !reachable && "cursor-not-allowed opacity-40",
                    isViewing && "opacity-100",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center",
                      completed && "text-[var(--gamibar-brand)]",
                      isCurrent && !completed && "text-[var(--foreground)]",
                      !completed && !isCurrent && "text-[var(--muted-foreground)]/45",
                    )}
                    aria-hidden
                  >
                    {completed ? (
                      <Check className="size-4 stroke-[2.5]" />
                    ) : isCurrent ? (
                      <span className="relative grid size-4 place-items-center">
                        <Circle className="size-4 fill-current stroke-current" strokeWidth={2.5} />
                        <span className="absolute size-1.5 rounded-full bg-[var(--gamibar-page)]" />
                      </span>
                    ) : (
                      <Circle className="size-4 stroke-current" strokeWidth={2} />
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      completed && "text-[var(--muted-foreground)]",
                      isCurrent && !completed && "text-[var(--foreground)]",
                      !completed && !isCurrent && "text-[var(--muted-foreground)]/50",
                      isViewing &&
                        !completed &&
                        isCurrent &&
                        "underline decoration-[var(--gamibar-brand)] decoration-2 underline-offset-4",
                    )}
                  >
                    Question {i + 1}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </aside>
    </div>
  );
}

function ConnectDotsCompletionCard({
  board,
  attemptPayload,
}: {
  board: ConnectDotsBoardConfig;
  attemptPayload?: Record<string, unknown>;
}) {
  const catalog = getModeCatalog("connect_dots");
  const savedPayload = (attemptPayload ?? {}) as { paths?: PathMap; routes?: PathMap };
  const savedPaths = savedPayload.paths ?? savedPayload.routes ?? {};
  const hasSavedPaths = Object.keys(savedPaths).length > 0;

  const publicBoard = useMemo(
    () => ({
      gridSize: board.gridSize,
      difficulty: board.difficulty,
      pairs: board.pairs,
      seed: board.seed,
    }),
    [board],
  );

  return (
    <div className="@container flex min-h-0 flex-1 flex-col rounded-2xl border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] shadow-[var(--shadow-soft)]">
      <p className="shrink-0 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        Your completed board
      </p>
      <div className="flex min-h-0 flex-1 items-center justify-center px-2 py-2">
        {hasSavedPaths ? (
          <div className="aspect-square h-[min(100cqh,100cqw)] w-[min(100cqw,100cqh)] max-h-full max-w-full shrink-0 p-0.5">
            <ConnectDots
              board={publicBoard}
              solution={board.solution}
              initialPaths={savedPaths}
              disabled
              showControls={false}
              fitToContainer
              className="size-full"
            />
          </div>
        ) : catalog ? (
          <div className="flex aspect-square h-[min(100cqh,100cqw)] w-[min(100cqw,100cqh)] max-h-full max-w-full items-center justify-center rounded-xl bg-[var(--game-connect-dots-soft)] p-3">
            <img
              src={catalog.preview}
              alt="Connect Dots"
              className="max-h-full max-w-full object-contain"
              draggable={false}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ConnectDotsPlay({
  roomId,
  reconnectToken,
  board,
  instruction,
  endsAt,
  title,
  myAttempt,
}: {
  roomId: string;
  reconnectToken: string;
  board: ConnectDotsBoardConfig;
  instruction: string;
  endsAt: number | null;
  title: string;
  myAttempt: {
    completed?: boolean;
    durationMs?: number | null;
    payload?: Record<string, unknown>;
  } | null;
}) {
  return (
    <ConnectDotsGridPlay
      roomId={roomId}
      reconnectToken={reconnectToken}
      board={board}
      instruction={instruction}
      endsAt={endsAt}
      title={title}
      myAttempt={myAttempt}
    />
  );
}

function ConnectDotsGridPlay({
  roomId,
  reconnectToken,
  board,
  instruction,
  endsAt,
  title,
  myAttempt,
}: {
  roomId: string;
  reconnectToken: string;
  board: ConnectDotsBoardConfig;
  instruction: string;
  endsAt: number | null;
  title: string;
  myAttempt: {
    completed?: boolean;
    payload?: Record<string, unknown>;
  } | null;
}) {
  const savedPayload = (myAttempt?.payload ?? {}) as {
    paths?: PathMap;
    routes?: PathMap;
  };
  const savedPaths = (savedPayload.paths ?? savedPayload.routes ?? {}) as PathMap;
  const hasSavedPaths = Object.keys(savedPaths).length > 0;
  const [progress, setProgress] = useState({
    connected: myAttempt?.completed
      ? board.pairCount
      : typeof myAttempt?.correctCount === "number"
        ? myAttempt.correctCount
        : Object.keys(savedPaths).length,
    total: board.pairCount,
  });
  const [done, setDone] = useState(Boolean(myAttempt?.completed));
  const [timedOut, setTimedOut] = useState(false);
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const incorrectThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestPaths = useRef<PathMap>(savedPaths);
  const skipInitialPaths = useRef(!hasSavedPaths && !myAttempt?.completed);

  const reportIncorrectLink = useCallback(() => {
    if (done) return;
    if (incorrectThrottleRef.current) return;
    incorrectThrottleRef.current = setTimeout(() => {
      incorrectThrottleRef.current = null;
    }, 400);
    void recordConnectDotsIncorrectAttemptFn({
      data: { roomId, reconnectToken },
    });
  }, [done, reconnectToken, roomId]);

  const publicBoard = useMemo(
    () => ({
      gridSize: board.gridSize,
      difficulty: board.difficulty,
      pairs: board.pairs,
      seed: board.seed,
    }),
    [board],
  );

  const syncProgress = useCallback(
    async (paths: PathMap, completed: boolean) => {
      const res = await submitConnectDotsPathsFn({
        data: { roomId, reconnectToken, paths, completed },
      });
      if (!res.ok) {
        toast.error(friendlyGameError(res.error, "Could not submit your answer. Try again."));
        return;
      }
      if (res.completed) {
        setDone(true);
        toast.success("Board complete - waiting for results.");
      }
    },
    [reconnectToken, roomId],
  );

  const handleProgress = useCallback((connected: number, total: number) => {
    setProgress((prev) =>
      prev.connected === connected && prev.total === total ? prev : { connected, total },
    );
  }, []);

  const onPathsChange = useCallback(
    (paths: PathMap) => {
      if (skipInitialPaths.current) {
        skipInitialPaths.current = false;
        return;
      }
      latestPaths.current = paths;
      if (throttleRef.current) clearTimeout(throttleRef.current);
      throttleRef.current = setTimeout(() => {
        void syncProgress(latestPaths.current, false);
      }, 700);
    },
    [syncProgress],
  );

  useEffect(() => {
    return () => {
      if (throttleRef.current) clearTimeout(throttleRef.current);
      if (incorrectThrottleRef.current) clearTimeout(incorrectThrottleRef.current);
    };
  }, []);

  return (
    <div className="min-h-dvh-screen bg-[var(--gamibar-page)] font-sans">
      <div className="mx-auto w-full max-w-lg px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-w-xl sm:px-5 sm:py-6">
        <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-[var(--gamibar-border)]/80 bg-[var(--gamibar-page)]/95 px-4 py-3 backdrop-blur-sm sm:-mx-5 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gamibar-brand)]">
                {title}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-[var(--muted-foreground)]">
                {instruction}
              </p>
            </div>
            <TimerBar endsAt={endsAt} onTimedOut={setTimedOut} />
          </div>
          <p className="mt-2 text-xs font-medium text-[var(--gamibar-text-tertiary)]">
            {board.difficulty.toUpperCase()} · {board.gridSize}×{board.gridSize} ·{" "}
            {progress.connected}/{progress.total} pairs
          </p>
          {timedOut && !done ? (
            <p className="mt-2 text-xs font-semibold text-red-700" role="status">
              Time&apos;s up — saving your progress…
            </p>
          ) : null}
        </div>

        {done ? (
          <div className="rounded-[24px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] px-6 py-12 text-center shadow-[var(--shadow-soft)]">
            <p className="text-sm text-[var(--muted-foreground)]">Saving your results…</p>
          </div>
        ) : (
          <div className="rounded-[24px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] p-4 shadow-[var(--shadow-soft)] sm:p-6">
            <ConnectDots
              board={publicBoard}
              solution={board.solution}
              disabled={done || timedOut}
              initialPaths={hasSavedPaths ? savedPaths : undefined}
              onProgress={handleProgress}
              onPathsChange={onPathsChange}
              onIncorrectLink={reportIncorrectLink}
              onComplete={(paths) => {
                if (throttleRef.current) clearTimeout(throttleRef.current);
                void syncProgress(paths, true);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function JigsawMissionPlay({
  roomId,
  reconnectToken,
  questions,
  imageUrl,
  cols,
  rows,
  pieceUnlockAt,
  correctQuestionIds,
  missionPayload,
  endsAt,
  completed,
  wrongCount,
  instruction,
}: {
  roomId: string;
  reconnectToken: string;
  questions: Array<{
    id: string;
    prompt: string;
    options: Record<QuizOptionId, string>;
    order: number;
  }>;
  imageUrl: string | null;
  cols: number;
  rows: number;
  pieceUnlockAt?: number[];
  correctQuestionIds: string[];
  missionPayload: Record<string, unknown>;
  endsAt: number | null;
  completed: boolean;
  wrongCount: number;
  instruction: string;
}) {
  const total = questions.length;
  const tileCount = cols * rows;
  const unlockSchedule = useMemo(
    () => resolvePieceUnlockAt(total, tileCount, pieceUnlockAt),
    [total, tileCount, pieceUnlockAt],
  );
  const { collectionCardSize, assemblyCardSize, tapDragThreshold } = useJigsawTouchLayout();
  const [localCorrectIds, setLocalCorrectIds] = useState(correctQuestionIds);
  const [localMissionPayload, setLocalMissionPayload] = useState(missionPayload);
  const correctIdsKey = correctQuestionIds.join(",");
  const missionPayloadKey = JSON.stringify(missionPayload);

  useEffect(() => {
    setLocalCorrectIds(correctQuestionIds);
  }, [correctIdsKey, correctQuestionIds]);

  useEffect(() => {
    setLocalMissionPayload((prev) => ({
      ...missionPayload,
      tileRotations: {
        ...readTileRotations(missionPayload),
        ...readTileRotations(prev),
      },
      tileLayouts: {
        ...readTileLayouts(missionPayload),
        ...readTileLayouts(prev),
      },
    }));
  }, [missionPayloadKey, missionPayload]);

  const mission = readJigsawMissionPayload(localMissionPayload);
  const correctSet = useMemo(() => new Set(localCorrectIds), [localCorrectIds]);
  const earnedTileIds = useMemo(
    () =>
      readEarnedTileIds(localMissionPayload, cols, rows, correctSet.size, total, unlockSchedule),
    [localMissionPayload, cols, rows, correctSet.size, total, unlockSchedule],
  );
  const tilesUnlocked = earnedTileIds.length;
  const tileRotations = useMemo(
    () => readTileRotations(localMissionPayload),
    [localMissionPayload],
  );
  const tileLayouts = useMemo(() => readTileLayouts(localMissionPayload), [localMissionPayload]);
  const isRetryRound = isJigsawMissionRetryRound(mission);
  const retryRemaining = retryPoolQuestionIds(questions, correctSet).length;
  const activeQuestionId = resolveJigsawMissionQuestionId(questions, correctSet, mission);
  const activeQuestion = questions.find((q) => q.id === activeQuestionId) ?? null;
  const firstRoundProgress = mission.firstRoundComplete
    ? total
    : Math.min(mission.firstRoundIndex ?? 0, total);

  const [selected, setSelected] = useState<QuizOptionId | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showComplete, setShowComplete] = useState(completed);
  const [localAssembly, setLocalAssembly] = useState(
    () => readJigsawMissionPayload(missionPayload).phase === "assemble",
  );
  const [assemblySubmitting, setAssemblySubmitting] = useState(false);
  const [assemblyMessage, setAssemblyMessage] = useState<string | null>(null);
  const [assemblySuccess, setAssemblySuccess] = useState<{ durationMs: number | null } | null>(
    null,
  );
  const [timedOut, setTimedOut] = useState(false);

  const collectionRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const flyQueueRef = useRef<string[]>([]);
  const pendingAssemblyRef = useRef(false);
  const postRewardTimeoutRef = useRef<number | null>(null);
  const flyStartTimeoutRef = useRef<number | null>(null);
  const assemblySubmitInFlightRef = useRef(false);

  const [displayedTileIds, setDisplayedTileIds] = useState<string[]>(() =>
    readEarnedTileIds(
      missionPayload,
      cols,
      rows,
      correctQuestionIds.length,
      total,
      resolvePieceUnlockAt(total, tileCount, pieceUnlockAt),
    ),
  );
  const [activeFlyTileId, setActiveFlyTileId] = useState<string | null>(null);
  const [landedTileId, setLandedTileId] = useState<string | null>(null);
  const [flyRects, setFlyRects] = useState<{ from: DOMRect; to: DOMRect } | null>(null);
  const [rewardAnimating, setRewardAnimating] = useState(false);
  const activeFlyRef = useRef<string | null>(null);

  useEffect(() => {
    activeFlyRef.current = activeFlyTileId;
  }, [activeFlyTileId]);

  const isAnimatingReward = rewardAnimating || activeFlyTileId !== null;

  const tileImageSrc =
    imageUrl ??
    "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect fill="#e5e7eb" width="100%" height="100%"/></svg>`,
      );

  const clearPostRewardTimeout = useCallback(() => {
    if (postRewardTimeoutRef.current != null) {
      window.clearTimeout(postRewardTimeoutRef.current);
      postRewardTimeoutRef.current = null;
    }
  }, []);

  const schedulePostReward = useCallback(
    (allPiecesUnlocked: boolean) => {
      clearPostRewardTimeout();
      const delay = allPiecesUnlocked ? 520 : 320;
      postRewardTimeoutRef.current = window.setTimeout(() => {
        setFeedback(null);
        setSelected(null);
        setLandedTileId(null);
        if (allPiecesUnlocked) setLocalAssembly(true);
      }, delay);
    },
    [clearPostRewardTimeout],
  );

  const beginFlySequence = useCallback(
    (tileIds: string[], allPiecesUnlocked: boolean) => {
      if (flyStartTimeoutRef.current != null) window.clearTimeout(flyStartTimeoutRef.current);
      pendingAssemblyRef.current = allPiecesUnlocked;
      flyQueueRef.current = [];

      if (tileIds.length === 0) {
        schedulePostReward(allPiecesUnlocked);
        return;
      }

      setRewardAnimating(true);
      const [first, ...rest] = tileIds;
      flyQueueRef.current = rest;
      flyStartTimeoutRef.current = window.setTimeout(() => {
        setActiveFlyTileId(first);
      }, 420);
    },
    [schedulePostReward],
  );

  const handleFlyComplete = useCallback(() => {
    const current = activeFlyRef.current;
    if (!current) return;

    setDisplayedTileIds((prev) => (prev.includes(current) ? prev : [...prev, current]));
    setLandedTileId(current);
    setActiveFlyTileId(null);

    const queue = flyQueueRef.current;
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      flyQueueRef.current = rest;
      window.setTimeout(() => setActiveFlyTileId(next), 70);
      return;
    }

    setRewardAnimating(false);
    schedulePostReward(pendingAssemblyRef.current);
  }, [schedulePostReward]);

  const handleRotateTile = useCallback(
    (tileId: string) => {
      if (timedOut) return;
      if (isAnimatingReward && !localAssembly) return;
      if (assemblySuccess || showComplete || completed) return;
      if (!earnedTileIds.includes(tileId)) return;

      const current = tileRotations[tileId] ?? (0 as JigsawTileCardRotation);
      const next = nextClockwiseTileCardRotation(current);

      setLocalMissionPayload((prev) => ({
        ...prev,
        tileRotations: {
          ...readTileRotations(prev),
          [tileId]: next,
        },
      }));
      setAssemblyMessage(null);

      void rotateJigsawMissionTileFn({
        data: {
          roomId,
          reconnectToken,
          tileId,
          rotation: next,
        },
      })
        .then((res) => {
          if (!res.ok) {
            setLocalMissionPayload((prev) => ({
              ...prev,
              tileRotations: {
                ...readTileRotations(prev),
                [tileId]: current,
              },
            }));
            toast.error(friendlyGameError(res.error, "Could not save the rotation. Try again."));
          }
        })
        .catch(() => {
          setLocalMissionPayload((prev) => ({
            ...prev,
            tileRotations: {
              ...readTileRotations(prev),
              [tileId]: current,
            },
          }));
          toast.error("Could not save the rotation. Try again.");
        });
    },
    [
      timedOut,
      isAnimatingReward,
      localAssembly,
      assemblySuccess,
      showComplete,
      completed,
      earnedTileIds,
      tileRotations,
      roomId,
      reconnectToken,
    ],
  );

  useEffect(() => {
    if (rewardAnimating || activeFlyTileId) return;
    const earned = readEarnedTileIds(
      localMissionPayload,
      cols,
      rows,
      correctSet.size,
      total,
      unlockSchedule,
    );
    setDisplayedTileIds(earned);
  }, [
    localMissionPayload,
    cols,
    rows,
    correctSet.size,
    total,
    unlockSchedule,
    rewardAnimating,
    activeFlyTileId,
  ]);

  useLayoutEffect(() => {
    if (!activeFlyTileId) {
      setFlyRects(null);
      return;
    }

    const measure = () => {
      const fromEl = feedbackRef.current;
      const collectionEl = collectionRef.current;
      if (!fromEl || !collectionEl) {
        window.requestAnimationFrame(measure);
        return;
      }
      const flyIndex = displayedTileIds.includes(activeFlyTileId)
        ? displayedTileIds.indexOf(activeFlyTileId)
        : displayedTileIds.length;
      const flyTotal = displayedTileIds.includes(activeFlyTileId)
        ? displayedTileIds.length
        : displayedTileIds.length + 1;

      setFlyRects({
        from: fromEl.getBoundingClientRect(),
        to: tileRowLayoutRect(collectionEl, flyIndex, flyTotal, collectionCardSize),
      });
    };

    measure();
  }, [activeFlyTileId, collectionCardSize, displayedTileIds]);

  useEffect(
    () => () => {
      clearPostRewardTimeout();
      if (flyStartTimeoutRef.current != null) window.clearTimeout(flyStartTimeoutRef.current);
    },
    [clearPostRewardTimeout],
  );

  useEffect(() => {
    if (completed) setShowComplete(true);
  }, [completed]);

  useEffect(() => {
    if (readJigsawMissionPayload(missionPayload).phase === "assemble") {
      setLocalAssembly(true);
    }
  }, [missionPayloadKey, missionPayload]);

  const submit = async () => {
    if (!activeQuestion || !selected || feedback || timedOut) return;
    setSubmitting(true);
    try {
      const res = await submitJigsawMissionAnswerFn({
        data: {
          roomId,
          reconnectToken,
          questionId: activeQuestion.id,
          selectedOption: selected,
        },
      });
      if (!res.ok) {
        toast.error(friendlyGameError(res.error, "Could not submit your answer. Try again."));
        return;
      }

      const missionState = readJigsawMissionPayload(localMissionPayload);
      let firstRoundIndex = missionState.firstRoundIndex ?? 0;
      let firstRoundComplete = missionState.firstRoundComplete ?? false;
      let retryQuestionId = missionState.retryQuestionId ?? null;

      if (res.correct) {
        const prevEarned = readEarnedTileIds(
          localMissionPayload,
          cols,
          rows,
          correctSet.size,
          total,
          unlockSchedule,
        );
        setLocalCorrectIds((prev) =>
          prev.includes(activeQuestion.id) ? prev : [...prev, activeQuestion.id],
        );
        if (!firstRoundComplete) {
          firstRoundIndex += 1;
          if (firstRoundIndex >= total) firstRoundComplete = true;
        }
        const unlocked = new Set([...correctSet, activeQuestion.id]);
        const poolAfter = retryPoolQuestionIds(questions, unlocked);
        retryQuestionId = firstRoundComplete ? (poolAfter[0] ?? null) : null;
        const nextEarned =
          res.earnedTileIds ??
          readEarnedTileIds(localMissionPayload, cols, rows, unlocked.size, total, unlockSchedule);
        const newTiles = newlyEarnedTileIds(prevEarned, nextEarned);
        const nextRotations =
          res.tileRotations ??
          mergeTileRotationsForNewTiles(readTileRotations(localMissionPayload), newTiles);
        const nextLayouts =
          res.tileLayouts ??
          mergeTileLayoutsForNewTiles(readTileLayouts(localMissionPayload), newTiles, nextEarned);
        setLocalMissionPayload((prev) => ({
          ...mergeJigsawMissionPayload(prev, {
            phase: res.allPiecesUnlocked ? "assemble" : "quiz",
            firstRoundIndex,
            firstRoundComplete,
            retryQuestionId,
          }),
          earnedTileIds: nextEarned,
          tileRotations: nextRotations,
          tileLayouts: nextLayouts,
        }));
        setFeedback("correct");
        beginFlySequence(newTiles, Boolean(res.allPiecesUnlocked));
      } else if (!firstRoundComplete) {
        firstRoundIndex += 1;
        if (firstRoundIndex >= total) {
          firstRoundComplete = true;
          retryQuestionId = retryPoolQuestionIds(questions, correctSet)[0] ?? null;
        }
        setLocalMissionPayload((prev) =>
          mergeJigsawMissionPayload(prev, {
            firstRoundIndex,
            firstRoundComplete,
            retryQuestionId,
          }),
        );
      } else {
        const pool = retryPoolQuestionIds(questions, correctSet);
        retryQuestionId = nextRetryQuestionId(pool, activeQuestion.id);
        setLocalMissionPayload((prev) =>
          mergeJigsawMissionPayload(prev, {
            firstRoundComplete: res.firstRoundComplete,
            retryQuestionId,
          }),
        );
      }

      if (!res.correct) {
        setFeedback("wrong");
        setTimeout(() => {
          setFeedback(null);
          setSelected(null);
        }, 1800);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssemblySubmit = async (layout: number[]) => {
    if (assemblySubmitInFlightRef.current) return;
    assemblySubmitInFlightRef.current = true;
    setAssemblySubmitting(true);
    setAssemblyMessage(null);
    try {
      const res = await submitJigsawMissionAssemblyFn({
        data: {
          roomId,
          reconnectToken,
          layout,
          totalPieces: cols * rows,
          tileRotations: { ...tileRotations },
        },
      });
      if (!res.ok) {
        toast.error(friendlyGameError(res.error, "Could not submit your answer. Try again."));
        return;
      }
      if (!res.solved) {
        setAssemblyMessage(res.message ?? "The puzzle is not complete yet.");
        return;
      }
      setAssemblySuccess({ durationMs: res.durationMs ?? null });
      window.setTimeout(() => setShowComplete(true), 1200);
      toast.success("Puzzle complete!");
    } finally {
      assemblySubmitInFlightRef.current = false;
      setAssemblySubmitting(false);
    }
  };

  if (assemblySuccess && imageUrl) {
    return (
      <div className="flex min-h-dvh-screen flex-col overflow-x-hidden bg-[#FAFAFA]">
        <JigsawMissionSuccess
          imageUrl={imageUrl}
          cols={cols}
          durationMs={assemblySuccess.durationMs}
          questionTotal={total}
          correctCount={correctSet.size}
          incorrectAttempts={wrongCount}
        />
      </div>
    );
  }

  if (showComplete || completed) {
    return (
      <PageLoader message="Loading your results…" description="Fetching your score and rank." />
    );
  }

  if (!localAssembly && !activeQuestion) {
    return (
      <PageLoader
        message={submitting ? "Saving your answer…" : "Loading question…"}
        description="Unlocking puzzle pieces as you progress."
      />
    );
  }

  return (
    <div className="flex min-h-dvh-screen min-w-0 flex-col overflow-x-hidden bg-[#FAFAFA]">
      <SlidoProgressHeader
        piecesUnlocked={tilesUnlocked}
        totalPieces={tileCount}
        endsAt={endsAt}
        onTimedOut={setTimedOut}
      />

      {timedOut ? (
        <p
          className="mx-auto max-w-5xl px-4 pt-4 text-center text-sm font-medium text-red-800 md:px-6"
          role="status"
        >
          Time&apos;s up —{" "}
          {localAssembly
            ? "assembly can no longer be submitted."
            : "no more answers can be submitted."}
        </p>
      ) : null}

      <AnimatePresence mode="wait">
        {!localAssembly && activeQuestion ? (
          <motion.div
            key="jigsaw-quiz"
            initial={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto flex w-full min-w-0 max-w-5xl flex-1 flex-col gap-3 px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:grid md:grid-cols-2 md:items-start md:gap-6 md:px-6 md:py-8 lg:px-8"
          >
            <div className="order-1 min-w-0 rounded-2xl border border-[#E5E7EB] bg-white p-2.5 shadow-sm sm:p-3 md:p-6">
              <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[#737373] md:mb-4 md:text-xs">
                Your puzzle
              </p>
              <JigsawMissionRewardStack
                ref={collectionRef}
                displayedTileIds={displayedTileIds}
                tileRotations={tileRotations}
                tileLayouts={tileLayouts}
                imageSrc={imageUrl}
                cols={cols}
                rows={rows}
                landedTileId={landedTileId}
                onRotateTile={handleRotateTile}
                rotateDisabled={timedOut || isAnimatingReward}
                cardSize={collectionCardSize}
                tapDragThreshold={tapDragThreshold}
              />
              <p className="mt-2 text-center text-[10px] leading-snug text-[#737373] md:mt-4 md:text-xs">
                {isRetryRound
                  ? `Retry round — ${retryRemaining} question${retryRemaining === 1 ? "" : "s"} remaining`
                  : `${tilesUnlocked}/${tileCount} tiles earned · answer questions to unlock more`}
              </p>
            </div>

            <div className="order-2 min-w-0 rounded-2xl border border-[#E5E7EB] bg-white p-3 shadow-sm sm:p-4 md:p-6">
              {isRetryRound && (
                <p className="mb-3 rounded-xl bg-[var(--game-jigsaw-soft)] px-3 py-2 text-center text-xs font-semibold text-[var(--game-jigsaw-deep)]">
                  Retry round · {retryRemaining} missed question{retryRemaining === 1 ? "" : "s"}
                </p>
              )}
              <SlidoQuizPanel
                question={activeQuestion}
                questionIndex={isRetryRound ? total - retryRemaining : firstRoundProgress}
                totalQuestions={total}
                selected={selected}
                feedback={feedback}
                submitting={submitting}
                disabled={timedOut || isAnimatingReward}
                feedbackRef={feedbackRef}
                onSelect={setSelected}
                onSubmit={() => void submit()}
              />
            </div>

            {activeFlyTileId && flyRects
              ? (() => {
                  const tile = tileMetaFromId(activeFlyTileId, cols, rows);
                  if (!tile) return null;
                  const visualRotation =
                    tileRotations[activeFlyTileId] ?? (0 as JigsawTileCardRotation);
                  return (
                    <JigsawMissionFlyingTile
                      key={activeFlyTileId}
                      tileId={activeFlyTileId}
                      col={tile.col}
                      row={tile.row}
                      cols={cols}
                      rows={rows}
                      imageUrl={tileImageSrc}
                      visualRotation={visualRotation}
                      from={flyRects.from}
                      to={flyRects.to}
                      onComplete={handleFlyComplete}
                    />
                  );
                })()
              : null}
          </motion.div>
        ) : localAssembly && imageUrl ? (
          <motion.div
            key="jigsaw-assembly"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6 md:py-8 lg:px-8"
          >
            <p className="mb-3 text-center text-xs font-semibold text-[#111111] md:mb-4 md:text-sm">
              <span className="md:hidden">Tap to rotate · drag pieces onto the board</span>
              <span className="hidden md:inline">
                All questions complete — tap to rotate pieces, drag them onto the board
              </span>
            </p>
            <JigsawMissionAssembly
              imageUrl={imageUrl}
              cols={cols}
              rows={rows}
              earnedTileIds={earnedTileIds}
              tileRotations={tileRotations}
              tileLayouts={tileLayouts}
              onRotateTile={handleRotateTile}
              assemblyCardSize={assemblyCardSize}
              submitting={assemblySubmitting}
              disabled={timedOut}
              submitMessage={assemblyMessage}
              initialPlacements={
                Array.isArray(localMissionPayload.assemblyLayout)
                  ? (localMissionPayload.assemblyLayout as Array<number | null>)
                  : undefined
              }
              onSubmit={(layout) => void handleAssemblySubmit(layout)}
              onClearSubmitMessage={() => setAssemblyMessage(null)}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function JigsawPlay({
  roomId,
  reconnectToken,
  imageUrl,
  instruction,
  endsAt,
  myAttempt,
}: {
  roomId: string;
  reconnectToken: string;
  imageUrl: string | null;
  instruction: string;
  endsAt: number | null;
  myAttempt: {
    completed?: boolean;
    payload?: Record<string, unknown>;
  } | null;
}) {
  const cols = JIGSAW_GRID.cols;
  const rows = JIGSAW_GRID.rows;
  const total = JIGSAW_GRID.pieceCount;
  const initialLocked =
    typeof myAttempt?.payload?.lockedCount === "number" ? myAttempt.payload.lockedCount : 0;
  const initialSlots = Array.isArray(myAttempt?.payload?.slots)
    ? (myAttempt.payload.slots as number[])
    : undefined;
  const [locked, setLocked] = useState(initialLocked);
  const [busy, setBusy] = useState(false);

  const report = useCallback(
    async (nextLocked: number, done: boolean, slots?: number[]) => {
      setLocked(nextLocked);
      setBusy(true);
      try {
        const res = await submitJigsawProgressFn({
          data: {
            roomId,
            reconnectToken,
            lockedCount: nextLocked,
            totalPieces: total,
            completed: done,
            layout: slots,
          },
        });
        if (!res.ok)
          toast.error(friendlyGameError(res.error, "Could not record your attempt. Try again."));
        else if (res.completed) toast.success("Puzzle complete!");
      } finally {
        setBusy(false);
      }
    },
    [roomId, reconnectToken, total],
  );

  const onProgress = useCallback(
    (nextLocked: number, done: boolean, slots?: number[]) => {
      void report(nextLocked, done, slots);
    },
    [report],
  );

  if (!imageUrl) {
    return (
      <Centered>
        <p className="text-sm text-[#525252]">The host has not uploaded a puzzle image yet.</p>
      </Centered>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-6 sm:px-5 sm:py-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gamibar-brand)]">
            Jigsaw Mission
          </p>
          <p className="mt-1 text-sm text-[#525252]">{instruction}</p>
        </div>
        <TimerBar endsAt={endsAt} />
      </div>

      <p className="mt-4 text-center text-sm font-semibold text-[#111111]">
        Pieces locked: {locked}/{total}
      </p>

      <div className="mt-4">
        <JigsawPuzzle
          imageUrl={imageUrl}
          cols={cols}
          rows={rows}
          onProgress={onProgress}
          disabled={locked >= total || busy}
          initialSlots={initialSlots}
        />
      </div>
    </div>
  );
}

function QuizJigsawPlay({
  roomId,
  reconnectToken,
  questions,
  imageUrl,
  correctCount,
  endsAt,
  completed,
}: {
  roomId: string;
  reconnectToken: string;
  questions: Array<{
    id: string;
    prompt: string;
    options: Record<QuizOptionId, string>;
    order: number;
  }>;
  imageUrl: string | null;
  correctCount: number;
  endsAt: number | null;
  completed: boolean;
}) {
  const total = PUZZLE_QUEST_GRID.pieceCount;
  const [piecesUnlocked, setPiecesUnlocked] = useState(correctCount);
  const [selected, setSelected] = useState<QuizOptionId | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rewardCode, setRewardCode] = useState<string | null>(null);
  const [showComplete, setShowComplete] = useState(completed);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    setPiecesUnlocked(correctCount);
  }, [correctCount]);

  useEffect(() => {
    if (completed) setShowComplete(true);
  }, [completed]);

  const currentIndex = Math.min(piecesUnlocked, questions.length - 1);
  const current = questions[currentIndex] ?? questions[0];

  const submit = async () => {
    if (!current || !selected || feedback || timedOut) return;
    setSubmitting(true);
    try {
      const res = await submitQuizJigsawAnswerFn({
        data: {
          roomId,
          reconnectToken,
          questionId: current.id,
          selectedOption: selected,
        },
      });
      if (!res.ok) {
        toast.error(friendlyGameError(res.error, "Could not submit your answer. Try again."));
        return;
      }
      if (res.correct) {
        setFeedback("correct");
        setPiecesUnlocked(res.piecesUnlocked);
        if (res.completed && res.rewardCode) {
          setRewardCode(res.rewardCode);
          setTimeout(() => setShowComplete(true), 1200);
        } else {
          setTimeout(() => {
            setFeedback(null);
            setSelected(null);
          }, 1500);
        }
      } else {
        setFeedback("wrong");
        setTimeout(() => {
          setFeedback(null);
          setSelected(null);
        }, 1800);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (showComplete || completed) {
    return (
      <PageLoader message="Loading your results…" description="Fetching your score and rank." />
    );
  }

  if (!current) {
    return (
      <PageLoader
        message={submitting ? "Saving your answer…" : "Loading question…"}
        description="Unlocking puzzle pieces as you progress."
      />
    );
  }

  return (
    <div className="flex min-h-dvh-screen flex-col bg-[#FAFAFA]">
      <SlidoProgressHeader
        piecesUnlocked={piecesUnlocked}
        totalPieces={total}
        endsAt={endsAt}
        onTimedOut={setTimedOut}
      />

      {timedOut ? (
        <p
          className="mx-auto max-w-5xl px-4 pt-4 text-center text-sm font-medium text-red-800 md:px-6"
          role="status"
        >
          Time&apos;s up — no more answers can be submitted.
        </p>
      ) : null}

      <div className="mx-auto grid w-full max-w-5xl flex-1 gap-6 px-4 py-6 md:grid-cols-2 md:items-start md:px-6 md:py-8 lg:px-8">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-6">
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-[#737373]">
            Your puzzle
          </p>
          <PuzzleQuestBoard revealed={piecesUnlocked} imageSrc={imageUrl} />
          <p className="mt-4 text-center text-xs text-[#737373]">
            Each correct answer reveals one piece
          </p>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-6">
          <SlidoQuizPanel
            question={current}
            questionIndex={piecesUnlocked}
            totalQuestions={total}
            selected={selected}
            feedback={feedback}
            submitting={submitting}
            disabled={timedOut}
            onSelect={setSelected}
            onSubmit={() => void submit()}
          />
        </div>
      </div>
    </div>
  );
}
