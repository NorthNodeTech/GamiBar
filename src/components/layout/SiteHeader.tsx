import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Menu, Moon, Sun, X } from "lucide-react";
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
    <header className="safe-area-top sticky top-0 z-50 w-full max-w-[100vw] border-b border-[var(--gamibar-border)] bg-[var(--gamibar-surface)]/90 backdrop-blur-xl">
      <div className="safe-area-x mx-auto grid h-14 w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:h-16 md:grid-cols-[auto_1fr_auto] md:gap-4">
        <Link
          to="/"
          className="group col-start-1 row-start-1 flex min-w-0 items-center gap-2 sm:gap-2.5"
        >
          <Logo size={36} />
          <span className="truncate font-display text-base font-bold tracking-tight text-[var(--foreground)] transition-colors group-hover:text-[var(--muted-foreground)] sm:text-lg">
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
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-lg border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)]"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
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
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="safe-area-x border-t border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] py-3 md:hidden">
          <div className="grid gap-1">
            {publicNav.map((item) =>
              item.hash ? (
                <a
                  key={item.label}
                  href={item.to}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                >
                  {item.label}
                </Link>
              ),
            )}
            <Link
              to="/author/create"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface)]"
            >
              Create Session
            </Link>
            <div onClick={() => setOpen(false)}>
              <NavJoinGame className="mt-1 w-full rounded-xl" size="default" />
            </div>
            <Link
              to="/settings"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
            >
              Settings
            </Link>

            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-[var(--gamibar-border)] bg-[var(--surface)] px-3 py-3">
              <div className="flex items-center gap-2.5">
                {isDark ? (
                  <Moon className="size-4 text-[var(--gamibar-brand)]" />
                ) : (
                  <Sun className="size-4 text-amber-500" />
                )}
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">Dark mode</p>
                  <p className="text-[11px] text-[var(--gamibar-text-tertiary)]">
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
      )}
    </header>
  );
}
