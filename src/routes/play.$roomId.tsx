import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/layout/Logo";
import { LiveLeaderboard } from "@/components/author/LiveLeaderboard";
import { ConnectDots } from "@/components/games/ConnectDots";
import { JigsawPuzzle } from "@/components/games/JigsawPuzzle";
import { PuzzleQuestBoard } from "@/components/games/PuzzleQuestBoard";
import { SlidoProgressHeader, SlidoQuizPanel } from "@/components/games/SlidoQuizPanel";
import { Confetti } from "@/components/games/Confetti";
import { Button } from "@/components/ui/button";
import { GAME_CONFIG, GAME_MODE_META, JIGSAW_GRID, PUZZLE_QUEST_GRID } from "@/lib/game/config";
import { loadParticipantSession } from "@/lib/game/client-session";
import { formatDuration } from "@/lib/game/ranking";
import {
  submitConnectDotsPathsFn,
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
  const { snapshot } = useRoomPolling({ roomId, reconnectToken }, 1200);

  if (!reconnectToken) {
    return (
      <Centered>
        <p className="text-sm text-[#525252]">Join the room before playing.</p>
        <Button asChild className="mt-4 rounded-xl">
          <Link to="/join">Join with code</Link>
        </Button>
      </Centered>
    );
  }

  if (!snapshot) {
    return <Centered>Loading game…</Centered>;
  }

  if (!snapshot.ok) {
    return (
      <Centered>
        <p className="text-sm text-[#525252]">{snapshot.error}</p>
      </Centered>
    );
  }

  const room = snapshot.room;
  const gameFinished = room.status === "FINISHED" || room.status === "CANCELLED";
  const studentFinished =
    room.mode === "quiz" && room.payload.mode === "quiz"
      ? snapshot.myAnswers.length >= room.payload.questions.length ||
        Boolean(snapshot.myAttempt?.completed)
      : room.mode === "quiz_jigsaw"
        ? Boolean(snapshot.myAttempt?.completed)
        : Boolean(snapshot.myAttempt?.completed);

  if (gameFinished || studentFinished) {
    return (
      <StudentLeaderboardScreen
        title={room.name}
        rows={snapshot.leaderboard}
        myId={snapshot.participantId}
        finished={gameFinished}
        onHome={() => navigate({ to: "/" })}
      />
    );
  }

  if (room.status !== "LIVE" && room.status !== "COUNTDOWN") {
    return (
      <Centered>
        <p className="text-sm text-[#525252]">Waiting for the author to start…</p>
        <Button
          className="mt-4 rounded-xl"
          onClick={() => navigate({ to: "/join/lobby", search: { code: room.code } })}
        >
          Back to lobby
        </Button>
      </Centered>
    );
  }

  if (room.mode === "quiz_jigsaw" && room.payload.mode === "quiz_jigsaw") {
    const correctCount = snapshot.myAnswers.length;
    return (
      <QuizJigsawPlay
        roomId={roomId}
        reconnectToken={reconnectToken}
        questions={room.payload.questions}
        imageUrl={room.payload.jigsaw.imageUrl}
        correctCount={correctCount}
        endsAt={room.endsAt}
        completed={Boolean(snapshot.myAttempt?.completed)}
      />
    );
  }

  if (room.mode === "quiz" && room.payload.mode === "quiz") {
    return (
      <QuizPlay
        roomId={roomId}
        reconnectToken={reconnectToken}
        questions={room.payload.questions}
        answeredIds={new Set(snapshot.myAnswers.map((a) => a.questionId))}
        instruction={room.instruction}
        endsAt={room.endsAt}
      />
    );
  }

  if (room.mode === "connect_dots" && room.payload.mode === "connect_dots") {
    return (
      <ConnectDotsPlay
        roomId={roomId}
        reconnectToken={reconnectToken}
        board={room.payload.connectDots}
        instruction={room.instruction}
        endsAt={room.endsAt}
        title={GAME_MODE_META.connect_dots.title}
      />
    );
  }

  if (room.mode === "jigsaw" && room.payload.mode === "jigsaw") {
    return (
      <JigsawPlay
        roomId={roomId}
        reconnectToken={reconnectToken}
        imageUrl={room.payload.jigsaw.imageUrl}
        instruction={room.instruction}
        endsAt={room.endsAt}
      />
    );
  }

  return <Centered>Unsupported game mode.</Centered>;
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
  const [localAnswered, setLocalAnswered] = useState(answeredIds.size);

  useEffect(() => {
    setLocalAnswered(answeredIds.size);
  }, [answeredIds.size]);

  const submit = async () => {
    if (!current || !selected) return;
    setSubmitting(true);
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
        toast.error(res.error);
        return;
      }
      setSelected(null);
      setLocalAnswered(res.answeredCount);
      if (res.completed) toast.success("Quiz complete!");
    } finally {
      setSubmitting(false);
    }
  };

  if (!current) {
    return <Centered>Loading results…</Centered>;
  }

  const options: QuizOptionId[] = ["A", "B", "C", "D"];

  return (
    <div className="mx-auto flex min-h-dvh-screen max-w-lg flex-col px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-8">
      <div className="flex items-center justify-between gap-3">
        <Logo size={32} />
        <div className="flex shrink-0 items-center gap-2">
          <TimerBar endsAt={endsAt} />
          <span className="text-xs font-bold text-[#737373]">
            {localAnswered + 1}/{questions.length}
          </span>
        </div>
      </div>
      <p className="mt-4 text-xs text-[#737373]">{instruction}</p>
      <h1 className="mt-5 font-display text-[clamp(1.125rem,4.5vw,1.375rem)] font-bold leading-snug text-[#111111]">
        {current.prompt}
      </h1>
      <div className="mt-6 grid gap-2.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setSelected(opt)}
            className={cn(
              "flex min-h-11 w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-colors sm:min-h-12",
              selected === opt
                ? "border-[#111111] bg-[#111111] text-white"
                : "border-[var(--gamibar-border)] bg-white text-[#111111] hover:border-[#D1D5DB]",
            )}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/15 text-xs font-bold sm:size-8">
              {opt}
            </span>
            <span className="min-w-0 flex-1">{current.options[opt]}</span>
          </button>
        ))}
      </div>
      <Button
        className="mt-8 h-12 w-full rounded-xl bg-[#111111] hover:bg-black"
        disabled={!selected || submitting}
        onClick={() => void submit()}
      >
        {submitting ? "Submitting…" : "Submit answer"}
      </Button>
      <p className="mt-3 text-center text-xs text-[#737373]">One attempt - you cannot change this answer.</p>
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
}: {
  roomId: string;
  reconnectToken: string;
  board: ConnectDotsBoardConfig;
  instruction: string;
  endsAt: number | null;
  title: string;
}) {
  const [progress, setProgress] = useState({ connected: 0, total: board.pairCount });
  const [done, setDone] = useState(false);
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestPaths = useRef<PathMap>({});
  const skipInitialPaths = useRef(true);

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
        toast.error(res.error);
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
            <p className="font-display text-3xl font-extrabold text-[var(--foreground)]">COMPLETED!</p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Waiting for other players and the final leaderboard…
            </p>
          </div>
        ) : (
          <div className="rounded-[24px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] p-4 shadow-[var(--shadow-soft)] sm:p-6">
            <ConnectDots
              board={publicBoard}
              disabled={done}
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

function JigsawPlay({
  roomId,
  reconnectToken,
  imageUrl,
  instruction,
  endsAt,
}: {
  roomId: string;
  reconnectToken: string;
  imageUrl: string | null;
  instruction: string;
  endsAt: number | null;
}) {
  const cols = JIGSAW_GRID.cols;
  const rows = JIGSAW_GRID.rows;
  const total = JIGSAW_GRID.pieceCount;
  const [locked, setLocked] = useState(0);
  const [busy, setBusy] = useState(false);

  const report = useCallback(
    async (nextLocked: number, done: boolean) => {
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
          },
        });
        if (!res.ok) toast.error(res.error);
        else if (res.completed) toast.success("Puzzle complete!");
      } finally {
        setBusy(false);
      }
    },
    [roomId, reconnectToken, total],
  );

  const onProgress = useCallback(
    (nextLocked: number, done: boolean) => {
      void report(nextLocked, done);
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
          disabled={locked >= total}
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
        toast.error(res.error);
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

  if (showComplete) {
    return (
      <div className="relative flex min-h-dvh-screen flex-col items-center justify-center bg-white px-4 py-8">
        <Confetti />
        <div className="relative z-10 w-full max-w-md text-center">
          <PuzzleQuestBoard revealed={total} imageSrc={imageUrl} />
          <h1 className="mt-6 font-display text-3xl font-extrabold text-[#111111]">
            Puzzle Complete!
          </h1>
          {rewardCode && (
            <div className="mt-4 rounded-2xl border-2 border-dashed border-[#7C3AED] bg-[#EDE9FE] px-6 py-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[#5B21B6]">
                Your reward code
              </p>
              <p className="mt-2 font-display text-2xl font-extrabold tracking-widest text-[#111111]">
                {rewardCode}
              </p>
            </div>
          )}
          <p className="mt-4 text-sm text-[#525252]">
            You unlocked all {total} pieces. Waiting for final results…
          </p>
        </div>
      </div>
    );
  }

  if (!current) {
    return <Centered>Loading…</Centered>;
  }

  return (
    <div className="flex min-h-dvh-screen flex-col bg-[#FAFAFA]">
      <SlidoProgressHeader
        piecesUnlocked={piecesUnlocked}
        totalPieces={total}
        endsAt={endsAt}
      />

      <div className="mx-auto grid w-full max-w-5xl flex-1 gap-6 px-4 py-6 lg:grid-cols-2 lg:items-start lg:px-8 lg:py-8">
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

function StudentLeaderboardScreen({
  title,
  rows,
  myId,
  finished,
  onHome,
}: {
  title: string;
  rows: Array<{
    rank: number;
    participantId: string;
    displayName: string;
    detail?: string;
    secondaryMetric: number | null;
  }>;
  myId: string | null;
  finished: boolean;
  onHome: () => void;
}) {
  const myRow = rows.find((r) => r.participantId === myId);
  const boardRows = rows.map((r) => ({
    ...r,
    detail: r.detail ?? "",
  }));

  return (
    <div className="min-h-screen bg-[var(--gamibar-page)] px-4 py-8 sm:px-5">
      <div className="mx-auto max-w-lg">
        <Logo size={40} />
        <h1 className="mt-6 font-display text-2xl font-extrabold text-[var(--foreground)] sm:text-3xl">
          {finished ? "Final Leaderboard" : "Leaderboard"}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{title}</p>
        {myRow && (
          <p className="mt-3 rounded-xl border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
            Your rank:{" "}
            <span className="font-bold text-[var(--foreground)]">
              #{myRow.rank} · {myRow.detail}
            </span>
            {myRow.secondaryMetric != null && (
              <span className="ml-1 text-[var(--muted-foreground)]">({formatDuration(myRow.secondaryMetric)})</span>
            )}
          </p>
        )}
        {!finished && (
          <p className="mt-3 text-xs text-[var(--muted-foreground)]">
            Standings update live until the author ends the game or time runs out.
          </p>
        )}
        <LiveLeaderboard
          rows={boardRows}
          finished={finished}
          highlightParticipantId={myId ?? undefined}
          className="mt-6"
        />
        <Button
          className="mt-6 w-full rounded-xl bg-[var(--foreground)] text-[var(--background)] hover:opacity-90"
          onClick={onHome}
        >
          Back home
        </Button>
      </div>
    </div>
  );
}
