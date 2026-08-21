import { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "@/lib/navigation";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileClock,
  FileText,
  Loader2,
  Lock,
  Maximize2,
  Minimize2,
  Plus,
  QrCode,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import QRCode from "react-qr-code";
import { toast } from "sonner";

import { AuthorShell } from "@/components/layout/AuthorShell";
import { Button } from "@/components/ui/button";
import { InlineErrorBanner } from "@/components/ui/async-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthSafe } from "@/lib/auth-store";
import { fetchBillingStatus } from "@/lib/billing";
import { UpgradeToProDialog } from "@/components/billing/UpgradeToProDialog";
import { createRoomFn } from "@/lib/game/room.functions";
import {
  SESSION_FILE_ACCEPT,
  SESSION_FILE_DEFAULT_RETENTION_DAYS,
  SESSION_FILE_MAX_FILES,
  SESSION_FILE_RETENTION_OPTIONS,
  formatExpiryLabel,
  formatSessionFileSize,
  getFileKindLabel,
  getSessionFileShareUrl,
  uploadSessionFiles,
  deleteSessionFile,
  fetchTeacherSessionFiles,
  validateSessionShareFiles,
  type SessionFileRetentionDays,
  type SessionFileSummary,
} from "@/lib/sharing-files/session-files";
import { cn } from "@/lib/utils";

export default function QRFilePage() {
  const { user } = useAuthSafe();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [roomName, setRoomName] = useState("Presentation Resources");
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [retentionDays, setRetentionDays] = useState<SessionFileRetentionDays>(
    SESSION_FILE_DEFAULT_RETENTION_DAYS,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fullscreenQr, setFullscreenQr] = useState(false);
  const [fileLimits, setFileLimits] = useState({ maxBytes: 15 * 1024 * 1024, retentionDays: 7 });

  useEffect(() => {
    let active = true;
    if (!user?.id) return () => undefined;
    void fetchBillingStatus()
      .then((status) => {
        if (!active) return;
        setFileLimits({
          maxBytes: status.currentPlan.limits.fileSizeMb * 1024 * 1024,
          retentionDays: status.currentPlan.limits.fileRetentionDays,
        });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (retentionDays > fileLimits.retentionDays) {
      setRetentionDays(fileLimits.retentionDays as SessionFileRetentionDays);
    }
  }, [fileLimits.retentionDays, retentionDays]);

  // Active created session state
  const [activeSession, setActiveSession] = useState<{
    roomId: string;
    authorToken: string;
    summary: SessionFileSummary;
  } | null>(null);

  const shareUrl = useMemo(
    () =>
      activeSession?.summary?.shareSlug
        ? getSessionFileShareUrl(activeSession.summary.shareSlug)
        : "",
    [activeSession?.summary?.shareSlug],
  );

  const validation = useMemo(
    () =>
      validateSessionShareFiles(
        stagedFiles,
        activeSession?.summary?.files?.length ?? 0,
        fileLimits.maxBytes,
      ),
    [stagedFiles, activeSession?.summary?.files?.length, fileLimits.maxBytes],
  );

  const remainingSlots = Math.max(
    0,
    SESSION_FILE_MAX_FILES - (activeSession?.summary?.files?.length ?? 0) - stagedFiles.length,
  );

  const handleAddFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = [...stagedFiles, ...Array.from(incoming)];
    const result = validateSessionShareFiles(
      next,
      activeSession?.summary?.files?.length ?? 0,
      fileLimits.maxBytes,
    );
    if (!result.ok) {
      setError(result.errors[0] ?? "Some files cannot be added.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setError(null);
    setStagedFiles(next);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemoveStaged = (index: number) => {
    setError(null);
    setStagedFiles(stagedFiles.filter((_, i) => i !== index));
  };

  const handleCreateQrDrop = async () => {
    if (stagedFiles.length === 0 && !activeSession) {
      setError("Please add at least one document to share.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let roomId = activeSession?.roomId;
      let authorToken = activeSession?.authorToken;

      if (!roomId || !authorToken) {
        // Create dedicated Resource Drop room
        const roomResult = await createRoomFn({
          data: {
            name: roomName.trim() || "Presentation Resources",
            subject: "Resource Drop",
            mode: "polls",
            authorId: user?.id || "",
            authorName: user?.name || "Host",
            payload: {
              mode: "polls",
              questions: [
                {
                  id: "q-1",
                  prompt: "Did you find these resources helpful?",
                  type: "yes_no",
                  required: false,
                  options: [
                    { id: "o-1", label: "Yes" },
                    { id: "o-2", label: "No" },
                  ],
                },
              ],
              settings: {
                anonymous: true,
                allowResubmission: true,
                showLiveResults: true,
              },
              timeLimitSeconds: null,
            },
          },
        });

        if (!roomResult.ok) {
          throw new Error(roomResult.error || "Could not initialize document drop room.");
        }

        roomId = roomResult.room.id;
        authorToken = roomResult.authorToken;
      }

      if (!roomId || !authorToken) {
        throw new Error("Could not initialize document drop room.");
      }

      // Upload staged files
      if (stagedFiles.length > 0) {
        const summary = await uploadSessionFiles(roomId, authorToken, stagedFiles, retentionDays);
        setActiveSession({ roomId, authorToken, summary });
        setStagedFiles([]);
        toast.success(`QR File Drop is live for ${retentionDays} days!`);
      } else {
        const summary = await fetchTeacherSessionFiles(roomId, authorToken);
        setActiveSession({ roomId, authorToken, summary });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create QR File Drop.";
      if (
        msg.includes("1 active room") ||
        msg.includes("Upgrade to GamiBar Pro") ||
        msg.includes("Free accounts")
      ) {
        setShowUpgrade(true);
      } else {
        setError(msg);
        toast.error(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRemoteFile = async (fileId: string) => {
    if (!activeSession) return;
    try {
      const nextSummary = await deleteSessionFile(
        activeSession.roomId,
        activeSession.authorToken,
        fileId,
      );
      setActiveSession({ ...activeSession, summary: nextSummary });
      toast.success("File deleted from QR Drop.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete file.");
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Download link copied to clipboard!");
    } catch {
      toast.message(shareUrl);
    }
  };

  return (
    <AuthorShell>
      <div className="mx-auto w-full max-w-5xl py-2 sm:py-6 text-[#111111] px-4 sm:px-6">
        {error && (
          <InlineErrorBanner className="mb-6" message={error} onDismiss={() => setError(null)} />
        )}

        {/* Main Workspace Layout */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
          {/* Left Column: Upload & Configuration Form */}
          <div className="space-y-6">
            {/* Session / Presentation Name */}
            {!activeSession && (
              <div className="rounded-2xl border border-[#CBD5E1] bg-white p-4 sm:p-5 shadow-sm">
                <Label
                  htmlFor="room-name"
                  className="text-xs font-bold uppercase tracking-wider text-[#4B5563]"
                >
                  Presentation / Session Title
                </Label>
                <Input
                  id="room-name"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. Chapter 4 Lecture Slides & Handouts"
                  className="mt-2 h-11 rounded-xl border-[#CBD5E1] text-sm font-medium"
                />
              </div>
            )}

            {/* Document Upload Zone */}
            <div className="rounded-2xl border border-[#CBD5E1] bg-white p-4 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
                <div>
                  <h3 className="font-display text-base font-bold text-[#111111]">Add Documents</h3>
                  <p className="text-xs text-[#5F6368] mt-0.5">
                    PDF, PPT, PPTX, DOC, DOCX up to {Math.round(fileLimits.maxBytes / 1024 / 1024)}{" "}
                    MB (Max {SESSION_FILE_MAX_FILES} file).
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={isSubmitting || remainingSlots <= 0}
                  className="h-10 rounded-xl bg-[#111111] hover:bg-[#2A2A2A] text-white text-xs font-bold"
                >
                  <Upload className="mr-1.5 size-3.5" />
                  Browse Files
                </Button>
                <input
                  ref={inputRef}
                  type="file"
                  accept={SESSION_FILE_ACCEPT}
                  className="sr-only"
                  onChange={(e) => handleAddFiles(e.target.files)}
                />
              </div>

              {/* Retention Selector */}
              <div className="mt-4 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#4B5563]">
                  Document Retention
                </p>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Choose how many days your shared files stay active for audience download.
                </p>
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  {SESSION_FILE_RETENTION_OPTIONS.map((days) => {
                    const isLocked = days > fileLimits.retentionDays;
                    const isSelected = retentionDays === days;
                    return (
                      <button
                        key={days}
                        type="button"
                        onClick={() => {
                          if (isLocked) {
                            setShowUpgrade(true);
                          } else {
                            setRetentionDays(days);
                          }
                        }}
                        className={cn(
                          "relative flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-bold transition-all border",
                          isSelected
                            ? "border-[#111111] bg-[#111111] text-white shadow-sm"
                            : isLocked
                              ? "border-[#E5E7EB] bg-[#F9FAFB] text-[#71717A] hover:border-[#111111] hover:text-[#111111]"
                              : "border-[#D1D5DB] bg-white text-[#4B5563] hover:bg-[#F3F4F6]",
                        )}
                      >
                        <span>{days} Days</span>
                        {isLocked && (
                          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#111111] bg-[#ECECEE] px-1.5 py-0.5 rounded border border-[#D4D4D8]">
                            <Lock className="size-2.5 text-[#111111]" /> Pro
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Staged Files List */}
              {stagedFiles.length > 0 && (
                <div className="mt-5 space-y-2">
                  <p className="text-xs font-bold text-[#111111]">
                    Ready to Upload ({stagedFiles.length} file{stagedFiles.length === 1 ? "" : "s"}
                    ):
                  </p>
                  {stagedFiles.map((file, idx) => (
                    <div
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#CBD5E1] bg-[#FAFAFA] p-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                          <FileText className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#111111] truncate">{file.name}</p>
                          <p className="text-[11px] text-[#6B7280]">
                            {getFileKindLabel(file.type)} · {formatSessionFileSize(file.size)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveStaged(idx)}
                        aria-label={`Remove ${file.name}`}
                        className="grid size-7 place-items-center rounded-lg text-[#9CA3AF] hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload & Generate Action */}
              <div className="mt-5 pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
                <span className="text-xs font-medium text-[#6B7280]">
                  {remainingSlots} file slot{remainingSlots === 1 ? "" : "s"} available
                </span>

                <Button
                  type="button"
                  onClick={handleCreateQrDrop}
                  disabled={isSubmitting || (stagedFiles.length === 0 && !activeSession)}
                  className="h-11 rounded-xl bg-[#FF3B30] hover:bg-[#E6332B] px-6 text-xs font-bold text-white shadow-md transition-all active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                      Uploading & Generating QR...
                    </>
                  ) : activeSession ? (
                    <>
                      <Upload className="mr-1.5 size-4" />
                      Add More Files to QR
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-1.5 size-4" />
                      Generate QR Code & Link
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Active Live Shared Files on this QR Drop */}
            {activeSession && activeSession.summary.files.length > 0 && (
              <div className="rounded-2xl border border-[#CBD5E1] bg-white p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="font-display text-sm font-bold text-[#111111]">
                      Live Files on this QR ({activeSession.summary.files.length})
                    </h3>
                  </div>
                  <span className="text-xs text-[#6B7280]">Expires in {retentionDays} days</span>
                </div>

                <div className="space-y-2">
                  {activeSession.summary.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#CBD5E1] bg-[#F8F9FA] p-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#ECFDF5] text-[#059669]">
                          <FileText className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#111111] truncate">{file.name}</p>
                          <p className="text-[11px] text-[#6B7280]">
                            {getFileKindLabel(file.mimeType)} ·{" "}
                            {formatSessionFileSize(file.byteSize)} · Expires{" "}
                            {formatExpiryLabel(file.expiresAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDeleteRemoteFile(file.id)}
                          aria-label={`Delete ${file.name}`}
                          className="grid size-7 place-items-center rounded-lg text-[#9CA3AF] hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live QR Code Card & Direct Sharing */}
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-[#CBD5E1] bg-white p-5 sm:p-6 shadow-sm text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#CBD5E1] bg-[#F8F9FA] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#4B5563]">
                <QrCode className="size-3 text-[#FF3B30]" />
                Audience QR Code
              </span>

              {shareUrl ? (
                <div className="mt-5 flex flex-col items-center">
                  <div className="rounded-2xl border-2 border-[#111111] bg-white p-4 shadow-md">
                    <QRCode
                      value={shareUrl}
                      size={180}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#111111"
                    />
                  </div>

                  <p className="mt-3 text-xs font-bold text-[#111111]">
                    Scan with any phone camera
                  </p>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">
                    Direct instant download without app install
                  </p>

                  <div className="mt-4 flex w-full flex-col gap-2">
                    <Button
                      type="button"
                      onClick={handleCopyLink}
                      className="h-10 w-full rounded-xl bg-[#111111] hover:bg-[#2A2A2A] text-white text-xs font-bold"
                    >
                      {copied ? (
                        <>
                          <Check className="mr-1.5 size-3.5 text-emerald-400" />
                          Copied Link!
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

                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center text-xs font-semibold text-[#FF3B30] hover:underline pt-1"
                    >
                      Preview Student Download Page
                      <ExternalLink className="ml-1 size-3" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="mt-6 flex flex-col items-center py-8">
                  <div className="grid size-28 place-items-center rounded-2xl border-2 border-dashed border-[#D1D5DB] bg-[#F8F9FA] text-[#9CA3AF]">
                    <QrCode className="size-12 opacity-40" />
                  </div>
                  <p className="mt-4 text-xs font-bold text-[#111111]">QR Code Preview</p>
                  <p className="mt-1 text-[11px] text-[#6B7280] max-w-[200px]">
                    Add documents on the left and click "Generate QR Code" to activate.
                  </p>
                </div>
              )}
            </div>

            {/* Instruction Card */}
            <div className="rounded-2xl border border-[#CBD5E1] bg-[#F8F9FA] p-4 text-left">
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                How QRFile Works
              </h4>
              <ul className="mt-2 space-y-1.5 text-xs text-[#5F6368]">
                <li className="flex items-start gap-1.5">
                  <span className="font-bold text-[#111111]">1.</span> Upload your slides, notes, or
                  worksheets.
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="font-bold text-[#111111]">2.</span> Project the generated QR code
                  on screen.
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="font-bold text-[#111111]">3.</span> Everyone in the room scans
                  and downloads instantly.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Projector Modal for Classrooms */}
      {fullscreenQr && shareUrl && (
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
              {roomName || "Presentation Resources"}
            </h2>

            <div className="mt-8 rounded-3xl bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.8)] ring-8 ring-white/10">
              <QRCode value={shareUrl} size={280} level="H" bgColor="#ffffff" fgColor="#111111" />
            </div>

            <p className="mt-6 font-mono text-sm text-white/80 bg-white/10 px-4 py-1.5 rounded-full">
              {shareUrl.replace(/^https?:\/\//, "")}
            </p>

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

      <UpgradeToProDialog
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        featureTitle="Active Room Limit Reached"
        featureDescription="Free accounts can run 1 active room at a time. Upgrade to GamiBar Pro for ₹49/month to run unlimited simultaneous active rooms!"
      />
    </AuthorShell>
  );
}
