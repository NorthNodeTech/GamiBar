import { createFileRoute } from "@tanstack/react-router";
import { LayoutTemplate } from "lucide-react";

import { AuthorPlaceholder } from "@/components/author/AuthorPlaceholder";

export const Route = createFileRoute("/author/templates")({
  head: () => ({ meta: [{ title: "Templates - GamiBAR" }] }),
  component: () => (
    <AuthorPlaceholder
      title="Templates"
      description="Quick Quiz, Revision Battle, Icebreaker and other ready-to-run session templates."
      icon={LayoutTemplate}
    />
  ),
});
