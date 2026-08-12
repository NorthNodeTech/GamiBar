import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "@/components/ui/reveal";
import { FadeUp, SectionHeading } from "@/components/ui/text-motion";
import { Hero3D } from "@/components/home/Hero3D";
import { GameModesSection } from "@/components/home/GameModesSection";
import { JourneyTimeline } from "@/components/home/JourneyTimeline";
import { LandingSection } from "@/components/home/ViewportSection";
import { Card3DTilt } from "@/components/home/Card3DTilt";
import { MagneticButton } from "@/components/home/MagneticButton";
import {
  HOMEPAGE_CTA,
  HOMEPAGE_FAQ,
  HOMEPAGE_FAQ_SECTION,
  HOMEPAGE_INFRASTRUCTURE_FEATURES,
  HOMEPAGE_INFRASTRUCTURE_SECTION,
  HOMEPAGE_SEO,
  HOMEPAGE_TESTIMONIALS,
  HOMEPAGE_TESTIMONIALS_SECTION,
} from "@/content/homepage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: HOMEPAGE_SEO.title },
      { name: "description", content: HOMEPAGE_SEO.description },
      { property: "og:title", content: HOMEPAGE_SEO.ogTitle },
      { property: "og:description", content: HOMEPAGE_SEO.ogDescription },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen text-[var(--foreground)]">
      <Hero3D />

      <GameModesSection />

      <JourneyTimeline />

      <LandingSection id="why">
        <SectionHeading
          eyebrow={HOMEPAGE_INFRASTRUCTURE_SECTION.eyebrow}
          title={HOMEPAGE_INFRASTRUCTURE_SECTION.title}
          description={HOMEPAGE_INFRASTRUCTURE_SECTION.description}
          className="mb-10 text-center md:mb-14"
        />

        <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-3 md:items-stretch">
          {HOMEPAGE_INFRASTRUCTURE_FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08} className="h-full">
              <Card3DTilt className="h-full p-6 sm:p-7">
                <div className="grid size-10 place-items-center rounded-xl border border-[var(--gamibar-border)] bg-[var(--surface)] text-[var(--foreground)]">
                  <f.icon className="size-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[var(--foreground)] sm:mt-5">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">{f.copy}</p>
              </Card3DTilt>
            </Reveal>
          ))}
        </div>
      </LandingSection>

      <LandingSection id="testimonials">
        <SectionHeading
          eyebrow={HOMEPAGE_TESTIMONIALS_SECTION.eyebrow}
          title={HOMEPAGE_TESTIMONIALS_SECTION.title}
          description={HOMEPAGE_TESTIMONIALS_SECTION.description}
          className="mb-10 text-center md:mb-14"
        />

        <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-3 md:items-stretch">
          {HOMEPAGE_TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08} className="h-full">
              <Card3DTilt
                variant="dark"
                className="flex h-full min-h-[320px] flex-col justify-between overflow-hidden p-0 sm:min-h-[360px]"
              >
                <div className="relative flex h-full flex-col justify-between p-6 sm:p-7">
                  <img
                    src={t.image}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f]/95 via-[#0a0a0f]/72 to-[#0a0a0f]/45" />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.12),transparent_55%)]" />

                  <p className="relative z-10 text-sm leading-relaxed text-white/90">"{t.quote}"</p>
                  <div className="relative z-10 mt-5 flex items-center justify-between border-t border-white/15 pt-4 sm:mt-6">
                    <div>
                      <p className="text-sm font-bold text-white">{t.name}</p>
                      <p className="text-xs text-white/65">{t.role}</p>
                    </div>
                    <CheckCircle2 className="size-4 shrink-0 text-[var(--success)]" aria-hidden />
                  </div>
                </div>
              </Card3DTilt>
            </Reveal>
          ))}
        </div>
      </LandingSection>

      <section id="faq" className="mx-auto max-w-4xl scroll-mt-20 px-5 py-16 md:py-20">
        <SectionHeading
          eyebrow={HOMEPAGE_FAQ_SECTION.eyebrow}
          title={HOMEPAGE_FAQ_SECTION.title}
          className="mb-10 text-center md:mb-12"
          titleClassName="text-[clamp(1.75rem,4.5vw,2.25rem)]"
        />

        <Reveal className="rounded-2xl border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] p-6 shadow-[var(--shadow-soft)]">
          <Accordion type="single" collapsible className="w-full">
            {HOMEPAGE_FAQ.map((item) => (
              <AccordionItem
                key={item.question}
                value={item.question}
                className="border-b border-[var(--gamibar-border)]"
              >
                <AccordionTrigger className="text-left text-sm font-semibold text-[var(--foreground)] hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </section>

      <section className="mx-auto max-w-5xl px-5 pt-6 pb-24 md:pb-28">
        <Reveal className="relative overflow-hidden rounded-3xl border border-[var(--gamibar-border)] bg-[var(--foreground)] p-10 text-center shadow-lg md:p-16 dark:bg-[var(--elevated)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),transparent_70%)]" />

          <FadeUp>
            <Sparkles className="mx-auto size-8 text-[var(--background)]/70 dark:text-[var(--foreground)]/70" />
          </FadeUp>
          <FadeUp delay={0.08}>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[var(--background)] md:text-4xl dark:text-[var(--foreground)]">
              {HOMEPAGE_CTA.title}
            </h2>
          </FadeUp>
          <FadeUp delay={0.14}>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-[var(--background)]/60 dark:text-[var(--muted-foreground)]">
              {HOMEPAGE_CTA.description}
            </p>
          </FadeUp>

          <FadeUp delay={0.2} className="mt-8 flex flex-wrap justify-center gap-4 md:mt-9">
            <MagneticButton>
              <Button
                asChild
                size="lg"
                className="h-13 rounded-full bg-[var(--background)] px-8 text-base font-semibold text-[var(--foreground)] shadow-md transition-all hover:opacity-90 dark:bg-[var(--gamibar-brand)] dark:text-white dark:hover:bg-[var(--gamibar-brand-hover)]"
              >
                <Link to="/author/create">
                  {HOMEPAGE_CTA.primaryCta} <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </MagneticButton>

            <MagneticButton>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-13 rounded-full border-[var(--background)]/20 bg-[var(--background)]/5 px-8 text-base font-semibold text-[var(--background)] transition-all hover:bg-[var(--background)]/10 dark:border-[var(--gamibar-border)] dark:bg-transparent dark:text-[var(--foreground)] dark:hover:bg-[var(--surface)]"
              >
                <Link to="/join">{HOMEPAGE_CTA.secondaryCta}</Link>
              </Button>
            </MagneticButton>
          </FadeUp>
        </Reveal>
      </section>
    </div>
  );
}
