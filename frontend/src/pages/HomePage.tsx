import { Link } from "@/lib/navigation";
import { ArrowRight, CheckCircle2, QrCode, Quote, Sparkles, Users, Zap } from "lucide-react";
import { useLayoutEffect } from "react";

import { GameModesSection } from "@/components/home/GameModesSection";
import { Hero3D } from "@/components/home/Hero3D";
import { JourneyTimeline } from "@/components/home/JourneyTimeline";
import { LandingSection } from "@/components/home/ViewportSection";
import { Logo } from "@/components/layout/Logo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { FadeUp, SectionHeading } from "@/components/ui/text-motion";
import { MagneticButton } from "@/components/home/MagneticButton";
import { MobileCarousel } from "@/components/ui/MobileCarousel";
import {
  HOMEPAGE_AUDIENCES,
  HOMEPAGE_AUDIENCE_SECTION,
  HOMEPAGE_CTA,
  HOMEPAGE_FAQ,
  HOMEPAGE_FAQ_SECTION,
  HOMEPAGE_HERO,
  HOMEPAGE_PROBLEM_POINTS,
  HOMEPAGE_PROBLEM_SECTION,
  HOMEPAGE_SEO,
  HOMEPAGE_TESTIMONIALS,
  HOMEPAGE_TESTIMONIALS_SECTION,
} from "@/content/homepage";
import { cn } from "@/lib/utils";
import { createSeoHead, DEFAULT_SOCIAL_IMAGE, SITE_URL } from "@/lib/seo";

