import { useSearch } from "@/lib/navigation";
import { Link, useNavigate } from "@/lib/navigation";
import { ArrowLeft, ArrowRight, CameraOff, HelpCircle, Keyboard, ScanLine } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/layout/Logo";
import { GameCodeInput } from "@/components/session/GameCodeInput";
import { Button } from "@/components/ui/button";
import { InlineErrorBanner } from "@/components/ui/async-state";
import { getRoomSnapshotFn } from "@/lib/game/room.functions";
import { normalizeRoomCode } from "@shared/game/room-code";
import { friendlyGameError } from "@/lib/accessibility";
import { releaseAllCameraStreams } from "@/lib/media/release-camera";
import { cn } from "@/lib/utils";
import { createSeoHead, createWebPageJsonLd } from "@/lib/seo";

const JoinQrScanner = lazy(() =>
  import("@/components/session/JoinQrScanner").then((module) => ({
    default: module.JoinQrScanner,
  })),
);
const joinTitle = "Join a Live Classroom Game | GamiBar";
const joinDescription =
  "Join a GamiBar classroom game from any phone, tablet, or computer. Enter the six-digit room code or scan the session QR code to begin.";

type JoinMode = "scan" | "code";

export default function JoinCodePage() {
  const navigate = useNavigate();
  const { code: preset, mode: initialMode } = useSearch();
  const [mode, setMode] = useState<JoinMode>(initialMode === "scan" ? "scan" : "code");
  const [code, setCode] = useState(preset ?? "");
  const [loading, setLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const autoJoinAttempted = useRef(false);

  useEffect(() => {
    if (mode === "code") {
      releaseAllCameraStreams();
    }
  }, [mode]);

  useEffect(() => {
    return () => {
      releaseAllCameraStreams();
    };
  }, []);

  const switchMode = useCallback((next: JoinMode) => {
    if (next === "code") {
      releaseAllCameraStreams();
    }
    setMode(next);
  }, []);

  useEffect(() => {
    if (preset) setCode(preset);
  }, [preset]);

  const handleJoin = useCallback(
    async (raw?: string) => {
      const clean = normalizeRoomCode(raw ?? code);
      if (clean.length < 6) {
        setJoinError("Enter the full 6-digit code.");
        return;
      }
      setLoading(true);
      setJoinError(null);
      try {
        const snap = await getRoomSnapshotFn({ data: { code: clean } });
        if (!snap.ok) {
          setJoinError(
            friendlyGameError(
              snap.error,
              "That room code was not found. Check the code and try again.",
            ),
          );
          return;
        }
        if (snap.room.status === "FINISHED" || snap.room.status === "CANCELLED") {
          setJoinError("This room is closed.");
          return;
        }
        const isResourceDrop = Boolean(
          ("isResourceDrop" in snap.room.payload && snap.room.payload.isResourceDrop === true) ||
          snap.room.subject === "Resource Drop" ||
          snap.room.name === "Presentation Resources" ||
          snap.room.name === "Presentation Resource" ||
          snap.room.name.toLowerCase().includes("presentation resource") ||
          snap.room.name.toLowerCase().includes("qr drop") ||
          snap.room.name.toLowerCase().includes("qrfile") ||
          snap.room.name.toLowerCase().includes("resource drop"),
        );
        if (isResourceDrop) {
          navigate({ to: "/share/$shareSlug", params: { shareSlug: clean } });
          return;
        }
        navigate({ to: "/join/name", search: { code: clean } });
      } catch {
        setJoinError("Could not validate room. Check your connection and try again.");
      } finally {
        setLoading(false);
      }
    },
    [code, navigate],
  );

  const handleScannedCode = useCallback(
    (scanned: string) => {
      releaseAllCameraStreams();
      setCode(scanned);
      toast.success("QR scanned - joining room…");
      void handleJoin(scanned);
    },
    [handleJoin],
  );

  useEffect(() => {
    const clean = normalizeRoomCode(preset ?? "");
    if (clean.length === 6 && !autoJoinAttempted.current) {
      autoJoinAttempted.current = true;
      void handleJoin(clean);
    }
  }, [preset, handleJoin]);

  return (
    <div className="flex min-h-dvh-screen flex-col bg-[var(--gamibar-page)] px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-[#525252] transition-colors hover:text-[#111111]"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>

        <Link to="/" className="mt-4 flex items-center justify-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-[#111111] p-2.5 shadow-sm">
            <Logo size={34} />
          </div>
          <span className="font-display text-2xl font-bold tracking-tight text-[#111111]">
            Gami<span className="text-[#FF3B30]">BAR</span>
          </span>
        </Link>

        <div className="mt-8 text-center">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#111111] sm:text-4xl">
            Join your class
          </h1>
          <p className="mt-3 text-sm text-[#525252]">
            Scan the QR on the host screen, or type the 6-digit code.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-[var(--gamibar-border)] bg-white p-1">
          <button
            type="button"
            onClick={() => switchMode("scan")}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors",
              mode === "scan" ? "bg-[#111111] text-white" : "text-[#525252] hover:text-[#111111]",
            )}
          >
            <ScanLine className="size-4" />
            Scan QR
          </button>
          <button
            type="button"
            onClick={() => switchMode("code")}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors",
              mode === "code" ? "bg-[#111111] text-white" : "text-[#525252] hover:text-[#111111]",
            )}
          >
            <Keyboard className="size-4" />
            Enter code
          </button>
        </div>

        <div className="mt-6">
          {mode === "scan" ? (
            loading ? (
              <div className="mx-auto flex aspect-square w-full max-w-[min(100%,360px)] flex-col items-center justify-center gap-2 rounded-[24px] border border-[var(--gamibar-border)] bg-[#0a0a0a] px-6 text-center text-white shadow-[var(--shadow-soft)]">
                <CameraOff className="size-8 text-emerald-400" />
                <p className="text-sm font-medium">QR scanned - camera off</p>
                <p className="text-xs text-white/60">Validating room…</p>
              </div>
            ) : (
              <Suspense
                fallback={
                  <div
                    className="mx-auto aspect-square w-full max-w-[min(100%,360px)] rounded-[24px] border border-[var(--gamibar-border)] bg-[#0a0a0a]"
                    aria-label="Loading QR scanner"
                  />
                }
              >
                <JoinQrScanner
                  onCode={handleScannedCode}
                  onError={(message) => setJoinError(message)}
                />
              </Suspense>
            )
          ) : (
            <div className="rounded-2xl border border-[var(--gamibar-border)] bg-white p-5 shadow-[var(--shadow-soft)]">
              <p className="text-center text-sm font-medium text-[#525252]">
                Enter the 6-digit room code
              </p>
              <div className="mt-5">
                <GameCodeInput value={code} onChange={setCode} autoFocus length={6} />
              </div>
              <Button
                type="button"
                onClick={() => void handleJoin()}
                disabled={loading}
                className="mt-6 h-12 w-full rounded-xl bg-[#111111] text-base font-bold text-white hover:bg-black"
              >
                {loading ? "Checking…" : "Join game"}
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          )}
        </div>

        {joinError ? (
          <InlineErrorBanner
            className="mt-4"
            message={joinError}
            onRetry={() => void handleJoin()}
            retrying={loading}
            onDismiss={() => setJoinError(null)}
          />
        ) : null}

        <button
          type="button"
          onClick={() =>
            toast.message("The host shows a QR code and room code on the live room screen.")
          }
          className="mt-6 inline-flex items-center justify-center gap-1.5 text-sm font-medium text-[#737373] transition-colors hover:text-[#111111]"
        >
          <HelpCircle className="size-4" />
          Where is the QR code?
        </button>
      </div>
    </div>
  );
}
