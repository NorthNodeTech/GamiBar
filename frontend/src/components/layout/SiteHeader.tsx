import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const publicNav = [
  { to: "/#games", label: "Games", hash: true },
  { to: "/#journey", label: "How it works", hash: true },
  { to: "/#audience", label: "For hosts", hash: true },
  { to: "/#testimonials", label: "Testimonials", hash: true },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[#F1F2F4] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
          <Link to="/" className="group flex min-w-0 items-center gap-2.5">
            <Logo size={36} />
            <span className="font-display text-base font-bold leading-none tracking-tight text-[#111111] transition-colors group-hover:text-[#30343A] sm:text-lg">
              Gami<span className="font-black text-[#FF3B30]">BAR</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {publicNav.map((item) => {
              const active =
                !item.hash && (pathname === item.to || pathname.startsWith(`${item.to}/`));
              if (item.hash) {
                return (
                  <a
                    key={item.label}
                    href={item.to}
                    className="rounded-xl px-4 py-2 text-base font-medium text-[#111111] transition-colors hover:bg-[#F4F5F7]"
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
                    "rounded-xl px-4 py-2 text-base font-medium text-[#111111] transition-colors hover:bg-[#F4F5F7]",
                    active && "bg-[#F4F5F7]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            <Button
              asChild
              variant="ghost"
              className="h-11 rounded-xl px-4 text-base font-semibold text-[#111111] hover:bg-[#F4F5F7] hover:text-[#111111]"
            >
              <Link to="/author/login">Log In</Link>
            </Button>
            <Button
              asChild
              className="h-12 rounded-xl bg-[#FF3B30] px-8 text-base font-bold text-white shadow-[0_10px_24px_rgba(255,59,48,0.24)] hover:bg-[#E6332B]"
            >
              <Link to="/author/register">Sign Up</Link>
            </Button>
          </div>

          <button
            type="button"
            className="grid size-11 place-items-center rounded-full border border-[#D9DDE3] bg-white text-[#111111] shadow-sm transition-colors hover:bg-[#F4F5F7] md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={open}
            aria-controls="mobile-site-menu"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </header>

      {open && (
        <div
          id="mobile-site-menu"
          className="fixed inset-0 z-[100] overflow-y-auto bg-white text-[#111111] md:hidden"
        >
          <div className="safe-area-x flex min-h-dvh flex-col p-5">
            <div className="flex h-16 items-center justify-between border-b border-[#F1F2F4]">
              <Link
                to="/"
                onClick={() => setOpen(false)}
                className="flex min-w-0 items-center gap-2.5"
              >
                <Logo size={36} />
                <span className="truncate font-display text-base font-bold leading-none text-[#111111]">
                  Gami<span className="font-black text-[#FF3B30]">BAR</span>
                </span>
              </Link>
              <button
                type="button"
                className="grid size-11 place-items-center rounded-full border border-[#D9DDE3] bg-white text-[#111111] shadow-sm hover:bg-[#F4F5F7]"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex flex-1 flex-col py-6">
              <nav className="grid gap-2" aria-label="Mobile primary navigation">
                {publicNav.map((item) =>
                  item.hash ? (
                    <a
                      key={item.label}
                      href={item.to}
                      onClick={() => setOpen(false)}
                      className="flex min-h-12 items-center rounded-xl px-4 text-base font-semibold text-[#111111] transition-colors hover:bg-[#F4F5F7]"
                    >
                      <span className="min-w-0 truncate">{item.label}</span>
                    </a>
                  ) : (
                    <Link
                      key={item.label}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className="flex min-h-12 items-center rounded-xl px-4 text-base font-semibold text-[#111111] transition-colors hover:bg-[#F4F5F7]"
                    >
                      <span className="min-w-0 truncate">{item.label}</span>
                    </Link>
                  ),
                )}
              </nav>

              <div className="mt-8 grid gap-3">
                <Button
                  asChild
                  variant="outline"
                  className="h-12 rounded-xl border-[#D9DDE3] bg-white text-base font-semibold text-[#111111] hover:bg-[#F4F5F7]"
                >
                  <Link to="/author/login" onClick={() => setOpen(false)}>
                    Log In
                  </Link>
                </Button>
                <Button
                  asChild
                  className="h-12 rounded-xl bg-[#FF3B30] text-base font-bold text-white hover:bg-[#E6332B]"
                >
                  <Link to="/author/register" onClick={() => setOpen(false)}>
                    Sign Up
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
