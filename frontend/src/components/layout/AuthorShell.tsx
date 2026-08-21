import { Link, useNavigate, useRouterState } from "@/lib/navigation";
import { LogOut, QrCode, Radio } from "lucide-react";
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
        <Icon className="size-4 shrink-0" strokeWidth={active ? 2.25 : 1.75} />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="author-shell flex min-h-dvh flex-col overflow-x-clip bg-[#F8F9FB]">
      <header className="sticky top-0 z-30 border-b border-[#E7E9ED] bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-[80rem] px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-2 sm:h-16">
            <Link
              to="/author"
              className="flex min-w-0 shrink-0 items-center gap-2 tap-target"
              aria-label="GamiBar Portal Home"
            >
              <img
                src={logoBlack}
                alt="GamiBar"
                className="h-7 w-auto object-contain sm:h-8"
              />
              <span className="truncate font-display text-sm font-bold text-[#111111] sm:text-base">
                Gami<span className="font-black text-[#FF3B30]">BAR</span>
              </span>
            </Link>

            <nav
              className="hidden flex-1 items-center justify-center gap-1 sm:flex"
              aria-label="Main navigation"
            >
              {authorNavItems.map((item) => renderNavLink(item))}
              {onLiveRoom && (
                <span className="ml-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#FF3B30]/20 bg-[#FFF1F0] px-2.5 py-2 text-xs font-semibold text-[#FF3B30]">
                  <Radio className="size-3.5" />
                  Live
                </span>
              )}
            </nav>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
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
        <main className="relative px-4 py-5 pb-[max(5.25rem,calc(4.75rem+env(safe-area-inset-bottom)))] sm:px-6 sm:py-6 sm:pb-6 lg:px-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Dock Navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E7E9ED] bg-white/95 backdrop-blur-md pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] sm:hidden"
        aria-label="Mobile navigation"
      >
        <div className="mx-auto grid max-w-md grid-cols-4 items-center px-1">
          {authorBottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = navItemActive(pathname, item, onLiveRoom);
            const label = item.mobileLabel ?? item.label;
            return (
              <Link
                key={`mobile-bottom-${item.to}`}
                to={item.to}
                title={item.label}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-1 text-center transition-all",
                  active ? "text-[#111111]" : "text-[#5F6368] hover:text-[#111111]",
                )}
              >
                <span
                  className={cn(
                    "grid h-7 w-12 place-items-center rounded-full transition-colors",
                    active
                      ? "bg-[#111111] text-white shadow-sm"
                      : "text-[#5F6368] hover:bg-[#F8F9FB]",
                  )}
                >
                  <Icon className="size-[17px] shrink-0" strokeWidth={active ? 2.25 : 1.75} />
                </span>
                <span
                  className={cn(
                    "max-w-full truncate text-[10.5px] font-medium leading-tight",
                    active && "font-bold text-[#111111]",
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
