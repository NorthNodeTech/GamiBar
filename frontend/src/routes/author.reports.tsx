import { createFileRoute } from "@tanstack/react-router";
import { FileStack } from "lucide-react";

import { AuthorPlaceholder } from "@/components/author/AuthorPlaceholder";

export const Route = createFileRoute("/author/reports")({
  head: () => ({ meta: [{ title: "Reports - GamiBAR" }] }),
  component: () => (
    <AuthorPlaceholder
      title="Reports"
      description="Post-session analytics - participation, accuracy, and students needing support - will live here."
      icon={FileStack}
    />
  ),
});
