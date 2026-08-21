-- Reconciled with the migration version recorded by the live Supabase project.
revoke all on public.gamibar_session_file_shares from anon, authenticated;
revoke all on public.gamibar_session_files from anon, authenticated;
grant select on public.gamibar_session_file_shares to authenticated;
grant select on public.gamibar_session_files to authenticated;
