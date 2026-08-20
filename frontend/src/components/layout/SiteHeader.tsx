import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Plus, X } from "lucide-react";
import { useState } from "react";

import { Logo } from "@/components/layout/Logo";
import { NavJoinGame } from "@/components/layout/NavJoinGame";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const publicNav = [
  { to: "/#games", label: "Tools", hash: true },
  { to: "/#journey", label: "Flow", hash: true },
  { to: "/#faq", label: "FAQ", hash: true },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <>
      <header className="sticky top-4 z-50 mx-4 md:mx-auto max-w-5xl lg:max-w-6xl rounded-full border border-white/15 bg-black/60 backdrop-blur-xl shadow-[0_16px_50px_rgba(0,0,0,0.5)] px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="group flex items-center gap-2.5">
          <Logo size={32} tone="on-dark" />
          <span className="font-display text-sm font-bold leading-none tracking-tight text-white transition-colors group-hover:text-white/80 sm:text-base">
            Gami<span className="font-black text-[#FF3B30]">BAR</span>
          </span>
        </Link>

        {/* Center Navigation Links */}
        <nav className="hidden items-center gap-1 md:flex">
          {publicNav.map((item) => {
            const active =
              !item.hash && (pathname === item.to || pathname.startsWith(`${item.to}/`));
            if (item.hash) {
              return (
                <a
                  key={item.label}
                  href={item.to}
                  className="rounded-full px-4 py-1.5 text-sm font-medium text-white/75 transition-colors hover:text-white hover:bg-white/10"
                >
                  {item.label}
                </a>
              );
            }
            return (
              <Link
                key={item.label}
                to={item.to}
                className={cn(
                  "relative rounded-full px-4 py-1.5 text-sm font-medium text-white/75 transition-colors hover:text-white hover:bg-white/10",
                  active && "bg-white/15 text-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Buttons */}
        <div className="hidden items-center gap-2.5 md:flex">
          <Button
            asChild
            size="sm"
            className="rounded-full border border-white/20 bg-white/10 px-4 text-xs font-bold text-white shadow-sm backdrop-blur-md transition-all hover:bg-white/20 hover:text-white h-9"
          >
            <Link to="/author/create">Create room</Link>
          </Button>
          <NavJoinGame className="rounded-full bg-[#FF3B30] hover:bg-[#E6332B] h-9 px-4 text-xs font-bold text-white shadow-[0_4px_16px_rgba(255,59,48,0.4)]" />
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex items-center md:hidden">
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={open}
            aria-controls="mobile-site-menu"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {open && (
        <div
          id="mobile-site-menu"
          className="fixed inset-0 z-[100] overflow-y-auto bg-black/95 backdrop-blur-xl text-white md:hidden"
        >
          <div className="safe-area-x flex min-h-dvh flex-col p-6">
            <div className="flex h-16 items-center justify-between border-b border-white/10">
              <Link
                to="/"
                onClick={() => setOpen(false)}
                className="flex min-w-0 items-center gap-2.5"
              >
                <Logo size={34} tone="on-dark" />
                <span className="truncate font-display text-base font-bold leading-none text-white">
                  Gami<span className="font-black text-[#FF3B30]">BAR</span>
                </span>
              </Link>
              <button
                type="button"
                className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex flex-1 flex-col py-6">
              <nav className="grid gap-3" aria-label="Mobile primary navigation">
                {publicNav.map((item) =>
                  item.hash ? (
                    <a
                      key={item.label}
                      href={item.to}
                      onClick={() => setOpen(false)}
                      className="flex min-h-11 items-center rounded-xl px-4 text-base font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <span className="min-w-0 truncate">{item.label}</span>
                    </a>
                  ) : (
                    <Link
                      key={item.label}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className="flex min-h-11 items-center rounded-xl px-4 text-base font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <span className="min-w-0 truncate">{item.label}</span>
                    </Link>
                  ),
                )}
              </nav>

              <div className="mt-8 grid grid-cols-1 gap-4 min-[380px]:grid-cols-2">
                <Button
                  asChild
                  className="h-11 rounded-xl border border-white/20 bg-white/10 font-bold text-white shadow-sm backdrop-blur-md transition-all hover:bg-white/20 hover:text-white"
                >
                  <Link to="/author/create" onClick={() => setOpen(false)}>
                    <Plus className="mr-2 size-4" />
                    Create room
                  </Link>
                </Button>
                <NavJoinGame
                  className="h-11 w-full rounded-xl bg-[#FF3B30] hover:bg-[#E6332B] font-bold text-white shadow-[0_4px_16px_rgba(255,59,48,0.4)]"
                  size="default"
                  onClick={() => setOpen(false)}
                />
              </div>

              <div className="mt-8 grid gap-2 border-t border-white/10 pt-6">
                <Link
                  to="/settings"
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center rounded-xl px-4 text-base font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <span className="min-w-0 truncate">Settings</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
