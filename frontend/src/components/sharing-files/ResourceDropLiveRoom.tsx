import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { Link } from "@/lib/navigation";
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  Maximize2,
  Minimize2,
  QrCode,
  Radio,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import logoBlack from "@/assets/GamiBar_Logo_Black.png";
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
      toast.success("Share link copied!");
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
    <div className="relative flex h-screen max-h-screen w-screen flex-col overflow-hidden bg-[#F8F9FB] p-4 text-[#111111] select-none sm:p-6 lg:p-7">
      {/* Background Subtle Grid Texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: "radial-gradient(#111111 0.75px, transparent 0.75px)",
          backgroundSize: "24px 24px",
        }}
      />

      {isReconnecting && retry && <ConnectionBanner onRetry={retry} retrying={Boolean(retrying)} />}

      {/* Top Header Bar */}
      <header className="relative z-10 flex h-11 shrink-0 items-center justify-between border-b border-black/10 bg-white/80 px-4 py-2 backdrop-blur-md rounded-2xl shadow-xs">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <img
            src={logoBlack}
            alt="GamiBar"
            className="h-8 w-auto object-contain transition-transform duration-200 hover:scale-105"
          />
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-extrabold tracking-tight text-[#111111]">
              Gami<span className="font-black text-[#FF3B30]">BAR</span>
            </span>
            <span className="hidden items-center gap-1.5 rounded-full border border-black/10 bg-[#F1F3F6] px-2.5 py-0.5 text-[11px] font-bold text-[#111111] sm:inline-flex">
              <Radio className="size-3 text-[#FF3B30]" />
              QR File
            </span>
          </div>
        </div>

        {/* Action Exit Button */}
        <Link
          to="/author/tools"
          className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3.5 py-1.5 text-xs font-bold text-[#111111] shadow-xs transition-all hover:bg-[#111111] hover:text-white active:scale-98"
        >
          <ArrowLeft className="size-3.5" />
          Exit Room
        </Link>
      </header>

      {error && (
        <div className="relative z-10 mt-3 shrink-0">
          <InlineErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {/* Main 3-Card Grid fitting 100vh */}
      <main className="relative z-10 mt-4 grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-12 items-stretch">
        {/* CARD 1: QR, Code & Direct Link (Left 7 Cols) */}
        <section className="flex flex-col justify-between rounded-3xl border border-black/10 bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)] lg:col-span-7">
          {/* Card Top Title Row */}
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#FF3B30]/20 bg-[#FFF1F0] px-3.5 py-1 text-xs font-bold text-[#FF3B30]">
              <QrCode className="size-3.5" />
              QR, Code & Direct Link
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFullscreenQr(true)}
              className="h-8 rounded-full border border-black/10 bg-[#F8F9FA] px-3 text-xs font-bold text-[#111111] hover:bg-[#111111] hover:text-white transition-colors"
            >
              <Maximize2 className="mr-1.5 size-3.5" />
              Projector View
            </Button>
          </div>

          {/* Centerpiece: Framed High-Contrast QR Code */}
          <div className="my-auto flex flex-col items-center py-2">
            <div className="relative rounded-3xl border-2 border-[#111111] bg-white p-4 shadow-xl">
              {/* Futuristic Red Corner Accents */}
              <div className="absolute -left-1 -top-1 size-4 rounded-tl-md border-l-4 border-t-4 border-[#FF3B30]" />
              <div className="absolute -right-1 -top-1 size-4 rounded-tr-md border-r-4 border-t-4 border-[#FF3B30]" />
              <div className="absolute -bottom-1 -left-1 size-4 rounded-bl-md border-b-4 border-l-4 border-[#FF3B30]" />
              <div className="absolute -bottom-1 -right-1 size-4 rounded-br-md border-b-4 border-r-4 border-[#FF3B30]" />

              <QRCode value={qrValue} size={250} level="M" bgColor="#ffffff" fgColor="#111111" />
            </div>
            <p className="mt-3 text-xs font-bold tracking-tight text-[#5F6368]">
              Scan with any mobile phone camera to download instantly
            </p>
          </div>

          {/* Bottom Interactive Access Bar */}
          <div className="space-y-2.5 pt-2">
            {/* 6-Digit Room Code Box */}
            <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-[#F8F9FA] p-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#5F6368]">
                  Room Code
                </span>
                <div className="mt-1 flex items-center gap-1.5">
                  {room.code.split("").map((digit, idx) => (
                    <span
                      key={idx}
                      className="grid size-8 place-items-center rounded-lg border border-[#E5E7EB] bg-white font-mono text-base font-black text-[#111111] shadow-xs"
                    >
                      {digit}
                    </span>
                  ))}
                </div>
              </div>
              <Button
                type="button"
                onClick={handleCopyCode}
                className="h-9 rounded-xl bg-[#111111] px-4 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#FF3B30]"
              >
                {copiedCode ? (
                  <>
                    <Check className="mr-1.5 size-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 size-3.5" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>

            {/* Direct Link Input Row */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl || fallbackJoinUrl}
                className="h-10 flex-1 truncate rounded-xl border border-black/10 bg-[#FAFAFA] px-3.5 font-mono text-xs font-medium text-[#111111] shadow-inner select-all focus:outline-none"
              />
              <Button
                type="button"
                onClick={handleCopyLink}
                className="h-10 shrink-0 rounded-xl bg-[#111111] px-4 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#FF3B30]"
              >
                {copiedLink ? (
                  <>
                    <Check className="mr-1.5 size-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 size-3.5" />
                    Copy Link
                  </>
                )}
              </Button>
            </div>

            {shareUrl && (
              <div className="text-center">
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs font-bold text-[#FF3B30] transition-colors hover:text-[#E6332B] hover:underline"
                >
                  Preview Student Download Page
                  <ExternalLink className="ml-1 size-3" />
                </a>
              </div>
            )}
          </div>
        </section>

        {/* Right Side: CARD 2 & CARD 3 (Right 5 Cols) */}
        <section className="flex flex-col justify-between gap-4 lg:col-span-5">
          {/* CARD 2: People Who Used QR (Audience Hub) */}
          <div className="relative overflow-hidden rounded-3xl border border-black bg-gradient-to-br from-[#111111] via-[#18181B] to-[#27272A] p-5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                People Who Used QR
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-white">
                <span className="size-2 animate-pulse rounded-full bg-[#FF3B30]" />
                Live Sync
              </span>
            </div>

            <div className="mt-3 flex items-center gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/10 text-white shadow-inner">
                <Users className="size-7 text-[#FF3B30]" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <p className="font-display text-4xl font-black tracking-tight text-white tabular-nums">
                    {totalDownloads}
                  </p>
                  <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                    {totalDownloads === 1 ? "Download" : "Downloads"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-white/70">
                  {totalDownloads === 0
                    ? "Waiting for participants to scan and download..."
                    : totalDownloads === 1
                      ? "1 person has downloaded the document"
                      : `${totalDownloads} participants have downloaded the document`}
                </p>
              </div>
            </div>
          </div>

          {/* CARD 3: Room Document File (Asset Deck) */}
          <div className="flex flex-1 flex-col justify-between rounded-3xl border border-black/10 bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
            <div>
              <div className="mb-3 flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div className="flex items-center gap-2">
                  <div className="grid size-6 place-items-center rounded-md bg-[#FFF1F0] text-[#FF3B30]">
                    <FileText className="size-3.5" />
                  </div>
                  <h2 className="font-display text-xs font-extrabold uppercase tracking-wider text-[#111111]">
                    Room Document File ({files.length})
                  </h2>
                </div>
                {loading && <Loader2 className="size-4 animate-spin text-[#FF3B30]" />}
              </div>

              {files.length > 0 ? (
                <div className="space-y-2.5">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F8F9FA] p-3.5 transition-all hover:border-[#111111]/30"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#FFD0CC] bg-[#FFF1F0] text-[#FF3B30] shadow-xs">
                          <FileText className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <p
                            className="truncate text-sm font-extrabold text-[#111111]"
                            title={file.name}
                          >
                            {file.name}
                          </p>
                          <p className="mt-0.5 text-xs text-[#5F6368]">
                            <span className="font-bold text-[#111111]">
                              {getFileKindLabel(file.mimeType)}
                            </span>{" "}
                            · {formatSessionFileSize(file.byteSize)} ·{" "}
                            <span className="font-bold text-[#FF3B30]">
                              {file.downloadedCount ?? 0} downloads
                            </span>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteFile(file.id)}
                        disabled={deletingId === file.id}
                        aria-label={`Delete ${file.name}`}
                        className="grid size-9 shrink-0 place-items-center rounded-xl border border-transparent text-[#9CA3AF] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-[#FF3B30]"
                      >
                        {deletingId === file.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8F9FA] p-6 text-center">
                  <FileText className="mx-auto size-7 text-[#9CA3AF]" />
                  <p className="mt-2 text-xs font-bold text-[#5F6368]">
                    No document attached to this QR code yet.
                  </p>
                </div>
              )}
            </div>

            {/* Upload or replace document button */}
            {files.length < SESSION_FILE_MAX_FILES && (
              <div className="mt-4 border-t border-[#E5E7EB] pt-3">
                <Button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                  className="h-10 w-full rounded-xl border border-black bg-[#111111] text-xs font-bold text-white shadow-xs transition-all hover:bg-[#2A2A2A]"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-1.5 size-4 animate-spin text-[#FF3B30]" />
                      Uploading document to QR...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-1.5 size-4 text-white" />
                      {files.length === 0 ? "Upload Document" : "Replace / Add Document"}
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
        </section>
      </main>

      {/* Projector Fullscreen Modal */}
      {fullscreenQr && qrValue && (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#111111] p-6 text-white backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setFullscreenQr(false)}
            className="absolute right-6 top-6 grid size-12 place-items-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20"
            aria-label="Close fullscreen view"
          >
            <X className="size-6" />
          </button>

          <div className="flex max-w-xl flex-col items-center text-center">
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-bold uppercase tracking-wider text-white">
              Scan to Download Document
            </span>
            <h2 className="mt-3 font-display text-3xl font-black text-white sm:text-4xl">
              {room.name}
            </h2>

            <div className="mt-6 rounded-3xl bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.8)] ring-8 ring-white/10">
              <QRCode value={qrValue} size={300} level="H" bgColor="#ffffff" fgColor="#111111" />
            </div>

            <div className="mt-5 flex items-center gap-3">
              <span className="rounded-xl bg-white/10 px-5 py-2 font-mono text-xl font-bold">
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
    </div>
  );
}
