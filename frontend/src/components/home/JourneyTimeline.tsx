import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { LandingSection } from "@/components/home/ViewportSection";
import { MobileCarousel } from "@/components/ui/MobileCarousel";
import { MOTION_EASE, SectionHeading } from "@/components/ui/text-motion";
import { HOMEPAGE_JOURNEY_MILESTONES, HOMEPAGE_JOURNEY_SECTION } from "@/content/homepage";

export function JourneyTimeline() {
  const reduce = useReducedMotion();

  return (
    <LandingSection
      id="journey"
      width="7xl"
      className="flex min-h-[100svh] flex-col justify-center bg-white !py-10 md:!py-18"
    >
      <SectionHeading
        eyebrow={HOMEPAGE_JOURNEY_SECTION.eyebrow}
        title={HOMEPAGE_JOURNEY_SECTION.title}
        description={HOMEPAGE_JOURNEY_SECTION.description}
        className="mb-6 text-center md:mb-12"
      />

      {/* Desktop Horizontal Flow (>= lg) with Darker Crisp Borders */}
      <div className="hidden lg:block">
        <div className="grid grid-cols-4 gap-5 items-stretch">
          {HOMEPAGE_JOURNEY_MILESTONES.map((m, i) => (
            <motion.div
              key={m.title}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.07, ease: MOTION_EASE }}
              className="flex h-full"
            >
              <article className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[22px] border border-[#CBD5E1] bg-[#FAFAFA] shadow-[0_2px_6px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#94A3B8] hover:bg-white hover:shadow-[0_16px_36px_rgba(16,24,40,0.08)]">
                <div>
                  <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-[#CBD5E1] bg-[#F4F5F7]">
                    <img
                      src={m.image}
                      alt={m.imageAlt}
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute left-3 top-3">
                      <span className="inline-flex rounded-full bg-black/75 px-2.5 py-0.5 font-mono text-[10px] font-bold text-white backdrop-blur-md">
                        STEP 0{i + 1}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="rounded-full border border-[#FFD0CC] bg-[#FFF1F0] px-2 py-0.5 text-[10px] font-bold text-[#FF3B30]">
                        {m.badge}
                      </span>
                      {i < HOMEPAGE_JOURNEY_MILESTONES.length - 1 && (
                        <ArrowRight className="size-3 text-[#94A3B8]" />
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

      {/* Mobile Flow Carousel (< lg) with Autoplay */}
      <div className="block lg:hidden">
        <MobileCarousel autoPlay={true} autoPlayInterval={4000}>
          {HOMEPAGE_JOURNEY_MILESTONES.map((m, i) => (
            <div
              key={m.title}
              className="overflow-hidden rounded-[18px] border border-[#CBD5E1] bg-[#FAFAFA] shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-[#CBD5E1] bg-[#F4F5F7]">
                <img
                  src={m.image}
                  alt={m.imageAlt}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
                <div className="absolute left-3 top-3">
                  <span className="inline-flex rounded-full bg-black/75 px-2 py-0.5 font-mono text-[9px] font-bold text-white backdrop-blur-md">
                    STEP 0{i + 1}
                  </span>
                </div>
              </div>

              <div className="p-3.5">
                <span className="rounded-full border border-[#FFD0CC] bg-[#FFF1F0] px-2 py-0.5 text-[9px] font-bold text-[#FF3B30]">
                  {m.badge}
                </span>
                <h3 className="mt-1.5 font-display text-sm font-bold text-[#111111]">
                  {m.title}
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-[#5F6368]">
                  {m.desc}
                </p>
              </div>
            </div>
          ))}
        </MobileCarousel>
      </div>
    </LandingSection>
  );
}
