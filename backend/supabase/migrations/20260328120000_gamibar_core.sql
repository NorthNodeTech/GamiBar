-- GamiBAR core schema
-- Classroom live sessions: rooms, participants, quiz/jigsaw/maze content & scores.
-- Apply ONLY to a dedicated GamiBAR Supabase project.

-- ---------------------------------------------------------------------------
-- Extensions & private helpers
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto" with schema extensions;

create schema if not exists private;

revoke all on schema private from public;
-- authenticated needs USAGE so RLS policies can call private.is_room_* helpers.
grant usage on schema private to postgres, service_role, authenticated;

-- ---------------------------------------------------------------------------
-- Enums (match src/lib/game state-machine + config)
-- ---------------------------------------------------------------------------
create type public.gamibar_room_status as enum (
  'DRAFT',
  'LOBBY',
  'READY',
  'COUNTDOWN',
  'LIVE',
  'FINISHED',
  'CANCELLED'
);

create type public.gamibar_game_mode as enum ('quiz', 'jigsaw', 'maze');

create type public.gamibar_participant_status as enum (
  'ONLINE',
  'DISCONNECTED',
  'PLAYING',
  'COMPLETED'
);

create type public.gamibar_user_role as enum ('author', 'student');

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users when signed in)
-- ---------------------------------------------------------------------------
create table public.gamibar_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null
    check (char_length(trim(display_name)) between 1 and 80),
  role public.gamibar_user_role not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.gamibar_profiles is
  'Signed-in author/student profiles. Guests are not stored here.';

-- ---------------------------------------------------------------------------
-- Rooms
-- ---------------------------------------------------------------------------
create table public.gamibar_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null
    constraint gamibar_rooms_code_format
      check (code ~ '^[1-9][0-9]{5}$'),
  name text not null
    check (char_length(trim(name)) between 1 and 80),
  subject text not null default 'General'
    check (char_length(subject) <= 60),
  -- Nullable so guest authors (no auth.users yet) can host sessions.
  author_id uuid references public.gamibar_profiles (id) on delete set null,
  author_name text not null
    check (char_length(trim(author_name)) between 1 and 80),
  -- SHA-256 hex of author capability token (never store raw token).
  author_token_hash text not null,
  status public.gamibar_room_status not null default 'LOBBY',
  mode public.gamibar_game_mode not null,
  -- Full GamePayload including quiz correctOption / maze pairs.
  -- Students must never receive this JSON raw while LIVE; strip via RPC/server.
  config jsonb not null default '{}'::jsonb,
  max_participants integer not null default 80
    check (max_participants between 1 and 200),
  started_at timestamptz,
  ends_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gamibar_rooms_code_unique unique (code)
);

comment on column public.gamibar_rooms.config is
  'Mode payload: quiz questions (+correctOption), jigsaw meta, or maze pairs.';
comment on column public.gamibar_rooms.author_token_hash is
  'sha256(hex) of authorToken; validated by server / RPCs only.';

-- ---------------------------------------------------------------------------
-- Participants (students in a room; guests allowed)
-- ---------------------------------------------------------------------------
create table public.gamibar_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.gamibar_rooms (id) on delete cascade,
  user_id uuid references public.gamibar_profiles (id) on delete set null,
  display_name text not null
    check (char_length(trim(display_name)) between 1 and 32),
  status public.gamibar_participant_status not null default 'ONLINE',
  -- SHA-256 hex of reconnect capability token.
  reconnect_token_hash text not null,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint gamibar_participants_reconnect_token_unique unique (reconnect_token_hash)
);

comment on table public.gamibar_participants is
  'Students in a live session. user_id null = guest join.';

-- ---------------------------------------------------------------------------
-- Quiz answers (one attempt per question)
-- ---------------------------------------------------------------------------
create table public.gamibar_quiz_answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.gamibar_rooms (id) on delete cascade,
  participant_id uuid not null references public.gamibar_participants (id) on delete cascade,
  question_id text not null
    check (char_length(question_id) between 1 and 64),
  selected_option text not null
    check (selected_option in ('A', 'B', 'C', 'D')),
  is_correct boolean not null,
  submitted_at timestamptz not null default now(),
  constraint gamibar_quiz_answers_one_attempt unique (participant_id, question_id)
);

