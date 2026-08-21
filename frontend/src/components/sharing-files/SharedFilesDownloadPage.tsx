import { Download, FileClock, FileText, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PageErrorState, PageLoader } from "@/components/ui/async-state";
import {
  createSharedFileDownloadUrl,
  fetchSharedSessionFiles,
  formatExpiryLabel,
  formatSessionFileSize,
  getFileKindLabel,
  subscribeResourceDropChanges,
  type SessionFileSummary,
} from "@/lib/sharing-files/session-files";

type SharedFilesDownloadPageProps = {
  shareSlug: string;
};

export function SharedFilesDownloadPage({ shareSlug }: SharedFilesDownloadPageProps) {
  const [summary, setSummary] = useState<SessionFileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoStarted, setAutoStarted] = useState(false);

  const load = useCallback(
    async (background = false) => {
      if (!background) {
        setLoading(true);
        setError(null);
      }
      try {
        setSummary(await fetchSharedSessionFiles(shareSlug));
        setError(null);
      } catch (err) {
        if (!background) {
          setError(err instanceof Error ? err.message : "This file share link is not active.");
        }
      } finally {
        if (!background) setLoading(false);
      }
    },
    [shareSlug],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!summary?.shareSlug) return undefined;
    return subscribeResourceDropChanges({ shareSlug: summary.shareSlug }, () => load(true));
  }, [load, summary?.shareSlug]);

  const download = useCallback(
    async (fileId: string) => {
      setDownloadingId(fileId);
      try {
        const { url } = await createSharedFileDownloadUrl(shareSlug, fileId);
        window.location.assign(url);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not prepare download.";
        toast.error(message);
        void load();
      } finally {
        setDownloadingId(null);
      }
    },
    [load, shareSlug],
  );

  useEffect(() => {
    if (!summary || autoStarted || summary.files.length !== 1) return;
    setAutoStarted(true);
    void download(summary.files[0]!.id);
  }, [autoStarted, download, summary]);

  if (loading) {
    return (
      <PageLoader message="Loading files..." description="Checking active session documents." />
    );
  }

  if (error || !summary) {
    return (
      <PageErrorState
        title="Files unavailable"
        message={error ?? "This file share link is not active."}
        onRetry={() => void load()}
        retryLabel="Check again"
      />
    );
  }

  return (
    <div className="min-h-dvh-screen bg-[var(--gamibar-page)] px-4 py-6 text-[var(--foreground)] sm:px-6">
      <main className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-lg flex-col">
        <section className="rounded-[28px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gamibar-brand-soft)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--gamibar-brand)]">
                <FileClock className="size-3" />
                Scan-to-download
              </span>
              <h1 className="mt-4 font-display text-2xl font-extrabold text-[var(--foreground)]">
                {summary.room.name}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                {summary.files.length === 1
                  ? "Your download should start automatically. Use the button below if the browser blocks it."
                  : "Choose the document the host shared for this session."}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 shrink-0 rounded-xl"
              onClick={() => void load()}
              aria-label="Refresh files"
            >
              <RefreshCw className="size-4" />
            </Button>
          </div>

          <div className="mt-5 grid gap-2">
            {summary.files.length > 0 ? (
              summary.files.map((file) => (
                <div
                  key={file.id}
                  className="flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--gamibar-border)] bg-white px-3 py-3"
                >
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--game-jigsaw-soft)] text-[var(--game-jigsaw)]">
                    <FileText className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                      {file.name}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {getFileKindLabel(file.mimeType)}, {formatSessionFileSize(file.byteSize)}
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-[var(--game-connect-dots-deep)]">
                      {formatExpiryLabel(file.expiresAt)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    className="size-10 shrink-0 rounded-xl bg-[#111111] text-white hover:bg-black"
                    disabled={downloadingId === file.id}
                    onClick={() => void download(file.id)}
                    aria-label={`Download ${file.name}`}
                  >
                    {downloadingId === file.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Download className="size-4" />
                    )}
                  </Button>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--gamibar-border)] bg-[var(--gamibar-page)] px-4 py-8 text-center">
                <p className="font-display text-lg font-bold text-[var(--foreground)]">
                  No active files
                </p>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  Files may have expired or the host may remove them after sharing.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
