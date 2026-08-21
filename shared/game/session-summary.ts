import type { GameMode } from "@shared/game/config";

/** Count teacher-authored items from persisted room configuration. */
export function questionCountFromConfig(mode: GameMode, config: unknown): number {
  if (!config || typeof config !== "object") return 0;
  const raw = config as Record<string, unknown>;

  if (mode === "connect_dots") {
    const connectDots = raw.connectDots as Record<string, unknown> | undefined;
    const contentPairs = connectDots?.contentPairs;
    if (Array.isArray(contentPairs) && contentPairs.length > 0) return contentPairs.length;
    return typeof connectDots?.pairCount === "number" ? connectDots.pairCount : 0;
  }

  return Array.isArray(raw.questions) ? raw.questions.length : 0;
}
