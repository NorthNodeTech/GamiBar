import { Check, Copy, Download, FileText, Link2, Loader2, QrCode, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { InlineErrorBanner } from "@/components/ui/async-state";
import { SessionFilesPicker } from "@/components/sharing-files/SessionFilesPicker";
import {
  SESSION_FILE_DEFAULT_RETENTION_DAYS,
  deleteSessionFile,
  fetchTeacherSessionFiles,
  formatExpiryLabel,
  formatSessionFileSize,
  getFileKindLabel,
  getSessionFileShareUrl,
  subscribeResourceDropChanges,
  type SessionFileRetentionDays,
  type SessionFileSummary,
} from "@/lib/sharing-files/session-files";
import { uploadSessionFiles } from "@/lib/sharing-files/session-files";
import { cn } from "@/lib/utils";

type SessionFilesPanelProps = {
  roomId: string;
  authorToken: string;
  className?: string;
};

export function SessionFilesPanel({ roomId, authorToken, className }: SessionFilesPanelProps) {
  const [summary, setSummary] = useState<SessionFileSummary | null>(null);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [retentionDays, setRetentionDays] = useState<SessionFileRetentionDays>(
    SESSION_FILE_DEFAULT_RETENTION_DAYS,
  );

  const shareUrl = useMemo(
    () => (summary?.shareSlug ? getSessionFileShareUrl(summary.shareSlug) : ""),
    [summary?.shareSlug],
  );

  const refresh = async () => {
    setError(null);
    setLoading(true);
    try {
      setSummary(await fetchTeacherSessionFiles(roomId, authorToken));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load shared files.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // room/token changes mean this is a different teacher capability.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, authorToken]);

  useEffect(() => {
    return subscribeResourceDropChanges({ roomId }, () => {
      void refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, authorToken]);

  const upload = async () => {
    if (stagedFiles.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const next = await uploadSessionFiles(roomId, authorToken, stagedFiles, retentionDays);
      setSummary(next);
      setStagedFiles([]);
      toast.success(`Resource Drop is live for ${retentionDays} days.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not upload files.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (fileId: string) => {
    setRemovingId(fileId);
    setError(null);
    try {
      setSummary(await deleteSessionFile(roomId, authorToken, fileId));
      toast.success("File removed.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not remove file.";
      setError(message);
      toast.error(message);
    } finally {
      setRemovingId(null);
    }
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      toast.success("File share link copied.");
    } catch {
      toast.message(shareUrl);
    }
  };

  const activeCount = summary?.files.length ?? 0;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] p-5 shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_100%_0%,rgba(16,185,129,0.12),transparent_55%)]"
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--game-connect-dots-soft)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--game-connect-dots-deep)]">
              <QrCode className="size-3" />
              Resource Drop
            </span>
            <h2 className="mt-3 font-display text-lg font-bold text-[var(--foreground)]">
              QR document drop
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Upload once, show the QR, and students download without chasing chat links.
            </p>
          </div>
          {loading ? <Loader2 className="size-5 animate-spin text-[var(--gamibar-brand)]" /> : null}
        </div>

        {error ? (
          <InlineErrorBanner
            className="mt-4"
            message={error}
            onRetry={refresh}
            onDismiss={() => setError(null)}
          />
        ) : null}

        {summary ? (
          <div className="mt-5 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
              <div className="mx-auto rounded-[22px] bg-white p-3 shadow-[var(--shadow-lift)] ring-1 ring-black/5 sm:mx-0">
                <QRCode value={shareUrl} size={132} level="M" bgColor="#ffffff" fgColor="#111111" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--gamibar-text-tertiary)]">
                  File link
                </p>
                <p className="mt-2 break-all rounded-2xl border border-[var(--gamibar-border)] bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--foreground)]">
                  {shareUrl.replace(/^https?:\/\//, "")}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl"
                    onClick={copyLink}
                  >
                    {copied ? (
                      <Check className="size-4 text-emerald-500" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                    {copied ? "Copied" : "Copy link"}
                  </Button>
                  <Button type="button" variant="outline" className="h-10 rounded-xl" asChild>
                    <a href={shareUrl} target="_blank" rel="noreferrer">
                      <Link2 className="size-4" />
                      Open
                    </a>
                  </Button>
                </div>
              </div>
            </div>

            <SessionFilesPicker
              files={stagedFiles}
              onChange={setStagedFiles}
              activeCount={activeCount}
              disabled={busy}
              retentionDays={retentionDays}
              onRetentionDaysChange={setRetentionDays}
              compact
            />
            {stagedFiles.length > 0 ? (
              <Button
                type="button"
                className="h-11 rounded-xl bg-[#111111] text-white hover:bg-black"
                disabled={busy}
                onClick={() => void upload()}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                {busy
                  ? "Uploading..."
                  : `Upload ${stagedFiles.length} file${stagedFiles.length === 1 ? "" : "s"}`}
              </Button>
            ) : null}

            <div className="grid gap-2">
              {summary.files.length > 0 ? (
                summary.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--gamibar-border)] bg-white px-3 py-3"
                  >
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--game-jigsaw-soft)] text-[var(--game-jigsaw)]">
                      <FileText className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                        {file.name}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {getFileKindLabel(file.mimeType)}, {formatSessionFileSize(file.byteSize)},{" "}
                        {formatExpiryLabel(file.expiresAt)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 shrink-0 rounded-xl text-[var(--gamibar-text-tertiary)] hover:text-red-600"
                      disabled={removingId === file.id}
                      onClick={() => void remove(file.id)}
                      aria-label={`Remove ${file.name}`}
                    >
                      {removingId === file.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--gamibar-border)] bg-[var(--gamibar-page)] px-4 py-5 text-center text-sm text-[var(--muted-foreground)]">
                  Add a document and the QR becomes a scan-to-download link.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
