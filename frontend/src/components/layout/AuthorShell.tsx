import { Link, useNavigate, useRouterState } from "@/lib/navigation";
import { Home, LogOut, Plus, QrCode, Radio, ScanLine, Wrench } from "lucide-react";
import type { ReactNode } from "react";

import { Logo } from "@/components/layout/Logo";
import logoBlack from "@/assets/GamiBar_Logo_Black.png";
import { UserProfileMenu } from "@/components/layout/UserProfileMenu";
import { authorBottomNavItems, authorNavItems, type AuthorNavItem } from "@/lib/author-nav";
import { useAuthSafe } from "@/lib/auth-store";
import { clearAuthorRoom } from "@/lib/game/client-session";
import { cn } from "@/lib/utils";

function navItemActive(pathname: string, item: AuthorNavItem, onLiveRoom: boolean) {
  return item.match(pathname) || (item.to === "/author/tools" && onLiveRoom);
}

function navLinkClass(active: boolean) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200",
    active
      ? "bg-[#111111] text-white shadow-xs font-bold"
      : "text-[#5F6368] hover:bg-white hover:text-[#111111] hover:shadow-xs",
  );
}

export function AuthorShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, logout } = useAuthSafe();
  const onLiveRoom = pathname.startsWith("/author/room/");
  const qrActive = pathname.startsWith("/qr-file") || pathname.startsWith("/author/qr-file");

  const handleLogout = async () => {
    await logout();
    clearAuthorRoom();
    navigate({ to: "/" });
  };

  const renderNavLink = (item: AuthorNavItem) => {
    const Icon = item.icon;
    const active = navItemActive(pathname, item, onLiveRoom);

    return (
      <Link
        key={`desktop-${item.to}`}
        to={item.to}
        title={item.label}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        className={navLinkClass(active)}
      >
        <Icon className="size-4 shrink-0" strokeWidth={active ? 2.5 : 2} />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="author-shell flex min-h-dvh flex-col overflow-x-clip bg-[#F8F9FB]">
      <header className="sticky top-0 z-30 border-b border-[#E7E9ED]/80 bg-white/85 backdrop-blur-xl transition-all">
        <div className="mx-auto max-w-[80rem] px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4 sm:h-[76px]">
            {/* Brand Logo */}
            <Link
              to="/author"
              className="group flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3 transition-transform active:scale-98"
              aria-label="GamiBar Portal Home"
            >
              <div className="relative grid place-items-center">
                <img
                  src={logoBlack}
                  alt="GamiBar"
                  className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105 sm:h-12"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="truncate font-display text-xl font-extrabold tracking-tight text-[#111111] sm:text-2xl">
                  Gami<span className="font-black text-[#FF3B30]">BAR</span>
                </span>
                <span className="hidden rounded-md border border-[#E5E7EB] bg-[#F8F9FA] px-2 py-0.5 text-xs font-bold text-[#6B7280] lg:inline-flex">
                  Host
                </span>
              </div>
            </Link>

            {/* Floating Nav Segmented Island */}
            <nav
              className="hidden flex-1 items-center justify-center sm:flex"
              aria-label="Main navigation"
            >
              <div className="flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#F1F3F6]/90 p-1.5 shadow-xs backdrop-blur-md">
                {authorNavItems.map((item) => renderNavLink(item))}
                {onLiveRoom && (
                  <span className="ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-bold text-[#FF3B30] animate-pulse">
                    <span className="size-2 rounded-full bg-[#FF3B30]" />
                    Live Session
                  </span>
                )}
              </div>
            </nav>

            {/* Action Buttons & Profile */}
            <div className="flex shrink-0 items-center gap-2.5 sm:gap-3.5">
              {/* Desktop Create Room & Join Room Action Buttons */}
              <div className="hidden items-center gap-2.5 sm:flex">
                <Link
                  to="/join"
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-[#D9DDE3] bg-white px-4.5 text-sm font-bold text-[#374151] shadow-xs transition-all hover:border-[#111111] hover:text-[#111111] hover:shadow-sm active:scale-95"
                >
                  <ScanLine className="size-4 text-[#5F6368]" strokeWidth={2.25} />
                  <span>Join room</span>
                </Link>
                <Link
                  to="/author/create"
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-b from-[#1E293B] to-[#0F172A] px-5 text-sm font-bold text-white shadow-xs transition-all hover:scale-[1.02] hover:shadow-sm active:scale-95 border border-white/10"
                >
                  <Plus className="size-4 stroke-[2.5]" />
                  <span>Create room</span>
                </Link>
              </div>

              {onLiveRoom && (
                <span className="inline-flex items-center gap-1 rounded-xl border border-[#FF3B30]/20 bg-[#FFF1F0] px-2 py-1 text-[10px] font-semibold text-[#FF3B30] sm:hidden">
                  <Radio className="size-3" />
                  Live
                </span>
              )}

              {/* Mobile QRFile Button beside user profile/logout */}
              <Link
                to="/qr-file"
                title="QRFile"
                aria-label="QRFile Instant Sharing"
                aria-current={qrActive ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all sm:hidden",
                  qrActive
                    ? "bg-[#111111] text-white shadow-sm"
                    : "border border-[#E7E9ED] bg-[#F8F9FB] text-[#111111] hover:bg-[#EEF0F4]",
                )}
              >
                <QrCode className="size-3.5 shrink-0" strokeWidth={qrActive ? 2.5 : 2} />
                <span>QRFile</span>
              </Link>

              {/* User Profile Popover (ChatGPT-style) */}
              <UserProfileMenu />
            </div>
          </div>
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
        <main className="relative px-4 py-4 pb-[max(4.25rem,calc(3.75rem+env(safe-area-inset-bottom)))] sm:px-6 sm:py-6 sm:pb-6 lg:px-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Dock Navigation with Text Labels */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E7E9ED]/90 bg-white/90 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.06)] sm:hidden"
        aria-label="Mobile navigation"
      >
        <div className="mx-auto flex h-14 max-w-sm items-center justify-around px-4 pb-[env(safe-area-inset-bottom)]">
          {/* Home */}
          <Link
            to="/author"
            title="Home"
            aria-label="Home"
            aria-current={pathname === "/author" || pathname === "/author/" ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center py-1 transition-all active:scale-95",
              pathname === "/author" || pathname === "/author/"
                ? "text-[#111111]"
                : "text-[#8A8F98] hover:text-[#111111]",
            )}
          >
            <Home
              className="size-5 shrink-0"
              strokeWidth={pathname === "/author" || pathname === "/author/" ? 2.5 : 2}
            />
            <span
              className={cn(
                "mt-0.5 text-[10px] tracking-tight",
                pathname === "/author" || pathname === "/author/"
                  ? "font-extrabold text-[#111111]"
                  : "font-medium text-[#717680]",
              )}
            >
              Home
            </span>
          </Link>

          {/* Create FAB */}
          <Link
            to="/author/create"
            title="Create room"
            aria-label="Create room"
            aria-current={pathname.startsWith("/author/create") ? "page" : undefined}
            className="group relative -top-3 flex flex-1 flex-col items-center justify-center tap-target"
          >
            <div
              className={cn(
                "grid size-11 place-items-center rounded-full text-white shadow-[0_6px_16px_rgba(15,23,42,0.3)] ring-[3px] ring-white transition-all duration-150 active:scale-90 group-hover:scale-105",
                pathname.startsWith("/author/create")
                  ? "bg-[#FF3B30] shadow-[0_6px_18px_rgba(255,59,48,0.4)]"
                  : "bg-gradient-to-b from-[#1E293B] via-[#111827] to-[#0A0E1A]",
              )}
            >
              <Plus className="size-5 text-white stroke-[2.5]" />
            </div>
            <span
              className={cn(
                "mt-0.5 whitespace-nowrap text-[10px] tracking-tight",
                pathname.startsWith("/author/create")
                  ? "font-extrabold text-[#FF3B30]"
                  : "font-extrabold text-[#111111]",
              )}
            >
              Create
            </span>
          </Link>

          {/* Join FAB */}
          <Link
            to="/join"
            title="Join room"
            aria-label="Join room"
            aria-current={pathname.startsWith("/join") ? "page" : undefined}
            className="group relative -top-3 flex flex-1 flex-col items-center justify-center tap-target"
          >
            <div
              className={cn(
                "grid size-11 place-items-center rounded-full text-white shadow-[0_6px_16px_rgba(15,23,42,0.3)] ring-[3px] ring-white transition-all duration-150 active:scale-90 group-hover:scale-105",
                pathname.startsWith("/join")
                  ? "bg-[#FF3B30] shadow-[0_6px_18px_rgba(255,59,48,0.4)]"
                  : "bg-gradient-to-b from-[#1E293B] via-[#111827] to-[#0A0E1A]",
              )}
            >
              <ScanLine className="size-5 text-white stroke-[2.25]" />
            </div>
            <span
              className={cn(
                "mt-0.5 whitespace-nowrap text-[10px] tracking-tight",
                pathname.startsWith("/join")
                  ? "font-extrabold text-[#FF3B30]"
                  : "font-extrabold text-[#111111]",
              )}
            >
              Join
            </span>
          </Link>

          {/* Tools */}
          <Link
            to="/author/tools"
            title="Tools"
            aria-label="Tools"
            aria-current={
              pathname.startsWith("/author/tools") && !pathname.startsWith("/author/create")
                ? "page"
                : undefined
            }
            className={cn(
              "flex flex-1 flex-col items-center justify-center py-1 transition-all active:scale-95",
              pathname.startsWith("/author/tools") && !pathname.startsWith("/author/create")
                ? "text-[#111111]"
                : "text-[#8A8F98] hover:text-[#111111]",
            )}
          >
            <Wrench
              className="size-5 shrink-0"
              strokeWidth={
                pathname.startsWith("/author/tools") && !pathname.startsWith("/author/create")
                  ? 2.5
                  : 2
              }
            />
            <span
              className={cn(
                "mt-0.5 text-[10px] tracking-tight",
                pathname.startsWith("/author/tools") && !pathname.startsWith("/author/create")
                  ? "font-extrabold text-[#111111]"
                  : "font-medium text-[#717680]",
              )}
            >
              Tools
            </span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
