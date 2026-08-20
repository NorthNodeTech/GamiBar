import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";

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
  HOMEPAGE_SEO,
  HOMEPAGE_TESTIMONIALS,
  HOMEPAGE_TESTIMONIALS_SECTION,
} from "@/content/homepage";
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
              "Jigsaw learning missions",
              "Connect-the-dots logic games",
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

      <GameModesSection />

      <JourneyTimeline />


      <LandingSection id="testimonials" width="7xl" className="min-h-screen flex flex-col justify-center !py-16 md:!py-24 bg-[#FAFAFA]">
        <SectionHeading
          title={HOMEPAGE_TESTIMONIALS_SECTION.title}
          description={HOMEPAGE_TESTIMONIALS_SECTION.description}
          className="mb-10 text-center md:mb-14"
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:items-stretch">
          {HOMEPAGE_TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08} className="h-full">
              <Card3DTilt
                variant="light"
                className="flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-[#E7E9ED] bg-white p-0 shadow-[0_1px_3px_rgba(16,24,40,0.04)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_16px_36px_rgba(16,24,40,0.06)]"
              >
                <div className="w-full flex flex-col justify-between h-full">
                  <div>
                    {/* Testimonial Photo */}
                    <div className="relative aspect-video w-full overflow-hidden border-b border-[#EEF0F3]">
                      <img
                        src={t.image}
                        alt={t.imageAlt}
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    </div>
                    {/* Testimonial Content */}
                    <div className="p-5">
                      <p className="text-sm font-medium leading-relaxed text-[#5F6368] italic">
                        "{t.quote}"
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-5 pt-0 mt-4 flex items-center justify-between border-t border-[#EEF0F3] pt-4">
                    <div>
                      <p className="font-display text-base font-bold text-[#111111]">{t.name}</p>
                      <p className="text-xs text-[#5F6368]">{t.role}</p>
                    </div>
                    <CheckCircle2 className="size-4 shrink-0 text-[#FF3B30]" aria-hidden />
                  </div>
                </div>
              </Card3DTilt>
            </Reveal>
          ))}
        </div>
      </LandingSection>

      <LandingSection id="faq" width="5xl" className="min-h-screen flex flex-col justify-center !py-16 md:!py-24 bg-white">
        <SectionHeading
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
      </LandingSection>

      <LandingSection className="min-h-screen flex flex-col justify-center !py-16 md:!py-24 bg-[#FAFAFA]">
        <Reveal className="relative overflow-hidden rounded-3xl border border-[var(--gamibar-border)] bg-[var(--foreground)] p-10 text-center shadow-lg md:p-16 dark:bg-[var(--elevated)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),transparent_70%)]" />

          <FadeUp>
            <h2 className="text-3xl font-extrabold tracking-tight text-[var(--background)] md:text-4xl dark:text-[var(--foreground)]">
              {HOMEPAGE_CTA.title}
            </h2>
          </FadeUp>
          <FadeUp delay={0.08}>
            <p className="mx-auto mt-4 max-w-xl text-base text-[var(--background)]/80 sm:text-lg dark:text-[var(--muted-foreground)]">
              {HOMEPAGE_CTA.description}
            </p>
          </FadeUp>
          <FadeUp delay={0.16} className="mt-8 flex flex-col justify-center items-center gap-3.5 sm:flex-row sm:gap-4">
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
      </LandingSection>
    </div>
  );
}
