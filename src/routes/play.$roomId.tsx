import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { friendlyGameError } from "@/lib/accessibility";
import { ConnectDots } from "@/components/games/ConnectDots";
import { ConnectDotsMatchBoard } from "@/components/games/ConnectDotsMatchBoard";
import { JigsawMissionAssembly } from "@/components/games/JigsawMissionAssembly";
import { JigsawPuzzle } from "@/components/games/JigsawPuzzle";
import { PuzzleQuestBoard } from "@/components/games/PuzzleQuestBoard";
import { SlidoProgressHeader, SlidoQuizPanel } from "@/components/games/SlidoQuizPanel";
import { GameCompletionScreen } from "@/components/games/GameCompletionScreen";
import { Button } from "@/components/ui/button";
import {
  ConnectionBanner,
  InlineErrorBanner,
  PageErrorState,
  PageLoader,
} from "@/components/ui/async-state";
import { GAME_CONFIG, GAME_MODE_META, JIGSAW_GRID, PUZZLE_QUEST_GRID } from "@/lib/game/config";
import { buildGameCompletionViewModel } from "@/lib/game/completion";
import {
  isJigsawMissionRetryRound,
  readJigsawMissionPayload,
  resolveJigsawMissionQuestionId,
  retryPoolQuestionIds,
} from "@/lib/game/jigsaw-mission-flow";
import { isStudentSessionFinished } from "@/lib/game/mode-registry";
import { loadParticipantSession, saveParticipantSession } from "@/lib/game/client-session";
import {
  getRoomSnapshotFn,
  reconnectParticipantFn,
  submitConnectDotsMatchesFn,
  submitConnectDotsPathsFn,
  recordConnectDotsIncorrectAttemptFn,
  submitJigsawMissionAnswerFn,
  submitJigsawMissionAssemblyFn,
  submitJigsawProgressFn,
  submitQuizAnswerFn,
  submitQuizJigsawAnswerFn,
} from "@/lib/game/room.functions";
import type { ConnectDotsBoardConfig, QuizOptionId } from "@/lib/game/types";
import { useRoomPolling } from "@/lib/game/useRoomPolling";
import type { PathMap } from "@/lib/connect-dots";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/play/$roomId")({
  head: () => ({
    meta: [{ title: "Play - GamiBAR" }],
  }),
  component: StudentPlayPage,
});

