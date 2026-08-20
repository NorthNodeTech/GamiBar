import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HOMEPAGE_HERO } from "@/content/homepage";
import homeHeroBg from "@/assets/home-hero-bg.webp";

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
    <section className="relative isolate overflow-hidden min-h-screen flex items-center bg-[#070707] text-white py-16 sm:py-24">
      {/* Background Image (No black shade overlay) */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        <motion.img
          src={homeHeroBg}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full object-cover opacity-100"
          initial={{ scale: 1.06 }}
          animate={{ scale: 1.0 }}
          transition={{ duration: 7, ease: "easeOut" }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-start">
        <div className="max-w-2xl text-left flex flex-col items-start drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)]">
          {/* Badge */}
          <motion.span
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-white/80 shadow-sm backdrop-blur-md"
          >
            {HOMEPAGE_HERO.badge}
          </motion.span>

          {/* Headline */}
          <motion.h1
            custom={0.08}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-6 font-display text-[clamp(2.2rem,5.5vw,4.2rem)] font-black leading-[1.05] tracking-tight text-white"
          >
            {HOMEPAGE_HERO.headlinePrefix}
          </motion.h1>

          {/* Accent */}
          <motion.p
            custom={0.16}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-4 font-display text-[clamp(1.4rem,3.2vw,2.2rem)] font-extrabold leading-tight text-red-500"
          >
            {HOMEPAGE_HERO.headlineAccent}
          </motion.p>

          {/* Description */}
          <motion.p
            custom={0.22}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-6 text-sm leading-relaxed text-zinc-200 sm:text-base max-w-xl"
          >
            {HOMEPAGE_HERO.lede}
          </motion.p>

          {/* CTAs */}
          <motion.div
            custom={0.3}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-8 flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto"
          >
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full bg-[#FF3B30] px-8 text-sm font-bold text-white shadow-[0_12px_34px_rgba(255,59,48,0.34)] transition-all duration-200 hover:bg-[#E6332B] hover:shadow-[0_16px_40px_rgba(255,59,48,0.45)] w-full sm:w-auto"
            >
              <Link to="/author/create">
                {HOMEPAGE_HERO.primaryCta}
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-white/20 bg-white/5 px-8 text-sm font-bold text-white backdrop-blur-md transition-all duration-200 hover:bg-white/10 hover:text-white w-full sm:w-auto"
            >
              <Link to="/join">{HOMEPAGE_HERO.secondaryCta}</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
