import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Play, Sparkles, Square, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConnectDotsLayoutWarning } from "@/components/author/ConnectDotsLayoutWarning";
import { CompletionTimeline } from "@/components/author/LiveLeaderboard";
import { LiveGameDashboard } from "@/components/author/LiveGameDashboard";
import { UnifiedLeaderboard } from "@/components/author/UnifiedLeaderboard";
import { LobbyWall, ParticipantStrip } from "@/components/author/LobbyWall";
import { RoomCodeDisplay } from "@/components/author/RoomCodeDisplay";
import { AuthorShell } from "@/components/layout/AuthorShell";
import { RoomJoinShare } from "@/components/session/RoomJoinShare";
import { Button } from "@/components/ui/button";
import {
  ConnectionBanner,
  InlineErrorBanner,
  PageErrorState,
  PageLoader,
} from "@/components/ui/async-state";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { GAME_MODE_META } from "@/lib/game/config";
import type { Room } from "@/lib/game/types";
import { loadAuthorRoom } from "@/lib/game/client-session";
import { friendlyGameError } from "@/lib/accessibility";
import { assessConnectDotsContentSolvability } from "@/lib/game/connect-dots-solvability";
import { startGameFn, stopGameFn, setShowLeaderboardToStudentsFn } from "@/lib/game/room.functions";
import { useRoomPolling } from "@/lib/game/useRoomPolling";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/author/room/$roomId")({
  head: () => ({
    meta: [{ title: "Live Room - GamiBAR" }],
  }),
  component: AuthorRoomPage,
});

