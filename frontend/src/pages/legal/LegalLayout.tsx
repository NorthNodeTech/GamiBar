import { BUSINESS_DETAILS } from "@shared/legal/business";
import type { ReactNode } from "react";

import { Link } from "@/lib/navigation";

export function LegalLayout({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-[#F7F7F8] px-4 py-14 text-[#111111] sm:px-6 sm:py-20">
      <article className="mx-auto max-w-3xl rounded-3xl border border-[#D9DDE3] bg-white p-6 shadow-[0_12px_40px_rgba(16,24,40,0.05)] sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#FF3B30]">
          GamiBAR legal
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">{title}</h1>
        <p className="mt-4 text-base leading-7 text-[#5F6368]">{summary}</p>
        <p className="mt-3 text-xs text-[#737780]">Effective {BUSINESS_DETAILS.effectiveDate}</p>
        <div className="legal-copy mt-9 space-y-8 text-sm leading-7 text-[#374151]">{children}</div>
        <div className="mt-10 flex flex-wrap gap-4 border-t border-[#E7E9ED] pt-6 text-sm font-semibold">
          <Link to="/terms" className="hover:text-[#FF3B30]">
            Terms
          </Link>
          <Link to="/privacy" className="hover:text-[#FF3B30]">
            Privacy
          </Link>
          <Link to="/refund-policy" className="hover:text-[#FF3B30]">
            Refunds
          </Link>
          <Link to="/contact" className="hover:text-[#FF3B30]">
            Contact
          </Link>
        </div>
      </article>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-bold text-[#111111]">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}

export function BusinessIdentity() {
  return (
    <LegalSection title="Business details">
      <p>
        {BUSINESS_DETAILS.legalName}, trading as {BUSINESS_DETAILS.brandName}, is an individual
        business registered in India.
      </p>
      <p>Registered address: {BUSINESS_DETAILS.address}</p>
      <p>
        Email:{" "}
        <a className="font-semibold underline" href={`mailto:${BUSINESS_DETAILS.supportEmail}`}>
          {BUSINESS_DETAILS.supportEmail}
        </a>{" "}
        · Phone:{" "}
        <a className="font-semibold underline" href="tel:+916303392391">
          {BUSINESS_DETAILS.phone}
        </a>
      </p>
    </LegalSection>
  );
}
