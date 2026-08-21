import { Link, useNavigate } from "@/lib/navigation";
import { useMutation, useQuery, useQueryClient } from "@/lib/query";
import {
  Filter,
  Gamepad2,
  Loader2,
  Play,
  QrCode,
  RotateCcw,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GAME_MODE_META } from "@shared/game/config";
import { saveAuthorRoom } from "@/lib/game/client-session";
import { claimAuthorSessionFn } from "@/lib/game/room.functions";
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

const TOOL_FILTER_OPTIONS: Array<{ id: string; label: string }> = [
  { id: "all", label: "All Tools" },
  { id: "quiz", label: "Quiz Challenge" },
  { id: "connect_dots", label: "Connect Dots" },
  { id: "jigsaw", label: "Jigsaw Puzzle" },
  { id: "polls", label: "Live Polls" },
  { id: "visual_point", label: "Target Hunt" },
  { id: "resource_drop", label: "Resource Drop" },
];

function formatCreatedDate(value: string): string {
  const ms = Number(value);
  const date = Number.isFinite(ms) ? new Date(ms) : new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function MySessionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthor } = useAuth();
  const [deleteTarget, setDeleteTarget] = useState<AuthorSessionSummary | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [toolFilter, setToolFilter] = useState<string>("all");

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

  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);

  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sessions.filter((session) => {
      if (toolFilter !== "all") {
        if (toolFilter === "resource_drop") {
          if (session.subject !== "Resource Drop") return false;
        } else {
          if (session.mode !== toolFilter || session.subject === "Resource Drop") return false;
        }
      }
      if (!q) return true;
      return (
        session.name.toLowerCase().includes(q) ||
        session.code.includes(q) ||
        (GAME_MODE_META[session.mode]?.title ?? session.mode).toLowerCase().includes(q) ||
        (session.subject ?? "").toLowerCase().includes(q)
      );
    });
  }, [sessions, searchQuery, toolFilter]);

  const busyId = openLiveMutation.isPending
    ? openLiveMutation.variables?.id
    : deleteMutation.isPending
      ? deleteMutation.variables?.id
      : null;

  return (
    <AuthorShell>
      <AuthorPageFrame width="md">
        <AuthorPageHeader title="My sessions" />

        {sessions.length > 0 ? (
          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sessions by name or code..."
                className="h-11 rounded-2xl border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] pl-10 text-sm shadow-[var(--shadow-soft)] focus-visible:ring-1 focus-visible:ring-[var(--foreground)]"
              />
            </div>

            {/* Tool / Mode Filter Dropdown */}
            <div className="w-full sm:w-[185px]">
              <Select value={toolFilter} onValueChange={setToolFilter}>
                <SelectTrigger className="h-11 rounded-2xl border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] px-3.5 text-xs font-semibold text-[var(--foreground)] shadow-[var(--shadow-soft)] focus:ring-1 focus:ring-[var(--foreground)]">
                  <div className="flex items-center gap-2 truncate">
                    <Filter className="size-3.5 text-[var(--muted-foreground)] shrink-0" />
                    <SelectValue placeholder="All Tools" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] shadow-lg">
                  {TOOL_FILTER_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.id}
                      value={opt.id}
                      className="rounded-xl text-xs font-medium cursor-pointer"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}

        <div className="mt-5 sm:mt-6">
          {sessionsQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--muted-foreground)]">
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
            <div className="rounded-3xl border border-dashed border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] px-6 py-14 text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--gamibar-page)] text-[var(--muted-foreground)]">
                <Gamepad2 className="size-7" />
              </div>
              <p className="mt-4 text-base font-bold text-[var(--foreground)]">No sessions yet</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Create your first game room and invite players.
              </p>
              <Button
                asChild
                className="mt-5 rounded-xl bg-[var(--gamibar-brand)] font-semibold text-white shadow-sm hover:bg-[var(--gamibar-brand-hover)]"
              >
                <Link to="/author/create">Create room</Link>
              </Button>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] px-6 py-10 text-center">
              <p className="text-sm font-medium text-[var(--muted-foreground)]">
                No sessions match your search or selected tool.
              </p>
            </div>
          ) : (
            <ul className="grid gap-3">
              {filteredSessions.map((session) => (
                <MyGameCard
                  key={session.id}
                  session={session}
                  busy={busyId === session.id}
                  onOpenLive={() => openLiveMutation.mutate(session)}
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
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteConfirmName("");
          }
        }}
      >
        <AlertDialogContent className="rounded-3xl border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-bold">
              Delete this session?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left text-sm text-[var(--muted-foreground)]">
                <p>
                  Permanently removes{" "}
                  <span className="font-semibold text-[var(--foreground)]">
                    {deleteTarget?.name}
                  </span>{" "}
                  and all its records.
                </p>
                <p>
                  Type <span className="font-bold text-[var(--foreground)]">DELETE</span> to
                  confirm:
                </p>
                <Input
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder="DELETE"
                  autoComplete="off"
                  className="rounded-xl"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending} className="rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={
                deleteMutation.isPending || deleteConfirmName.trim().toUpperCase() !== "DELETE"
              }
              className="rounded-xl bg-red-600 font-bold text-white hover:bg-red-700"
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
  onDelete,
}: {
  session: AuthorSessionSummary;
  busy: boolean;
  onOpenLive: () => void;
  onDelete: () => void;
}) {
  const isFinished = session.status === "FINISHED" || session.status === "CANCELLED";
  const isResourceDrop = session.subject === "Resource Drop";
  const modeTitle = isResourceDrop
    ? "Resource Drop"
    : (GAME_MODE_META[session.mode]?.title ?? session.mode);

  return (
    <li className="overflow-hidden rounded-2xl border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] shadow-[var(--shadow-soft)] transition-all hover:border-[var(--foreground)]/20">
      <div className="flex items-start gap-3.5 p-4 sm:p-5">
        <GameModeMiniPreview mode={session.mode} subject={session.subject} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold text-[var(--foreground)]">
                {session.name}
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                {modeTitle} · {formatCreatedDate(session.createdAt)}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
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
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-[var(--muted-foreground)]">
            <span className="inline-flex items-center gap-1 font-mono font-bold tracking-wider text-[var(--foreground)]">
              {session.code}
            </span>
            <span className="inline-flex items-center gap-1 font-medium">
              <Users className="size-3.5 text-[var(--muted-foreground)]" />
              {session.playerCount}
            </span>
            {session.roundCount && session.roundCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] px-2 py-0.5 text-[10px] font-bold text-[var(--foreground)]">
                <RotateCcw className="size-3 text-[var(--gamibar-brand)]" />
                {session.roundCount > 1 ? `${session.roundCount} rounds` : `1 round`}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[var(--gamibar-border)] bg-[var(--gamibar-page)]/30 px-4 py-2.5 sm:px-5">
        <Button
          type="button"
          size="sm"
          className="h-9 rounded-xl bg-[var(--foreground)] px-4 text-xs font-bold text-[var(--background)] shadow-sm hover:opacity-90"
          disabled={busy}
          onClick={onOpenLive}
        >
          {session.subject === "Resource Drop" ? (
            <>
              <QrCode className="mr-1.5 size-3.5" />
              Open QR Drop
            </>
          ) : (
            <>
              <Play className="mr-1.5 size-3.5 fill-current" />
              {isFinished ? "Open room" : "Open live"}
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 rounded-xl px-3 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
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
