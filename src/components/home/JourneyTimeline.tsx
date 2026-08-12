import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

import { LandingSection } from "@/components/home/ViewportSection";
import { Card3DTilt } from "@/components/home/Card3DTilt";
import { MOTION_EASE, SectionHeading } from "@/components/ui/text-motion";
import {
  HOMEPAGE_JOURNEY_MILESTONES,
  HOMEPAGE_JOURNEY_SECTION,
} from "@/content/homepage";

export function JourneyTimeline() {
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 20 });
  const pathLength = useTransform(smoothProgress, [0, 0.9], [0, 1]);

  return (
    <LandingSection id="journey" width="5xl" innerClassName="relative" className="!py-16 md:!py-24">
      <div ref={containerRef}>
        <SectionHeading
          title={HOMEPAGE_JOURNEY_SECTION.title}
          description={HOMEPAGE_JOURNEY_SECTION.description}
          className="mb-10 text-center md:mb-14"
        />

        <div className="relative">
          <div className="pointer-events-none absolute bottom-0 left-6 top-0 w-1 -translate-x-1/2 md:left-1/2">
            <svg className="-ml-1.5 h-full w-4" preserveAspectRatio="none" viewBox="0 0 10 1000">
              <line x1="5" y1="0" x2="5" y2="1000" stroke="var(--gamibar-border)" strokeWidth="2" />
              <motion.line
                x1="5"
                y1="0"
                x2="5"
                y2="1000"
                stroke="var(--foreground)"
                strokeWidth="3"
                style={{ pathLength }}
              />
            </svg>
          </div>

          <div className="space-y-10 md:space-y-14">
            {HOMEPAGE_JOURNEY_MILESTONES.map((m, i) => {
              const isEven = i % 2 === 0;
              const Icon = m.icon;

              return (
                <motion.div
                  key={m.title}
                  initial={reduce ? false : { opacity: 0, y: 24 }}
                  whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-48px" }}
                  transition={{ duration: 0.55, delay: i * 0.04, ease: MOTION_EASE }}
                  className={`relative flex flex-col items-center gap-6 md:flex-row md:gap-8 ${
                    isEven ? "md:flex-row-reverse" : ""
                  }`}
                >
                  <motion.div
                    initial={reduce ? false : { opacity: 0, x: isEven ? 20 : -20 }}
                    whileInView={reduce ? undefined : { opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-48px" }}
                    transition={{ duration: 0.55, delay: 0.06 + i * 0.04, ease: MOTION_EASE }}
                    className="w-full pl-14 md:w-1/2 md:pl-0"
                  >
                    <Card3DTilt className="border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] p-5 sm:p-6 hover:border-[color-mix(in_srgb,var(--foreground)_28%,var(--gamibar-border))]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-[var(--gamibar-text-tertiary)]">
                          STEP 0{i + 1}
                        </span>
                        <span className="rounded-full border border-[var(--gamibar-border)] bg-[var(--surface)] px-2.5 py-0.5 text-xs font-bold text-[var(--muted-foreground)]">
                          {m.badge}
                        </span>
                      </div>
                      <h3 className="mt-3 text-base font-bold text-[var(--foreground)] sm:text-lg">
                        {m.title}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-[var(--muted-foreground)] sm:text-sm">
                        {m.desc}
                      </p>
                    </Card3DTilt>
                  </motion.div>

                  <motion.div
                    initial={reduce ? false : { opacity: 0, scale: 0.65 }}
                    whileInView={reduce ? undefined : { opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-48px" }}
                    transition={{ duration: 0.45, delay: 0.1 + i * 0.04, ease: MOTION_EASE }}
                    className="absolute left-6 z-10 grid size-10 -translate-x-1/2 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)] shadow-md md:left-1/2"
                  >
                    <Icon className="size-4" />
                  </motion.div>

                  <div className="hidden w-1/2 md:block" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </LandingSection>
  );
}
