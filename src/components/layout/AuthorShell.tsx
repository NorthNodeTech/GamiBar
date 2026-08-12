import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Radio } from "lucide-react";
import type { ReactNode } from "react";

import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { authorNavItems, authorPageTitle } from "@/lib/author-nav";
import { useAuthSafe } from "@/lib/auth-store";
import { clearAuthorRoom } from "@/lib/game/client-session";
import { cn } from "@/lib/utils";

export function AuthorShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, logout } = useAuthSafe();
  const title = authorPageTitle(pathname);
  const isLive = pathname.startsWith("/author/room/");
  const onLiveRoom = isLive;

  const handleLogout = async () => {
    await logout();
    clearAuthorRoom();
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--gamibar-page)]">
      <header className="sticky top-0 z-30 border-b border-[var(--gamibar-border)] bg-[var(--gamibar-surface)]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 lg:gap-4 lg:px-8">
          <Link to="/author" className="flex shrink-0 items-center gap-2">
            <Logo size={32} />
            <span className="hidden font-display text-sm font-bold text-[#111111] sm:inline">
              Gami<span className="text-[var(--gamibar-brand)]">BAR</span>
            </span>
          </Link>

          <nav
            className="flex min-w-0 flex-1 items-center justify-center gap-0.5 overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-1"
            aria-label="Author navigation"
          >
            {authorNavItems.map((item) => {
              const Icon = item.icon;
              const active =
                item.match(pathname) ||
                (item.to === "/author/create" && onLiveRoom);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm",
                    active
                      ? "bg-[#111111] text-white shadow-[0_4px_14px_rgba(0,0,0,0.12)]"
                      : "text-[#525252] hover:bg-[var(--gamibar-page)] hover:text-[#111111]",
                  )}
                >
                  <Icon className="size-4 shrink-0" strokeWidth={active ? 2.25 : 1.75} />
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.mobileLabel ?? item.label.split(" ")[0]}</span>
                </Link>
              );
            })}
            {onLiveRoom && (
              <span className="ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--gamibar-brand)]/25 bg-[var(--gamibar-brand-soft)] px-2.5 py-2 text-xs font-semibold text-[var(--gamibar-brand)]">
                <Radio className="size-3.5 animate-pulse" />
                <span className="hidden sm:inline">Live</span>
              </span>
            )}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5">
            <ThemeToggle />
            <div className="hidden items-center gap-2 rounded-xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] py-1 pl-1 pr-2 md:flex">
              <div className="grid size-8 place-items-center rounded-lg bg-white text-xs font-bold text-[var(--gamibar-brand)] shadow-[var(--shadow-soft)]">
                {(user?.name ?? "A").slice(0, 1).toUpperCase()}
              </div>
              <span className="max-w-[7rem] truncate text-xs font-semibold text-[#111111]">
                {user?.name ?? "Host"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="grid size-9 place-items-center rounded-xl text-[#737373] transition-colors hover:bg-[#F5F5F5] hover:text-[#111111]"
              aria-label="Log out"
            >
              <LogOut className="size-[18px]" />
            </button>
          </div>
        </div>
        {title && (
          <div className="border-t border-[var(--gamibar-border)]/60 px-4 py-2 lg:px-8">
            <p className="mx-auto max-w-7xl truncate text-xs font-medium text-[#737373]">{title}</p>
          </div>
        )}
      </header>

      <div className="relative flex-1">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(239,68,68,0.06),transparent_55%)]"
          aria-hidden
        />
        <div className="relative px-4 py-3 sm:px-6 sm:py-4 lg:px-8">{children}</div>
      </div>
    </div>
  );
}
