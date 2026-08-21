import { useEffect, useState } from "react";

import {
  ASSEMBLY_DRAG_THRESHOLD_COARSE_PX,
  ASSEMBLY_DRAG_THRESHOLD_PX,
} from "@shared/game/jigsaw-assembly-drag";

/** Card sizes tuned for touch on narrow viewports (below md). */
export const JIGSAW_MOBILE_COLLECTION_CARD_SIZE = 64;
export const JIGSAW_MOBILE_ASSEMBLY_CARD_SIZE = 76;

const MOBILE_MQ = "(max-width: 767px)";
const COARSE_MQ = "(pointer: coarse)";

/**
 * Responsive Jigsaw Mission layout values — larger cards and looser tap thresholds on phones.
 * Desktop values unchanged at md and above.
 */
export function useJigsawTouchLayout() {
  const [isMobile, setIsMobile] = useState(false);
  const [isCoarse, setIsCoarse] = useState(false);

  useEffect(() => {
    const mobileMq = window.matchMedia(MOBILE_MQ);
    const coarseMq = window.matchMedia(COARSE_MQ);
    const update = () => {
      setIsMobile(mobileMq.matches);
      setIsCoarse(coarseMq.matches);
    };
    update();
    mobileMq.addEventListener("change", update);
    coarseMq.addEventListener("change", update);
    return () => {
      mobileMq.removeEventListener("change", update);
      coarseMq.removeEventListener("change", update);
    };
  }, []);

  return {
    isMobile,
    isCoarse,
    collectionCardSize: isMobile ? JIGSAW_MOBILE_COLLECTION_CARD_SIZE : 56,
    assemblyCardSize: isMobile ? JIGSAW_MOBILE_ASSEMBLY_CARD_SIZE : 68,
    tapDragThreshold: isCoarse ? ASSEMBLY_DRAG_THRESHOLD_COARSE_PX : ASSEMBLY_DRAG_THRESHOLD_PX,
  };
}
