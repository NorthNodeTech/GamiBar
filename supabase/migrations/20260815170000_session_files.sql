create table if not exists public.gamibar_session_file_shares (
  room_id uuid primary key references public.gamibar_rooms(id) on delete cascade,
  share_slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gamibar_session_file_shares_share_slug_format check (share_slug ~ '^[A-Za-z0-9_-]{24,80}$')
);

create table if not exists public.gamibar_session_files (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.gamibar_rooms(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  byte_size bigint not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  deleted_at timestamptz,
  downloaded_count integer not null default 0,
  last_downloaded_at timestamptz,
  constraint gamibar_session_files_name_length check (char_length(original_name) between 1 and 180),
  constraint gamibar_session_files_path_length check (char_length(storage_path) between 1 and 512),
  constraint gamibar_session_files_path_room_prefix check (storage_path like (room_id::text || '/%')),
  constraint gamibar_session_files_byte_size check (byte_size > 0 and byte_size <= 52428800),
  constraint gamibar_session_files_expires_after_create check (expires_at > created_at),
  constraint gamibar_session_files_mime_type_check check (
    mime_type in (
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    )
  )
);

create index if not exists gamibar_session_file_shares_share_slug_room_idx
  on public.gamibar_session_file_shares (share_slug, room_id);

create index if not exists gamibar_session_files_room_active_idx
  on public.gamibar_session_files (room_id, expires_at)
  where deleted_at is null;

create index if not exists gamibar_session_files_cleanup_idx
  on public.gamibar_session_files (expires_at, room_id)
  where deleted_at is null;

alter table public.gamibar_session_file_shares enable row level security;
alter table public.gamibar_session_files enable row level security;

drop policy if exists "Authors can read session file shares" on public.gamibar_session_file_shares;
create policy "Authors can read session file shares"
  on public.gamibar_session_file_shares
  for select
  to authenticated
  using ((select private.is_room_author(room_id)));

drop policy if exists "Authors can read session files" on public.gamibar_session_files;
create policy "Authors can read session files"
  on public.gamibar_session_files
  for select
  to authenticated
  using ((select private.is_room_author(room_id)));

revoke all on public.gamibar_session_file_shares from anon;
revoke all on public.gamibar_session_files from anon;
grant select on public.gamibar_session_file_shares to authenticated;
grant select on public.gamibar_session_files to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gamibar-session-files',
  'gamibar-session-files',
  false,
  52428800,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
