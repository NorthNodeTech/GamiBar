import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, Plus, Users } from "lucide-react";

import { AuthorShell } from "@/components/layout/AuthorShell";
import { Button } from "@/components/ui/button";
import { loadAuthorRoom } from "@/lib/game/client-session";
import { useAuth } from "@/lib/auth-store";
import { fetchAuthorSessions } from "@/lib/supabase/author-sessions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/author/sessions")({
  head: () => ({ meta: [{ title: "Sessions - GamiBAR" }] }),
  component: SessionsPage,
});

const statusLabel: Record<string, string> = {
  LOBBY: "Lobby",
  READY: "Ready",
  COUNTDOWN: "Starting",
  LIVE: "Live",
  FINISHED: "Finished",
  ARCHIVED: "Archived",
};

function SessionsPage() {
  const savedRoom = loadAuthorRoom();
  const { user, isAuthor } = useAuth();

  const sessionsQuery = useQuery({
    queryKey: ["author-sessions", user?.id],
    enabled: isAuthor && Boolean(user?.id),
    queryFn: () => fetchAuthorSessions(user!.id),
  });

  const sessions = sessionsQuery.data ?? [];
  const totalPlayers = sessions.reduce((sum, session) => sum + session.playerCount, 0);

  return (
    <AuthorShell>
      <div className="mx-auto max-w-3xl px-2 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-[#111111]">Sessions</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#525252]">
              Track every room you host, how many players joined, and jump back into live control.
            </p>
          </div>
          <Button asChild className="rounded-xl bg-[#111111] hover:bg-black">
            <Link to="/author/create">
              <Plus className="mr-2 size-4" />
              New session
            </Link>
          </Button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <StatCard label="Hosted rooms" value={String(sessions.length)} />
          <StatCard label="Players joined" value={String(totalPlayers)} />
          <StatCard
            label="Live now"
            value={String(sessions.filter((s) => s.status === "LIVE" || s.status === "LOBBY").length)}
          />
        </div>

        {savedRoom && (
          <div className="mt-6 rounded-2xl border border-[var(--gamibar-brand)]/30 bg-[var(--gamibar-brand-soft)] p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gamibar-brand)]">
              Active in this browser
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-2xl font-bold tracking-[0.2em] text-[#111111]">{savedRoom.code}</p>
              <Button asChild size="sm" className="rounded-xl bg-[#111111] hover:bg-black">
                <Link to="/author/room/$roomId" params={{ roomId: savedRoom.roomId }}>
                  Open control screen
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
              Loading your sessions…
            </div>
          ) : sessionsQuery.isError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              Could not load sessions. Try refreshing the page.
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--gamibar-border)] bg-white px-6 py-12 text-center">
              <p className="text-sm text-[#525252]">No hosted sessions yet.</p>
              <Button asChild className="mt-4 rounded-xl bg-[#111111] hover:bg-black">
                <Link to="/author/create">Create your first session</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {sessions.map((session) => (
                <li
                  key={session.id}
                  className="rounded-2xl border border-[var(--gamibar-border)] bg-white p-4 shadow-[var(--shadow-soft)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#111111]">{session.name}</p>
                      <p className="mt-0.5 text-xs text-[#737373]">
                        {session.subject} · {session.mode.replace("_", " ")}
                      </p>
                      <p className="mt-2 font-mono text-lg font-bold tracking-[0.18em] text-[#111111]">
                        {session.code}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                          session.status === "LIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : session.status === "FINISHED"
                              ? "bg-neutral-100 text-neutral-700"
                              : "bg-amber-100 text-amber-900",
                        )}
                      >
                        {statusLabel[session.status] ?? session.status}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#525252]">
                        <Users className="size-3.5" />
                        {session.playerCount} player{session.playerCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button asChild variant="outline" size="sm" className="rounded-xl">
                      <Link to="/author/room/$roomId" params={{ roomId: session.id }}>
                        Open room
                        <ArrowRight className="ml-2 size-4" />
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AuthorShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--gamibar-border)] bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#737373]">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-[#111111]">{value}</p>
    </div>
  );
}
