import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Radio } from "lucide-react";
import type { ReactNode } from "react";

import { Logo } from "@/components/layout/Logo";
import { authorNavItems, type AuthorNavItem } from "@/lib/author-nav";
import { useAuthSafe } from "@/lib/auth-store";
import { clearAuthorRoom } from "@/lib/game/client-session";
import { cn } from "@/lib/utils";

function navItemActive(pathname: string, item: AuthorNavItem, onLiveRoom: boolean) {
  return item.match(pathname) || (item.to === "/author/tools" && onLiveRoom);
}

function navLinkClass(active: boolean, layout: "mobile" | "desktop") {
  if (layout === "mobile") {
    return cn(
      "flex flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1 text-center text-[10px] font-semibold leading-tight transition-colors",
      active ? "text-[#111111]" : "text-[#5F6368]",
    );
  }

  return cn(
    "tap-target inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200",
    active
      ? "bg-[#111111] text-white shadow-[0_4px_14px_rgba(0,0,0,0.12)]"
      : "text-[#5F6368] hover:bg-[#F8F9FB] hover:text-[#111111]",
  );
}

export function AuthorShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, logout } = useAuthSafe();
  const onLiveRoom = pathname.startsWith("/author/room/");

  const handleLogout = async () => {
    await logout();
    clearAuthorRoom();
    navigate({ to: "/" });
  };

  const renderNavLink = (item: AuthorNavItem, layout: "mobile" | "desktop") => {
    const Icon = item.icon;
    const active = navItemActive(pathname, item, onLiveRoom);
    const label = layout === "mobile" ? (item.mobileLabel ?? item.label) : item.label;

    return (
      <Link
        key={`${layout}-${item.to}`}
        to={item.to}
        title={item.label}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        className={navLinkClass(active, layout)}
      >
        {layout === "mobile" ? (
          <span
            className={cn(
              "grid size-8 place-items-center rounded-lg transition-colors",
              active && "bg-[var(--foreground)] text-[var(--background)] shadow-sm",
            )}
          >
            <Icon className="size-[17px] shrink-0" strokeWidth={active ? 2.25 : 1.75} />
          </span>
        ) : (
          <Icon className="size-4 shrink-0" strokeWidth={active ? 2.25 : 1.75} />
        )}
        <span className={cn(layout === "mobile" && "max-w-full truncate")}>{label}</span>
      </Link>
    );
  };

  return (
    <div className="author-shell flex min-h-dvh flex-col overflow-x-clip bg-[#F8F9FB]">
      <header className="sticky top-0 z-30 border-b border-[#E7E9ED] bg-white">
        <div className="mx-auto max-w-[80rem] px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-2 sm:h-16">
            <Link to="/author" className="flex min-w-0 shrink-0 items-center gap-2 tap-target">
              <Logo size={28} className="sm:hidden" />
              <Logo size={34} className="hidden sm:block" />
              <span className="truncate font-display text-sm font-bold text-[#111111]">
                Gami<span className="text-[#FF3B30]">BAR</span>
              </span>
            </Link>

            <nav
              className="hidden flex-1 items-center justify-center gap-1 sm:flex"
              aria-label="Main navigation"
            >
              {authorNavItems.map((item) => renderNavLink(item, "desktop"))}
              {onLiveRoom && (
                <span className="ml-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#FF3B30]/20 bg-[#FFF1F0] px-2.5 py-2 text-xs font-semibold text-[#FF3B30]">
                  <Radio className="size-3.5" />
                  Live
                </span>
              )}
            </nav>

            <div className="flex shrink-0 items-center gap-1">
              {onLiveRoom && (
                <span className="inline-flex items-center gap-1 rounded-xl border border-[#FF3B30]/20 bg-[#FFF1F0] px-2 py-1.5 text-[10px] font-semibold text-[#FF3B30] sm:hidden">
                  <Radio className="size-3" />
                  Live
                </span>
              )}
              <div className="hidden items-center gap-2 rounded-xl border border-[#E7E9ED] bg-[#F8F9FB] py-1 pl-1 pr-2 md:flex">
                <div className="grid size-8 place-items-center rounded-lg bg-white text-xs font-bold text-[#FF3B30] shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
                  {(user?.name ?? "A").slice(0, 1).toUpperCase()}
                </div>
                <span className="max-w-[7rem] truncate text-xs font-semibold text-[#111111]">
                  {user?.name ?? "Host"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="tap-target grid size-10 place-items-center rounded-xl text-[#5F6368] transition-colors hover:bg-[#F8F9FB] hover:text-[#111111] sm:size-9"
                aria-label="Log out"
              >
                <LogOut className="size-[18px]" />
              </button>
            </div>
          </div>

          <nav
            className="grid grid-cols-4 gap-0.5 border-t border-[#E7E9ED] py-1 sm:hidden"
            aria-label="Main navigation"
          >
            {authorNavItems.map((item) => renderNavLink(item, "mobile"))}
          </nav>
        </div>
      </header>

      <div className="relative flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div
            className="absolute inset-0 opacity-[0.45]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(17,17,17,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(17,17,17,0.025) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
        </div>
        <main className="relative px-4 py-5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 sm:pb-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
