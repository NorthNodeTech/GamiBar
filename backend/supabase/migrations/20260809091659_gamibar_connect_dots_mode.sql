-- Reconciled with the migration version and name recorded by the live Supabase project.
-- Add Connect Dots game mode (replaces Maze Connect in the product UI).
-- Keep legacy enum value `maze` for any historical rows.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'gamibar_game_mode'
      AND e.enumlabel = 'connect_dots'
  ) THEN
    ALTER TYPE public.gamibar_game_mode ADD VALUE 'connect_dots';
  END IF;
END
$$;
