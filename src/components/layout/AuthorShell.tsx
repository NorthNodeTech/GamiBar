import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, LogOut, Plus, Radio } from "lucide-react";
import type { ReactNode } from "react";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useAuthSafe } from "@/lib/auth-store";
import { clearAuthorRoom } from "@/lib/game/client-session";
import { cn } from "@/lib/utils";

const mobileNav = [
  { to: "/author", label: "Home", icon: Home },
  { to: "/author/create", label: "Create", icon: Plus },
] as const;

function pageTitle(pathname: string): string | null {
  if (pathname.startsWith("/author/room/")) return "Live control";
  if (pathname.startsWith("/author/create")) return "Create session";
  if (pathname === "/author" || pathname === "/author/") return "Author portal";
  return null;
}

export function AuthorShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { logout } = useAuthSafe();
  const title = pageTitle(pathname);
  const isLive = pathname.startsWith("/author/room/");

  const handleLogout = async () => {
    await logout();
    clearAuthorRoom();
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-dvh bg-[var(--gamibar-page)]">
      <div className="sticky top-0 hidden h-dvh md:block">
        <AppSidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-[var(--gamibar-border)] bg-[var(--gamibar-surface)]/90 px-4 backdrop-blur-xl md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/author" className="flex shrink-0 items-center gap-2 md:hidden">
              <Logo size={32} />
              <span className="font-display text-sm font-bold text-[#111111]">
                Gami<span className="text-[var(--gamibar-brand)]">BAR</span>
              </span>
            </Link>
            {title && (
              <div className="hidden min-w-0 md:block">
                <p className="truncate text-sm font-semibold text-[#111111]">{title}</p>
                {isLive && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-[var(--gamibar-brand)]">
                    <Radio className="size-3 animate-pulse" />
                    Live room
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="grid size-9 place-items-center rounded-xl text-[#737373] transition-colors hover:bg-[#F5F5F5] hover:text-[#111111] md:hidden"
              aria-label="Log out"
            >
              <LogOut className="size-[18px]" />
            </button>
          </div>
        </header>
        <div className="relative flex-1">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(239,68,68,0.06),transparent_55%)]"
            aria-hidden
          />
          <div className="relative px-4 py-3 sm:px-6 sm:py-4 lg:px-8">{children}</div>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--gamibar-border)] bg-[var(--gamibar-surface)]/95 px-3 py-2 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-sm gap-1">
          {mobileNav.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === "/author"
                ? pathname === "/author" || pathname === "/author/"
                : pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-semibold transition-colors",
                  active
                    ? "bg-[var(--gamibar-brand-soft)] text-[var(--gamibar-brand)]"
                    : "text-[#737373]",
                )}
              >
                <Icon className="size-[18px]" strokeWidth={active ? 2.25 : 1.75} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
