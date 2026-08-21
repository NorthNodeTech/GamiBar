-- Reconciled with the migration version recorded by the live Supabase project.
-- Unlimited room capacity: max_participants = 0 means no join cap.

alter table public.gamibar_rooms
  drop constraint if exists gamibar_rooms_max_participants_check;

alter table public.gamibar_rooms
  add constraint gamibar_rooms_max_participants_check
  check (max_participants >= 0);

alter table public.gamibar_rooms
  alter column max_participants set default 0;

update public.gamibar_rooms
set max_participants = 0
where max_participants <> 0;

comment on column public.gamibar_rooms.max_participants is
  '0 = unlimited players. Legacy positive values are treated as a cap in older clients only.';
