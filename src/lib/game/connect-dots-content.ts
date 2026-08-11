import {
  CONNECT_DOTS_COLORS,
  generateConnectDotsPuzzle,
  type ConnectDotsDifficulty,
  type ConnectDotsPuzzle,
} from "@/lib/connect-dots";
import { GAME_CONFIG } from "@/lib/game/config";
import type { ConnectDotsBoardConfig, ConnectDotsContentPair } from "@/lib/game/types";

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic answer column order for a room seed. */
export function shuffledAnswerOrder(pairIds: string[], seed: string): string[] {
  const rand = mulberry32(hashSeed(`${seed}-answers`));
  const order = [...pairIds];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

export function pairColor(index: number): string {
  return CONNECT_DOTS_COLORS[index % CONNECT_DOTS_COLORS.length]!;
}

export type ConnectDotsMatchMap = Record<string, string>;

export function countCorrectConnectDotsMatches(
  matches: ConnectDotsMatchMap,
  validPairIds: ReadonlySet<string>,
): number {
  let count = 0;
  for (const [questionId, answerId] of Object.entries(matches)) {
    if (questionId === answerId && validPairIds.has(questionId)) count += 1;
  }
  return count;
}

export function isConnectDotsMatchesComplete(
  matches: ConnectDotsMatchMap,
  totalPairs: number,
  validPairIds: ReadonlySet<string>,
): boolean {
  return countCorrectConnectDotsMatches(matches, validPairIds) === totalPairs && totalPairs > 0;
}

export function validConnectDotsPairIds(pairs: ConnectDotsContentPair[]): ReadonlySet<string> {
  return new Set(pairs.map((p) => p.id));
}

export function emptyConnectDotsPairs(): ConnectDotsContentPair[] {
  return Array.from({ length: GAME_CONFIG.connect_dots.defaultPairCount }, (_, i) => ({
    id: `pair-${i + 1}`,
    question: "",
    answer: "",
  }));
}

export function isConnectDotsPairComplete(pair: ConnectDotsContentPair): boolean {
  return Boolean(pair.question.trim() && pair.answer.trim());
}

export function connectDotsPairsProgress(pairs: ConnectDotsContentPair[]) {
  const total = pairs.length;
  const done = pairs.filter(isConnectDotsPairComplete).length;
  const minPairs = GAME_CONFIG.connect_dots.minPairs;
  return {
    done,
    total,
    complete: done === total && total >= minPairs,
  };
}

function gridSizeForPairCount(pairCount: number): number {
  return Math.min(11, Math.max(5, Math.ceil(Math.sqrt(pairCount * 5)) + 1));
}

function difficultyForPairCount(pairCount: number): ConnectDotsDifficulty {
  if (pairCount <= 4) return "easy";
  if (pairCount <= 6) return "medium";
  return "hard";
}

function timeLimitForPairCount(pairCount: number): number {
  return Math.min(180, Math.max(45, 40 + pairCount * 10));
}

/** Build a solvable board from teacher-authored question/answer pairs. */
export function buildConnectDotsFromContentPairs(
  contentPairs: ConnectDotsContentPair[],
  seed?: string,
): ConnectDotsPuzzle & { boardConfig: ConnectDotsBoardConfig } {
  const pairCount = Math.max(1, contentPairs.length);
  const gridSize = gridSizeForPairCount(pairCount);
  const difficulty = difficultyForPairCount(pairCount);
  const puzzle = generateConnectDotsPuzzle(difficulty, seed, {
    pairCount,
    gridSize,
  });

  const pairsWithText = puzzle.publicBoard.pairs.map((pair, i) => ({
    ...pair,
    question: contentPairs[i]?.question.trim() ?? "",
    answer: contentPairs[i]?.answer.trim() ?? "",
  }));

  const boardConfig: ConnectDotsBoardConfig = {
    difficulty: puzzle.publicBoard.difficulty,
    gridSize: puzzle.publicBoard.gridSize,
    pairCount: puzzle.pairCount,
    seed: puzzle.publicBoard.seed,
    pairs: pairsWithText.map((p) => ({
      id: p.id,
      label: p.label,
      color: p.color,
      a: p.a,
      b: p.b,
      question: p.question,
      answer: p.answer,
    })),
    contentPairs: contentPairs.map((p) => ({
      id: p.id,
      question: p.question,
      answer: p.answer,
    })),
    solution: puzzle.solution,
  };

  return {
    ...puzzle,
    publicBoard: { ...puzzle.publicBoard, pairs: pairsWithText },
    timeLimitSeconds: timeLimitForPairCount(pairCount),
    boardConfig,
  };
}

export function reorderConnectDotsPairs(
  pairs: ConnectDotsContentPair[],
  fromIndex: number,
  toIndex: number,
): ConnectDotsContentPair[] {
  if (toIndex < 0 || toIndex >= pairs.length || fromIndex === toIndex) return pairs;
  const next = [...pairs];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item!);
  return next.map((p, i) => ({ ...p, id: `pair-${i + 1}` }));
}
