import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Moon, Plus, Sun, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Logo } from "@/components/layout/Logo";
import { NavJoinGame } from "@/components/layout/NavJoinGame";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useTheme } from "@/lib/theme-store";

const publicNav = [
  { to: "/#games", label: "Game Modes", hash: true },
  { to: "/#journey", label: "How It Works", hash: true },
  { to: "/#why", label: "Features", hash: true },
  { to: "/#faq", label: "FAQ", hash: true },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isDark, setTheme } = useTheme();

  return (
    <>
      <header className="safe-area-top sticky top-0 z-50 w-full max-w-[100vw] border-b border-[var(--gamibar-border)] bg-[var(--gamibar-surface)]/90 backdrop-blur-xl">
        <div className="safe-area-x mx-auto grid h-14 w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:h-16 md:grid-cols-[auto_1fr_auto] md:gap-4">
          <Link
            to="/"
            className="group col-start-1 row-start-1 flex min-w-0 items-center gap-2.5 sm:gap-3"
          >
            <Logo size={36} className="relative top-px" />
            <span className="truncate font-display text-base font-bold leading-none tracking-tight text-[var(--foreground)] transition-colors group-hover:text-[var(--muted-foreground)] sm:text-lg">
              Gami<span className="font-black text-red-500">BAR</span>
            </span>
          </Link>

          <nav className="col-start-2 row-start-1 hidden items-center justify-self-center gap-0.5 md:flex">
            {publicNav.map((item) => {
              const active =
                !item.hash && (pathname === item.to || pathname.startsWith(`${item.to}/`));
              if (item.hash) {
                return (
                  <a
                    key={item.label}
                    href={item.to}
                    className="rounded-lg px-3 py-2 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                  >
                    {item.label}
                  </a>
                );
              }
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className="relative rounded-lg px-3 py-2 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                >
                  {active && (
                    <span className="absolute inset-0 rounded-lg border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)]" />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="col-start-3 row-start-1 hidden items-center gap-2 md:flex">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-xl border-[var(--gamibar-border)] font-semibold text-[var(--foreground)] hover:bg-[var(--surface)]"
            >
              <Link to="/author/create">Create Session</Link>
            </Button>
            <NavJoinGame />
            <ThemeToggle />
          </div>

          <div className="col-start-2 row-start-1 flex shrink-0 justify-self-end md:hidden">
            <button
              type="button"
              className="grid size-11 shrink-0 place-items-center rounded-lg border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] p-2 text-[var(--foreground)] shadow-sm"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle navigation"
              aria-expanded={open}
              aria-controls="mobile-site-menu"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div
          id="mobile-site-menu"
          className="fixed inset-0 z-[100] overflow-y-auto bg-[var(--gamibar-surface)] md:hidden"
        >
          <div className="safe-area-x flex min-h-dvh flex-col">
            <div className="safe-area-top flex h-16 items-center justify-between border-b border-[var(--gamibar-border)]">
              <Link
                to="/"
                onClick={() => setOpen(false)}
                className="flex min-w-0 items-center gap-2.5"
              >
                <Logo size={34} />
                <span className="truncate font-display text-base font-bold leading-none text-[var(--foreground)]">
                  Gami<span className="font-black text-red-500">BAR</span>
                </span>
              </Link>
              <button
                type="button"
                className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] text-[var(--foreground)] shadow-sm transition-colors hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex flex-1 flex-col py-5">
              <nav className="grid gap-2" aria-label="Mobile primary navigation">
                {publicNav.map((item) => {
                  return item.hash ? (
                    <a
                      key={item.label}
                      href={item.to}
                      onClick={() => setOpen(false)}
                      className="flex min-h-11 items-center rounded-xl px-3 text-base font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    >
                      <span className="min-w-0 truncate">{item.label}</span>
                    </a>
                  ) : (
                    <Link
                      key={item.label}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className="flex min-h-11 items-center rounded-xl px-3 text-base font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    >
                      <span className="min-w-0 truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-5 grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
                <Button
                  asChild
                  variant="outline"
                  className="h-11 rounded-xl border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] font-semibold text-[var(--foreground)] shadow-sm hover:bg-[var(--surface)]"
                >
                  <Link to="/author/create" onClick={() => setOpen(false)}>
                    <Plus className="size-4" />
                    Create Session
                  </Link>
                </Button>
                <NavJoinGame
                  className="h-11 w-full rounded-xl shadow-[0_6px_16px_rgba(239,68,68,0.22)]"
                  size="default"
                  onClick={() => setOpen(false)}
                />
              </div>

              <div className="mt-5 grid gap-2 border-t border-[var(--gamibar-border)] pt-5">
                <Link
                  to="/settings"
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center rounded-xl px-3 text-base font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  <span className="min-w-0 truncate">Settings</span>
                </Link>

                <div className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-[var(--gamibar-border)] bg-[var(--surface)] px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--gamibar-surface)]">
                      {isDark ? (
                        <Moon className="size-4 text-[var(--gamibar-brand)]" />
                      ) : (
                        <Sun className="size-4 text-amber-500" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                        Dark mode
                      </p>
                      <p className="text-xs text-[var(--gamibar-text-tertiary)]">
                        {isDark ? "On" : "Off"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isDark}
                    onCheckedChange={(enabled) => setTheme(enabled ? "dark" : "light")}
                    aria-label="Toggle dark mode"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
