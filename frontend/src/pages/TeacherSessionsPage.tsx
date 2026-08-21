import { Link, useNavigate } from "@/lib/navigation";
import { useMutation, useQuery, useQueryClient } from "@/lib/query";
import {
  ArrowRight,
  Copy,
  Gamepad2,
  Loader2,
  Play,
  Plus,
  QrCode,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AuthorPageFrame } from "@/components/author/AuthorPageFrame";
import { AuthorPageHeader } from "@/components/author/AuthorPageHeader";
import { GameModeMiniPreview } from "@/components/author/GameModeMiniPreview";
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
import { Label } from "@/components/ui/label";
import { GAME_MODE_META } from "@shared/game/config";
import { saveAuthorRoom } from "@/lib/game/client-session";
import { claimAuthorSessionFn, duplicateRoomFn } from "@/lib/game/room.functions";
import { useAuth } from "@/lib/auth-store";
import {
  deleteAuthorSession,
  fetchAuthorSessions,
  type AuthorSessionSummary,
} from "@/lib/supabase/author-sessions";
import { cn } from "@/lib/utils";

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

function isActiveSession(status: string) {
  return (
    status === "LIVE" ||
    status === "LOBBY" ||
    status === "COUNTDOWN" ||
    status === "READY" ||
    status === "DRAFT"
  );
}

