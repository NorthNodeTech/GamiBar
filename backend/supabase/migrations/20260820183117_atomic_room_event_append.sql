-- Atomically append room timeline events without replacing events written by concurrent requests.
-- A room retains only its latest 200 events to keep snapshot rows bounded.

create or replace function public.gamibar_append_room_events(
  p_room_id uuid,
  p_events jsonb
)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  if jsonb_typeof(p_events) <> 'array' then
    raise exception 'p_events must be a json array';
  end if;

  update public.gamibar_rooms as rooms
  set events = (
    with expanded as (
      select
        entry.value,
        entry.ordinality,
        count(*) over () as total_count
      from jsonb_array_elements(coalesce(rooms.events, '[]'::jsonb) || p_events)
        with ordinality as entry(value, ordinality)
    )
    select coalesce(jsonb_agg(expanded.value order by expanded.ordinality), '[]'::jsonb)
    from expanded
    where expanded.ordinality > greatest(expanded.total_count - 200, 0)
  )
  where rooms.id = p_room_id;

  if not found then
    raise exception 'room not found';
  end if;
end;
$$;

revoke execute on function public.gamibar_append_room_events(uuid, jsonb) from public;
revoke execute on function public.gamibar_append_room_events(uuid, jsonb) from anon;
revoke execute on function public.gamibar_append_room_events(uuid, jsonb) from authenticated;
grant execute on function public.gamibar_append_room_events(uuid, jsonb) to service_role;
