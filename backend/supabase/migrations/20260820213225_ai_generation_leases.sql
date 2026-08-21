-- Coordinate AI generation across backend instances without a custom lock server.

create table public.gamibar_ai_generation_leases (
  author_id uuid primary key references public.gamibar_authors (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

comment on table public.gamibar_ai_generation_leases is
  'Short server-only leases that prevent concurrent AI generation for one author across instances.';

create index gamibar_ai_generation_leases_expires_at_idx
  on public.gamibar_ai_generation_leases (expires_at);

create or replace function public.gamibar_acquire_ai_generation_lease(
  p_author_id uuid,
  p_lease_seconds integer default 120
)
returns boolean
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  acquired_author_id uuid;
begin
  if p_lease_seconds < 15 or p_lease_seconds > 300 then
    raise exception 'lease duration must be between 15 and 300 seconds';
  end if;

  insert into public.gamibar_ai_generation_leases as leases (
    author_id,
    expires_at
  )
  values (
    p_author_id,
    now() + make_interval(secs => p_lease_seconds)
  )
  on conflict (author_id)
  do update
  set
    expires_at = excluded.expires_at,
    created_at = now()
  where leases.expires_at <= now()
  returning author_id into acquired_author_id;

  return acquired_author_id is not null;
end;
$$;

create or replace function public.gamibar_release_ai_generation_lease(
  p_author_id uuid
)
returns void
language sql
volatile
security invoker
set search_path = ''
as $$
  delete from public.gamibar_ai_generation_leases
  where author_id = p_author_id;
$$;

alter table public.gamibar_ai_generation_leases enable row level security;
alter table public.gamibar_ai_generation_leases force row level security;

revoke all privileges on table public.gamibar_ai_generation_leases from anon, authenticated;
grant select, insert, update, delete on table public.gamibar_ai_generation_leases to service_role;

revoke execute on function public.gamibar_acquire_ai_generation_lease(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.gamibar_acquire_ai_generation_lease(uuid, integer)
  to service_role;

revoke execute on function public.gamibar_release_ai_generation_lease(uuid)
  from public, anon, authenticated;
grant execute on function public.gamibar_release_ai_generation_lease(uuid)
  to service_role;
