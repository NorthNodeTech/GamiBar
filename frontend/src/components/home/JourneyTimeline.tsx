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
        className="mb-10 text-center md:mb-14"
        titleClassName="text-[clamp(2rem,5vw,3.5rem)]"
      />

      {/* Desktop Horizontal Flow (Hidden on Mobile) */}
      <div className="hidden lg:block">
        <div className="grid grid-cols-5 gap-4 items-stretch">
          {HOMEPAGE_JOURNEY_MILESTONES.map((m, i) => (
            <motion.div
              key={m.title}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.07, ease: MOTION_EASE }}
              className="flex h-full"
            >
              <article className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[22px] border border-[#E7E9ED] bg-[#FAFAFA] shadow-[0_1px_3px_rgba(16,24,40,0.04)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#D9DDE3] hover:bg-white hover:shadow-[0_16px_36px_rgba(16,24,40,0.08)]">
                <div>
                  {/* Image banner */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-[#EEF0F3] bg-[#F4F5F7]">
                    <img
                      src={m.image}
                      alt={m.imageAlt}
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute left-3 top-3">
                      <span className="inline-flex rounded-full bg-black/65 px-2.5 py-0.5 font-mono text-[10px] font-bold text-white backdrop-blur-md">
                        STEP 0{i + 1}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="rounded-full bg-[#FFF1F0] px-2 py-0.5 text-[10px] font-bold text-[#FF3B30]">
                        {m.badge}
                      </span>
                      {i < HOMEPAGE_JOURNEY_MILESTONES.length - 1 && (
                        <ArrowRight className="size-3 text-[#B0B5BD]" />
                      )}
                    </div>
                    <h3 className="mt-2.5 font-display text-sm font-bold leading-snug text-[#111111]">
                      {m.title}
                    </h3>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-[#5F6368]">
                      {m.desc}
                    </p>
                  </div>
                </div>
              </article>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Mobile Vertical Flow (Hidden on Desktop) */}
      <div className="space-y-4 lg:hidden">
        {HOMEPAGE_JOURNEY_MILESTONES.map((m, i) => (
          <motion.div
            key={m.title}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: i * 0.05, ease: MOTION_EASE }}
          >
            <div className="overflow-hidden rounded-[20px] border border-[#E7E9ED] bg-[#FAFAFA] shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
              <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-[#EEF0F3] bg-[#F4F5F7]">
                <img
                  src={m.image}
                  alt={m.imageAlt}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
                <div className="absolute left-3 top-3">
                  <span className="inline-flex rounded-full bg-black/65 px-2.5 py-0.5 font-mono text-[10px] font-bold text-white backdrop-blur-md">
                    STEP 0{i + 1}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-[#FFF1F0] px-2.5 py-0.5 text-xs font-bold text-[#FF3B30]">
                    {m.badge}
                  </span>
                </div>
                <h3 className="mt-2 font-display text-base font-bold text-[#111111]">
                  {m.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#5F6368]">
                  {m.desc}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </LandingSection>
  );
}
