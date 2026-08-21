import { AlertTriangle } from "lucide-react";

import type { ConnectDotsLayoutAssessment } from "@shared/game/connect-dots-solvability";
import { cn } from "@/lib/utils";

export function ConnectDotsLayoutWarning({
  assessment,
  className,
}: {
  assessment: ConnectDotsLayoutAssessment | null;
  className?: string;
}) {
  if (!assessment?.warning) return null;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950",
        className,
      )}
      role="status"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
      <div>
        <p className="font-semibold">Board layout warning</p>
        <p className="mt-1 leading-relaxed text-amber-900/90">{assessment.warning}</p>
        <p className="mt-1.5 text-xs text-amber-800/80">
          You can still launch - try shuffling answers or adjusting pairs if participants struggle.
        </p>
      </div>
    </div>
  );
}
