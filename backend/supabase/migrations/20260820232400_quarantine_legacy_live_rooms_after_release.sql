-- Preserve the retired live-room snapshot table as a database-only archive after release.
-- Apply this migration only after the backend no longer references
-- public.gamibar_live_rooms.

do $$
begin
  if to_regclass('public.gamibar_live_rooms') is not null
     and to_regclass('private.gamibar_live_rooms') is not null then
    raise exception
      'cannot quarantine gamibar_live_rooms because both public and private copies exist';
  end if;

  if to_regclass('public.gamibar_live_rooms') is not null then
    alter table public.gamibar_live_rooms set schema private;
  end if;

  if to_regclass('private.gamibar_live_rooms') is null then
    raise exception
      'cannot quarantine gamibar_live_rooms because the legacy table does not exist';
  end if;
end
$$;

alter table private.gamibar_live_rooms enable row level security;

revoke all privileges on table private.gamibar_live_rooms
  from public, anon, authenticated, service_role;

comment on table private.gamibar_live_rooms is
  'Archive-only legacy room snapshots retained for recovery. Runtime application code must not read or write this table.';
