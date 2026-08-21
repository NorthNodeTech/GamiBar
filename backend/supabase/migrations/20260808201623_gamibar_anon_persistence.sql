-- Reconciled with the migration version recorded by the live Supabase project.
-- Enable static SPA guest flows on normalized tables (replaces gamibar_live_rooms JSON blob).

alter table public.gamibar_rooms
  add column if not exists events jsonb not null default '[]'::jsonb;

comment on column public.gamibar_rooms.events is
  'Recent room event log for live UI (participant joins, progress, game lifecycle).';

create index if not exists gamibar_participants_reconnect_hash_idx
  on public.gamibar_participants (reconnect_token_hash);

create index if not exists gamibar_rooms_code_idx
  on public.gamibar_rooms (code);

-- Guest classroom: anon read/write (same trust model as gamibar_live_rooms).
grant select, insert, update on table public.gamibar_rooms to anon;
grant select, insert, update on table public.gamibar_participants to anon;
grant select, insert on table public.gamibar_quiz_answers to anon;
grant select, insert, update on table public.gamibar_attempts to anon;
grant select, insert, update on table public.gamibar_jigsaw_assets to anon;

drop policy if exists "rooms_select_anon" on public.gamibar_rooms;
create policy "rooms_select_anon"
  on public.gamibar_rooms for select to anon using (true);

drop policy if exists "rooms_insert_anon" on public.gamibar_rooms;
create policy "rooms_insert_anon"
  on public.gamibar_rooms for insert to anon with check (true);

drop policy if exists "rooms_update_anon" on public.gamibar_rooms;
create policy "rooms_update_anon"
  on public.gamibar_rooms for update to anon using (true) with check (true);

drop policy if exists "participants_select_anon" on public.gamibar_participants;
create policy "participants_select_anon"
  on public.gamibar_participants for select to anon using (true);

drop policy if exists "participants_insert_anon" on public.gamibar_participants;
create policy "participants_insert_anon"
  on public.gamibar_participants for insert to anon with check (true);

drop policy if exists "participants_update_anon" on public.gamibar_participants;
create policy "participants_update_anon"
  on public.gamibar_participants for update to anon using (true) with check (true);

drop policy if exists "quiz_answers_select_anon" on public.gamibar_quiz_answers;
create policy "quiz_answers_select_anon"
  on public.gamibar_quiz_answers for select to anon using (true);

drop policy if exists "quiz_answers_insert_anon" on public.gamibar_quiz_answers;
create policy "quiz_answers_insert_anon"
  on public.gamibar_quiz_answers for insert to anon with check (true);

drop policy if exists "attempts_select_anon" on public.gamibar_attempts;
create policy "attempts_select_anon"
  on public.gamibar_attempts for select to anon using (true);

drop policy if exists "attempts_insert_anon" on public.gamibar_attempts;
create policy "attempts_insert_anon"
  on public.gamibar_attempts for insert to anon with check (true);

drop policy if exists "attempts_update_anon" on public.gamibar_attempts;
create policy "attempts_update_anon"
  on public.gamibar_attempts for update to anon using (true) with check (true);

drop policy if exists "jigsaw_assets_select_anon" on public.gamibar_jigsaw_assets;
create policy "jigsaw_assets_select_anon"
  on public.gamibar_jigsaw_assets for select to anon using (true);

drop policy if exists "jigsaw_assets_insert_anon" on public.gamibar_jigsaw_assets;
create policy "jigsaw_assets_insert_anon"
  on public.gamibar_jigsaw_assets for insert to anon with check (true);

drop policy if exists "jigsaw_assets_update_anon" on public.gamibar_jigsaw_assets;
create policy "jigsaw_assets_update_anon"
  on public.gamibar_jigsaw_assets for update to anon using (true) with check (true);

-- Jigsaw uploads from guest authors during room creation.
update storage.buckets
set public = true
where id = 'gamibar-jigsaw';

drop policy if exists "jigsaw_storage_select_anon" on storage.objects;
create policy "jigsaw_storage_select_anon"
  on storage.objects for select to anon
  using (bucket_id = 'gamibar-jigsaw');

drop policy if exists "jigsaw_storage_insert_anon" on storage.objects;
create policy "jigsaw_storage_insert_anon"
  on storage.objects for insert to anon
  with check (bucket_id = 'gamibar-jigsaw');

drop policy if exists "jigsaw_storage_update_anon" on storage.objects;
create policy "jigsaw_storage_update_anon"
  on storage.objects for update to anon
  using (bucket_id = 'gamibar-jigsaw')
  with check (bucket_id = 'gamibar-jigsaw');