-- ---------------------------------------------------------------------------
-- Attempts (progress / score per participant per room)
-- ---------------------------------------------------------------------------
create table public.gamibar_attempts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.gamibar_rooms (id) on delete cascade,
  participant_id uuid not null references public.gamibar_participants (id) on delete cascade,
  mode public.gamibar_game_mode not null,
  progress numeric(5,4) not null default 0
    check (progress >= 0 and progress <= 1),
  correct_count integer not null default 0
    check (correct_count >= 0),
  score numeric(12,2),
  duration_ms integer
    check (duration_ms is null or duration_ms >= 0),
  completed boolean not null default false,
  completed_at timestamptz,
  -- Mode-specific extras (maze connections, jigsaw lockedCount, etc.).
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gamibar_attempts_one_per_participant unique (room_id, participant_id)
);

-- ---------------------------------------------------------------------------
-- Jigsaw asset metadata (binary lives in Storage)
-- ---------------------------------------------------------------------------
create table public.gamibar_jigsaw_assets (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null unique references public.gamibar_rooms (id) on delete cascade,
  storage_path text not null
    check (char_length(storage_path) between 1 and 512),
  mime_type text not null
    check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  cols integer not null default 5 check (cols between 1 and 12),
  rows integer not null default 2 check (rows between 1 and 12),
  byte_size integer check (byte_size is null or byte_size > 0),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes (FK + hot paths)
-- ---------------------------------------------------------------------------
create index gamibar_rooms_author_id_idx
  on public.gamibar_rooms (author_id);

create index gamibar_rooms_status_active_idx
  on public.gamibar_rooms (status)
  where status in ('LOBBY', 'READY', 'COUNTDOWN', 'LIVE');

create index gamibar_rooms_created_at_idx
  on public.gamibar_rooms (created_at desc);

create index gamibar_participants_room_id_idx
  on public.gamibar_participants (room_id);

create index gamibar_participants_user_id_idx
  on public.gamibar_participants (user_id)
  where user_id is not null;

create index gamibar_quiz_answers_room_id_idx
  on public.gamibar_quiz_answers (room_id);

create index gamibar_quiz_answers_participant_id_idx
  on public.gamibar_quiz_answers (participant_id);

create index gamibar_attempts_room_id_idx
  on public.gamibar_attempts (room_id);

create index gamibar_attempts_participant_id_idx
  on public.gamibar_attempts (participant_id);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger gamibar_profiles_set_updated_at
  before update on public.gamibar_profiles
  for each row execute function private.set_updated_at();

create trigger gamibar_rooms_set_updated_at
  before update on public.gamibar_rooms
  for each row execute function private.set_updated_at();

create trigger gamibar_attempts_set_updated_at
  before update on public.gamibar_attempts
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create profile on auth signup
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_role public.gamibar_user_role;
  chosen_name text;
begin
  -- Prefer app_metadata.role (not user-editable user_metadata).
  chosen_role := case
    when coalesce(new.raw_app_meta_data ->> 'role', '') = 'author' then 'author'::public.gamibar_user_role
    else 'student'::public.gamibar_user_role
  end;

  chosen_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'Player'
  );

  insert into public.gamibar_profiles (id, display_name, role)
  values (new.id, left(chosen_name, 80), chosen_role)
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;
revoke all on function private.set_updated_at() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS helpers (security definer, locked down)
-- ---------------------------------------------------------------------------
create or replace function private.is_room_author(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.gamibar_rooms r
    where r.id = p_room_id
      and r.author_id is not null
      and r.author_id = (select auth.uid())
  );
$$;