export default function Landing() {
  useLayoutEffect(() => {
    if (!window.location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, []);

  return (
    <div className="relative min-h-screen text-[var(--foreground)]">
      <Hero3D />
      <ProblemScene />
      <JourneyTimeline />
      <GameModesSection />
      <AudienceScene />
      <TestimonialsScene />
      <FaqScene />
      <CtaScene />
    </div>
  );
}

function ProblemScene() {
  return (
    <LandingSection
      id="problem"
      width="7xl"
      className="flex min-h-[100svh] flex-col justify-center bg-white !py-10 md:!py-18"
    >
      <div className="grid items-center gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:gap-14">
        <div>
          <SectionHeading
            eyebrow={HOMEPAGE_PROBLEM_SECTION.eyebrow}
            title={HOMEPAGE_PROBLEM_SECTION.title}
            description={HOMEPAGE_PROBLEM_SECTION.description}
            align="left"
            titleClassName="text-[clamp(1.5rem,3.4vw,2.4rem)] leading-[1.12]"
            className="max-w-2xl"
          />

          <div className="mt-6 grid gap-3">
            {HOMEPAGE_PROBLEM_POINTS.map((point, index) => {
              const Icon = point.icon;
              return (
                <Reveal key={point.title} delay={index * 0.08}>
                  <div className="grid grid-cols-[38px_1fr] gap-3.5 rounded-[18px] border border-[#CBD5E1] bg-[#FAFAFA] p-3.5 shadow-sm transition-all hover:border-[#94A3B8]">
                    <div className="grid size-9 place-items-center rounded-xl border border-[#CBD5E1] bg-white text-[#FF3B30] shadow-sm">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-bold text-[#111111]">
                        {point.title}
                      </h3>
                      <p className="mt-0.5 text-xs sm:text-[13px] leading-relaxed text-[#5F6368]">
                        {point.description}
                      </p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>

        <Reveal className="relative">
          <div className="relative overflow-hidden rounded-[28px] border border-[#CBD5E1] bg-[#111111] p-2.5 shadow-[0_24px_60px_rgba(16,24,40,0.12)]">
            <img
              src={HOMEPAGE_HERO.image}
              alt={HOMEPAGE_HERO.imageAlt}
              loading="lazy"
              decoding="async"
              className="aspect-[4/3] w-full rounded-[20px] object-cover"
            />
            <div className="absolute inset-x-2.5 bottom-2.5 rounded-b-[20px] bg-gradient-to-t from-black/80 via-black/45 to-transparent p-4 pt-16">
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-bold text-white sm:text-xs">
                {["Teacher leads", "GamiBar room", "Phones respond"].map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1.5 backdrop-blur-md"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </LandingSection>
  );
}

function AudienceScene() {
  return (
    <LandingSection
      id="audience"
      width="7xl"
      className="flex min-h-[100svh] flex-col justify-center bg-white !py-10 md:!py-18"
    >
      <SectionHeading
        eyebrow={HOMEPAGE_AUDIENCE_SECTION.eyebrow}
        title={HOMEPAGE_AUDIENCE_SECTION.title}
        description={HOMEPAGE_AUDIENCE_SECTION.description}
        className="mb-8 md:mb-12"
      />

      <div className="grid gap-5">
        {HOMEPAGE_AUDIENCES.map((audience, index) => (
          <Reveal key={audience.title} delay={index * 0.08}>
            <article className="grid overflow-hidden rounded-[24px] border border-[#CBD5E1] bg-[#FAFAFA] shadow-[0_2px_6px_rgba(0,0,0,0.05)] transition-all hover:border-[#94A3B8] lg:grid-cols-2">
              <div className={cn("relative min-h-64", index === 1 && "lg:order-last")}>
                <img
                  src={audience.image}
                  alt={audience.imageAlt}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 size-full object-cover"
                />
              </div>
              <div className="flex flex-col justify-center p-5 sm:p-7 lg:p-8">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#FF3B30]">
                  {audience.eyebrow}
                </span>
                <h3 className="mt-2 font-display text-[clamp(1.25rem,2.8vw,1.85rem)] font-bold leading-tight text-[#111111]">
                  {audience.title}
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-[#5F6368]">
                  {audience.description}
                </p>
                <ul className="mt-4 grid gap-2.5">
                  {audience.points.map((point) => (
                    <li
                      key={point}
                      className="flex gap-2.5 text-xs sm:text-[13px] leading-relaxed text-[#3F444A]"
                    >
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-[#FF3B30]" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </LandingSection>
  );
}

function TestimonialsScene() {
  return (
    <LandingSection
      id="testimonials"
      width="7xl"
      className="flex min-h-[100svh] flex-col justify-center bg-[#FAFAFA] !py-10 md:!py-18"
    >
      <SectionHeading
        eyebrow={HOMEPAGE_TESTIMONIALS_SECTION.eyebrow}
        title={HOMEPAGE_TESTIMONIALS_SECTION.title}
        description={HOMEPAGE_TESTIMONIALS_SECTION.description}
        className="mb-6 text-center md:mb-12"
      />

      {/* Mobile Touch Carousel (< md) */}
      <div className="block md:hidden">
        <MobileCarousel autoPlay={true} autoPlayInterval={4500}>
          {HOMEPAGE_TESTIMONIALS.map((testimonial) => (
            <article
              key={testimonial.name}
              className="flex h-full w-full flex-col justify-between rounded-[20px] border border-[#CBD5E1] bg-white p-4 shadow-[0_2px_8px_rgba(16,24,40,0.04)]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <Quote className="size-5 text-[#FF3B30] opacity-90" aria-hidden />
                  <span className="rounded-full border border-[#FFD0CC] bg-[#FFF1F0] px-2 py-0.5 text-[10px] font-bold text-[#FF3B30]">
                    {testimonial.tag}
                  </span>
                </div>
                <p className="mt-3 text-xs font-medium leading-relaxed text-[#2D3139]">
                  "{testimonial.quote}"
                </p>
              </div>

              <div className="mt-4 border-t border-[#E2E8F0] pt-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-[#FF3B30] to-[#FF7B72] font-display text-[11px] font-bold text-white shadow-sm">
                    {testimonial.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-xs font-bold text-[#111111] truncate">
                      {testimonial.name}
                    </p>
                    <p className="text-[10px] font-medium text-[#7A7F87] truncate">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </MobileCarousel>
      </div>

      {/* Desktop 3-column Grid (>= md) */}
      <div className="hidden md:grid md:grid-cols-3 items-stretch gap-5">
        {HOMEPAGE_TESTIMONIALS.map((testimonial, index) => (
          <Reveal key={testimonial.name} delay={index * 0.08} className="h-full">
            <article className="flex h-full flex-col justify-between rounded-[22px] border border-[#CBD5E1] bg-white p-5 sm:p-6 shadow-[0_2px_8px_rgba(16,24,40,0.04)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#94A3B8] hover:shadow-[0_20px_40px_rgba(16,24,40,0.08)]">
              <div>
                <div className="flex items-center justify-between">
                  <Quote className="size-6 text-[#FF3B30] opacity-90" aria-hidden />
                  <span className="rounded-full border border-[#FFD0CC] bg-[#FFF1F0] px-2.5 py-0.5 text-[11px] font-bold text-[#FF3B30]">
                    {testimonial.tag}
                  </span>
                </div>
                <p className="mt-4 text-xs sm:text-sm font-medium leading-relaxed text-[#2D3139]">
                  "{testimonial.quote}"
                </p>
              </div>

              <div className="mt-6 border-t border-[#E2E8F0] pt-4">
                <div className="flex items-center gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-[#FF3B30] to-[#FF7B72] font-display text-xs font-bold text-white shadow-sm">
                    {testimonial.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-sm font-bold text-[#111111] truncate">
                      {testimonial.name}
                    </p>
                    <p className="text-[11px] font-medium text-[#7A7F87] truncate">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </LandingSection>
  );
}

function FaqScene() {
  return (
    <LandingSection
      id="faq"
      width="5xl"
      className="flex min-h-[90svh] flex-col justify-center bg-white !py-10 md:!py-20"
    >
      <SectionHeading
        eyebrow={HOMEPAGE_FAQ_SECTION.eyebrow}
        title={HOMEPAGE_FAQ_SECTION.title}
        description="Everything you need to know about setting up rooms, running games, and engaging participants."
        className="mb-8 text-center md:mb-12"
      />

      <div className="mx-auto w-full max-w-3xl">
        <Reveal delay={0.05} className="w-full">
          <div className="rounded-[24px] border border-[#CBD5E1] bg-[#FAFAFA] p-5 sm:p-7 shadow-[0_4px_16px_rgba(16,24,40,0.04)]">
            <Accordion type="single" collapsible className="w-full space-y-3">
              {HOMEPAGE_FAQ.map((item) => (
                <AccordionItem
                  key={item.question}
                  value={item.question}
                  className="rounded-2xl border border-[#CBD5E1] bg-white px-5 py-1 shadow-sm transition-all hover:border-[#94A3B8] last:border-b"
                >
                  <AccordionTrigger className="text-left text-sm sm:text-base font-bold text-[#111111] hover:no-underline py-4">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-xs sm:text-sm leading-relaxed text-[#5F6368] pt-1 pb-4">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Reveal>
      </div>
    </LandingSection>
  );
}

function CtaScene() {
  return (
    <LandingSection
      className="flex min-h-[90svh] flex-col justify-center bg-[#FAFAFA] !py-12 md:!py-24"
      width="7xl"
    >
      <Reveal className="relative overflow-hidden rounded-[36px] border border-[#111111]/10 bg-[#0A0A0A] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.25)] sm:p-14 lg:p-20 text-white">
        {/* Left Side Ambient Brand Logo Watermark (Reduced Opacity) */}
        <div className="pointer-events-none absolute -left-12 -top-12 sm:-left-8 sm:top-1/2 sm:-translate-y-1/2 opacity-[0.07] sm:opacity-[0.09] select-none transition-opacity">
          <Logo size={420} className="size-[280px] sm:size-[440px]" />
        </div>

        {/* Ambient Radial Gradient Accent */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,59,48,0.12),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,255,255,0.05),transparent_60%)]" />

        <div className="relative z-10 mx-auto max-w-3xl">
          <FadeUp>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md">
              <Sparkles className="size-3.5 text-[#FF3B30]" /> Interactive Classroom & Workshop
              Platform
            </div>
          </FadeUp>

          <FadeUp delay={0.06}>
            <h2 className="mt-6 font-display text-[clamp(2rem,4.2vw,3.4rem)] font-black leading-[1.08] tracking-tight text-white">
              Turn every session into an unforgettable live room.
            </h2>
          </FadeUp>

          <FadeUp delay={0.12}>
            <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-white/80">
              Launch real-time quizzes, opinion polls, interactive image puzzles, diagram labeling,
              and instant QR file sharing in seconds.
            </p>
          </FadeUp>

          {/* Feature Highlights Badges */}
          <FadeUp delay={0.16}>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 text-xs font-semibold text-white/90">
              <span className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/15 backdrop-blur-sm shadow-sm">
                <Zap className="size-3.5 text-[#FF3B30]" /> 6 Interactive Tool Modes
              </span>
              <span className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/15 backdrop-blur-sm shadow-sm">
                <Users className="size-3.5 text-[#FF3B30]" /> No App or Sign-Up for Players
              </span>
              <span className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/15 backdrop-blur-sm shadow-sm">
                <QrCode className="size-3.5 text-[#FF3B30]" /> Instant QR File Sharing
              </span>
            </div>
          </FadeUp>

          {/* Action Buttons */}
          <FadeUp
            delay={0.22}
            className="mt-9 flex flex-col items-center justify-center gap-3.5 sm:flex-row sm:gap-4"
          >
            <MagneticButton>
              <Button
                asChild
                size="lg"
                className="h-13 rounded-full bg-white px-8 text-sm font-bold text-[#111111] shadow-[0_10px_30px_rgba(255,255,255,0.25)] transition-all hover:bg-white/90 hover:scale-105"
              >
                <Link to="/author/create">
                  + Create a room now <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </MagneticButton>

            <MagneticButton>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-13 rounded-full border-white/25 bg-white/10 px-8 text-sm font-bold text-white backdrop-blur-md transition-all hover:bg-white/20 hover:text-white"
              >
                <Link to="/join">Join live room</Link>
              </Button>
            </MagneticButton>
          </FadeUp>

          <FadeUp delay={0.28}>
            <p className="mt-6 text-[11px] font-medium text-white/50">
              Free forever for essential hosting · Set up in under 60 seconds
            </p>
          </FadeUp>
        </div>
      </Reveal>
    </LandingSection>
  );
}
