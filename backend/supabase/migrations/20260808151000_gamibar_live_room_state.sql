-- Shared live room state for static SPA (no Node server).

create table public.gamibar_live_rooms (
  id text primary key,
  code text not null,
  author_token text not null,
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gamibar_live_rooms_code_unique unique (code),
  constraint gamibar_live_rooms_code_format check (code ~ '^[1-9][0-9]{5}$')
);

create index gamibar_live_rooms_updated_at_idx
  on public.gamibar_live_rooms (updated_at desc);

alter table public.gamibar_live_rooms enable row level security;

create policy "live_rooms_select_anon"
  on public.gamibar_live_rooms
  for select
  to anon, authenticated
  using (true);

create policy "live_rooms_insert_anon"
  on public.gamibar_live_rooms
  for insert
  to anon, authenticated
  with check (true);

create policy "live_rooms_update_anon"
  on public.gamibar_live_rooms
  for update
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update on table public.gamibar_live_rooms to anon, authenticated;
