import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { LandingSection } from "@/components/home/ViewportSection";
import { MOTION_EASE, SectionHeading } from "@/components/ui/text-motion";
import { HOMEPAGE_JOURNEY_MILESTONES, HOMEPAGE_JOURNEY_SECTION } from "@/content/homepage";

export function JourneyTimeline() {
  const reduce = useReducedMotion();

  return (
    <LandingSection
      id="journey"
      width="7xl"
      className="flex min-h-[100svh] flex-col justify-center bg-white !py-16 md:!py-24"
    >
      <SectionHeading
        eyebrow={HOMEPAGE_JOURNEY_SECTION.eyebrow}
        title={HOMEPAGE_JOURNEY_SECTION.title}
        description={HOMEPAGE_JOURNEY_SECTION.description}
        className="mb-10 text-center md:mb-16"
        titleClassName="text-[clamp(2rem,5vw,3.5rem)]"
      />

      {/* Desktop Horizontal Flow (Hidden on Mobile) */}
      <div className="hidden lg:block">
        {/* Horizontal Step Icons & Connector Line */}
        <div className="relative mb-8">
          <div className="absolute left-[10%] right-[10%] top-6 h-0.5 -translate-y-1/2 bg-[#E7E9ED]" />
          <div className="relative z-10 grid grid-cols-5 gap-4">
            {HOMEPAGE_JOURNEY_MILESTONES.map((m, i) => {
              const Icon = m.icon;
              return (
                <div key={m.title} className="flex flex-col items-center">
                  <motion.div
                    initial={reduce ? false : { scale: 0.7, opacity: 0 }}
                    whileInView={reduce ? undefined : { scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08, ease: MOTION_EASE }}
                    className="grid size-12 place-items-center rounded-2xl bg-[#FF3B30] text-white shadow-[0_4px_16px_rgba(255,59,48,0.3)]"
                  >
                    <Icon className="size-5" />
                  </motion.div>
                  <span className="mt-3 font-mono text-xs font-black tracking-widest text-[#9CA3AF]">
                    STEP 0{i + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Horizontal Cards Grid */}
        <div className="grid grid-cols-5 gap-4 items-stretch">
          {HOMEPAGE_JOURNEY_MILESTONES.map((m, i) => (
            <motion.div
              key={m.title}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.1 + i * 0.06, ease: MOTION_EASE }}
              className="flex h-full"
            >
              <article className="flex h-full w-full flex-col justify-between rounded-[22px] border border-[#E7E9ED] bg-[#FAFAFA] p-5 shadow-[0_1px_3px_rgba(16,24,40,0.04)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#D9DDE3] hover:bg-white hover:shadow-[0_16px_36px_rgba(16,24,40,0.08)]">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-[#FFF1F0] px-2.5 py-0.5 text-[11px] font-bold text-[#FF3B30]">
                      {m.badge}
                    </span>
                    {i < HOMEPAGE_JOURNEY_MILESTONES.length - 1 && (
                      <ArrowRight className="size-3.5 text-[#D1D5DB]" />
                    )}
                  </div>
                  <h3 className="mt-3.5 font-display text-base font-bold leading-snug text-[#111111]">
                    {m.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#5F6368]">
                    {m.desc}
                  </p>
                </div>
              </article>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Mobile Vertical Flow (Hidden on Desktop) */}
      <div className="relative lg:hidden">
        <div className="pointer-events-none absolute bottom-0 left-6 top-0 w-0.5 -translate-x-1/2 bg-[#E7E9ED]" />

        <div className="space-y-6">
          {HOMEPAGE_JOURNEY_MILESTONES.map((m, i) => {
            const Icon = m.icon;
            return (
              <motion.div
                key={m.title}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.05, ease: MOTION_EASE }}
                className="relative flex items-start gap-4 pl-14"
              >
                {/* Node icon */}
                <div className="absolute left-6 top-4 grid size-10 -translate-x-1/2 place-items-center rounded-xl bg-[#FF3B30] text-white shadow-[0_4px_12px_rgba(255,59,48,0.25)]">
                  <Icon className="size-4" />
                </div>

                {/* Card */}
                <div className="w-full rounded-[20px] border border-[#E7E9ED] bg-[#FAFAFA] p-5 shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-[#9CA3AF]">
                      STEP 0{i + 1}
                    </span>
                    <span className="rounded-full bg-[#FFF1F0] px-2.5 py-0.5 text-xs font-bold text-[#FF3B30]">
                      {m.badge}
                    </span>
                  </div>
                  <h3 className="mt-2 font-display text-base font-bold text-[#111111]">
                    {m.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#5F6368]">
                    {m.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </LandingSection>
  );
}
