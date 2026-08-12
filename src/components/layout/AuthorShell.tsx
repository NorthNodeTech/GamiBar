import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Radio } from "lucide-react";
import type { ReactNode } from "react";

import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { authorNavItems, type AuthorNavItem } from "@/lib/author-nav";
import { useAuthSafe } from "@/lib/auth-store";
import { clearAuthorRoom } from "@/lib/game/client-session";
import { cn } from "@/lib/utils";

function navItemActive(pathname: string, item: AuthorNavItem, onLiveRoom: boolean) {
  return item.match(pathname) || (item.to === "/author/create" && onLiveRoom);
}

function navLinkClass(active: boolean, layout: "mobile" | "desktop") {
  if (layout === "mobile") {
    return cn(
      "flex flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1 text-center text-[10px] font-semibold leading-tight transition-colors",
      active ? "text-[var(--gamibar-brand)]" : "text-[var(--muted-foreground)]",
    );
  }

  return cn(
    "tap-target inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200",
    active
      ? "bg-[var(--foreground)] text-[var(--background)] shadow-[0_4px_14px_rgba(0,0,0,0.14)]"
      : "text-[var(--muted-foreground)] hover:bg-[var(--gamibar-page)] hover:text-[var(--foreground)]",
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
    <div className="author-shell flex min-h-dvh flex-col overflow-x-clip bg-[var(--gamibar-page)]">
      <header className="sticky top-0 z-30 border-b border-[var(--gamibar-border)] bg-[var(--gamibar-surface)]/90 backdrop-blur-xl supports-[backdrop-filter]:bg-[var(--gamibar-surface)]/80">
        <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
          <div className="flex h-12 items-center justify-between gap-2 sm:h-14">
            <Link to="/author" className="flex min-w-0 shrink-0 items-center gap-2 tap-target">
              <Logo size={28} className="sm:hidden" />
              <Logo size={32} className="hidden sm:block" />
              <span className="truncate font-display text-sm font-bold text-[var(--foreground)]">
                Gami<span className="text-[var(--gamibar-brand)]">BAR</span>
              </span>
            </Link>

            <nav
              className="hidden flex-1 items-center justify-center gap-1 sm:flex"
              aria-label="Main navigation"
            >
              {authorNavItems.map((item) => renderNavLink(item, "desktop"))}
              {onLiveRoom && (
                <span className="ml-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--gamibar-brand)]/30 bg-[var(--gamibar-brand-soft)] px-2.5 py-2 text-xs font-semibold text-[var(--gamibar-brand)]">
                  <Radio className="size-3.5 animate-pulse" />
                  Live
                </span>
              )}
            </nav>

            <div className="flex shrink-0 items-center gap-1">
              {onLiveRoom && (
                <span className="inline-flex items-center gap-1 rounded-xl border border-[var(--gamibar-brand)]/30 bg-[var(--gamibar-brand-soft)] px-2 py-1.5 text-[10px] font-semibold text-[var(--gamibar-brand)] sm:hidden">
                  <Radio className="size-3 animate-pulse" />
                  Live
                </span>
              )}
              <ThemeToggle />
              <div className="hidden items-center gap-2 rounded-xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] py-1 pl-1 pr-2 md:flex">
                <div className="grid size-8 place-items-center rounded-lg bg-[var(--gamibar-surface)] text-xs font-bold text-[var(--gamibar-brand)] shadow-[var(--shadow-soft)]">
                  {(user?.name ?? "A").slice(0, 1).toUpperCase()}
                </div>
                <span className="max-w-[7rem] truncate text-xs font-semibold text-[var(--foreground)]">
                  {user?.name ?? "Host"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="tap-target grid size-10 place-items-center rounded-xl text-[var(--muted-foreground)] transition-colors hover:bg-[var(--gamibar-page)] hover:text-[var(--foreground)] sm:size-9"
                aria-label="Log out"
              >
                <LogOut className="size-[18px]" />
              </button>
            </div>
          </div>

          <nav
            className="grid grid-cols-4 gap-0.5 border-t border-[var(--gamibar-border)] py-1 sm:hidden"
            aria-label="Main navigation"
          >
            {authorNavItems.map((item) => renderNavLink(item, "mobile"))}
          </nav>
        </div>
      </header>

      <div className="relative flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-8%,rgba(239,68,68,0.07),transparent_58%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_20%,rgba(59,130,246,0.05),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_35%_at_0%_80%,rgba(16,185,129,0.04),transparent_50%)]" />
          <div
            className="absolute inset-0 opacity-[0.35] dark:opacity-[0.12]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
        </div>
        <main className="relative px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-5 sm:pb-5 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
