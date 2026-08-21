import {
  ASSEMBLY_DRAG_THRESHOLD_PX,
  ROTATE_TAP_THRESHOLD_COARSE_PX,
  ROTATE_TAP_THRESHOLD_PX,
} from "@shared/game/jigsaw-assembly-drag";

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

/** Max movement (px) that still counts as an intentional rotate tap. */
export const ROTATE_TAP_STRICT_PX = 8;

export function rotateTapThreshold(coarsePointer: boolean): number {
  return coarsePointer ? ROTATE_TAP_THRESHOLD_COARSE_PX : ROTATE_TAP_THRESHOLD_PX;
}

/** Pointer capture on the element — rotate only on a deliberate tap (no drag, no ghost click). */
export function bindExplicitRotateTap(
  element: HTMLElement,
  session: TileTapSession,
  onTap: () => void,
  threshold = ROTATE_TAP_STRICT_PX,
): () => void {
  let cancelled = false;

  const cleanup = () => {
    element.removeEventListener("pointermove", onMove);
    element.removeEventListener("pointerup", onUp);
    element.removeEventListener("pointercancel", onUp);
    if (element.hasPointerCapture(session.pointerId)) {
      element.releasePointerCapture(session.pointerId);
    }
  };

  const onMove = (ev: PointerEvent) => {
    if (ev.pointerId !== session.pointerId) return;
    if (
      pointerMovedBeyondTapThreshold(session.startX, session.startY, ev.clientX, ev.clientY, threshold)
    ) {
      cancelled = true;
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

  try {
    element.setPointerCapture(session.pointerId);
  } catch {
    // Pointer capture may fail on some browsers — fall back to element listeners only.
  }

  element.addEventListener("pointermove", onMove);
  element.addEventListener("pointerup", onUp);
  element.addEventListener("pointercancel", onUp);

  return cleanup;
}
