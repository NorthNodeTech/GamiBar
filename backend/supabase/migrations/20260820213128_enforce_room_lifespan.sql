-- Persist the room lifespan selected from the author's plan at creation time.
-- Existing rooms are grandfathered with no expiry because their creation plan is unknown.

alter table public.gamibar_rooms
  add column expires_at timestamptz;

comment on column public.gamibar_rooms.expires_at is
  'Room access expiry fixed at creation time. Null means an unlimited paid-plan room.';

create index gamibar_rooms_expires_at_idx
  on public.gamibar_rooms (expires_at)
  where expires_at is not null;
