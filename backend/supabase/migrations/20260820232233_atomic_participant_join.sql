-- Atomically serialize account-free participant joins so host plan capacity cannot be
-- exceeded by concurrent requests. The Express service remains the only
-- caller; browser roles cannot execute this function directly.

create unique index if not exists gamibar_participants_room_display_name_key
  on public.gamibar_participants (room_id, lower(btrim(display_name)));

create or replace function public.gamibar_join_room(
  p_room_code text,
  p_participant_id uuid,
  p_attempt_id uuid,
  p_display_name text,
  p_reconnect_token_hash text,
  p_user_id uuid default null
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_display_name text := btrim(coalesce(p_display_name, ''));
  v_joined_at timestamptz;
  v_linked_user_id uuid;
  v_participant_count bigint;
  v_room public.gamibar_rooms%rowtype;
begin
  if p_room_code is null or btrim(p_room_code) !~ '^[1-9][0-9]{5}$' then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_ROOM_CODE',
      'error', 'Enter a valid 6-digit room code.'
    );
  end if;

  if p_participant_id is null or p_attempt_id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_JOIN_REQUEST',
      'error', 'Could not create the player session.'
    );
  end if;

  if char_length(v_display_name) = 0 then
    return jsonb_build_object(
      'ok', false,
      'code', 'NAME_REQUIRED',
      'error', 'Enter a display name.'
    );
  end if;

  if char_length(v_display_name) > 32 or v_display_name ~ '[[:cntrl:]]' then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_DISPLAY_NAME',
      'error', 'Use a display name of 32 characters or fewer.'
    );
  end if;

  if coalesce(p_reconnect_token_hash, '') !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_JOIN_REQUEST',
      'error', 'Could not create the player session.'
    );
  end if;

  select rooms.*
  into v_room
  from public.gamibar_rooms as rooms
  where rooms.code = btrim(p_room_code)
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'ROOM_NOT_FOUND',
      'error', 'Room code not found.'
    );
  end if;

  if v_room.expires_at is not null and v_room.expires_at <= now() then
    return jsonb_build_object(
      'ok', false,
      'code', 'ROOM_EXPIRED',
      'error', 'This room has expired. Ask the host to create a new room.'
    );
  end if;

  if v_room.status not in (
    'LOBBY'::public.gamibar_room_status,
    'READY'::public.gamibar_room_status
  ) then
    return jsonb_build_object(
      'ok', false,
      'code', 'ROOM_NOT_JOINABLE',
      'error', 'This room is closed or already in progress.'
    );
  end if;

  if exists (
    select 1
    from public.gamibar_participants as participants
    where participants.room_id = v_room.id
      and lower(btrim(participants.display_name)) = lower(v_display_name)
  ) then
    return jsonb_build_object(
      'ok', false,
      'code', 'DISPLAY_NAME_TAKEN',
      'error', 'That nickname is already in this room. Rejoin from the same device or choose another nickname.'
    );
  end if;

  if v_room.max_participants > 0 then
    select count(*)
    into v_participant_count
    from public.gamibar_participants as participants
    where participants.room_id = v_room.id;

    if v_participant_count >= v_room.max_participants then
      return jsonb_build_object(
        'ok', false,
        'code', 'ROOM_FULL',
        'error', format(
          'This room is full (%s players max).',
          v_room.max_participants
        )
      );
    end if;
  end if;

  if p_user_id is not null then
    select authors.id
    into v_linked_user_id
    from public.gamibar_authors as authors
    where authors.id = p_user_id;
  end if;

  v_joined_at := clock_timestamp();

  insert into public.gamibar_participants (
    id,
    room_id,
    user_id,
    display_name,
    status,
    reconnect_token_hash,
    joined_at,
    last_seen_at
  )
  values (
    p_participant_id,
    v_room.id,
    v_linked_user_id,
    v_display_name,
    'ONLINE'::public.gamibar_participant_status,
    p_reconnect_token_hash,
    v_joined_at,
    v_joined_at
  );

  insert into public.gamibar_attempts (
    id,
    room_id,
    participant_id,
    mode,
    payload
  )
  values (
    p_attempt_id,
    v_room.id,
    p_participant_id,
    v_room.mode,
    '{}'::jsonb
  );

  perform public.gamibar_append_room_events(
    v_room.id,
    jsonb_build_array(
      jsonb_build_object(
        'type', 'participant_joined',
        'participant', jsonb_build_object(
          'id', p_participant_id,
          'displayName', v_display_name,
          'status', 'ONLINE',
          'joinedAt', floor(extract(epoch from v_joined_at) * 1000)::bigint
        )
      )
    )
  );

  return jsonb_build_object(
    'ok', true,
    'roomId', v_room.id,
    'participantId', p_participant_id,
    'attemptId', p_attempt_id,
    'displayName', v_display_name,
    'joinedAt', floor(extract(epoch from v_joined_at) * 1000)::bigint,
    'mode', v_room.mode
  );
