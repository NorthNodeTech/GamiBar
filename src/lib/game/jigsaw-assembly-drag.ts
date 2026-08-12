/** Find the skeleton slot to snap to for a pointer position. */
export function findSnapSlot(
  clientX: number,
  clientY: number,
  slotElements: readonly (HTMLElement | null)[],
  snapRatio: number,
): number | null {
  for (let i = 0; i < slotElements.length; i++) {
    const el = slotElements[i];
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      return i;
    }
  }

  let best: { index: number; dist: number } | null = null;
  for (let i = 0; i < slotElements.length; i++) {
    const el = slotElements[i];
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const threshold = Math.min(rect.width, rect.height) * snapRatio;
    const dist = Math.hypot(clientX - cx, clientY - cy);
    if (dist <= threshold && (!best || dist < best.dist)) {
      best = { index: i, dist };
    }
  }

  return best?.index ?? null;
}

export const ASSEMBLY_SNAP_RATIO = 0.42;
export const ASSEMBLY_SNAP_RATIO_COARSE = 0.55;

/** Minimum pointer movement (px) before a drag begins — avoids accidental drags on tap. */
export const ASSEMBLY_DRAG_THRESHOLD_PX = 6;
export const ASSEMBLY_DRAG_THRESHOLD_COARSE_PX = 10;
