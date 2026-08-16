import { createFileRoute } from "@tanstack/react-router";

import { SharedFilesDownloadPage } from "@/components/sharing-files/SharedFilesDownloadPage";

export const Route = createFileRoute("/share/$shareSlug")({
  head: () => ({
    meta: [{ title: "Session Files - GamiBAR" }],
  }),
  component: ShareRoute,
});

function ShareRoute() {
  const { shareSlug } = Route.useParams();
  return <SharedFilesDownloadPage shareSlug={shareSlug} />;
}
