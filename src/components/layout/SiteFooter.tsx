import { Link } from "@tanstack/react-router";

import northNodeLogo from "@/assets/northnode.webp";
import { Logo } from "@/components/layout/Logo";

type FooterItem = {
  label: string;
  to?: string;
};

export function SiteFooter() {
  const productItems: FooterItem[] = [
    { label: "Game Modes" },
    { label: "Play Games" },
    { label: "Join with Code" },
    { label: "Leaderboard" },
  ];

  const accountItems: FooterItem[] = [
    { label: "Create Game", to: "/author/create" },
    { label: "Join Game", to: "/join" },
  ];

  const activityItems: FooterItem[] = [
    { label: "Quiz Challenge" },
    { label: "Jigsaw Mission" },
    { label: "Connect Dots" },
  ];

  return (
    <footer className="mt-auto border-t border-[#E5E7EB] bg-[#111111] text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <Logo size={36} tone="on-dark" />
            <span className="font-display text-base font-bold leading-none text-white">
              Gami<span className="text-red-500">BAR</span>
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#A3A3A3]">
            Where learning becomes a game. Live quizzes, collaborative puzzles and connect-the-dots
            challenges for classrooms.
          </p>
          <div className="mt-5 flex items-center gap-2.5">
            <span className="text-[11px] text-[#737373]">by</span>
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
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p className="text-xs text-[#737373]">
            © {new Date().getFullYear()} GamiBAR. All rights reserved.
          </p>
          <div className="flex flex-col gap-3 sm:items-end">
            <span className="text-xs text-[#525252]">Built for teachers and students</span>
            <p className="text-[11px] text-[#737373]">
              Powered by{" "}
              <a
                href="https://northnode.live/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#A3A3A3] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                northnode
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
      <h4 className="text-xs font-semibold uppercase tracking-widest text-[#737373]">{title}</h4>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item.label}>
            {item.to ? (
              <Link
                to={item.to}
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
