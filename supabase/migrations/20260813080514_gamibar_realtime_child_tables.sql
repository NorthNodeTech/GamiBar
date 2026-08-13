-- Realtime room sync now listens to normalized room child tables.
-- Keep publication coverage aligned with the client subscriptions.

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'gamibar_participants',
    'gamibar_quiz_answers',
    'gamibar_attempts',
    'gamibar_jigsaw_assets'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;
