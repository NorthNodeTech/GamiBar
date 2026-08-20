import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Quote } from "lucide-react";

import { GameModesSection } from "@/components/home/GameModesSection";
import { Hero3D } from "@/components/home/Hero3D";
import { JourneyTimeline } from "@/components/home/JourneyTimeline";
import { LandingSection } from "@/components/home/ViewportSection";
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

export const Route = createFileRoute("/")({
  head: () =>
    createSeoHead({
      title: HOMEPAGE_SEO.title,
      description: HOMEPAGE_SEO.description,
      path: "/",
      jsonLd: {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": `${SITE_URL}/#organization`,
            name: "GamiBar",
            url: SITE_URL,
            logo: `${SITE_URL}/icon-512.png`,
            image: DEFAULT_SOCIAL_IMAGE,
            description:
              "GamiBar turns classrooms, workshops, and sessions into interactive experiences with live activities, QR resource sharing, and session tools.",
            parentOrganization: {
              "@type": "Organization",
              name: "NorthNode",
              url: "https://northnode.live/",
            },
          },
          {
            "@type": "WebSite",
            "@id": `${SITE_URL}/#website`,
            url: SITE_URL,
            name: "GamiBar",
            description: HOMEPAGE_SEO.description,
            publisher: { "@id": `${SITE_URL}/#organization` },
            inLanguage: "en-US",
          },
          {
            "@type": "WebPage",
            "@id": `${SITE_URL}/#webpage`,
            url: `${SITE_URL}/`,
            name: HOMEPAGE_SEO.title,
            description: HOMEPAGE_SEO.description,
            isPartOf: { "@id": `${SITE_URL}/#website` },
            about: { "@id": `${SITE_URL}/#software` },
            primaryImageOfPage: { "@type": "ImageObject", url: DEFAULT_SOCIAL_IMAGE },
            inLanguage: "en-US",
          },
          {
            "@type": "SoftwareApplication",
            "@id": `${SITE_URL}/#software`,
            name: "GamiBar",
            url: SITE_URL,
            applicationCategory: "EducationalApplication",
            applicationSubCategory: "Audience response and classroom game platform",
            operatingSystem: "Any device with a modern web browser",
            browserRequirements: "Requires JavaScript and a modern web browser",
            description: HOMEPAGE_SEO.description,
            image: DEFAULT_SOCIAL_IMAGE,
            publisher: { "@id": `${SITE_URL}/#organization` },
            featureList: [
              "Live classroom quizzes",
              "Polls and Surveys",
              "Jigsaw learning missions",
              "Connect Dots logic games",
              "Target Hunt image challenges",
              "QR-based Resource Drop document sharing",
              "Host-selected 7, 14, or 28 day document retention",
              "Six-digit room codes and QR joining",
              "Real-time participant rankings",
            ],
          },
          {
            "@type": "Service",
            "@id": `${SITE_URL}/#service`,
            name: "GamiBar live gamified learning sessions",
            serviceType: "Interactive classroom and training session software",
            provider: { "@id": `${SITE_URL}/#organization` },
            audience: [
              { "@type": "EducationalAudience", educationalRole: "instructor" },
              { "@type": "EducationalAudience", educationalRole: "learner" },
              { "@type": "BusinessAudience", audienceType: "training facilitator" },
            ],
            areaServed: "Worldwide",
            availableChannel: {
              "@type": "ServiceChannel",
              serviceUrl: `${SITE_URL}/author/create`,
            },
          },
          {
            "@type": "FAQPage",
            "@id": `${SITE_URL}/#faq`,
            mainEntity: HOMEPAGE_FAQ.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
          },
        ],
      },
    }),
  component: Landing,
});

