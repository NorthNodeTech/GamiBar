alter table public.gamibar_session_files
  alter column expires_at set default (now() + interval '7 days');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gamibar_session_files_expires_within_28_days'
      and conrelid = 'public.gamibar_session_files'::regclass
  ) then
    alter table public.gamibar_session_files
      add constraint gamibar_session_files_expires_within_28_days
      check (expires_at <= created_at + interval '28 days');
  end if;
end $$;
