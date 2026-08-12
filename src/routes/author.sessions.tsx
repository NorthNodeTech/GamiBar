import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Copy,
  Eye,
  Gamepad2,
  Loader2,
  Play,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { AuthorShell } from "@/components/layout/AuthorShell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { InlineErrorBanner } from "@/components/ui/async-state";
import { Input } from "@/components/ui/input";
import { GAME_MODE_META } from "@/lib/game/config";
import { loadAuthorRoom, saveAuthorRoom } from "@/lib/game/client-session";
import { duplicateRoomFn } from "@/lib/game/room.functions";
import { useAuth } from "@/lib/auth-store";
import {
  deleteAuthorSession,
  fetchAuthorSessions,
  type AuthorSessionSummary,
} from "@/lib/supabase/author-sessions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/author/sessions")({
  head: () => ({ meta: [{ title: "My Games - GamiBAR" }] }),
  component: MyGamesPage,
});

const statusLabel: Record<string, string> = {
  DRAFT: "Draft",
  LOBBY: "Lobby",
  READY: "Ready",
  COUNTDOWN: "Starting",
  LIVE: "Live",
  FINISHED: "Finished",
  CANCELLED: "Cancelled",
};

function formatCreatedDate(value: string): string {
  const ms = Number(value);
  const date = Number.isFinite(ms) ? new Date(ms) : new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function MyGamesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const savedRoom = loadAuthorRoom();
  const { user, isAuthor } = useAuth();
  const [deleteTarget, setDeleteTarget] = useState<AuthorSessionSummary | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const sessionsQuery = useQuery({
    queryKey: ["author-sessions", user?.id],
    enabled: isAuthor && Boolean(user?.id),
    queryFn: () => fetchAuthorSessions(user!.id),
  });

  const deleteMutation = useMutation({
    mutationFn: (session: AuthorSessionSummary) => deleteAuthorSession(user!.id, session.id),
    onSuccess: () => {
      toast.success("Game deleted.");
      void queryClient.invalidateQueries({ queryKey: ["author-sessions", user?.id] });
      setDeleteTarget(null);
      setDeleteConfirmName("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: (session: AuthorSessionSummary) =>
      duplicateRoomFn({
        data: {
          sourceRoomId: session.id,
          authorId: user!.id,
          authorName: user!.name,
        },
      }),
    onSuccess: (result, session) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      saveAuthorRoom({
        roomId: result.room.id,
        code: result.room.code,
        authorToken: result.authorToken,
      });
      toast.success(`Duplicated "${session.name}" — new code ${result.room.code}`);
      void queryClient.invalidateQueries({ queryKey: ["author-sessions", user?.id] });
      navigate({ to: "/author/room/$roomId", params: { roomId: result.room.id } });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sessions = sessionsQuery.data ?? [];
  const busyId = duplicateMutation.isPending
    ? duplicateMutation.variables?.id
    : deleteMutation.isPending
      ? deleteMutation.variables?.id
      : null;

  return (
    <AuthorShell>
      <div className="mx-auto max-w-4xl px-2 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-[#111111]">My Games</h1>
            <p className="mt-2 text-sm text-[#525252]">Games you created and hosted.</p>
          </div>
          <Button asChild className="rounded-xl bg-[#111111] hover:bg-black">
            <Link to="/author/create">
              <Plus className="mr-2 size-4" />
              Create Game
            </Link>
          </Button>
        </div>

        {savedRoom && (
          <div className="mt-6 rounded-2xl border border-[var(--gamibar-brand)]/30 bg-[var(--gamibar-brand-soft)] p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gamibar-brand)]">
              Active in this browser
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-2xl font-bold tracking-[0.2em] text-[#111111]">
                {savedRoom.code}
              </p>
              <Button asChild size="sm" className="rounded-xl bg-[#111111] hover:bg-black">
                <Link to="/author/room/$roomId" params={{ roomId: savedRoom.roomId }}>
                  Open live control
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}

        <div className="mt-8">
          {sessionsQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#737373]">
              <Loader2 className="size-4 animate-spin" />
              Loading games…
            </div>
          ) : sessionsQuery.isError ? (
            <InlineErrorBanner
              className="py-8 text-center"
              message="Could not load your games. Check your connection and try again."
              onRetry={() => void sessionsQuery.refetch()}
              retrying={sessionsQuery.isFetching}
            />
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--gamibar-border)] bg-white px-6 py-12 text-center">
              <Gamepad2 className="mx-auto size-8 text-[#737373]" />
              <p className="mt-4 text-sm text-[#525252]">No games yet.</p>
              <Button asChild className="mt-4 rounded-xl bg-[#111111] hover:bg-black">
                <Link to="/author/create">Create Game</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-4">
              {sessions.map((session) => (
                <MyGameCard
                  key={session.id}
                  session={session}
                  busy={busyId === session.id}
                  canOpenLive={savedRoom?.roomId === session.id}
                  onViewResults={() =>
                    navigate({ to: "/author/sessions/$roomId", params: { roomId: session.id } })
                  }
                  onDuplicate={() => duplicateMutation.mutate(session)}
                  onDelete={() => {
                    setDeleteTarget(session);
                    setDeleteConfirmName("");
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteConfirmName("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this game?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left text-sm text-muted-foreground">
                <p>
                  This permanently removes{" "}
                  <span className="font-semibold text-foreground">{deleteTarget?.name}</span>, its
                  participant data, scores, and results. This cannot be undone.
                </p>
                <p>
                  Type the game name <span className="font-semibold text-foreground">{deleteTarget?.name}</span>{" "}
                  to confirm:
                </p>
                <Input
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder="Game name"
                  autoComplete="off"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                deleteMutation.isPending ||
                deleteConfirmName.trim() !== (deleteTarget?.name ?? "").trim()
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) deleteMutation.mutate(deleteTarget);
              }}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete game"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AuthorShell>
  );
}

function MyGameCard({
  session,
  busy,
  canOpenLive,
  onViewResults,
  onDuplicate,
  onDelete,
}: {
  session: AuthorSessionSummary;
  busy: boolean;
  canOpenLive: boolean;
  onViewResults: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const isFinished = session.status === "FINISHED" || session.status === "CANCELLED";
  const isStartable =
    session.status === "LIVE" ||
    session.status === "LOBBY" ||
    session.status === "COUNTDOWN" ||
    session.status === "READY" ||
    session.status === "DRAFT";

  return (
    <li className="overflow-hidden rounded-2xl border border-[var(--gamibar-border)] bg-white shadow-[var(--shadow-soft)]">
      <div className="border-b border-[var(--gamibar-border)] bg-[var(--gamibar-page)]/50 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-[#111111]">{session.name}</p>
            <p className="mt-0.5 text-xs text-[#737373]">{session.subject}</p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
              session.status === "LIVE"
                ? "bg-emerald-100 text-emerald-800"
                : isFinished
                  ? "bg-neutral-100 text-neutral-700"
                  : "bg-amber-100 text-amber-900",
            )}
          >
            {statusLabel[session.status] ?? session.status}
          </span>
        </div>
      </div>

      <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-4">
        <MetaItem label="Mode" value={GAME_MODE_META[session.mode]?.title ?? session.mode} />
        <MetaItem label="Code" value={session.code} mono />
        <MetaItem label="Created" value={formatCreatedDate(session.createdAt)} />
        <MetaItem
          label="Questions"
          value={
            session.mode === "connect_dots"
              ? `${session.questionCount} pair${session.questionCount === 1 ? "" : "s"}`
              : String(session.questionCount)
          }
        />
        <MetaItem
          label="Participants"
          value={
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" />
              {session.playerCount}
            </span>
          }
        />
        <MetaItem label="Status" value={statusLabel[session.status] ?? session.status} />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--gamibar-border)] bg-[var(--gamibar-page)]/30 px-4 py-3 sm:px-5">
        {canOpenLive && isStartable ? (
          <Button asChild size="sm" className="rounded-xl bg-[#111111] hover:bg-black">
            <Link to="/author/room/$roomId" params={{ roomId: session.id }}>
              <Play className="mr-1.5 size-3.5 fill-current" />
              Start game
            </Link>
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          disabled={busy}
          onClick={onViewResults}
        >
          <Eye className="mr-1.5 size-3.5" />
          {isFinished ? "View results" : "View game"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          disabled={busy}
          onClick={onDuplicate}
        >
          <Copy className="mr-1.5 size-3.5" />
          Duplicate
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl text-red-700 hover:bg-red-50 hover:text-red-800"
          disabled={busy}
          onClick={onDelete}
        >
          <Trash2 className="mr-1.5 size-3.5" />
          Delete
        </Button>
      </div>
    </li>
  );
}

function MetaItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#737373]">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-sm font-medium text-[#111111]",
          mono && "font-mono tracking-[0.12em]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

