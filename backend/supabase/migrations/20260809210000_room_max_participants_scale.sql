-- Let authors set large room caps (up to 100k players per room).

alter table public.gamibar_rooms
  drop constraint if exists gamibar_rooms_max_participants_check;

alter table public.gamibar_rooms
  add constraint gamibar_rooms_max_participants_check
  check (max_participants >= 1 and max_participants <= 100000);

alter table public.gamibar_rooms
  alter column max_participants set default 500;

comment on column public.gamibar_rooms.max_participants is
  'Maximum students that can join this room. Set by the author when creating the session.';
