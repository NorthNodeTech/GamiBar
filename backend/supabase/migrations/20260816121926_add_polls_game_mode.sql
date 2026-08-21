-- Reconciled with the migration version recorded by the live Supabase project.
-- Add polls and survey rooms to the shared live-room mode enum.

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typnamespace = 'public'::regnamespace
      and t.typname = 'gamibar_game_mode'
      and e.enumlabel = 'polls'
  ) then
    alter type public.gamibar_game_mode add value 'polls';
  end if;
end $$;
