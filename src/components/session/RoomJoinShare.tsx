import { Check, Copy, Link2, QrCode, ScanLine } from "lucide-react";
import { useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { toast } from "sonner";

import { RoomCodeDisplay } from "@/components/author/RoomCodeDisplay";
import { Button } from "@/components/ui/button";
import { getJoinUrl } from "@/lib/game/join-url";
import { cn } from "@/lib/utils";

type RoomJoinShareProps = {
  code: string;
  className?: string;
  /** Larger layout for projector / first screen after create */
  prominent?: boolean;
};

export function RoomJoinShare({ code, className, prominent = false }: RoomJoinShareProps) {
  const joinUrl = useMemo(() => getJoinUrl(code), [code]);
  const cleanCode = code.replace(/\D/g, "");
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const flashCopied = (kind: "code" | "link") => {
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1600);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(cleanCode);
      flashCopied("code");
      toast.success("Room code copied");
    } catch {
      toast.message(cleanCode);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      flashCopied("link");
      toast.success("Join link copied");
    } catch {
      toast.message(joinUrl);
    }
  };

  const displayUrl = joinUrl.replace(/^https?:\/\//, "");

  return (
    <div
      className={cn(
        "relative w-full min-w-0 overflow-hidden rounded-[28px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_0%_0%,rgba(239,68,68,0.12),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_100%_100%,rgba(59,130,246,0.08),transparent_50%)]"
      />

      <div className={cn("relative", prominent ? "p-5 sm:p-7" : "p-5")}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gamibar-brand)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(239,68,68,0.35)]">
              <ScanLine className="size-3" />
              Scan to join
            </span>
            <p className="mt-3 text-sm font-medium text-[var(--muted-foreground)]">
              Students scan the QR or type the 6-digit code
            </p>
          </div>
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl border border-[var(--gamibar-border)] bg-[var(--surface)] text-[var(--gamibar-brand)]">
            <QrCode className="size-5" />
          </div>
        </div>

        <div
          className={cn(
            "mt-5 grid gap-6",
            prominent
              ? "md:grid-cols-[auto_minmax(0,1fr)] md:items-start md:gap-6 xl:items-center xl:gap-8"
              : "sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-6",
          )}
        >
          <div className="flex shrink-0 justify-center md:justify-start">
            <div className="relative rounded-[22px] bg-white p-3 shadow-[var(--shadow-lift)] ring-1 ring-black/5 sm:p-4">
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-px rounded-[22px] bg-[linear-gradient(135deg,rgba(239,68,68,0.35),transparent_40%,transparent_60%,rgba(59,130,246,0.25))] opacity-70"
              />
              <div className="relative rounded-[16px] bg-white p-2">
                <QRCode
                  value={joinUrl}
                  size={prominent ? 176 : 140}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#111111"
                />
              </div>
            </div>
          </div>

          <div className="min-w-0 text-center sm:text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gamibar-text-tertiary)]">
              Room code
            </p>
            <div className="mt-3 flex justify-center sm:justify-start">
              <RoomCodeDisplay code={code} size={prominent ? "large" : "default"} />
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--gamibar-border)] bg-[var(--surface)] px-3.5 py-3 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--gamibar-text-tertiary)]">
                Direct link
              </p>
              <p className="mt-1 break-all font-mono text-xs leading-relaxed text-[var(--foreground)]">
                {displayUrl}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void copyCode()}
                className="h-11 w-full rounded-xl border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] px-3 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface)] sm:text-sm"
              >
                {copied === "code" ? (
                  <Check className="size-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <Copy className="size-3.5 shrink-0" />
                )}
                <span className="truncate">{copied === "code" ? "Copied" : "Copy code"}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void copyLink()}
                className="h-11 w-full rounded-xl border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] px-3 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface)] sm:text-sm"
              >
                {copied === "link" ? (
                  <Check className="size-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <Link2 className="size-3.5 shrink-0" />
                )}
                <span className="truncate">{copied === "link" ? "Copied" : "Copy link"}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