function AuthorRoomPage() {
  const { roomId } = Route.useParams();
  const author = useMemo(() => loadAuthorRoom(), [roomId]);
  const authorToken = author?.roomId === roomId ? author.authorToken : undefined;
  const { snapshot, error, isInitialLoading, isReconnecting, retrying, retry, refresh } =
    useRoomPolling({ roomId, authorToken });
  const [busy, setBusy] = useState(false);
  const [leaderboardBusy, setLeaderboardBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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
          <Button asChild className="mt-5 rounded-xl bg-[var(--gamibar-brand)] text-white hover:bg-[var(--gamibar-brand-hover)]">
            <Link to="/author/create">Create a new room</Link>
          </Button>
        </div>
      </AuthorShell>
    );
  }

  if (isInitialLoading) {
    return (
      <AuthorShell>
        <PageLoader message="Loading room…" description="Fetching live game data." fullScreen={false} className="min-h-[40vh]" />
      </AuthorShell>
    );
  }

  if (!snapshot) {
    return (
      <AuthorShell>
        <PageErrorState
          title="Connection problem"
          message={friendlyGameError(error, "Could not connect to this room. Check your network and try again.")}
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
          message={friendlyGameError(error ?? snapshot.error, "This room may have been deleted or closed.")}
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
  const leaderboard = snapshot.leaderboard;
  const completions = snapshot.recentEvents
    .filter((e) => e.type === "player_completed")
    .slice(-8)
    .reverse()
    .map((e, i) =>
      e.type === "player_completed"
        ? {
            key: `${e.participantId}-${i}`,
            displayName: e.displayName,
            durationMs: e.durationMs,
          }
        : null,
    )
    .filter(Boolean) as { key: string; displayName: string; durationMs?: number | null }[];

  const playing = room.participants.filter((p) => p.status === "PLAYING").length;
  const completed = room.participants.filter((p) => p.status === "COMPLETED").length;
  const inLobby = room.status === "LOBBY" || room.status === "READY" || room.status === "DRAFT";
  const isLive = room.status === "LIVE" || room.status === "COUNTDOWN";
  const canStart = (room.status === "LOBBY" || room.status === "READY") && room.participantCount >= 1;

  const handleStart = async () => {
    let confirmMessage = "Start the game for all students in the lobby?";
    if (connectDotsSolvability?.warning) {
      confirmMessage = `${connectDotsSolvability.warning}\n\nYou can still start, but students may not be able to finish. Start anyway?`;
    }
    if (!window.confirm(confirmMessage)) return;
    setBusy(true);
    setActionError(null);
    try {
      const res = await startGameFn({ data: { roomId, authorToken } });
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
    if (!window.confirm("Stop the game and calculate the final leaderboard?")) return;
    setBusy(true);
    setActionError(null);
    try {
      const res = await stopGameFn({ data: { roomId, authorToken } });
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

  const handleLeaderboardVisibility = async (enabled: boolean) => {
    setLeaderboardBusy(true);
    setActionError(null);
    try {
      const res = await setShowLeaderboardToStudentsFn({
        data: { roomId, authorToken, enabled },
      });
      if (!res.ok) {
        const message = friendlyGameError(res.error, "Could not update leaderboard visibility.");
        setActionError(message);
        toast.error(message);
      } else {
        toast.success(enabled ? "Students can see the live leaderboard" : "Leaderboard hidden from students");
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
  const liveProgress = snapshot.liveProgress ?? [];

  const statusHint = inLobby
    ? "Share the QR or code below. Start when at least one student has joined."
    : isLive
      ? "Round is live. Watch rankings below and stop when you are ready for final results."
      : "Session complete. Review the leaderboard and completions below.";

  return (
    <AuthorShell>
      {isReconnecting ? <ConnectionBanner onRetry={retry} retrying={retrying} /> : null}
      <div className="mx-auto w-full max-w-7xl space-y-5 pb-8">
        {actionError ? (
          <InlineErrorBanner message={actionError} onDismiss={() => setActionError(null)} />
        ) : null}
        <section className="relative overflow-hidden rounded-[28px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] px-4 py-5 shadow-[var(--shadow-soft)] sm:px-7 sm:py-6">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.18),transparent_50%)]"
          />
          <div className="relative space-y-4 sm:space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={room.status} />
              <RoomMetaChips room={room} />
            </div>

            <div className="min-w-0">
              <h1 className="font-display text-[clamp(1.75rem,7vw,2.25rem)] font-extrabold leading-tight tracking-tight text-[var(--foreground)] sm:text-4xl">
                {room.name}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted-foreground)]">
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

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              {(room.status === "LOBBY" || room.status === "READY") && (
                <Button
                  className={cn(
                    "h-11 w-full rounded-xl px-6 font-semibold sm:w-auto",
                    canStart
                      ? "bg-[var(--gamibar-brand)] text-white hover:bg-[var(--gamibar-brand-hover)]"
                      : "bg-[var(--surface)] text-[var(--gamibar-text-tertiary)] hover:bg-[var(--surface)]",
                  )}
                  disabled={busy || !canStart}
                  onClick={() => void handleStart()}
                >
                  <Play className="mr-2 size-4 shrink-0" />
                  <span className="truncate">
                    {busy
                      ? "Starting game…"
                      : canStart
                        ? `Start game · ${room.participantCount} ready`
                        : "Waiting for students"}
                  </span>
                </Button>
              )}
              {isLive && (
                <Button
                  variant="outline"
                  className="h-11 w-full rounded-xl border-[var(--gamibar-border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--surface)] sm:w-auto"
                  disabled={busy}
                  onClick={() => void handleStop()}
                >
                  <Square className="mr-2 size-4 shrink-0" />
                  {busy ? "Ending game…" : "Stop game"}
                </Button>
              )}
              <Button
                asChild
                variant="outline"
                className="h-11 w-full rounded-xl border-[var(--gamibar-border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--surface)] sm:w-auto"
              >
                <Link to="/author/create">New room</Link>
              </Button>
            </div>
          </div>

          {!inLobby && (
            <div className="relative mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-4 sm:gap-3">
              <HeroMetric label="Joined" value={room.participantCount} icon={Users} />
              <HeroMetric label="Playing" value={playing} accent="quiz" />
              <HeroMetric label="Completed" value={completed} accent="connect_dots" />
              <HeroMetric
                label="Time left"
                value={remaining != null ? `${remaining}s` : room.status === "LIVE" ? "No limit" : "—"}
                icon={Clock}
                {...(remaining != null ? { accent: "brand" as const } : {})}
              />
            </div>
          )}
        </section>

        {inLobby ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <RoomJoinShare code={room.code} prominent />
            <LobbyWall
              participants={room.participants}
              mode={room.mode}
              roomName={room.name}
            />
          </div>
        ) : (
          <>
            {isLive && (
              <LiveGameDashboard
                mode={room.mode}
                rows={liveProgress}
                joined={room.participantCount}
                playing={playing}
                completed={completed}
              />
            )}

            {!isLive && (
              <div className="rounded-[28px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] px-5 py-5 shadow-[var(--shadow-soft)] sm:px-6">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--gamibar-text-tertiary)]">
                  Room code
                </p>
                <div className="mt-3 flex justify-center sm:justify-start">
                  <RoomCodeDisplay code={room.code} size="large" />
                </div>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                {room.mode === "quiz" && isLive && (
                  <div className="flex items-center justify-between gap-4 rounded-[24px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] px-5 py-4 shadow-[var(--shadow-soft)] sm:px-6">
                    <div className="min-w-0">
                      <Label htmlFor="show-leaderboard" className="text-sm font-semibold text-[var(--foreground)]">
                        Show leaderboard to students
                      </Label>
                      <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                        Off by default. Students only see final results when the game ends.
                      </p>
                    </div>
                    <Switch
                      id="show-leaderboard"
                      checked={room.showLeaderboardToStudents}
                      disabled={leaderboardBusy}
                      onCheckedChange={(checked) => void handleLeaderboardVisibility(checked)}
                    />
                  </div>
                )}
                <UnifiedLeaderboard
                  mode={room.mode}
                  rows={leaderboard}
                  finished={room.status === "FINISHED"}
                />
              </div>
              <CompletionTimeline items={completions} />
            </div>

            {!isLive && room.participants.length > 0 && (
              <LobbyWall participants={room.participants} mode={room.mode} roomName={room.name} />
            )}
          </>
        )}

        {inLobby && room.participantCount < 1 && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--gamibar-brand)]/35 bg-[var(--gamibar-brand-soft)] px-4 py-3.5 text-sm text-[var(--muted-foreground)]">
            <Sparkles className="size-4 shrink-0 text-[var(--gamibar-brand)]" />
            Share the QR or 6-digit code - as soon as one student joins, you can start the game.
          </div>
        )}
      </div>
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
