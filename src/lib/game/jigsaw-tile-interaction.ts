import { ASSEMBLY_DRAG_THRESHOLD_PX } from "@/lib/game/jigsaw-assembly-drag";

/** Returns true when pointer movement exceeds the tap/drag threshold. */
export function pointerMovedBeyondTapThreshold(
  startX: number,
  startY: number,
  clientX: number,
  clientY: number,
  threshold = ASSEMBLY_DRAG_THRESHOLD_PX,
): boolean {
  return Math.hypot(clientX - startX, clientY - startY) >= threshold;
}

export type TileTapSession = {
  pointerId: number;
  startX: number;
  startY: number;
};

/** Attach window listeners that fire `onTap` only when the pointer did not move enough to drag. */
export function bindRotateOnTap(
  session: TileTapSession,
  onTap: () => void,
  threshold = ASSEMBLY_DRAG_THRESHOLD_PX,
): () => void {
  let cancelled = false;

  const cleanup = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
  };

  const onMove = (ev: PointerEvent) => {
    if (ev.pointerId !== session.pointerId) return;
    if (
      pointerMovedBeyondTapThreshold(session.startX, session.startY, ev.clientX, ev.clientY, threshold)
    ) {
      cancelled = true;
      cleanup();
    }
  };

  const onUp = (ev: PointerEvent) => {
    if (ev.pointerId !== session.pointerId) return;
    cleanup();
    if (
      !cancelled &&
      !pointerMovedBeyondTapThreshold(session.startX, session.startY, ev.clientX, ev.clientY, threshold)
    ) {
      onTap();
    }
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);

  return cleanup;
}