end;
$$;

revoke execute on function public.gamibar_join_room(
  text,
  uuid,
  uuid,
  text,
  text,
  uuid
) from public, anon, authenticated;

grant execute on function public.gamibar_join_room(
  text,
  uuid,
  uuid,
  text,
  text,
  uuid
) to service_role;

comment on function public.gamibar_join_room(
  text,
  uuid,
  uuid,
  text,
  text,
  uuid
) is
  'Atomically admits a free guest participant while enforcing the host room capacity.';

-- Move the host start transition behind the same room-row lock used by joins.
-- This makes "join versus start" deterministic: either the participant joins
-- before LIVE, or the join is rejected after LIVE.
create or replace function public.gamibar_start_room(
  p_room_id uuid,
  p_author_token_hash text,
  p_overall_limit_seconds integer default null,
  p_countdown_seconds integer default 3
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_ends_at timestamptz;
  v_participant_count bigint;
  v_room public.gamibar_rooms%rowtype;
  v_started_at timestamptz;
begin
  if p_room_id is null
     or coalesce(p_author_token_hash, '') !~ '^[0-9a-f]{64}$'
     or p_countdown_seconds not between 0 and 10
     or (
       p_overall_limit_seconds is not null
       and p_overall_limit_seconds not between 1 and 86400
     ) then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_START_REQUEST',
      'error', 'Could not start this room.'
    );
  end if;

  select rooms.*
  into v_room
  from public.gamibar_rooms as rooms
  where rooms.id = p_room_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'ROOM_NOT_FOUND',
      'error', 'Room not found.'
    );
  end if;

  if v_room.author_token_hash <> p_author_token_hash then
    return jsonb_build_object(
      'ok', false,
      'code', 'HOST_REQUIRED',
      'error', 'Only the host can start the game.'
    );
  end if;

  if v_room.expires_at is not null and v_room.expires_at <= now() then
    return jsonb_build_object(
      'ok', false,
      'code', 'ROOM_EXPIRED',
      'error', 'This room has expired. Duplicate it to create a new room.'
    );
  end if;

  if v_room.status not in (
    'LOBBY'::public.gamibar_room_status,
    'READY'::public.gamibar_room_status
  ) then
    return jsonb_build_object(
      'ok', false,
      'code', 'ROOM_NOT_STARTABLE',
      'error', format('Cannot start from status %s.', v_room.status)
    );
  end if;

  select count(*)
  into v_participant_count
  from public.gamibar_participants as participants
  where participants.room_id = v_room.id;

  if v_participant_count < 1 then
    return jsonb_build_object(
      'ok', false,
      'code', 'PARTICIPANT_REQUIRED',
      'error', 'Wait for at least one participant to join.'
    );
  end if;

  v_started_at := clock_timestamp();
  v_ends_at := case
    when p_overall_limit_seconds is null then null
    else v_started_at + make_interval(secs => p_overall_limit_seconds)
  end;

  update public.gamibar_rooms as rooms
  set status = 'LIVE'::public.gamibar_room_status,
      started_at = v_started_at,
      ends_at = v_ends_at
  where rooms.id = v_room.id;

  update public.gamibar_participants as participants
  set status = 'PLAYING'::public.gamibar_participant_status,
      last_seen_at = v_started_at
  where participants.room_id = v_room.id
    and participants.status not in (
      'DISCONNECTED'::public.gamibar_participant_status,
      'COMPLETED'::public.gamibar_participant_status
    );

  perform public.gamibar_append_room_events(
    v_room.id,
    jsonb_build_array(
      jsonb_build_object(
        'type', 'game_starting',
        'startsAt',
          floor(extract(epoch from v_started_at) * 1000)::bigint
          + p_countdown_seconds * 1000,
        'countdownSeconds', p_countdown_seconds
      ),
      jsonb_build_object(
        'type', 'game_started',
        'startedAt', floor(extract(epoch from v_started_at) * 1000)::bigint,
        'endsAt', case
          when v_ends_at is null then null
          else floor(extract(epoch from v_ends_at) * 1000)::bigint
        end
      )
    )
  );

  return jsonb_build_object(
    'ok', true,
    'roomId', v_room.id,
    'startedAt', floor(extract(epoch from v_started_at) * 1000)::bigint,
    'endsAt', case
      when v_ends_at is null then null
      else floor(extract(epoch from v_ends_at) * 1000)::bigint
    end,
    'countdownSeconds', p_countdown_seconds
  );
end;
$$;

revoke execute on function public.gamibar_start_room(uuid, text, integer, integer)
  from public, anon, authenticated;

grant execute on function public.gamibar_start_room(uuid, text, integer, integer)
  to service_role;

comment on function public.gamibar_start_room(uuid, text, integer, integer) is
  'Atomically closes room admission and starts a host-authorized live game.';
