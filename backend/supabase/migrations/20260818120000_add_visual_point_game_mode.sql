-- Add Target Hunt game mode, assets, and submitted target answers.

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typnamespace = 'public'::regnamespace
      and t.typname = 'gamibar_game_mode'
      and e.enumlabel = 'visual_point'
  ) then
    alter type public.gamibar_game_mode add value 'visual_point';
  end if;
end $$;

create table if not exists public.gamibar_visual_point_assets (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.gamibar_rooms (id) on delete cascade,
  question_id text not null
    check (char_length(question_id) between 1 and 80),
  storage_path text not null
    check (char_length(storage_path) between 1 and 512),
  mime_type text not null
    check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  width integer
    check (width is null or width between 1 and 4096),
  height integer
    check (height is null or height between 1 and 4096),
  byte_size integer
    check (byte_size is null or byte_size > 0),
  created_at timestamptz not null default now(),
  constraint gamibar_visual_point_assets_room_question_unique unique (room_id, question_id)
);

create table if not exists public.gamibar_visual_point_answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.gamibar_rooms (id) on delete cascade,
  participant_id uuid not null references public.gamibar_participants (id) on delete cascade,
  question_id text not null
    check (char_length(question_id) between 1 and 80),
  selected_point_id text not null
    check (char_length(selected_point_id) between 1 and 80),
  is_correct boolean not null,
  submitted_at timestamptz not null default now(),
  constraint gamibar_visual_point_answers_one_attempt unique (participant_id, question_id)
);

create index if not exists gamibar_visual_point_assets_room_id_idx
  on public.gamibar_visual_point_assets (room_id);

create index if not exists gamibar_visual_point_answers_room_id_idx
  on public.gamibar_visual_point_answers (room_id);

create index if not exists gamibar_visual_point_answers_participant_id_idx
  on public.gamibar_visual_point_answers (participant_id);

alter table public.gamibar_visual_point_assets enable row level security;
alter table public.gamibar_visual_point_answers enable row level security;

drop policy if exists "visual_point_assets_select" on public.gamibar_visual_point_assets;
create policy "visual_point_assets_select"
  on public.gamibar_visual_point_assets
  for select
  to authenticated
  using (
    (select private.is_room_author(room_id))
    or (select private.is_room_participant(room_id))
  );

drop policy if exists "visual_point_assets_insert_as_author" on public.gamibar_visual_point_assets;
create policy "visual_point_assets_insert_as_author"
  on public.gamibar_visual_point_assets
  for insert
  to authenticated
  with check ((select private.is_room_author(room_id)));

drop policy if exists "visual_point_assets_update_as_author" on public.gamibar_visual_point_assets;
create policy "visual_point_assets_update_as_author"
  on public.gamibar_visual_point_assets
  for update
  to authenticated
  using ((select private.is_room_author(room_id)))
  with check ((select private.is_room_author(room_id)));

drop policy if exists "visual_point_answers_select" on public.gamibar_visual_point_answers;
create policy "visual_point_answers_select"
  on public.gamibar_visual_point_answers
  for select
  to authenticated
  using (
    (select private.is_room_author(room_id))
    or exists (
      select 1
      from public.gamibar_participants p
      where p.id = participant_id
        and p.user_id = (select auth.uid())
    )
  );

grant select, insert, update on table public.gamibar_visual_point_assets to authenticated;
grant select, insert, update on table public.gamibar_visual_point_assets to anon;
grant select, insert, update on table public.gamibar_visual_point_answers to anon, authenticated;

drop policy if exists "visual_point_assets_select_anon" on public.gamibar_visual_point_assets;
create policy "visual_point_assets_select_anon"
  on public.gamibar_visual_point_assets
  for select
  to anon
  using (true);

drop policy if exists "visual_point_assets_insert_anon" on public.gamibar_visual_point_assets;
create policy "visual_point_assets_insert_anon"
  on public.gamibar_visual_point_assets
  for insert
  to anon
  with check (true);

drop policy if exists "visual_point_assets_update_anon" on public.gamibar_visual_point_assets;
create policy "visual_point_assets_update_anon"
  on public.gamibar_visual_point_assets
  for update
  to anon
  using (true)
  with check (true);

drop policy if exists "visual_point_answers_select_anon" on public.gamibar_visual_point_answers;
create policy "visual_point_answers_select_anon"
  on public.gamibar_visual_point_answers
  for select
  to anon
  using (true);

drop policy if exists "visual_point_answers_insert_anon" on public.gamibar_visual_point_answers;
create policy "visual_point_answers_insert_anon"
  on public.gamibar_visual_point_answers
  for insert
  to anon
  with check (true);

drop policy if exists "visual_point_answers_update_anon" on public.gamibar_visual_point_answers;
create policy "visual_point_answers_update_anon"
  on public.gamibar_visual_point_answers
  for update
  to anon
  using (true)
  with check (true);

drop policy if exists "visual_point_answers_insert_as_author" on public.gamibar_visual_point_answers;
create policy "visual_point_answers_insert_as_author"
  on public.gamibar_visual_point_answers
  for insert
  to authenticated
  with check ((select private.is_room_author(room_id)));

drop policy if exists "visual_point_answers_update_as_author" on public.gamibar_visual_point_answers;
create policy "visual_point_answers_update_as_author"
  on public.gamibar_visual_point_answers
  for update
  to authenticated
  using ((select private.is_room_author(room_id)))
  with check ((select private.is_room_author(room_id)));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gamibar-visual-point',
  'gamibar-visual-point',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path convention: {room_id}/{question_id}.{ext}
drop policy if exists "visual_point_storage_select_authenticated" on storage.objects;
create policy "visual_point_storage_select_authenticated"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'gamibar-visual-point'
    and (
      (select private.is_room_author((storage.foldername(name))[1]::uuid))
      or (select private.is_room_participant((storage.foldername(name))[1]::uuid))
    )
  );

drop policy if exists "visual_point_storage_select_anon" on storage.objects;
create policy "visual_point_storage_select_anon"
  on storage.objects
  for select
  to anon
  using (bucket_id = 'gamibar-visual-point');

drop policy if exists "visual_point_storage_insert_anon" on storage.objects;
create policy "visual_point_storage_insert_anon"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'gamibar-visual-point');

drop policy if exists "visual_point_storage_update_anon" on storage.objects;
create policy "visual_point_storage_update_anon"
  on storage.objects
  for update
  to anon
  using (bucket_id = 'gamibar-visual-point')
  with check (bucket_id = 'gamibar-visual-point');

drop policy if exists "visual_point_storage_insert_author" on storage.objects;
create policy "visual_point_storage_insert_author"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'gamibar-visual-point'
    and (select private.is_room_author((storage.foldername(name))[1]::uuid))
  );

drop policy if exists "visual_point_storage_update_author" on storage.objects;
create policy "visual_point_storage_update_author"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'gamibar-visual-point'
    and (select private.is_room_author((storage.foldername(name))[1]::uuid))
  )
  with check (
    bucket_id = 'gamibar-visual-point'
    and (select private.is_room_author((storage.foldername(name))[1]::uuid))
  );

drop policy if exists "visual_point_storage_delete_author" on storage.objects;
create policy "visual_point_storage_delete_author"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'gamibar-visual-point'
    and (select private.is_room_author((storage.foldername(name))[1]::uuid))
  );
