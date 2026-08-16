import { createFileRoute } from "@tanstack/react-router";
import { Award } from "lucide-react";

import { AuthorPlaceholder } from "@/components/author/AuthorPlaceholder";

export const Route = createFileRoute("/author/achievements")({
  head: () => ({ meta: [{ title: "Achievements - GamiBAR" }] }),
  component: () => (
    <AuthorPlaceholder
      title="Achievements"
      description="Longest Streak, Fastest Player, Puzzle MVP and more - badge showcase coming next."
      icon={Award}
    />
  ),
});
