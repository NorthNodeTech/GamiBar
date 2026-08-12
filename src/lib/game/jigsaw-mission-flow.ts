import type { QuizQuestionDraft } from "@/lib/game/types";
import { readTileRotations, readTileLayouts } from "@/lib/game/jigsaw-tile-rewards";

export type JigsawMissionPayload = {
  phase?: "quiz" | "assemble";
  firstRoundIndex?: number;
  firstRoundComplete?: boolean;
  /** Current question id during retry rounds. */
  retryQuestionId?: string | null;
  /** Unique tile ids the student has earned from correct answers. */
  earnedTileIds?: string[];
  /** Visual card rotation per earned tile id (0, 90, 180, or 270 degrees). */
  tileRotations?: Record<string, 0 | 90 | 180 | 270>;
  /** Scrambled collection placement per earned tile id. */
  tileLayouts?: Record<string, { x: number; y: number; z: number }>;
};

export function readJigsawMissionPayload(raw: Record<string, unknown> | undefined): JigsawMissionPayload {
  if (!raw) return {};
  return {
    phase: raw.phase === "assemble" ? "assemble" : raw.phase === "quiz" ? "quiz" : undefined,
    firstRoundIndex: typeof raw.firstRoundIndex === "number" ? raw.firstRoundIndex : undefined,
    firstRoundComplete: raw.firstRoundComplete === true,
    retryQuestionId:
      typeof raw.retryQuestionId === "string"
        ? raw.retryQuestionId
        : raw.retryQuestionId === null
          ? null
          : undefined,
    earnedTileIds: Array.isArray(raw.earnedTileIds)
      ? raw.earnedTileIds.filter((id): id is string => typeof id === "string")
      : undefined,
    tileRotations: (() => {
      const rotations = readTileRotations(raw);
      return Object.keys(rotations).length > 0 ? rotations : undefined;
    })(),
    tileLayouts: (() => {
      const layouts = readTileLayouts(raw);
      return Object.keys(layouts).length > 0 ? layouts : undefined;
    })(),
  };
}

export function initialJigsawMissionPayload(): JigsawMissionPayload {
  return {
    phase: "quiz",
    firstRoundIndex: 0,
    firstRoundComplete: false,
    retryQuestionId: null,
  };
}

export function retryPoolQuestionIds(
  questions: Array<{ id: string }>,
  correctIds: ReadonlySet<string>,
): string[] {
  return questions.filter((q) => !correctIds.has(q.id)).map((q) => q.id);
}

/** Which question the student should answer next. */
export function resolveJigsawMissionQuestionId(
  questions: Array<{ id: string }>,
  correctIds: ReadonlySet<string>,
  payload: JigsawMissionPayload,
): string | null {
  const total = questions.length;
  if (correctIds.size >= total) return null;

  const firstRoundIndex = payload.firstRoundIndex ?? 0;
  const firstRoundComplete = payload.firstRoundComplete === true;

  if (!firstRoundComplete) {
    return questions[Math.min(firstRoundIndex, total - 1)]?.id ?? null;
  }

  const pool = retryPoolQuestionIds(questions, correctIds);
  if (pool.length === 0) return null;

  const retryId = payload.retryQuestionId;
  if (retryId && pool.includes(retryId)) return retryId;
  return pool[0] ?? null;
}

export function isJigsawMissionRetryRound(payload: JigsawMissionPayload): boolean {
  return payload.firstRoundComplete === true && payload.phase !== "assemble";
}

/** After a wrong retry answer, advance to the next question in the pool. */
export function nextRetryQuestionId(pool: string[], currentId: string): string {
  if (pool.length === 0) return currentId;
  const idx = pool.indexOf(currentId);
  if (idx < 0) return pool[0]!;
  return pool[(idx + 1) % pool.length]!;
}

export function mergeJigsawMissionPayload(
  attemptPayload: Record<string, unknown>,
  patch: JigsawMissionPayload,
): Record<string, unknown> {
  return { ...attemptPayload, ...patch };
}

export function questionIdsInOrder(questions: QuizQuestionDraft[]): string[] {
  return questions.map((q) => q.id);
}
