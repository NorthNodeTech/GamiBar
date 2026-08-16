import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Gamepad2, Shield, Sparkles, Trophy, Users, Zap } from "lucide-react";
import type { ReactNode } from "react";

import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/utils";

const highlights = [
  { icon: Gamepad2, text: "Quiz, Jigsaw, and Connect Dots in one live session" },
  { icon: Users, text: "Unlimited participants join with a code or QR" },
  { icon: Trophy, text: "Real-time leaderboard and room energy" },
  { icon: Shield, text: "Secure accounts backed by Supabase" },
] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export const authFieldClassName =
  "h-11 rounded-xl border-[var(--gamibar-border)] bg-[var(--gamibar-page)]/80 pl-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[border-color,box-shadow] placeholder:text-[var(--muted-foreground)]/70 focus-visible:border-[var(--gamibar-brand)]/40 focus-visible:ring-2 focus-visible:ring-[var(--gamibar-brand)]/15 dark:bg-[var(--gamibar-surface)]/60";

export const authLabelClassName =
  "text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]";

export const authPrimaryButtonClassName =
  "h-11 w-full rounded-xl bg-[var(--gamibar-brand)] text-sm font-bold text-white shadow-[0_10px_28px_-8px_rgba(239,68,68,0.55)] transition-all hover:bg-[var(--gamibar-brand-hover)] hover:shadow-[0_14px_32px_-8px_rgba(239,68,68,0.6)] disabled:opacity-60";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="auth-shell relative min-h-dvh overflow-x-clip bg-[var(--gamibar-page)] lg:grid lg:grid-cols-2">
      <div className="pointer-events-none absolute inset-0 lg:hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-15%,rgba(239,68,68,0.12),transparent_58%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_100%_0%,rgba(59,130,246,0.06),transparent_50%)]" />
      </div>

      <div className="relative hidden overflow-hidden bg-[#0a0a0a] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-14">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-[18%] size-80 rounded-full bg-[var(--gamibar-brand)]/20 blur-[120px]" />
          <div className="absolute -right-16 bottom-[12%] size-72 rounded-full bg-blue-500/10 blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.55) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <div className="inline-flex items-center gap-3">
            <Logo size={48} tone="on-dark" />
            <span className="font-display text-xl font-bold leading-none text-white">
              Gami<span className="text-[var(--gamibar-brand)]">BAR</span>
            </span>
          </div>
        </motion.div>

        <div className="relative max-w-md">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
            <Sparkles className="size-3.5 text-[var(--gamibar-brand)]" />
            GamiBAR
          </p>
          <h2 className="mt-5 font-display text-3xl font-black leading-[1.08] tracking-tight text-white xl:text-4xl">
            Host rooms your
            <br />
            <span className="bg-gradient-to-r from-white via-white to-white/75 bg-clip-text text-transparent">
              audience will love.
            </span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/55">
            Create a room in minutes, share a 6-digit code, and run synchronized rounds with live
            results.
          </p>
          <ul className="mt-10 space-y-3.5">
            {highlights.map((item, i) => (
              <motion.li
                key={item.text}
                custom={0.12 + i * 0.06}
                variants={fadeUp}
                initial="hidden"
                animate="show"
                className="flex items-start gap-3 text-sm text-white/65"
              >
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] ring-1 ring-white/10">
                  <item.icon className="size-4 text-[var(--gamibar-brand)]" />
                </span>
                {item.text}
              </motion.li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/30">
          (c) {new Date().getFullYear()} GamiBar. All rights reserved.
        </p>
      </div>

      <div className="relative flex min-h-dvh items-center justify-center px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8 lg:min-h-0 lg:px-10 lg:py-16">
        <div className="pointer-events-none absolute inset-0 hidden lg:block">
          <div className="absolute left-1/2 top-0 h-64 w-[min(100%,520px)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.08),transparent_70%)]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-[420px]"
        >
          <Link
            to="/"
            className="mb-5 inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--gamibar-surface)] hover:text-[var(--foreground)] lg:mb-7"
          >
            <ArrowLeft className="size-4" />
            Back to home
          </Link>

          <div className="mb-6 flex flex-col items-center text-center lg:hidden">
            <div className="relative">
              <div className="absolute -inset-3 rounded-full bg-[radial-gradient(circle,rgba(239,68,68,0.18),transparent_70%)]" />
              <Logo size={52} />
            </div>
            <p className="mt-3 font-display text-2xl font-bold tracking-tight text-[var(--foreground)]">
              Gami<span className="text-[var(--gamibar-brand)]">BAR</span>
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              Learning Arena
            </p>
          </div>

          <div
            className={cn(
              "relative overflow-hidden rounded-[1.35rem] border border-[var(--gamibar-border)]",
              "bg-[var(--gamibar-surface)]/95 p-6 shadow-[var(--shadow-lift)] backdrop-blur-xl sm:rounded-[1.5rem] sm:p-8",
              "ring-1 ring-[var(--gamibar-brand)]/10",
            )}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--gamibar-brand)]/50 to-transparent"
            />

            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gamibar-brand)]/20 bg-[var(--gamibar-brand-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--gamibar-brand)]">
              <Zap className="size-3" />
              Host access
            </span>

            <h1 className="mt-4 font-display text-[1.65rem] font-extrabold leading-tight tracking-tight text-[var(--foreground)] sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
              {subtitle}
            </p>

            <div className="mt-7 sm:mt-8">{children}</div>
          </div>

          <p className="mt-6 text-center text-sm leading-relaxed text-[var(--muted-foreground)]">
            {footer}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
