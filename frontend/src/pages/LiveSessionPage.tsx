import { useParams } from "@/lib/navigation";
import { Clock, Play, RotateCcw, Sparkles, Square, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ConnectDotsLayoutWarning } from "@/components/author/ConnectDotsLayoutWarning";
import {
  LiveRoomActionDialog,
  type LiveRoomAction,
} from "@/components/author/LiveRoomActionDialog";
import { LiveGameDashboard } from "@/components/author/LiveGameDashboard";
import { UnifiedLeaderboard } from "@/components/author/UnifiedLeaderboard";
import { LobbyWall, ParticipantStrip } from "@/components/author/LobbyWall";
import { RoomCodeDisplay } from "@/components/author/RoomCodeDisplay";
import { AuthorShell } from "@/components/layout/AuthorShell";
import { PollResultsPanel } from "@/components/polls/PollResultsPanel";
import { SessionFilesPanel } from "@/components/sharing-files/SessionFilesPanel";
import { RoomJoinShare } from "@/components/session/RoomJoinShare";
import { ResourceDropLiveRoom } from "@/components/sharing-files/ResourceDropLiveRoom";
import { Button } from "@/components/ui/button";
import {
  ConnectionBanner,
  InlineErrorBanner,
  PageErrorState,
  PageLoader,
} from "@/components/ui/async-state";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { GAME_MODE_META } from "@shared/game/config";
import type { PollResults, Room } from "@shared/game/types";
import { useAuth } from "@/lib/auth-store";
import { loadAuthorRoom, saveAuthorRoom } from "@/lib/game/client-session";
import { friendlyGameError } from "@/lib/accessibility";
import { assessConnectDotsContentSolvability } from "@shared/game/connect-dots-solvability";
import {
  startGameFn,
  stopGameFn,
  restartGameFn,
  setShowLeaderboardToStudentsFn,
  claimAuthorSessionFn,
} from "@/lib/game/room.functions";
import { useRoomSync } from "@/lib/game/useRoomSync";
import { cn } from "@/lib/utils";