export default function MySessionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthor } = useAuth();
  const [deleteTarget, setDeleteTarget] = useState<AuthorSessionSummary | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [duplicateTarget, setDuplicateTarget] = useState<AuthorSessionSummary | null>(null);
  const [duplicateName, setDuplicateName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "done">("all");

  const sessionsQuery = useQuery({
    queryKey: ["author-sessions", user?.id],
    enabled: isAuthor && Boolean(user?.id),
    queryFn: () => fetchAuthorSessions(user!.id),
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: (session: AuthorSessionSummary) => deleteAuthorSession(user!.id, session.id),
    onSuccess: () => {
      toast.success("Session deleted.");
      void queryClient.invalidateQueries({ queryKey: ["author-sessions", user?.id] });
      setDeleteTarget(null);
      setDeleteConfirmName("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openLiveMutation = useMutation({
    mutationFn: async (session: AuthorSessionSummary) => {
      const res = await claimAuthorSessionFn({
        data: { roomId: session.id, authorId: user!.id },
      });
      if (!res.ok) throw new Error(res.error);
      return { session, res };
    },
    onSuccess: ({ session, res }) => {
      saveAuthorRoom({
        roomId: session.id,
        code: res.room.code,
        authorToken: res.authorToken,
      });
      navigate({ to: "/author/room/$roomId", params: { roomId: session.id } });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: (input: { session: AuthorSessionSummary; name: string }) =>
      duplicateRoomFn({
        data: {
          sourceRoomId: input.session.id,
          authorId: user!.id,
          authorName: user!.name,
          name: input.name,
        },
      }),
    onSuccess: (result, { session, name }) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      saveAuthorRoom({
        roomId: result.room.id,
        code: result.room.code,
        authorToken: result.authorToken,
      });
      toast.success(`"${name}" created - new code ${result.room.code}`);
      void queryClient.invalidateQueries({ queryKey: ["author-sessions", user?.id] });
      setDuplicateTarget(null);
      setDuplicateName("");
      navigate({ to: "/author/room/$roomId", params: { roomId: result.room.id } });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);

  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sessions.filter((session) => {
      if (statusFilter === "active" && !isActiveSession(session.status)) return false;
      if (statusFilter === "done" && isActiveSession(session.status)) return false;
      if (!q) return true;
      return (
        session.name.toLowerCase().includes(q) ||
        session.code.includes(q) ||
        (GAME_MODE_META[session.mode]?.title ?? session.mode).toLowerCase().includes(q)
      );
    });
  }, [sessions, searchQuery, statusFilter]);
  const busyId = openLiveMutation.isPending
    ? openLiveMutation.variables?.id
    : duplicateMutation.isPending
      ? duplicateMutation.variables?.session.id
      : deleteMutation.isPending
        ? deleteMutation.variables?.id
        : null;

  return (
    <AuthorShell>
      <AuthorPageFrame width="md">
        <AuthorPageHeader
          title="My sessions"
          actions={
            <Button
              asChild
              className="w-full rounded-xl bg-[var(--gamibar-brand)] font-semibold shadow-[0_8px_24px_-8px_rgba(239,68,68,0.45)] hover:bg-[var(--gamibar-brand-hover)] sm:w-auto"
            >
              <Link to="/author/create">
                <Plus className="mr-2 size-4" />
                Create room
              </Link>
            </Button>
          }
        />

        {sessions.length > 0 ? (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, code, or mode..."
                className="h-10 rounded-xl pl-9"
              />
            </div>
            <div className="flex w-full gap-1 rounded-xl bg-[var(--gamibar-page)] p-1 sm:w-auto">
              {(
                [
                  ["all", "All"],
                  ["active", "Active"],
                  ["done", "Done"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={cn(
                    "tap-target flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition-colors sm:flex-none sm:px-3 sm:py-1.5",
                    statusFilter === key
                      ? "bg-[var(--gamibar-surface)] text-[var(--foreground)] shadow-sm"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-5 sm:mt-6">
          {sessionsQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#737373]">
              <Loader2 className="size-4 animate-spin" />
              Loading sessions...
            </div>
          ) : sessionsQuery.isError ? (
            <InlineErrorBanner
              className="py-8 text-center"
              message="Could not load your sessions. Check your connection and try again."
              onRetry={() => void sessionsQuery.refetch()}
              retrying={sessionsQuery.isFetching}
            />
          ) : sessions.length === 0 ? (
            <div className="author-card border-dashed px-6 py-14 text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--gamibar-page)] text-[var(--muted-foreground)]">
                <Gamepad2 className="size-7" />
              </div>
              <p className="mt-4 text-sm font-medium text-[var(--foreground)]">No sessions yet</p>
              <Button
                asChild
                className="mt-5 rounded-xl bg-[var(--gamibar-brand)] hover:bg-[var(--gamibar-brand-hover)]"
              >
                <Link to="/author/create">Create room</Link>
              </Button>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="author-card border-dashed px-6 py-10 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">
                No sessions match your search.
              </p>
            </div>
          ) : (
            <ul className="grid gap-2.5 sm:gap-3">
              {filteredSessions.map((session) => (
                <MyGameCard
                  key={session.id}
                  session={session}
                  busy={busyId === session.id}
                  onOpenLive={() => openLiveMutation.mutate(session)}
                  onDuplicate={() => {
                    setDuplicateTarget(session);
                    setDuplicateName("");
                  }}
                  onDelete={() => {
                    setDeleteTarget(session);
                    setDeleteConfirmName("");
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      </AuthorPageFrame>

      <AlertDialog
        open={duplicateTarget != null}
        onOpenChange={(open) => {
          if (!open) {
            setDuplicateTarget(null);
            setDuplicateName("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate session</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left text-sm text-muted-foreground">
                <p>
                  Same questions and settings, new join code and QR. Choose a name for this room.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="duplicate-game-name">New session name</Label>
                  <Input
                    id="duplicate-game-name"
                    value={duplicateName}
                    onChange={(e) => setDuplicateName(e.target.value)}
                    placeholder="e.g. Period 2 - Connect Dots"
                    autoComplete="off"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={duplicateMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={duplicateMutation.isPending || duplicateName.trim().length === 0}
              className="bg-[#111111] text-white hover:bg-black"
              onClick={(e) => {
                e.preventDefault();
                if (!duplicateTarget) return;
                duplicateMutation.mutate({
                  session: duplicateTarget,
                  name: duplicateName.trim(),
                });
              }}
            >
              {duplicateMutation.isPending ? "Creating..." : "Create duplicate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <AlertDialogTitle>Delete this session?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left text-sm text-muted-foreground">
                <p>
                  Permanently removes{" "}
                  <span className="font-semibold text-foreground">{deleteTarget?.name}</span> and
                  all its data.
                </p>
                <p>
                  Type <span className="font-semibold text-foreground">DELETE</span> to confirm:
                </p>
                <Input
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder="DELETE"
                  autoComplete="off"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                deleteMutation.isPending || deleteConfirmName.trim().toUpperCase() !== "DELETE"
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) deleteMutation.mutate(deleteTarget);
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete session"}
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
  onOpenLive,
  onDuplicate,
  onDelete,
}: {
  session: AuthorSessionSummary;
  busy: boolean;
  onOpenLive: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const isFinished = session.status === "FINISHED" || session.status === "CANCELLED";
  const canOpenLive = isActiveSession(session.status);
  const isResourceDrop = session.subject === "Resource Drop";
  const modeTitle = isResourceDrop
    ? "Resource Drop"
    : (GAME_MODE_META[session.mode]?.title ?? session.mode);

  return (
    <li className="author-card overflow-hidden">
      <div className="flex items-start gap-3 p-3 sm:p-4">
        <GameModeMiniPreview mode={session.mode} subject={session.subject} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-[var(--foreground)]">{session.name}</p>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                {modeTitle} · {formatCreatedDate(session.createdAt)}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                session.status === "LIVE"
                  ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
                  : isFinished
                    ? "bg-[var(--gamibar-page)] text-[var(--muted-foreground)]"
                    : "bg-amber-500/12 text-amber-800 dark:text-amber-400",
              )}
            >
              {statusLabel[session.status] ?? session.status}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted-foreground)]">
            <span className="inline-flex items-center gap-1 font-mono tracking-wider">
              {session.code}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" />
              {session.playerCount}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 border-t border-[var(--gamibar-border)] bg-[var(--gamibar-page)]/50 px-3 py-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-1.5 sm:px-4 sm:py-2">
        {session.subject === "Resource Drop" ? (
          <Button
            type="button"
            size="sm"
            className="col-span-2 h-10 rounded-lg bg-[var(--foreground)] px-3 text-xs text-[var(--background)] hover:opacity-90 sm:col-span-1 sm:h-8 sm:px-2.5"
            disabled={busy}
            onClick={onOpenLive}
          >
            <QrCode className="mr-1 size-3" />
            Open QR Drop
          </Button>
        ) : (
          <>
            <Button
              type="button"
              size="sm"
              className="col-span-2 h-10 rounded-lg bg-[var(--foreground)] px-3 text-xs text-[var(--background)] hover:opacity-90 sm:col-span-1 sm:h-8 sm:px-2.5"
              disabled={busy}
              onClick={onOpenLive}
            >
              <Play className="mr-1 size-3 fill-current" />
              {isFinished ? "Open room" : "Open live"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 rounded-lg px-2.5 text-xs sm:h-8"
              disabled={busy}
              onClick={onDuplicate}
            >
              <Copy className="mr-1 size-3" />
              Duplicate
            </Button>
          </>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 rounded-lg px-2.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 sm:col-span-1 sm:ml-auto sm:h-8"
          disabled={busy}
          onClick={onDelete}
        >
          <Trash2 className="mr-1 size-3" />
          Delete
        </Button>
      </div>
    </li>
  );
}
