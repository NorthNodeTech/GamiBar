import { Link } from "@/lib/navigation";
import type { LucideIcon } from "lucide-react";

import { AuthorPageFrame } from "@/components/author/AuthorPageFrame";
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
      <AuthorPageFrame width="sm" className="flex min-h-[50vh] items-center justify-center">
        <div className="author-card w-full max-w-md px-6 py-10 text-center sm:px-8 sm:py-12">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[var(--gamibar-brand-soft)] text-[var(--gamibar-brand)] ring-1 ring-[var(--gamibar-brand)]/15">
            <Icon className="size-7" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-bold tracking-tight text-[var(--foreground)]">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
            {description}
          </p>
          <Button
            asChild
            className="mt-8 rounded-xl bg-[var(--gamibar-brand)] hover:bg-[var(--gamibar-brand-hover)]"
          >
            <Link to="/author">Back to Home</Link>
          </Button>
        </div>
      </AuthorPageFrame>
    </AuthorShell>
  );
}
