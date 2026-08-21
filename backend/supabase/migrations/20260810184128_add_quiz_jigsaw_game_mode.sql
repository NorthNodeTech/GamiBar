-- Reconciled with the migration version recorded by the live Supabase project.
-- Add Puzzle Quest (quiz + jigsaw) game mode.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'gamibar_game_mode'
      AND e.enumlabel = 'quiz_jigsaw'
  ) THEN
    ALTER TYPE public.gamibar_game_mode ADD VALUE 'quiz_jigsaw';
  END IF;
END
$$;
