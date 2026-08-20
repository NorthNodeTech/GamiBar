import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { Logo } from "@/components/layout/Logo";
import { authorNavItems } from "@/lib/author-nav";
import { useAuthSafe } from "@/lib/auth-store";
import { clearAuthorRoom } from "@/lib/game/client-session";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, logout } = useAuthSafe();
  const onLiveRoom = pathname.startsWith("/author/room/");

  const handleLogout = async () => {
    await logout();
    clearAuthorRoom();
    navigate({ to: "/" });
  };

  return (
    <aside className="flex h-full w-[252px] shrink-0 flex-col border-r border-[var(--gamibar-border)] bg-white">
      <div className="border-b border-[var(--gamibar-border)] px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-[#111111] p-1.5 shadow-sm">
            <Logo size={28} />
          </div>
          <div className="min-w-0">
            <span className="block font-display text-lg font-bold tracking-tight text-[#111111]">
              Gami<span className="text-[var(--gamibar-brand)]">BAR</span>
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {authorNavItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.match(pathname) || (item.to === "/author/tools" && onLiveRoom);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-[#111111] text-white shadow-[0_4px_14px_rgba(0,0,0,0.12)]"
                  : "text-[#525252] hover:bg-[var(--gamibar-page)] hover:text-[#111111]",
              )}
            >
              <Icon className="size-[18px] shrink-0" strokeWidth={active ? 2.25 : 1.75} />
              {item.label}
            </Link>
          );
        })}
        {onLiveRoom && (
          <div className="flex items-center gap-3 rounded-xl border border-[var(--gamibar-brand)]/25 bg-[var(--gamibar-brand-soft)] px-3 py-2.5 text-sm font-semibold text-[var(--gamibar-brand)]">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--gamibar-brand)] opacity-40" />
              <span className="relative inline-flex size-2 rounded-full bg-[var(--gamibar-brand)]" />
            </span>
            Live control
          </div>
        )}
      </nav>

      <div className="space-y-3 border-t border-[var(--gamibar-border)] p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] px-3 py-3">
          <div className="grid size-10 place-items-center rounded-full bg-white text-sm font-bold text-[var(--gamibar-brand)] shadow-[var(--shadow-soft)]">
            {(user?.name ?? "A").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#111111]">{user?.name ?? "Author"}</p>
            <p className="text-xs text-[#737373]">Session host</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg p-1.5 text-[#737373] transition-colors hover:bg-white hover:text-[#111111]"
            aria-label="Log out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
