import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { HOMEPAGE_HERO, HOMEPAGE_HERO_STATS } from "@/content/homepage";

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
    <section className="relative isolate min-h-[calc(100svh-7rem)] overflow-hidden border-b border-white/10 bg-[#08080a]">
      <img
        src={HOMEPAGE_HERO.image}
        alt={HOMEPAGE_HERO.imageAlt}
        width={1536}
        height={1024}
        decoding="async"
        fetchPriority="high"
        loading="eager"
        className="absolute inset-0 size-full object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,7,0.94)_0%,rgba(5,5,7,0.76)_42%,rgba(5,5,7,0.25)_100%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(0deg,rgba(5,5,7,0.78)_0%,rgba(5,5,7,0.12)_52%,rgba(5,5,7,0.38)_100%)]"
      />

      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-7rem)] max-w-6xl flex-col justify-center px-4 py-12 sm:px-5 sm:py-16 lg:px-8">
        <div className="max-w-2xl text-white">
          <motion.span
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="inline-flex w-fit rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/90 shadow-sm backdrop-blur-md sm:text-xs"
          >
            {HOMEPAGE_HERO.badge}
          </motion.span>

          <motion.h1
            custom={0.08}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-5 font-display text-[clamp(3rem,12vw,6.5rem)] font-black leading-[0.92] tracking-tight text-white"
          >
            {HOMEPAGE_HERO.headlinePrefix}
          </motion.h1>

          <motion.p
            custom={0.16}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-4 max-w-xl font-display text-[clamp(1.375rem,4vw,2.25rem)] font-extrabold leading-tight text-white"
          >
            {HOMEPAGE_HERO.headlineAccent}
          </motion.p>

          <motion.p
            custom={0.22}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-4 max-w-xl text-sm leading-relaxed text-white/76 sm:text-base"
          >
            {HOMEPAGE_HERO.lede}
          </motion.p>

          <motion.div
            custom={0.3}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-6 flex flex-col gap-2.5 min-[420px]:flex-row sm:mt-8 sm:gap-3"
          >
            <Button
              asChild
              size="lg"
              className="h-11 rounded-full bg-[var(--gamibar-brand)] px-6 text-sm font-bold text-white shadow-[0_12px_34px_rgba(239,68,68,0.38)] hover:bg-[var(--gamibar-brand-hover)] sm:h-12 sm:px-7"
            >
              <Link to="/author">
                {HOMEPAGE_HERO.primaryCta}
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-11 rounded-full border-white/25 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur-md hover:bg-white/15 hover:text-white sm:h-12 sm:px-7"
            >
              <Link to="/join">{HOMEPAGE_HERO.secondaryCta}</Link>
            </Button>
          </motion.div>

          <motion.div
            custom={0.38}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-6 grid max-w-xl grid-cols-3 gap-2 sm:mt-8 sm:gap-3"
          >
            {HOMEPAGE_HERO_STATS.map((stat) => (
              <div
                key={stat.label}
                className="min-w-0 rounded-lg border border-white/12 bg-white/[0.09] px-2.5 py-2.5 backdrop-blur-md sm:px-3.5 sm:py-3"
              >
                <stat.icon className="size-4 text-white/85" />
                <p className="mt-2 font-display text-base font-black tabular-nums text-white sm:text-xl">
                  <AnimatedNumber value={stat.value} immediate />
                  {stat.suffix}
                </p>
                <p className="mt-0.5 text-[10px] font-medium leading-tight text-white/62 sm:text-xs">
                  {stat.label}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
