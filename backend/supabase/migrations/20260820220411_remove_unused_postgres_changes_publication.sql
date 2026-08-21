-- GamiBAR publishes room invalidations through Supabase Realtime Broadcast.
-- No browser subscribes to postgres_changes, so keeping gameplay tables in the
-- publication only adds unused logical-replication work.
alter publication supabase_realtime drop table
  public.gamibar_attempts,
  public.gamibar_jigsaw_assets,
  public.gamibar_live_rooms,
  public.gamibar_participants,
  public.gamibar_quiz_answers,
  public.gamibar_rooms,
  public.gamibar_session_file_shares,
  public.gamibar_session_files;