function StudentPlayPage() {
  const { roomId } = Route.useParams();
  const navigate = useNavigate();
  const participant = useMemo(() => loadParticipantSession(), [roomId]);
  const reconnectToken =
    participant && participant.roomId === roomId ? participant.reconnectToken : undefined;
  const { snapshot, error, isInitialLoading, isReconnecting, retrying, retry } = useRoomPolling(
    { roomId, reconnectToken },
    1200,
  );

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
        message={friendlyGameError(error, "Could not connect to the game. Check your network and try again.")}
        onRetry={retry}
        retrying={retrying}
      />
    );
  }

  if (!snapshot.ok) {
    return (
      <PageErrorState
        title="Could not load game"
        message={friendlyGameError(snapshot.error, "This game may have ended or the link is invalid.")}
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
  const totalPairs =
    room.payload.mode === "connect_dots" ? room.payload.connectDots.pairCount : 0;

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
        {room.mode === "quiz_jigsaw" &&
          typeof snapshot.myAttempt?.payload?.rewardCode === "string" &&
          snapshot.myAttempt.payload.rewardCode && (
            <div className="mt-4 rounded-2xl border-2 border-dashed border-[#7C3AED] bg-[#EDE9FE] px-6 py-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-[#5B21B6]">
                Your reward code
              </p>
              <p className="mt-2 font-display text-2xl font-extrabold tracking-widest text-[#111111]">
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
        <p className="text-sm text-[#525252]">Waiting for the author to start…</p>
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
          correctQuestionIds={snapshot.myAnswers.map((a) => a.questionId)}
          missionPayload={snapshot.myAttempt?.payload ?? {}}
          endsAt={room.endsAt}
          completed={Boolean(snapshot.myAttempt?.completed)}
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
        Your session was not found in this browser. Rejoin with the same room code and name to restore
        your progress.
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

function TimerBar({ endsAt }: { endsAt: number | null }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);
  if (left == null) return null;
  return (
    <span className="rounded-full bg-[var(--gamibar-brand-soft)] px-3 py-1 text-xs font-bold tabular-nums text-[var(--gamibar-brand)]">
      {left}s
    </span>
  );
}

function QuizPlay({
  roomId,
  reconnectToken,
  questions,
  answeredIds,
  instruction,
  endsAt,
}: {
  roomId: string;
  reconnectToken: string;
  questions: Array<{ id: string; prompt: string; options: Record<QuizOptionId, string>; order: number }>;
  answeredIds: Set<string>;
  instruction: string;
  endsAt: number | null;
}) {
  const unanswered = questions.filter((q) => !answeredIds.has(q.id));
  const current = unanswered[0] ?? null;
  const [selected, setSelected] = useState<QuizOptionId | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [localAnswered, setLocalAnswered] = useState(answeredIds.size);

  useEffect(() => {
    setLocalAnswered(answeredIds.size);
  }, [answeredIds.size]);

  const submit = async () => {
    if (!current || !selected) return;
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
      setSelected(null);
      setLocalAnswered(res.answeredCount);
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

  return (
    <div className="mx-auto flex min-h-dvh-screen max-w-lg flex-col px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-8">
      <div className="flex items-center justify-between gap-3">
        <Logo size={32} />
        <div className="flex shrink-0 items-center gap-2">
          <TimerBar endsAt={endsAt} />
          <span className="text-xs font-bold text-[var(--gamibar-text-tertiary)]">
            {localAnswered + 1}/{questions.length}
          </span>
        </div>
      </div>
      <p className="mt-4 text-xs text-[var(--gamibar-text-tertiary)]">{instruction}</p>
      <h1
        id={`quiz-question-${current.id}`}
        className="mt-5 font-display text-[clamp(1.125rem,4.5vw,1.375rem)] font-bold leading-snug text-[#111111]"
      >
        {current.prompt}
      </h1>
      <fieldset className="mt-6 border-0 p-0">
        <legend className="sr-only">
          Answer choices for question {localAnswered + 1} of {questions.length}
        </legend>
        <div className="grid gap-3 sm:gap-2.5">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setSelected(opt)}
              aria-pressed={selected === opt}
              aria-label={`Option ${opt}: ${current.options[opt]}`}
              className={cn(
                "flex min-h-[3.25rem] w-full touch-manipulation items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-colors active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 sm:min-h-12 sm:py-3",
                selected === opt
                  ? "border-[#111111] bg-[#111111] text-white"
                  : "border-[var(--gamibar-border)] bg-white text-[#111111] hover:border-[#D1D5DB]",
              )}
            >
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-lg text-xs font-bold sm:size-8",
                  selected === opt ? "bg-white/15" : "bg-[var(--gamibar-page)] text-[#111111]",
                )}
                aria-hidden="true"
              >
                {opt}
              </span>
              <span className="min-w-0 flex-1">{current.options[opt]}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <Button
        className="mt-8 h-12 w-full touch-manipulation rounded-xl bg-[#111111] hover:bg-black sm:h-12"
        disabled={!selected || submitting}
        onClick={() => void submit()}
      >
        {submitting ? "Saving answer…" : "Submit answer"}
      </Button>
      {submitError ? (
        <InlineErrorBanner
          className="mt-4 text-left"
          message={submitError}
          onRetry={() => void submit()}
          retrying={submitting}
          onDismiss={() => setSubmitError(null)}
        />
      ) : null}
      <p className="mt-3 text-center text-xs text-[var(--gamibar-text-tertiary)]">
        One attempt - you cannot change this answer.
      </p>
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
  const useMatchBoard = board.contentPairs.length > 0;

  if (useMatchBoard) {
    return (
      <ConnectDotsMatchPlay
        roomId={roomId}
        reconnectToken={reconnectToken}
        pairs={board.contentPairs}
        shuffleSeed={board.seed}
        instruction={instruction}
        endsAt={endsAt}
        title={title}
        myAttempt={myAttempt}
      />
    );
  }

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

function ConnectDotsMatchPlay({
  roomId,
  reconnectToken,
  pairs,
  shuffleSeed,
  instruction,
  endsAt,
  title,
  myAttempt,
}: {
  roomId: string;
  reconnectToken: string;
  pairs: ConnectDotsBoardConfig["contentPairs"];
  shuffleSeed: string;
  instruction: string;
  endsAt: number | null;
  title: string;
  myAttempt: {
    completed?: boolean;
    durationMs?: number | null;
    payload?: Record<string, unknown>;
  } | null;
}) {
  const savedPayload = (myAttempt?.payload ?? {}) as {
    matches?: Record<string, string>;
    routes?: Record<string, { r: number; c: number }[]>;
  };
  const initialMatched = Object.keys(savedPayload.matches ?? {}).length;
  const [progress, setProgress] = useState({
    matched: myAttempt?.completed ? pairs.length : initialMatched,
    total: pairs.length,
  });
  const [done, setDone] = useState(() => Boolean(myAttempt?.completed));
  const [durationMs, setDurationMs] = useState<number | null>(myAttempt?.durationMs ?? null);
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const incorrectThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestMatches = useRef<Record<string, string>>(savedPayload.matches ?? {});
  const skipInitialSync = useRef(initialMatched === 0 && !myAttempt?.completed);

  const reportIncorrectAttempt = useCallback(() => {
    if (done) return;
    if (incorrectThrottleRef.current) return;
    incorrectThrottleRef.current = setTimeout(() => {
      incorrectThrottleRef.current = null;
    }, 400);
    void recordConnectDotsIncorrectAttemptFn({
      data: { roomId, reconnectToken },
    });
  }, [done, reconnectToken, roomId]);

  useEffect(() => {
    if (myAttempt?.completed) {
      setDone(true);
      setDurationMs(myAttempt.durationMs ?? null);
      setProgress({ matched: pairs.length, total: pairs.length });
    }
  }, [myAttempt?.completed, myAttempt?.durationMs, pairs.length]);

  const syncProgress = useCallback(
    async (
      matches: Record<string, string>,
      routes: Record<string, { r: number; c: number }> | undefined,
      completed: boolean,
    ) => {
      const res = await submitConnectDotsMatchesFn({
        data: { roomId, reconnectToken, matches, routes },
      });
      if (!res.ok) {
        toast.error(friendlyGameError(res.error, "Could not submit your answer. Try again."));
        return;
      }
      if (res.completed) {
        setDone(true);
        setDurationMs(res.durationMs ?? null);
        setProgress({ matched: pairs.length, total: pairs.length });
        toast.success("All pairs connected!");
      } else if (completed) {
        toast.error("Connect every question to its answer to finish.");
      }
    },
    [pairs.length, reconnectToken, roomId],
  );

  const onMatchesChange = useCallback(
    (matches: Record<string, string>) => {
      if (skipInitialSync.current) {
        skipInitialSync.current = false;
        return;
      }
      latestMatches.current = matches;
      if (throttleRef.current) clearTimeout(throttleRef.current);
      throttleRef.current = setTimeout(() => {
        void syncProgress(latestMatches.current, undefined, false);
      }, 500);
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
      <div className="mx-auto w-full max-w-3xl px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-6">
        <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-[var(--gamibar-border)]/80 bg-[var(--gamibar-page)]/95 px-4 py-3 backdrop-blur-sm sm:-mx-5 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gamibar-brand)]">
                {title}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-[var(--muted-foreground)]">{instruction}</p>
            </div>
            <TimerBar endsAt={endsAt} />
          </div>
          <p className="mt-2 text-xs font-medium text-[var(--gamibar-text-tertiary)]">
            {progress.matched}/{progress.total} pairs matched
          </p>
        </div>

        <div className="rounded-[20px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] p-3 shadow-[var(--shadow-soft)] sm:rounded-[24px] sm:p-4 md:p-6">
          <ConnectDotsMatchBoard
            pairs={pairs}
            shuffleSeed={shuffleSeed}
            completed={done}
            onProgress={(matched, total) => setProgress({ matched, total })}
            onMatchesChange={onMatchesChange}
            onComplete={(matches, routes) => {
              if (done) return;
              if (throttleRef.current) clearTimeout(throttleRef.current);
              void syncProgress(matches, routes, true);
            }}
            initialMatches={savedPayload.matches}
            initialRoutes={savedPayload.routes}
            onIncorrectAttempt={reportIncorrectAttempt}
          />
        </div>
      </div>
    </div>
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
  const savedPaths = (myAttempt?.payload?.paths ?? {}) as PathMap;
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
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestPaths = useRef<PathMap>(savedPaths);
  const skipInitialPaths = useRef(!hasSavedPaths && !myAttempt?.completed);

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
              <p className="mt-1 line-clamp-2 text-sm text-[var(--muted-foreground)]">{instruction}</p>
            </div>
            <TimerBar endsAt={endsAt} />
          </div>
          <p className="mt-2 text-xs font-medium text-[var(--gamibar-text-tertiary)]">
            {board.difficulty.toUpperCase()} · {board.gridSize}×{board.gridSize} · {progress.connected}/
            {progress.total} pairs
          </p>
        </div>

        {done ? (
          <div className="rounded-[24px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] px-6 py-12 text-center shadow-[var(--shadow-soft)]">
            <p className="text-sm text-[var(--muted-foreground)]">Saving your results…</p>
          </div>
        ) : (
          <div className="rounded-[24px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] p-4 shadow-[var(--shadow-soft)] sm:p-6">
            <ConnectDots
              board={publicBoard}
              disabled={done}
              initialPaths={hasSavedPaths ? savedPaths : undefined}
              onProgress={(connected, total) => setProgress({ connected, total })}
              onPathsChange={onPathsChange}
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
  correctQuestionIds,
  missionPayload,
  endsAt,
  completed,
  instruction,
}: {
  roomId: string;
  reconnectToken: string;
  questions: Array<{ id: string; prompt: string; options: Record<QuizOptionId, string>; order: number }>;
  imageUrl: string | null;
  cols: number;
  rows: number;
  correctQuestionIds: string[];
  missionPayload: Record<string, unknown>;
  endsAt: number | null;
  completed: boolean;
  instruction: string;
}) {
  const total = questions.length;
  const mission = readJigsawMissionPayload(missionPayload);
  const correctSet = useMemo(() => new Set(correctQuestionIds), [correctQuestionIds]);
  const piecesUnlocked = correctSet.size;
  const assemblyPhase = mission.phase === "assemble" || piecesUnlocked >= total;
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
  const [localAssembly, setLocalAssembly] = useState(false);
  const [assemblySubmitting, setAssemblySubmitting] = useState(false);
  const [assemblyMessage, setAssemblyMessage] = useState<string | null>(null);
  const [completionTimeMs, setCompletionTimeMs] = useState<number | null>(null);

  useEffect(() => {
    if (completed) setShowComplete(true);
  }, [completed]);

  useEffect(() => {
    if (assemblyPhase) setLocalAssembly(true);
  }, [assemblyPhase]);

  const submit = async () => {
    if (!activeQuestion || !selected || feedback) return;
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
      if (res.correct) {
        setFeedback("correct");
        if (res.allPiecesUnlocked) {
          setTimeout(() => {
            setLocalAssembly(true);
            setFeedback(null);
            setSelected(null);
          }, 1200);
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

  const handleAssemblySubmit = async (layout: number[]) => {
    setAssemblySubmitting(true);
    setAssemblyMessage(null);
    try {
      const res = await submitJigsawMissionAssemblyFn({
        data: {
          roomId,
          reconnectToken,
          layout,
          totalPieces: cols * rows,
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
      setCompletionTimeMs(res.durationMs ?? null);
      setShowComplete(true);
      toast.success("Puzzle complete!");
    } finally {
      setAssemblySubmitting(false);
    }
  };

  if (showComplete || completed) {
    return (
      <PageLoader message="Loading your results…" description="Fetching your score and rank." />
    );
  }

  if ((assemblyPhase || localAssembly) && imageUrl) {
    return (
      <div className="mx-auto min-h-dvh-screen max-w-lg px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-8">
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
          All pieces unlocked — rebuild the image and submit
        </p>
        <div className="mt-4">
          <JigsawMissionAssembly
            imageUrl={imageUrl}
            cols={cols}
            rows={rows}
            submitting={assemblySubmitting}
            submitMessage={assemblyMessage}
            initialPlacements={
              Array.isArray(missionPayload.assemblyLayout)
                ? (missionPayload.assemblyLayout as Array<number | null>)
                : undefined
            }
            onSubmit={(layout) => void handleAssemblySubmit(layout)}
          />
        </div>
      </div>
    );
  }

  if (!activeQuestion) {
    return (
      <PageLoader
        message={submitting ? "Saving your answer…" : "Loading question…"}
        description="Unlocking puzzle pieces as you progress."
      />
    );
  }

  return (
    <div className="flex min-h-dvh-screen flex-col bg-[#FAFAFA]">
      <SlidoProgressHeader piecesUnlocked={piecesUnlocked} totalPieces={total} endsAt={endsAt} />

      <div className="mx-auto grid w-full max-w-5xl flex-1 gap-6 px-4 py-6 md:grid-cols-2 md:items-start md:px-6 md:py-8 lg:px-8">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-6">
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-[#737373]">
            Your puzzle
          </p>
          <PuzzleQuestBoard revealed={piecesUnlocked} imageSrc={imageUrl} cols={cols} rows={rows} />
          <p className="mt-4 text-center text-xs text-[#737373]">
            {isRetryRound
              ? `Retry round — ${retryRemaining} question${retryRemaining === 1 ? "" : "s"} left to unlock pieces`
              : "Each correct answer unlocks one piece. Missed questions return in a retry round."}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-6">
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
            onSelect={setSelected}
            onSubmit={() => void submit()}
          />
        </div>
      </div>
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
        if (!res.ok) toast.error(friendlyGameError(res.error, "Could not record your attempt. Try again."));
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
        <p className="text-sm text-[#525252]">The author has not uploaded a puzzle image yet.</p>
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
  questions: Array<{ id: string; prompt: string; options: Record<QuizOptionId, string>; order: number }>;
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

  useEffect(() => {
    setPiecesUnlocked(correctCount);
  }, [correctCount]);

  useEffect(() => {
    if (completed) setShowComplete(true);
  }, [completed]);

  const currentIndex = Math.min(piecesUnlocked, questions.length - 1);
  const current = questions[currentIndex] ?? questions[0];

  const submit = async () => {
    if (!current || !selected || feedback) return;
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
      />

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
            onSelect={setSelected}
            onSubmit={() => void submit()}
          />
        </div>
      </div>
    </div>
  );
}

