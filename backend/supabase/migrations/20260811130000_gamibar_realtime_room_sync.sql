-- Enable Supabase Realtime for live session sync (teacher start/stop, student join/complete).
-- Clients subscribe to postgres_changes and refetch snapshots instead of polling every ~1.2s.

alter publication supabase_realtime add table public.gamibar_live_rooms;
alter publication supabase_realtime add table public.gamibar_rooms;
