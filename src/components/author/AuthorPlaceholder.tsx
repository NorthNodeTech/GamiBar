import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

import { AuthorShell } from "@/components/layout/AuthorShell";
import { Button } from "@/components/ui/button";

export function AuthorPlaceholder({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <AuthorShell>
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--gamibar-brand-soft)] text-[var(--gamibar-brand)]">
          <Icon className="size-6" />
        </div>
        <h1 className="mt-6 font-display text-2xl font-bold tracking-tight text-[#111111] md:text-3xl">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#525252]">{description}</p>
        <Button asChild className="mt-8 rounded-xl bg-[#111111] hover:bg-black">
          <Link to="/author">Back to Home</Link>
        </Button>
      </div>
    </AuthorShell>
  );
}
