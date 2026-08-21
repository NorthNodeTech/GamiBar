import { useParams } from "@/lib/navigation";

import { SharedFilesDownloadPage } from "@/components/sharing-files/SharedFilesDownloadPage";

export default function ShareRoute() {
  const { shareSlug } = useParams();
  return <SharedFilesDownloadPage shareSlug={shareSlug} />;
}
