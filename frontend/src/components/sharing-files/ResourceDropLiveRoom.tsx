import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { Link } from "@/lib/navigation";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Maximize2,
  Minimize2,
  Plus,
  QrCode,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AuthorShell } from "@/components/layout/AuthorShell";
import { Button } from "@/components/ui/button";
import { InlineErrorBanner, ConnectionBanner } from "@/components/ui/async-state";
import {
  SESSION_FILE_ACCEPT,
  SESSION_FILE_DEFAULT_RETENTION_DAYS,
  SESSION_FILE_MAX_FILES,
  deleteSessionFile,
  fetchTeacherSessionFiles,
  formatSessionFileSize,
  getFileKindLabel,
  getSessionFileShareUrl,
  subscribeResourceDropChanges,
  uploadSessionFiles,
  validateSessionShareFiles,
  type SessionFileSummary,
} from "@/lib/sharing-files/session-files";
import type { Room } from "@shared/game/types";
import { cn } from "@/lib/utils";

type ResourceDropLiveRoomProps = {
  room: Room;
  authorToken: string;
  isReconnecting?: boolean;
  retry?: () => void;
  retrying?: boolean;
};

export function ResourceDropLiveRoom({
  room,
  authorToken,
  isReconnecting,
  retry,
  retrying,
}: ResourceDropLiveRoomProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [summary, setSummary] = useState<SessionFileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [fullscreenQr, setFullscreenQr] = useState(false);

  const shareUrl = useMemo(
    () => (summary?.shareSlug ? getSessionFileShareUrl(summary.shareSlug) : ""),
    [summary?.shareSlug],
  );

  const fallbackJoinUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/join?code=${room.code}`;
  }, [room.code]);

  // Guaranteed QR value - never spins indefinitely
  const qrValue = shareUrl || fallbackJoinUrl;

  const files = summary?.files ?? [];
  const totalDownloads = files.reduce((acc, file) => acc + (file.downloadedCount ?? 0), 0);

  const refreshFiles = useCallback(
    async (background = false) => {
      if (!background) {
        setLoading(true);
      }
      try {
        const data = await fetchTeacherSessionFiles(room.id, authorToken || "");
        setSummary(data);
        setError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not load shared files.";
        if (!authorToken && msg.includes("author token")) {
          // Token is being claimed via Supabase Bearer token in background
          return;
        }
        if (!background) {
          setError(msg);
        }
      } finally {
        if (!background) setLoading(false);
      }
    },
    [authorToken, room.id],
  );

  useEffect(() => {
    void refreshFiles();
  }, [refreshFiles]);

  useEffect(() => {
    return subscribeResourceDropChanges({ roomId: room.id }, () => refreshFiles(true));
  }, [refreshFiles, room.id]);

  const handleDirectUpload = async (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    const nextFiles = Array.from(incoming);
    const result = validateSessionShareFiles(nextFiles, files.length);
    if (!result.ok) {
      setError(result.errors[0] ?? "Cannot upload this file.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const nextSummary = await uploadSessionFiles(
        room.id,
        authorToken,
        nextFiles,
        SESSION_FILE_DEFAULT_RETENTION_DAYS,
      );
      setSummary(nextSummary);
      toast.success(`${nextFiles.length} file(s) uploaded to QR.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    setDeletingId(fileId);
    setError(null);
    try {
      const nextSummary = await deleteSessionFile(room.id, authorToken, fileId);
      setSummary(nextSummary);
      toast.success("File removed.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not delete file.";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyLink = async () => {
    const urlToCopy = shareUrl || fallbackJoinUrl;
    if (!urlToCopy) return;
    try {
      await navigator.clipboard.writeText(urlToCopy);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast.success("Share link copied to clipboard!");
    } catch {
      toast.message(urlToCopy);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      toast.success("Room code copied!");
    } catch {
      toast.message(room.code);
    }
  };

  return (
    <AuthorShell>
      {isReconnecting && retry && <ConnectionBanner onRetry={retry} retrying={Boolean(retrying)} />}

      <div className="mx-auto w-full max-w-5xl space-y-6 pb-12 pt-3 sm:pt-6 text-[#111111] px-4 sm:px-6">
        {error && (
          <InlineErrorBanner className="mb-4" message={error} onDismiss={() => setError(null)} />
        )}

        {/* Minimal Top Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2E8F0] pb-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-xs font-bold text-emerald-700">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Active QR Drop
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FFD0CC] bg-[#FFF1F0] px-2.5 py-0.5 text-xs font-bold text-[#FF3B30]">
                <QrCode className="size-3" />
                QRFile
              </span>
            </div>
            <h1 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold text-[#111111] truncate">
              {room.name}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-xl border-[#CBD5E1] bg-white hover:bg-[#F3F4F6] text-xs font-bold"
            >
              <Link to="/qr-file">
                <Plus className="mr-1.5 size-3.5" />
                New QR Drop
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-xl border-[#CBD5E1] bg-white hover:bg-[#F3F4F6] text-xs font-bold"
            >
              <Link to="/author/tools">
                <ArrowLeft className="mr-1.5 size-3.5" />
                All Tools
              </Link>
            </Button>
          </div>
        </div>

        {/* The 4 Essentials: 1. Files, 2. Scans Count, 3. Join Code, 4. QR Code */}
        <div className="grid gap-6 md:grid-cols-2 items-start">
          {/* Left Card: 1. File Name(s) & 2. Scans Counter */}
          <div className="space-y-4">
            {/* 2. Amount of people who used the QR */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm">
                  <Users className="size-6" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Audience Scans / Downloads
                  </p>
                  <p className="font-display text-2xl sm:text-3xl font-black text-emerald-950 tabular-nums">
                    {totalDownloads} {totalDownloads === 1 ? "person" : "people"} scanned
                  </p>
                </div>
              </div>
            </div>

            {/* 1. File Name(s) Details */}
            <div className="rounded-2xl border border-[#CBD5E1] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-[#111111]" />
                  <h2 className="font-display text-sm font-bold text-[#111111] uppercase tracking-wider">
                    Uploaded File ({files.length})
                  </h2>
                </div>
                {loading && <Loader2 className="size-4 animate-spin text-[#FF3B30]" />}
              </div>

              {files.length > 0 ? (
                <div className="space-y-3">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#CBD5E1] bg-[#FAFAFA] p-3.5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                          <FileText className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <p
                            className="text-sm font-extrabold text-[#111111] truncate"
                            title={file.name}
                          >
                            {file.name}
                          </p>
                          <p className="text-xs text-[#5F6368] mt-0.5">
                            {getFileKindLabel(file.mimeType)} ·{" "}
                            {formatSessionFileSize(file.byteSize)} · {file.downloadedCount ?? 0}{" "}
                            downloads
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteFile(file.id)}
                        disabled={deletingId === file.id}
                        aria-label={`Delete ${file.name}`}
                        className="grid size-8 shrink-0 place-items-center rounded-lg text-[#9CA3AF] hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        {deletingId === file.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8F9FA] p-6 text-center">
                  <FileText className="mx-auto size-7 text-[#9CA3AF]" />
                  <p className="mt-2 text-xs font-semibold text-[#4B5563]">
                    No document attached yet.
                  </p>
                </div>
              )}

              {/* Add file button */}
              {files.length < SESSION_FILE_MAX_FILES && (
                <div className="mt-4 pt-3 border-t border-[#E2E8F0]">
                  <Button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    variant="outline"
                    className="h-9 w-full rounded-xl border-[#CBD5E1] bg-white hover:bg-[#F3F4F6] text-xs font-bold text-[#111111]"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                        Uploading document...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-1.5 size-3.5" />
                        {files.length === 0 ? "Upload Document to QR" : "Add Another Document"}
                      </>
                    )}
                  </Button>
                  <input
                    ref={inputRef}
                    type="file"
                    accept={SESSION_FILE_ACCEPT}
                    multiple
                    className="sr-only"
                    onChange={(e) => handleDirectUpload(e.target.files)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Card: 3. Join Code & 4. QR Code */}
          <div className="space-y-4">
            {/* 3. Join Code Banner */}
            <div className="rounded-2xl border border-[#CBD5E1] bg-white p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#5F6368]">
                  Join Code
                </p>
                <p className="font-mono text-3xl font-black tracking-widest text-[#111111] mt-0.5">
                  {room.code}
                </p>
              </div>

              <Button
                type="button"
                onClick={handleCopyCode}
                size="sm"
                className="h-9 rounded-xl bg-[#111111] hover:bg-[#2A2A2A] text-white text-xs font-bold px-4"
              >
                {copiedCode ? (
                  <>
                    <Check className="mr-1 size-3.5 text-emerald-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 size-3.5" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>

            {/* 4. Audience QR Code */}
            <div className="rounded-2xl border border-[#CBD5E1] bg-white p-6 shadow-sm text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#CBD5E1] bg-[#F8F9FA] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#4B5563]">
                <QrCode className="size-3 text-[#FF3B30]" />
                Audience QR Code
              </span>

              <div className="mt-5 flex flex-col items-center">
                <div className="rounded-2xl border-2 border-[#111111] bg-white p-4 shadow-md">
                  <QRCode
                    value={qrValue}
                    size={200}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#111111"
                  />
                </div>

                <p className="mt-3 text-xs font-bold text-[#111111]">
                  Scan with any phone camera to download
                </p>

                <div className="mt-4 flex w-full flex-col gap-2">
                  <Button
                    type="button"
                    onClick={handleCopyLink}
                    className="h-10 w-full rounded-xl bg-[#111111] hover:bg-[#2A2A2A] text-white text-xs font-bold"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="mr-1.5 size-3.5 text-emerald-400" />
                        Copied Download Link!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1.5 size-3.5" />
                        Copy Share Link
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFullscreenQr(true)}
                    className="h-10 w-full rounded-xl border-[#CBD5E1] text-xs font-bold hover:bg-[#F3F4F6]"
                  >
                    <Maximize2 className="mr-1.5 size-3.5" />
                    Projector Fullscreen
                  </Button>

                  {shareUrl && (
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center text-xs font-semibold text-[#FF3B30] hover:underline pt-1"
                    >
                      Preview Student Download Page
                      <ExternalLink className="ml-1 size-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Projector Fullscreen View */}
      {fullscreenQr && qrValue && (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#111111] p-6 text-white backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setFullscreenQr(false)}
            className="absolute right-6 top-6 grid size-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
            aria-label="Close fullscreen view"
          >
            <X className="size-6" />
          </button>

          <div className="flex flex-col items-center text-center max-w-xl">
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-bold uppercase tracking-wider text-white">
              Scan to Download Documents
            </span>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-black text-white">
              {room.name}
            </h2>

            <div className="mt-6 rounded-3xl bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.8)] ring-8 ring-white/10">
              <QRCode value={qrValue} size={280} level="H" bgColor="#ffffff" fgColor="#111111" />
            </div>

            <div className="mt-5 flex items-center gap-3">
              <span className="font-mono text-xl font-bold bg-white/10 px-5 py-2 rounded-xl">
                Code: {room.code}
              </span>
            </div>

            <Button
              type="button"
              onClick={() => setFullscreenQr(false)}
              className="mt-6 h-11 rounded-full bg-[#FF3B30] px-8 text-xs font-bold text-white shadow-lg hover:bg-[#E6332B]"
            >
              <Minimize2 className="mr-2 size-4" />
              Exit Projector View
            </Button>
          </div>
        </div>
      )}
    </AuthorShell>
  );
}
