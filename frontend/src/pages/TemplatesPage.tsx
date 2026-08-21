import { LayoutTemplate } from "lucide-react";

import { AuthorPlaceholder } from "@/components/author/AuthorPlaceholder";

export default function TemplatesPage() {
  return (
    <AuthorPlaceholder
      title="Templates"
      description="Quick Quiz, Revision Battle, Icebreaker and other ready-to-run session templates."
      icon={LayoutTemplate}
    />
  );
}