export default function AuthorRoomPage() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const [claimedToken, setClaimedToken] = useState<string | undefined>(undefined);
  const author = loadAuthorRoom(roomId);
  const authorToken = claimedToken ?? (author?.roomId === roomId ? author.authorToken : undefined);
  const { snapshot, error, isInitialLoading, isReconnecting, retrying, retry, refresh } =
    useRoomSync({ roomId, authorToken });
  const [busy, setBusy] = useState(false);
  const [leaderboardBusy, setLeaderboardBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<LiveRoomAction | null>(null);
  const [selectedRound, setSelectedRound] = useState<number | "current">("current");

  useEffect(() => {
    if (!authorToken && user?.id && roomId) {
      void (async () => {
        try {
          const res = await claimAuthorSessionFn({
            data: { roomId, authorId: user.id },
          });
          if (res.ok) {
            saveAuthorRoom({
              roomId,
              code: res.room.code,
              authorToken: res.authorToken,
            });
            setClaimedToken(res.authorToken);
          }
        } catch {
          // ignore
        }
      })();
    }
  }, [authorToken, user?.id, roomId]);

  const connectDotsSolvability = useMemo(() => {
    if (!snapshot?.ok) return null;
    const room = snapshot.room;
    if (room.mode !== "connect_dots" || room.payload.mode !== "connect_dots") return null;
    const pairs = room.payload.connectDots.contentPairs;
    if (pairs.length === 0) return null;
    return assessConnectDotsContentSolvability(pairs, room.payload.connectDots.seed);
  }, [snapshot]);

  if (!authorToken) {
    return (
      <AuthorShell>
        <div className="mx-auto max-w-lg py-16 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--gamibar-brand-soft)] text-[var(--gamibar-brand)]">
            <Users className="size-6" />
          </div>
          <p className="mt-5 text-sm leading-relaxed text-[var(--muted-foreground)]">
            Author session for this room was not found in this browser.
          </p>
          <Button
            asChild
            className="mt-5 rounded-xl bg-[var(--gamibar-brand)] text-white hover:bg-[var(--gamibar-brand-hover)]"
          >
            <Link to="/author/create">Create a new room</Link>
          </Button>
        </div>
      </AuthorShell>
    );
  }

  if (isInitialLoading) {
    return (
      <AuthorShell>
        <PageLoader
          message="Loading room…"
          description="Fetching live game data."
          fullScreen={false}
          className="min-h-[40vh]"
        />
      </AuthorShell>
    );
  }

  if (!snapshot) {
    return (
      <AuthorShell>
        <PageErrorState
          title="Connection problem"
          message={friendlyGameError(
            error,
            "Could not connect to this room. Check your network and try again.",
          )}
          onRetry={retry}
          retrying={retrying}
          fullScreen={false}
          className="min-h-[40vh]"
        />
      </AuthorShell>
    );
  }

  if (!snapshot.ok) {
    return (
      <AuthorShell>
        <PageErrorState
          title="Could not load room"
          message={friendlyGameError(
            error ?? snapshot.error,
            "This room may have been deleted or closed.",
          )}
          onRetry={retry}
          retrying={retrying}
          fullScreen={false}
          className="min-h-[40vh]"
        >
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/author/create">Create a new room</Link>
          </Button>
        </PageErrorState>
      </AuthorShell>
    );
  }

  const room = snapshot.room;
  const isResourceDrop = Boolean(
    ("isResourceDrop" in room.payload && room.payload.isResourceDrop === true) ||
    room.subject === "Resource Drop" ||
    room.name === "Presentation Resources" ||
    room.name === "Presentation Resource" ||
    room.name.toLowerCase().includes("presentation resource") ||
    room.name.toLowerCase().includes("qr drop") ||
    room.name.toLowerCase().includes("qrfile") ||
    room.name.toLowerCase().includes("resource drop"),
  );

  if (isResourceDrop) {
    return (
      <ResourceDropLiveRoom
        room={room}
        authorToken={authorToken}
        isReconnecting={isReconnecting}
        retry={retry}
        retrying={retrying}
      />
    );
  }

  const leaderboard = snapshot.leaderboard;
  const playing = room.participants.filter((p) => p.status === "PLAYING").length;
  const completed = room.participants.filter((p) => p.status === "COMPLETED").length;
  const inLobby = room.status === "LOBBY" || room.status === "READY" || room.status === "DRAFT";
  const isLive = room.status === "LIVE" || room.status === "COUNTDOWN";
  const canStart =
    (room.status === "LOBBY" || room.status === "READY") && room.participantCount >= 1;

  const handleStart = async () => {
    setBusy(true);
    setActionError(null);
    try {
      const res = await startGameFn({ data: { roomId, authorToken, authorId: user?.id } });
      if (!res.ok) {
        const message = friendlyGameError(res.error, "Could not start the game. Try again.");
        setActionError(message);
        toast.error(message);
      } else {
        toast.success("Game started");
        void refresh();
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not start the game.";
      setActionError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async () => {
    setBusy(true);
    setActionError(null);
    try {
      const res = await stopGameFn({ data: { roomId, authorToken, authorId: user?.id } });
      if (!res.ok) {
        const message = friendlyGameError(res.error, "Could not end the game. Try again.");
        setActionError(message);
        toast.error(message);
      } else {
        toast.success("Game finished - leaderboard ready");
        void refresh();
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not stop the game.";
      setActionError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const handleRestart = async () => {
    setBusy(true);
    setActionError(null);
    try {
      const res = await restartGameFn({ data: { roomId, authorToken, authorId: user?.id } });
      if (!res.ok) {
        const message = friendlyGameError(res.error, "Could not restart the game. Try again.");
        setActionError(message);
        toast.error(message);
      } else {
        toast.success("Room reset - ready to play again!");
        void refresh();
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not restart the game.";
      setActionError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const handleLeaderboardVisibility = async (enabled: boolean) => {
    setLeaderboardBusy(true);
    setActionError(null);
    try {
      const res = await setShowLeaderboardToStudentsFn({
        data: { roomId, authorToken, authorId: user?.id, enabled },
      });
      if (!res.ok) {
        const message = friendlyGameError(res.error, "Could not update leaderboard visibility.");
        setActionError(message);
        toast.error(message);
      } else {
        toast.success(
          enabled
            ? "Participants can see the live leaderboard"
            : "Leaderboard hidden from participants",
        );
        void refresh();
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not update leaderboard visibility.";
      setActionError(message);
      toast.error(message);
    } finally {
      setLeaderboardBusy(false);
    }
  };

  const remaining =
    room.endsAt && room.status === "LIVE"
      ? Math.max(0, Math.ceil((room.endsAt - Date.now()) / 1000))
      : null;

  const timeLimitSeconds =
    room.payload && typeof room.payload === "object" && "timeLimitSeconds" in room.payload
      ? (room.payload.timeLimitSeconds as number)
      : null;
  const timerMode =
    room.payload && typeof room.payload === "object" && "timerMode" in room.payload
      ? (room.payload.timerMode as string)
      : "overall";

  let timerDisplayValue = "—";
  if (room.status === "LIVE") {
    if (timerMode === "per_question" && timeLimitSeconds && timeLimitSeconds > 0) {
      timerDisplayValue = `${timeLimitSeconds}s / question`;
    } else if (remaining != null) {
      timerDisplayValue = `${remaining}s`;
    } else if (timeLimitSeconds && timeLimitSeconds > 0) {
      timerDisplayValue = `${timeLimitSeconds}s`;
    } else {
      timerDisplayValue = "No limit";
    }
  }

  const liveProgress = snapshot.liveProgress ?? [];
  const pollResults =
    room.mode === "polls" ? (snapshot.pollResults as PollResults | undefined) : undefined;

  const roundHistory = (room as Room).roundHistory ?? [];

  let displayedLeaderboard = leaderboard;
  let displayedTitle = isLive ? "Live leaderboard" : "Final standings";
  let displayedSubtitle: string | undefined = undefined;

  if (selectedRound !== "current") {
    const pastRound = roundHistory.find((r) => r.roundNumber === selectedRound);
    if (pastRound) {
      displayedLeaderboard = pastRound.leaderboard;
      displayedTitle = `Round ${pastRound.roundNumber} Standings`;
      displayedSubtitle = `${pastRound.participantCount} participants · Finished at ${new Date(pastRound.finishedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
  }

  const roundTabs =
    roundHistory.length > 0 ? (
      <div className="flex flex-wrap items-center gap-1 rounded-xl bg-[var(--gamibar-page)] p-1">
        <button
          type="button"
          onClick={() => setSelectedRound("current")}
          className={cn(
            "rounded-lg px-2.5 py-1 text-xs font-bold transition-all",
            selectedRound === "current"
              ? "bg-[var(--foreground)] text-[var(--background)] shadow-sm"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
          )}
        >
          {isLive
            ? "Live Round"
            : `Latest Round (${roundHistory.length + (room.status === "FINISHED" ? 0 : 1)})`}
        </button>
        {roundHistory.map((r) => (
          <button
            key={r.roundNumber}
            type="button"
            onClick={() => setSelectedRound(r.roundNumber)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-bold transition-all",
              selectedRound === r.roundNumber
                ? "bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
            )}
          >
            Round {r.roundNumber}
          </button>
        ))}
      </div>
    ) : null;

  const statusHint = inLobby
    ? "Share the QR or code below. Start when at least one participant has joined."
    : isLive
      ? "Round is live. Watch rankings below and stop when you are ready for final results."
      : "Session complete. Review the leaderboard below or play again.";

  const sessionHeroCard = (
    <section className="relative overflow-hidden rounded-[28px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] px-4 py-5 shadow-[var(--shadow-soft)] sm:px-7 sm:py-6 lg:px-6 lg:py-5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.18),transparent_50%)]"
      />
      <div className="relative space-y-4 sm:space-y-5 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-6 lg:space-y-0">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={room.status} />
            <RoomMetaChips room={room} />
          </div>

          <div className="min-w-0">
            <h1 className="font-display text-[clamp(1.75rem,7vw,2.25rem)] font-extrabold leading-tight tracking-tight text-[var(--foreground)] sm:text-4xl lg:text-[2rem]">
              {room.name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted-foreground)] lg:max-w-xl">
              {statusHint}
            </p>
            {inLobby && connectDotsSolvability?.warning && (
              <ConnectDotsLayoutWarning assessment={connectDotsSolvability} className="mt-4" />
            )}
            {!inLobby && (
              <div className="mt-4">
                <ParticipantStrip participants={room.participants} />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end lg:min-w-[18rem] lg:justify-end">
          {(room.status === "LOBBY" || room.status === "READY") && (
            <Button
              className={cn(
                "h-11 w-full rounded-xl px-6 font-semibold sm:w-auto lg:h-10",
                canStart
                  ? "bg-[var(--gamibar-brand)] text-white hover:bg-[var(--gamibar-brand-hover)]"
                  : "bg-[var(--surface)] text-[var(--gamibar-text-tertiary)] hover:bg-[var(--surface)]",
              )}
              disabled={busy || !canStart}
              onClick={() => setPendingAction("start")}
            >
              <Play className="mr-2 size-4 shrink-0" />
              <span className="truncate">
                {busy
                  ? "Starting game…"
                  : canStart
                    ? `Start game · ${room.participantCount} ready`
                    : "Waiting for participants"}
              </span>
            </Button>
          )}
          {isLive && (
            <Button
              className="h-10 w-full rounded-xl bg-red-600 px-4 text-sm font-bold text-white shadow-sm shadow-red-900/10 hover:bg-red-700 focus-visible:ring-red-200 sm:w-auto"
              disabled={busy}
              onClick={() => setPendingAction("stop")}
            >
              <Square className="mr-2 size-3.5 shrink-0" />
              {busy ? "Ending game…" : "Stop game"}
            </Button>
          )}
          {room.status === "FINISHED" && (
            <Button
              className="h-10 w-full rounded-xl bg-[var(--gamibar-brand)] px-4 text-sm font-bold text-white shadow-sm hover:bg-[var(--gamibar-brand-hover)] sm:w-auto"
              disabled={busy}
              onClick={() => void handleRestart()}
            >
              <RotateCcw className="mr-2 size-3.5 shrink-0" />
              {busy ? "Resetting room…" : "Play again"}
            </Button>
          )}
        </div>
      </div>

      {!inLobby && (
        <div className="relative mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-4 sm:gap-3">
          <HeroMetric label="Joined" value={room.participantCount} icon={Users} />
          <HeroMetric label="Playing" value={playing} accent="quiz" />
          <HeroMetric label="Completed" value={completed} accent="connect_dots" />
          <HeroMetric
            label="Time left"
            value={timerDisplayValue}
            icon={Clock}
            {...(timerDisplayValue !== "No limit" && timerDisplayValue !== "—"
              ? { accent: "brand" as const }
              : {})}
          />
        </div>
      )}
    </section>
  );

  return (
    <AuthorShell>
      {isReconnecting ? <ConnectionBanner onRetry={retry} retrying={retrying} /> : null}
      <div className="mx-auto w-full max-w-7xl space-y-5 pb-8">
        {actionError ? (
          <InlineErrorBanner message={actionError} onDismiss={() => setActionError(null)} />
        ) : null}

        {inLobby ? (
          <>
            {sessionHeroCard}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(460px,520px)_minmax(0,1fr)] lg:items-start">
              <div className="space-y-5 lg:sticky lg:top-20">
                <RoomJoinShare code={room.code} prominent />
                {room.participantCount < 1 && (
                  <div className="hidden items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--gamibar-brand)]/35 bg-[var(--gamibar-brand-soft)] px-4 py-3.5 text-sm text-[var(--muted-foreground)] lg:flex">
                    <Sparkles className="size-4 shrink-0 text-[var(--gamibar-brand)]" />
                    Share the QR or 6-digit code. Start unlocks as soon as one participant joins.
                  </div>
                )}
              </div>
              <LobbyWall participants={room.participants} mode={room.mode} roomName={room.name} />
            </div>
          </>
        ) : (
          <>
            {/* 1. TOP: Leaderboard (or Poll Results if polls) */}
            {room.mode !== "polls" && (
              <UnifiedLeaderboard
                mode={room.mode}
                rows={displayedLeaderboard}
                finished={selectedRound !== "current" || room.status === "FINISHED"}
                title={displayedTitle}
                subtitle={displayedSubtitle}
                headerExtra={roundTabs}
              />
            )}
            {room.mode === "polls" && pollResults && <PollResultsPanel results={pollResults} />}

            {/* 2. AFTER THAT: Session Card (Computer Science Card with Play Again) */}
            {sessionHeroCard}

            {/* 3. BELOW THAT: Show Leaderboard to Participants Toggle */}
            {room.mode === "quiz" && isLive && (
              <div className="flex items-center justify-between gap-4 rounded-[24px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] px-5 py-4 shadow-[var(--shadow-soft)] sm:px-6">
                <div className="min-w-0">
                  <Label
                    htmlFor="show-leaderboard"
                    className="text-sm font-semibold text-[var(--foreground)]"
                  >
                    Show leaderboard to participants
                  </Label>
                </div>
                <Switch
                  id="show-leaderboard"
                  checked={room.showLeaderboardToStudents}
                  disabled={leaderboardBusy}
                  onCheckedChange={(checked) => void handleLeaderboardVisibility(checked)}
                />
              </div>
            )}

            {/* 4. Live Progress Dashboard */}
            {isLive && (
              <LiveGameDashboard
                mode={room.mode}
                rows={liveProgress}
                joined={room.participantCount}
                playing={playing}
                completed={completed}
              />
            )}
          </>
        )}

        {inLobby && room.participantCount < 1 && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--gamibar-brand)]/35 bg-[var(--gamibar-brand-soft)] px-4 py-3.5 text-sm text-[var(--muted-foreground)]">
            <Sparkles className="size-4 shrink-0 text-[var(--gamibar-brand)]" />
            Share the QR or 6-digit code - as soon as one participant joins, you can start the game.
          </div>
        )}
      </div>

      <LiveRoomActionDialog
        action={pendingAction}
        busy={busy}
        joinedCount={room.participantCount}
        roomCode={room.code}
        startWarning={connectDotsSolvability?.warning}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
        onConfirm={() => {
          void (pendingAction === "stop" ? handleStop() : handleStart());
        }}
      />
    </AuthorShell>
  );
}

function RoomMetaChips({ room }: { room: Room }) {
  const chips: string[] = [GAME_MODE_META[room.mode].title];

  if (room.mode === "connect_dots" && room.payload.mode === "connect_dots") {
    const { gridSize, contentPairs, pairCount } = room.payload.connectDots;
    const pairs = contentPairs.length > 0 ? contentPairs.length : pairCount;
    chips.push(`${pairs} pair${pairs === 1 ? "" : "s"}`);
    chips.push(`${gridSize}×${gridSize}`);
  }

  if (room.mode === "polls" && room.payload.mode === "polls") {
    const count = room.payload.questions.length;
    chips.push(`${count} question${count === 1 ? "" : "s"}`);
  }

  if (room.subject) chips.push(room.subject);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip}
          className="inline-flex max-w-full shrink-0 rounded-full border border-[var(--gamibar-border)] bg-[var(--surface)] px-2.5 py-0.5 text-[11px] font-medium leading-none text-[var(--muted-foreground)]"
        >
          <span className="truncate">{chip}</span>
        </span>
      ))}
    </div>
  );
}

function HeroMetric({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon?: typeof Users;
  accent?: "quiz" | "connect_dots" | "brand";
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-[var(--gamibar-border)] bg-[var(--surface)] px-3 py-3 sm:px-4 sm:py-3">
      <div className="flex items-center gap-1.5 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-[var(--gamibar-text-tertiary)]">
        {Icon && <Icon className="size-3.5 shrink-0" />}
        <span>{label}</span>
      </div>
      <p
        className={cn(
          "mt-1 font-display text-2xl font-bold tabular-nums text-[var(--foreground)]",
          accent === "brand" && "text-[var(--gamibar-brand)]",
          accent === "quiz" && "text-[var(--game-quiz)]",
          accent === "connect_dots" && "text-[var(--game-connect-dots)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
        status === "LIVE" || status === "COUNTDOWN"
          ? "bg-emerald-500/15 text-emerald-400"
          : status === "FINISHED"
            ? "bg-[var(--surface)] text-[var(--muted-foreground)]"
            : "bg-[var(--gamibar-brand-soft)] text-[var(--gamibar-brand)]",
      )}
    >
      {(status === "LIVE" || status === "LOBBY") && (
        <span className="size-1.5 animate-pulse rounded-full bg-current" />
      )}
      {status}
    </span>
  );
}
