import { Award } from "lucide-react";

import { AuthorPlaceholder } from "@/components/author/AuthorPlaceholder";

export default function AchievementsPage() {
  return (
    <AuthorPlaceholder
      title="Achievements"
      description="Longest Streak, Fastest Player, Puzzle MVP and more - badge showcase coming next."
      icon={Award}
    />
  );
}
