import { Html5Qrcode, type Html5QrcodeCameraScanConfig } from "html5-qrcode";
import { Camera, CameraOff, SwitchCamera } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { parseJoinCodeFromScan } from "@/lib/game/join-url";
import { releaseAllCameraStreams } from "@/lib/media/release-camera";
import { cn } from "@/lib/utils";

type JoinQrScannerProps = {
  onCode: (code: string) => void;
  onError?: (message: string) => void;
  className?: string;
};

type FacingMode = "environment" | "user";

const SCAN_CONFIG: Html5QrcodeCameraScanConfig = {
  fps: 10,
  qrbox: (viewfinderWidth, viewfinderHeight) => {
    const edge = Math.min(viewfinderWidth, viewfinderHeight);
    const size = Math.floor(edge * 0.72);
    return { width: size, height: size };
  },
  disableFlip: false,
};

async function stopScanner(scanner: Html5Qrcode | null, container?: HTMLElement | null) {
  if (!scanner) return;
  try {
    if (scanner.isScanning) {
      await scanner.stop();
    }
  } catch {
    // Camera may already be stopped.
  }
  try {
    scanner.clear();
  } catch {
    // Reader element may already be cleared.
  }
  if (container) {
    releaseAllCameraStreams(container);
  }
  releaseAllCameraStreams();
}

export function JoinQrScanner({ onCode, onError, className }: JoinQrScannerProps) {
  const elementId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);
  const onCodeRef = useRef(onCode);
  const onErrorRef = useRef(onError);
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [starting, setStarting] = useState(true);
  const [flipping, setFlipping] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);

  onCodeRef.current = onCode;
  onErrorRef.current = onError;

  const handleScan = useCallback((raw: string, scanner: Html5Qrcode) => {
    if (handledRef.current) return;
    const code = parseJoinCodeFromScan(raw);
    if (!code) return;
    handledRef.current = true;
    setScanning(false);
    setScanComplete(true);
    scannerRef.current = null;
    void stopScanner(scanner, containerRef.current).finally(() => onCodeRef.current(code));
  }, []);

  useEffect(() => {
    if (scanComplete) return;

    handledRef.current = false;
    let cancelled = false;
    let scanner: Html5Qrcode | null = null;

    const startScanner = async () => {
      setStarting(true);
      setCameraError(null);
      setScanning(false);

      scanner = new Html5Qrcode(elementId, { verbose: false });
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode },
          SCAN_CONFIG,
          (text) => {
            if (scanner) handleScan(text, scanner);
          },
          () => {},
        );

        if (cancelled) {
          await stopScanner(scanner, containerRef.current);
          return;
        }

        const container = containerRef.current;
        if (container) {
          container.querySelectorAll("video").forEach((video) => {
            video.style.position = "absolute";
            video.style.inset = "0";
            video.style.width = "100%";
            video.style.height = "100%";
            video.style.objectFit = "cover";
          });
          container.querySelectorAll("div").forEach((node) => {
            if (node === container || node.id === elementId) return;
            node.style.width = "100%";
            node.style.height = "100%";
            node.style.minHeight = "100%";
          });
        }

        setStarting(false);
        setFlipping(false);
        setScanning(true);
      } catch {
        if (cancelled) {
          await stopScanner(scanner, containerRef.current);
          return;
        }
        const message = "Allow camera access to scan the QR on the host screen.";
        setCameraError(message);
        setStarting(false);
        setFlipping(false);
        setScanning(false);
        onErrorRef.current?.(message);
      }
    };

    void startScanner();

    return () => {
      cancelled = true;
      const active = scannerRef.current ?? scanner;
      scannerRef.current = null;
      setScanning(false);
      setStarting(false);
      void stopScanner(active, containerRef.current);
    };
  }, [elementId, facingMode, handleScan, scanComplete]);

  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) return;
      const active = scannerRef.current;
      scannerRef.current = null;
      setScanning(false);
      setStarting(false);
      void stopScanner(active, containerRef.current);
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    return () => {
      void stopScanner(scannerRef.current, containerRef.current);
      releaseAllCameraStreams();
    };
  }, []);

  const flipCamera = () => {
    if (starting || flipping || cameraError || scanComplete) return;
    setFlipping(true);
    setScanning(false);
    setFacingMode((current) => (current === "environment" ? "user" : "environment"));
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="relative mx-auto aspect-square w-full max-w-[min(100%,360px)] overflow-hidden rounded-[24px] border border-[var(--gamibar-border)] bg-[#0a0a0a] shadow-[var(--shadow-soft)]">
        <div
          ref={containerRef}
          id={elementId}
          className="join-qr-scanner absolute inset-0 size-full"
        />

        {scanning && !cameraError && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative size-[68%] max-w-[240px]">
              <span className="absolute left-0 top-0 size-8 rounded-tl-xl border-l-[3px] border-t-[3px] border-white" />
              <span className="absolute right-0 top-0 size-8 rounded-tr-xl border-r-[3px] border-t-[3px] border-white" />
              <span className="absolute bottom-0 left-0 size-8 rounded-bl-xl border-b-[3px] border-l-[3px] border-white" />
              <span className="absolute bottom-0 right-0 size-8 rounded-br-xl border-b-[3px] border-r-[3px] border-white" />
            </div>
          </div>
        )}

        {(starting || flipping) && !cameraError && !scanComplete && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#0a0a0a]/95 text-white">
            <Camera className="size-8 animate-pulse" />
            <p className="text-sm font-medium">{flipping ? "Switching camera…" : "Starting camera…"}</p>
          </div>
        )}

        {scanComplete && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#0a0a0a] px-6 text-center text-white">
            <CameraOff className="size-8 text-emerald-400" />
            <p className="text-sm font-medium">QR scanned - camera off</p>
            <p className="text-xs text-white/60">Joining your room…</p>
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#0a0a0a] px-6 text-center text-white">
            <CameraOff className="size-8 text-white/70" />
            <p className="text-sm font-medium">{cameraError}</p>
            <p className="text-xs text-white/60">Use Enter code if camera access is blocked.</p>
          </div>
        )}

        {scanning && !cameraError && !starting && !flipping && (
          <button
            type="button"
            onClick={flipCamera}
            className="absolute right-3 top-3 z-20 grid size-10 place-items-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
            aria-label="Flip camera"
          >
            <SwitchCamera className="size-5" />
          </button>
        )}

        {scanning && !cameraError && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-4 pt-10 text-center">
            <p className="text-sm font-medium text-white">Align the QR inside the frame</p>
            <p className="mt-0.5 text-xs text-white/70">Shown on the host&apos;s projector or screen</p>
          </div>
        )}
      </div>
    </div>
  );
}
