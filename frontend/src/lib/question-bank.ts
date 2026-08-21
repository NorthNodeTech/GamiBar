import type { QuizQuestionDraft } from "@shared/game/types";

const STORAGE_KEY = "gamibar_question_bank";

export type QuestionBankSet = {
  id: string;
  name: string;
  subject: string;
  questions: QuizQuestionDraft[];
  createdAt: number;
  updatedAt: number;
};

function readAll(): QuestionBankSet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QuestionBankSet[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(sets: QuestionBankSet[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
}

export function listQuestionSets(): QuestionBankSet[] {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getQuestionSet(id: string): QuestionBankSet | null {
  return readAll().find((s) => s.id === id) ?? null;
}

export function saveQuestionSet(input: {
  id?: string;
  name: string;
  subject: string;
  questions: QuizQuestionDraft[];
}): QuestionBankSet {
  const now = Date.now();
  const all = readAll();
  const existing = input.id ? all.find((s) => s.id === input.id) : null;
  const set: QuestionBankSet = {
    id: existing?.id ?? `qb-${now}`,
    name: input.name.trim(),
    subject: input.subject.trim() || "General",
    questions: input.questions,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const next = existing ? all.map((s) => (s.id === set.id ? set : s)) : [set, ...all];
  writeAll(next);
  return set;
}

export function deleteQuestionSet(id: string) {
  writeAll(readAll().filter((s) => s.id !== id));
}

export function duplicateQuestionSet(id: string): QuestionBankSet | null {
  const source = getQuestionSet(id);
  if (!source) return null;
  return saveQuestionSet({
    name: `${source.name} (copy)`,
    subject: source.subject,
    questions: source.questions.map((q) => ({ ...q, id: `${q.id}-copy-${Date.now()}` })),
  });
}