function Landing() {
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
      className="flex min-h-[100svh] flex-col justify-center bg-white !py-16 md:!py-24"
    >
      <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div>
          <SectionHeading
            eyebrow={HOMEPAGE_PROBLEM_SECTION.eyebrow}
            title={HOMEPAGE_PROBLEM_SECTION.title}
            description={HOMEPAGE_PROBLEM_SECTION.description}
            align="left"
            titleClassName="text-[clamp(2rem,5vw,3.75rem)] leading-[1.02]"
            className="max-w-2xl"
          />

          <div className="mt-8 grid gap-4">
            {HOMEPAGE_PROBLEM_POINTS.map((point, index) => {
              const Icon = point.icon;
              return (
                <Reveal key={point.title} delay={index * 0.08}>
                  <div className="grid grid-cols-[44px_1fr] gap-4 rounded-[20px] border border-[#E7E9ED] bg-[#FAFAFA] p-4">
                    <div className="grid size-11 place-items-center rounded-2xl bg-white text-[#FF3B30] shadow-sm">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-[#111111]">
                        {point.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-[#5F6368]">
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
          <div className="relative overflow-hidden rounded-[32px] border border-[#E7E9ED] bg-[#111111] p-3 shadow-[0_28px_70px_rgba(16,24,40,0.14)]">
            <img
              src={HOMEPAGE_HERO.image}
              alt={HOMEPAGE_HERO.imageAlt}
              loading="lazy"
              decoding="async"
              className="aspect-[4/3] w-full rounded-[24px] object-cover"
            />
            <div className="absolute inset-x-3 bottom-3 rounded-b-[24px] bg-gradient-to-t from-black/80 via-black/45 to-transparent p-5 pt-20">
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold text-white sm:text-sm">
                {["Teacher leads", "GamiBar room", "Phones respond"].map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-md"
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
      className="flex min-h-[100svh] flex-col justify-center bg-white !py-16 md:!py-24"
    >
      <SectionHeading
        eyebrow={HOMEPAGE_AUDIENCE_SECTION.eyebrow}
        title={HOMEPAGE_AUDIENCE_SECTION.title}
        description={HOMEPAGE_AUDIENCE_SECTION.description}
        className="mb-10 md:mb-14"
      />

      <div className="grid gap-6">
        {HOMEPAGE_AUDIENCES.map((audience, index) => (
          <Reveal key={audience.title} delay={index * 0.08}>
            <article className="grid overflow-hidden rounded-[28px] border border-[#E7E9ED] bg-[#FAFAFA] shadow-[0_1px_3px_rgba(16,24,40,0.04)] lg:grid-cols-2">
              <div className={cn("relative min-h-72", index === 1 && "lg:order-last")}>
                <img
                  src={audience.image}
                  alt={audience.imageAlt}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 size-full object-cover"
                />
              </div>
              <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
                <span className="text-xs font-bold uppercase tracking-widest text-[#FF3B30]">
                  {audience.eyebrow}
                </span>
                <h3 className="mt-3 font-display text-[clamp(1.6rem,4vw,2.5rem)] font-black leading-tight text-[#111111]">
                  {audience.title}
                </h3>
                <p className="mt-4 text-base leading-relaxed text-[#5F6368]">
                  {audience.description}
                </p>
                <ul className="mt-6 grid gap-3">
                  {audience.points.map((point) => (
                    <li key={point} className="flex gap-3 text-sm leading-relaxed text-[#3F444A]">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#FF3B30]" />
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
      className="flex min-h-[100svh] flex-col justify-center bg-[#FAFAFA] !py-16 md:!py-24"
    >
      <SectionHeading
        eyebrow={HOMEPAGE_TESTIMONIALS_SECTION.eyebrow}
        title={HOMEPAGE_TESTIMONIALS_SECTION.title}
        description={HOMEPAGE_TESTIMONIALS_SECTION.description}
        className="mb-10 text-center md:mb-14"
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:items-stretch">
        {HOMEPAGE_TESTIMONIALS.map((testimonial, index) => (
          <Reveal key={testimonial.name} delay={index * 0.08} className="h-full">
            <article className="flex h-full flex-col justify-between rounded-[24px] border border-[#E7E9ED] bg-white p-7 shadow-[0_2px_8px_rgba(16,24,40,0.04)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#D9DDE3] hover:shadow-[0_20px_40px_rgba(16,24,40,0.08)]">
              <div>
                <div className="flex items-center justify-between">
                  <Quote className="size-8 text-[#FF3B30] opacity-90" aria-hidden />
                  <span className="rounded-full bg-[#FFF1F0] px-3 py-1 text-xs font-bold text-[#FF3B30]">
                    {testimonial.tag}
                  </span>
                </div>
                <p className="mt-5 text-base font-medium leading-relaxed text-[#2D3139]">
                  "{testimonial.quote}"
                </p>
              </div>

              <div className="mt-8 border-t border-[#EEF0F3] pt-5">
                <div className="flex items-center gap-3.5">
                  <div className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-[#FF3B30] to-[#FF7B72] font-display text-sm font-bold text-white shadow-sm">
                    {testimonial.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-base font-bold text-[#111111] truncate">
                      {testimonial.name}
                    </p>
                    <p className="text-xs font-medium text-[#7A7F87] truncate">
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
      className="flex min-h-[100svh] flex-col justify-center bg-white !py-16 md:!py-24"
    >
      <SectionHeading
        eyebrow={HOMEPAGE_FAQ_SECTION.eyebrow}
        title={HOMEPAGE_FAQ_SECTION.title}
        className="mb-10 text-center md:mb-12"
        titleClassName="text-[clamp(1.75rem,4.5vw,2.5rem)]"
      />

      <Reveal className="rounded-[20px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] p-5 shadow-[var(--shadow-soft)] sm:p-6">
        <Accordion type="single" collapsible className="w-full">
          {HOMEPAGE_FAQ.map((item) => (
            <AccordionItem
              key={item.question}
              value={item.question}
              className="border-b border-[var(--gamibar-border)] last:border-b-0"
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
    </LandingSection>
  );
}

function CtaScene() {
  return (
    <LandingSection
      className="flex min-h-[85svh] flex-col justify-center bg-[#FAFAFA] !py-16 md:!py-24"
      width="6xl"
    >
      <Reveal className="relative overflow-hidden rounded-[32px] border border-[var(--gamibar-border)] bg-[var(--foreground)] p-8 text-center shadow-lg sm:p-10 md:p-16 dark:bg-[var(--elevated)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08),transparent_70%)]" />

        <FadeUp>
          <h2 className="mx-auto max-w-3xl font-display text-[clamp(2rem,5vw,3.75rem)] font-black leading-tight text-[var(--background)] dark:text-[var(--foreground)]">
            {HOMEPAGE_CTA.title}
          </h2>
        </FadeUp>
        <FadeUp delay={0.08}>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[var(--background)]/80 sm:text-lg dark:text-[var(--muted-foreground)]">
            {HOMEPAGE_CTA.description}
          </p>
        </FadeUp>
        <FadeUp
          delay={0.16}
          className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row sm:gap-4"
        >
          <MagneticButton>
            <Button
              asChild
              size="lg"
              className="h-12 rounded-xl bg-[var(--background)] px-8 text-base font-semibold text-[var(--foreground)] shadow-md transition-all hover:opacity-90 dark:bg-[var(--gamibar-brand)] dark:text-white dark:hover:bg-[var(--gamibar-brand-hover)]"
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
              className="h-12 rounded-xl border-[var(--background)]/20 bg-[var(--background)]/5 px-8 text-base font-semibold text-[var(--background)] transition-all hover:bg-[var(--background)]/10 dark:border-[var(--gamibar-border)] dark:bg-transparent dark:text-[var(--foreground)] dark:hover:bg-[var(--surface)]"
            >
              <Link to="/join">{HOMEPAGE_CTA.secondaryCta}</Link>
            </Button>
          </MagneticButton>
        </FadeUp>
      </Reveal>
    </LandingSection>
  );
}