create or replace function private.is_room_participant(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.gamibar_participants p
    where p.room_id = p_room_id
      and p.user_id is not null
      and p.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_room_author(uuid) from public;
revoke all on function private.is_room_participant(uuid) from public;
grant execute on function private.is_room_author(uuid) to authenticated;
grant execute on function private.is_room_participant(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Guest / token flows go through server (service_role). Direct client access
-- is for signed-in authors & participants only.
-- ---------------------------------------------------------------------------
alter table public.gamibar_profiles enable row level security;
alter table public.gamibar_rooms enable row level security;
alter table public.gamibar_participants enable row level security;
alter table public.gamibar_quiz_answers enable row level security;
alter table public.gamibar_attempts enable row level security;
alter table public.gamibar_jigsaw_assets enable row level security;

-- Profiles
create policy "profiles_select_own"
  on public.gamibar_profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.gamibar_profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Rooms: authors manage their rooms.
-- Note: config contains quiz keys — keep guest/student reads on the server.
create policy "rooms_select_own"
  on public.gamibar_rooms
  for select
  to authenticated
  using ((select auth.uid()) = author_id);

create policy "rooms_insert_own"
  on public.gamibar_rooms
  for insert
  to authenticated
  with check ((select auth.uid()) = author_id);

create policy "rooms_update_own"
  on public.gamibar_rooms
  for update
  to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

create policy "rooms_delete_own"
  on public.gamibar_rooms
  for delete
  to authenticated
  using ((select auth.uid()) = author_id);

-- Participants
create policy "participants_select"
  on public.gamibar_participants
  for select
  to authenticated
  using (
    (select private.is_room_author(room_id))
    or (user_id is not null and user_id = (select auth.uid()))
  );

create policy "participants_update_own"
  on public.gamibar_participants
  for update
  to authenticated
  using (
    user_id is not null
    and user_id = (select auth.uid())
  )
  with check (
    user_id is not null
    and user_id = (select auth.uid())
  );

-- Quiz answers (authors see all in room; players see own)
create policy "quiz_answers_select"
  on public.gamibar_quiz_answers
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

-- Attempts
create policy "attempts_select"
  on public.gamibar_attempts
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

-- Jigsaw assets (author + participants in room)
create policy "jigsaw_assets_select"
  on public.gamibar_jigsaw_assets
  for select
  to authenticated
  using (
    (select private.is_room_author(room_id))
    or (select private.is_room_participant(room_id))
  );

create policy "jigsaw_assets_insert_as_author"
  on public.gamibar_jigsaw_assets
  for insert
  to authenticated
  with check ((select private.is_room_author(room_id)));

create policy "jigsaw_assets_update_as_author"
  on public.gamibar_jigsaw_assets
  for update
  to authenticated
  using ((select private.is_room_author(room_id)))
  with check ((select private.is_room_author(room_id)));

-- ---------------------------------------------------------------------------
-- Grants (Data API). Writes for gameplay go through service_role / RPCs.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select, update on table public.gamibar_profiles to authenticated;

grant select, insert, update, delete on table public.gamibar_rooms to authenticated;

grant select, update on table public.gamibar_participants to authenticated;

grant select on table public.gamibar_quiz_answers to authenticated;

grant select on table public.gamibar_attempts to authenticated;

grant select, insert, update on table public.gamibar_jigsaw_assets to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: jigsaw originals (private bucket)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gamibar-jigsaw',
  'gamibar-jigsaw',
  false,
  8388608, -- 8 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path convention: {room_id}/{filename}
create policy "jigsaw_storage_select_authenticated"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'gamibar-jigsaw'
    and (
      (select private.is_room_author((storage.foldername(name))[1]::uuid))
      or (select private.is_room_participant((storage.foldername(name))[1]::uuid))
    )
  );

create policy "jigsaw_storage_insert_author"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'gamibar-jigsaw'
    and (select private.is_room_author((storage.foldername(name))[1]::uuid))
  );

create policy "jigsaw_storage_update_author"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'gamibar-jigsaw'
    and (select private.is_room_author((storage.foldername(name))[1]::uuid))
  )
  with check (
    bucket_id = 'gamibar-jigsaw'
    and (select private.is_room_author((storage.foldername(name))[1]::uuid))
  );

create policy "jigsaw_storage_delete_author"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'gamibar-jigsaw'
    and (select private.is_room_author((storage.foldername(name))[1]::uuid))
  );
