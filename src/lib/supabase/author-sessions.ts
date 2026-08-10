import { supabase } from "@/lib/supabase/client";

export type AuthorSessionSummary = {
  id: string;
  code: string;
  name: string;
  subject: string;
  status: string;
  mode: string;
  createdAt: string;
  playerCount: number;
};

type RoomRow = {
  id: string;
  code: string;
  name: string;
  subject: string;
  status: string;
  mode: string;
  created_at: string;
  gamibar_participants: { count: number }[] | null;
};

export async function fetchAuthorSessions(authorId: string, limit = 50): Promise<AuthorSessionSummary[]> {
  const { data, error } = await supabase
    .from("gamibar_rooms")
    .select(
      "id, code, name, subject, status, mode, created_at, gamibar_participants(count)",
    )
    .eq("author_id", authorId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as RoomRow[]).map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    subject: row.subject,
    status: row.status,
    mode: row.mode,
    createdAt: row.created_at,
    playerCount: row.gamibar_participants?.[0]?.count ?? 0,
  }));
}
