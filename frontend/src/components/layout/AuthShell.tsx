import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, QrCode } from "lucide-react";
import { useState, type ReactNode } from "react";

import authHeroArt from "@/assets/home-hero-bg.webp";
import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/utils";

const heroCopy = {
  signin: {
    eyebrow: "Make sessions interactive",
    title: "Make every session interactive.",
    copy: "Bring your classroom, workshop, or presentation to life with games, live activities, polls, and instant audience interaction.",
    formEyebrow: "Host access",
  },
  register: {
    eyebrow: "Start with GamiBAR",
    title: "Make your next session unforgettable.",
    copy: "Create interactive classrooms, workshops, and live sessions with gamified experiences and simple tools your audience can join instantly.",
    formEyebrow: "Get started",
  },
  reset: {
    eyebrow: "Back to your rooms",
    title: "Get back to running better sessions.",
    copy: "Reset your password and return to the rooms, activities, and resources you use to keep audiences participating.",
    formEyebrow: "Account help",
  },
} as const;

export const authFieldClassName =
  "h-12 rounded-xl border-[#DDE1E6] bg-white pl-10 text-[#111111] shadow-none transition-[border-color,box-shadow] placeholder:text-[#8A8F98] focus-visible:border-[#FF3B30] focus-visible:ring-2 focus-visible:ring-[#FF3B30]/15 focus-visible:ring-offset-0";

export const authLabelClassName = "text-xs font-semibold text-[#5F6368]";

export const authPrimaryButtonClassName =
  "h-12 w-full rounded-xl bg-[#FF3B30] text-sm font-bold text-white shadow-[0_8px_20px_rgba(255,59,48,0.16)] transition-all duration-200 hover:bg-[#E6332B] disabled:opacity-60";

type AuthIntent = keyof typeof heroCopy;

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  intent = "signin",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
  intent?: AuthIntent;
}) {
  const reduceMotion = useReducedMotion();
  const copy = heroCopy[intent];
  const panelMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <div className="auth-shell min-h-dvh overflow-x-clip bg-[#FAFAFA] text-[#111111] lg:grid lg:grid-cols-2">
      <AuthStoryPanel copy={copy} reduceMotion={Boolean(reduceMotion)} />

      <main className="relative flex min-h-dvh justify-center px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8 lg:min-h-0 lg:items-center lg:px-10 lg:py-6 xl:py-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_45%_at_50%_0%,rgba(255,59,48,0.06),transparent_70%)]" />

        <motion.div {...panelMotion} className="relative w-full max-w-[460px]">
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-medium text-[#5F6368] transition-colors hover:text-[#111111] lg:mb-4 xl:mb-6"
          >
            <ArrowLeft className="size-4" />
            Back to home
          </Link>

          <MobileStoryHeader copy={copy} />

          <div className="rounded-[1.35rem] border border-[#E7E9ED] bg-white p-6 shadow-[0_14px_36px_rgba(16,24,40,0.08)] sm:rounded-[1.5rem] lg:p-7 xl:p-8">
            <p className="text-[11px] font-bold uppercase text-[#FF3B30]">{copy.formEyebrow}</p>
            <h1 className="mt-3 font-display text-[1.85rem] font-bold leading-tight text-[#111111] sm:text-[2.1rem]">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#5F6368]">{subtitle}</p>

            <div className="mt-6 xl:mt-7">{children}</div>
          </div>

          <p className="mt-5 text-center text-sm leading-relaxed text-[#5F6368]">{footer}</p>
        </motion.div>
      </main>
    </div>
  );
}

function AuthStoryPanel({
  copy,
  reduceMotion,
}: {
  copy: (typeof heroCopy)[AuthIntent];
  reduceMotion: boolean;
}) {
  const panelMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <aside className="relative hidden min-h-dvh overflow-hidden bg-[#0B0B0B] lg:flex">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#090909_0%,#111111_100%)]" />
        <div
          className="absolute inset-0 opacity-100"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="absolute -left-32 top-[10%] size-80 rounded-full bg-[#FF3B30]/12 blur-[110px]" />
        <div className="absolute -right-24 bottom-[4%] size-96 rounded-full bg-[#2563EB]/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex min-h-dvh w-full flex-col justify-between p-5 xl:p-10 2xl:p-12">
        <Link
          to="/"
          className="inline-flex w-fit items-center gap-3 transition-opacity hover:opacity-85"
        >
          <Logo size={40} tone="on-dark" />
          <span className="font-display text-xl font-bold leading-none text-white">
            Gami<span className="text-[#FF3B30]">BAR</span>
          </span>
        </Link>

        <motion.div
          {...panelMotion}
          className="flex min-h-0 flex-1 flex-col justify-center py-4 xl:py-6"
        >
          <div className="max-w-[34rem]">
            <p className="text-[11px] font-bold uppercase text-[#FF3B30]">{copy.eyebrow}</p>
            <h2 className="mt-3 font-display text-[2.1rem] font-bold leading-[1.08] text-white xl:mt-4 xl:text-[3rem]">
              {copy.title}
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-white/70 xl:mt-4 xl:text-[15px] xl:leading-7">
              {copy.copy}
            </p>
          </div>

          <div className="mt-4 max-w-[43rem] xl:mt-7">
            <div className="overflow-hidden rounded-[1.65rem] border border-white/10 bg-white/[0.04] p-2 shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
              <AuthHeroImage
                className="h-[clamp(10.25rem,25dvh,14.5rem)] rounded-[1.25rem] object-cover xl:h-[clamp(14rem,30dvh,20rem)]"
                alt="Teacher leading an interactive session while participants join from their phones"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </aside>
  );
}

function MobileStoryHeader({ copy }: { copy: (typeof heroCopy)[AuthIntent] }) {
  return (
    <div className="mb-5 lg:hidden">
      <div className="flex items-center gap-2.5">
        <Logo size={34} />
        <span className="font-display text-base font-bold text-[#111111]">
          Gami<span className="text-[#FF3B30]">BAR</span>
        </span>
      </div>

      <p className="mt-4 text-[11px] font-bold uppercase text-[#FF3B30]">{copy.eyebrow}</p>
      <h2 className="mt-2 font-display text-[1.9rem] font-bold leading-tight text-[#111111]">
        {copy.title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#5F6368]">{copy.copy}</p>
    </div>
  );
}

function AuthHeroImage({ className, alt }: { className?: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={cn("grid bg-[linear-gradient(135deg,#101010,#181818)] text-white/70", className)}
        role="img"
        aria-label={alt}
      >
        <div className="m-auto grid size-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-[#FF3B30]">
          <QrCode className="size-7" aria-hidden />
        </div>
      </div>
    );
  }

  return (
    <img
      src={authHeroArt}
      alt={alt}
      loading="lazy"
      className={cn("block size-full", className)}
      onError={() => setFailed(true)}
    />
  );
}
