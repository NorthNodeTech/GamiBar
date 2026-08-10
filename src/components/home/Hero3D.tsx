import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

import heroImage from "@/assets/hero.webp";
import heroDarkImage from "@/assets/herodark.webp";
import { Button } from "@/components/ui/button";
import { AnimatedAccent, AnimatedWords, MOTION_EASE } from "@/components/ui/text-motion";
import { AnimatedNumber } from "@/components/ui/animated-number";
import {
  HOMEPAGE_HERO,
  HOMEPAGE_HERO_STATS,
} from "@/content/homepage";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function Hero3D() {
  return (
    <section className="hero-section relative border-b border-[var(--gamibar-border)]/70">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_20%_0%,rgba(239,68,68,0.08),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_90%_20%,rgba(59,130,246,0.05),transparent_50%)]"
      />
      <div
        aria-hidden
        className="hero-section__mobile-glow pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_80%_70%_at_50%_100%,rgba(239,68,68,0.07),transparent_65%)] lg:hidden"
      />

      <div className="hero-section__inner relative z-10 mx-auto max-w-6xl px-4 sm:px-5 lg:px-8">
        <div className="hero-section__grid grid lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)] lg:gap-8 xl:gap-10">
          <div className="hero-section__copy min-w-0 text-left">
            <div className="hero-section__intro">
              <motion.div
                custom={0}
                variants={fadeUp}
                initial="hidden"
                animate="show"
                className="hero-section__badge inline-flex items-center gap-1.5 rounded-full border border-[var(--gamibar-brand)]/15 bg-[var(--gamibar-brand-soft)] px-3 py-1.5 text-[11px] font-semibold text-[var(--gamibar-brand)] shadow-[var(--shadow-soft)] backdrop-blur-md"
              >
                <Sparkles className="size-3.5 shrink-0" />
                {HOMEPAGE_HERO.badge}
              </motion.div>

              <motion.h1
                custom={0.07}
                variants={fadeUp}
                initial="hidden"
                animate="show"
                className="hero-section__headline mt-2.5 font-display text-[clamp(1.875rem,5.5vw,3.25rem)] font-extrabold leading-[1.1] tracking-tight text-[var(--foreground)] sm:mt-5"
              >
                <AnimatedWords text={HOMEPAGE_HERO.headlinePrefix} delay={0.1} />
                <span className="sm:whitespace-nowrap">
                  {" "}
                  <AnimatedAccent
                    delay={0.35}
                    className="bg-gradient-to-r from-[var(--gamibar-brand)] to-[#DC2626] bg-clip-text text-transparent text-gradient-shimmer"
                  >
                    {HOMEPAGE_HERO.headlineAccent}
                  </AnimatedAccent>
                </span>
              </motion.h1>

              <motion.p
                custom={0.14}
                variants={fadeUp}
                initial="hidden"
                animate="show"
                className="hero-section__lede mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted-foreground)] sm:mt-5 sm:text-[15px] lg:max-w-lg"
              >
                {HOMEPAGE_HERO.lede}
              </motion.p>
            </div>

            <div className="hero-section__cta-cluster">
              <motion.div
                custom={0.2}
                variants={fadeUp}
                initial="hidden"
                animate="show"
                className="hero-section__actions mt-3 flex flex-wrap gap-2 sm:mt-6 sm:gap-3"
              >
                <Button
                  asChild
                  size="lg"
                  className="hero-section__primary-btn h-11 rounded-full bg-[var(--gamibar-brand)] px-6 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(239,68,68,0.35)] hover:bg-[var(--gamibar-brand-hover)] sm:h-12 sm:px-7 sm:text-base"
                >
                  <Link to="/author/create">
                    {HOMEPAGE_HERO.primaryCta} <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="hero-section__secondary-btn h-11 rounded-full border-[var(--gamibar-border)] px-6 text-sm font-semibold sm:h-12 sm:px-7 sm:text-base"
                >
                  <Link to="/join">{HOMEPAGE_HERO.secondaryCta}</Link>
                </Button>
              </motion.div>

              <motion.div
                custom={0.28}
                variants={fadeUp}
                initial="hidden"
                animate="show"
                className="hero-section__stats mt-3 sm:mt-6"
              >
                <div className="hero-section__stats-grid grid grid-cols-3 gap-1.5 sm:gap-2">
                  {HOMEPAGE_HERO_STATS.map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.32 + i * 0.08, ease: MOTION_EASE }}
                      className="hero-section__stat min-w-0 rounded-xl border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)]/80 px-1.5 py-2 shadow-[var(--shadow-soft)] backdrop-blur-md sm:rounded-2xl sm:px-3 sm:py-2.5"
                    >
                      <stat.icon className="size-3.5 text-[var(--gamibar-brand)] sm:size-4" />
                      <p className="hero-section__stat-value mt-1.5 font-display text-sm font-bold tabular-nums text-[var(--foreground)] sm:mt-2 sm:text-lg">
                        <AnimatedNumber value={stat.value} immediate />
                        {stat.suffix}
                      </p>
                      <p className="hero-section__stat-label mt-0.5 text-[9px] font-medium leading-tight text-[var(--gamibar-text-tertiary)] sm:text-[10px]">
                        {stat.label}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>

          <div className="hero-illustration-wrap flex justify-center lg:justify-end">
            <HeroIllustration />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroIllustration() {
  return (
    <div className="hero-illustration-shell relative max-w-full select-none">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-2 rounded-[20px] bg-[radial-gradient(circle_at_50%_50%,rgba(239,68,68,0.14),transparent_68%)] sm:-inset-4 sm:rounded-[28px]"
      />

      <div
        className={cn(
          "hero-illustration-frame relative overflow-hidden rounded-[20px] border border-[var(--gamibar-border)]",
          "bg-[var(--gamibar-surface)] shadow-[var(--shadow-lift)] ring-1 ring-[var(--gamibar-brand)]/10 sm:rounded-[24px]",
          "dark:border-[var(--gamibar-border)] dark:bg-[var(--gamibar-surface)] dark:ring-[var(--gamibar-brand)]/20",
        )}
      >
        <img
          src={heroImage}
          alt={HOMEPAGE_HERO.imageAlt}
          width={1536}
          height={1024}
          decoding="async"
          fetchPriority="high"
          loading="eager"
          className="hero-illustration-image block h-auto w-auto max-w-full dark:hidden"
        />
        <img
          src={heroDarkImage}
          alt={HOMEPAGE_HERO.imageAlt}
          width={1536}
          height={1024}
          decoding="async"
          fetchPriority="high"
          loading="eager"
          className="hero-illustration-image hidden h-auto w-auto max-w-full dark:block"
        />
      </div>
    </div>
  );
}
