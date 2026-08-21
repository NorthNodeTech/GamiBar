import { Link } from "@/lib/navigation";

import northNodeLogo from "@/assets/northnode-optimized.webp";
import { Logo } from "@/components/layout/Logo";
import type { CoreLiveGameMode } from "@shared/game/session-flow";

type FooterItem = {
  label: string;
  to?: string;
  search?: { mode: CoreLiveGameMode };
};

const productItems: FooterItem[] = [
  { label: "Tools", to: "/games" },
  { label: "Quiz Battle", to: "/games/quiz" },
  { label: "Join with code", to: "/join" },
  { label: "Pricing", to: "/pricing" },
];

const accountItems: FooterItem[] = [
  { label: "Create room", to: "/author/create" },
  { label: "Join room", to: "/join" },
  { label: "Billing", to: "/author/billing" },
];

const legalItems: FooterItem[] = [
  { label: "Terms", to: "/terms" },
  { label: "Privacy", to: "/privacy" },
  { label: "Refunds & cancellation", to: "/refund-policy" },
  { label: "Contact", to: "/contact" },
];

const activityItems: FooterItem[] = [
  { label: "Quiz Challenge", to: "/games/quiz" },
  { label: "Jigsaw Mission", to: "/games/jigsaw" },
  { label: "Connect Dots", to: "/games/connect-dots" },
  { label: "Target Hunt", to: "/author/create", search: { mode: "visual_point" } },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[#E5E7EB] bg-[#111111] text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 md:grid-cols-[1.35fr_1fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <Logo size={52} />
            <span className="font-display text-lg font-bold leading-none text-white">
              Gami<span className="text-red-500">BAR</span>
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#A3A3A3]">
            Where learning becomes a game. Live quizzes, collaborative puzzles, Target Hunt
            challenges and connect-the-dots games for classrooms, workshops and sessions.
          </p>
          <div className="mt-5 flex items-center gap-2.5">
            <span className="text-[11px] text-[#A3A3A3]">by</span>
            <a
              href="https://northnode.live/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              aria-label="Visit NorthNode"
            >
              <img
                src={northNodeLogo}
                alt="NorthNode"
                width={120}
                height={40}
                loading="lazy"
                decoding="async"
                className="h-7 w-auto max-w-[7.5rem] object-contain sm:h-8"
              />
            </a>
          </div>
        </div>

        <FooterCol title="Product" items={productItems} />
        <FooterCol title="Account" items={accountItems} />
        <FooterCol title="Activities" items={activityItems} />
        <FooterCol title="Legal" items={legalItems} />
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p className="text-xs text-[#A3A3A3]">
            (c) {new Date().getFullYear()} GamiBAR. All rights reserved.
          </p>
          <div className="flex flex-col gap-3 sm:items-end">
            <span className="text-xs text-[#A3A3A3]">Built for hosts and participants</span>
            <p className="text-[11px] text-[#A3A3A3]">
              Powered by{" "}
              <a
                href="https://northnode.live/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#A3A3A3] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                NorthNode
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: FooterItem[] }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[#A3A3A3]">{title}</h2>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item.label}>
            {item.to ? (
              <Link
                to={item.to}
                {...(item.search ? { search: item.search } : {})}
                className="text-sm text-[#A3A3A3] transition-colors hover:text-white"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-sm text-[#A3A3A3]">{item.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
