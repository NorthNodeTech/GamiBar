import { createFileRoute } from "@tanstack/react-router";

import { SharedFilesDownloadPage } from "@/components/sharing-files/SharedFilesDownloadPage";

export const Route = createFileRoute("/share/$shareSlug")({
  head: () => ({
    meta: [{ title: "Resource Drop - GamiBar" }],
  }),
  component: ShareRoute,
});

function ShareRoute() {
  const { shareSlug } = Route.useParams();
  return <SharedFilesDownloadPage shareSlug={shareSlug} />;
}
