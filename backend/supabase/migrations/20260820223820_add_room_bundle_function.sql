-- Consolidate normalized room reads into one service-role-only RPC.
-- The function returns one room and its gameplay child rows as JSON arrays.

create or replace function public.gamibar_get_room_bundle(p_room_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
returns null on null input
as $$
  select jsonb_build_object(
    'room', to_jsonb(room_row),
    'participants', coalesce(
      (
        select jsonb_agg(
          to_jsonb(participant_row)
          order by participant_row.joined_at, participant_row.id
        )
        from public.gamibar_participants as participant_row
        where participant_row.room_id = room_row.id
      ),
      '[]'::jsonb
    ),
    'quiz_answers', coalesce(
      (
        select jsonb_agg(
          to_jsonb(quiz_answer_row)
          order by quiz_answer_row.submitted_at, quiz_answer_row.id
        )
        from public.gamibar_quiz_answers as quiz_answer_row
        where quiz_answer_row.room_id = room_row.id
      ),
      '[]'::jsonb
    ),
    'visual_point_answers', coalesce(
      (
        select jsonb_agg(
          to_jsonb(visual_point_answer_row)
          order by visual_point_answer_row.submitted_at, visual_point_answer_row.id
        )
        from public.gamibar_visual_point_answers as visual_point_answer_row
        where visual_point_answer_row.room_id = room_row.id
      ),
      '[]'::jsonb
    ),
    'attempts', coalesce(
      (
        select jsonb_agg(
          to_jsonb(attempt_row)
          order by attempt_row.created_at, attempt_row.id
        )
        from public.gamibar_attempts as attempt_row
        where attempt_row.room_id = room_row.id
      ),
      '[]'::jsonb
    )
  )
  from public.gamibar_rooms as room_row
  where room_row.id = p_room_id;
$$;

revoke execute on function public.gamibar_get_room_bundle(uuid)
  from public, anon, authenticated;

grant execute on function public.gamibar_get_room_bundle(uuid)
  to service_role;

comment on function public.gamibar_get_room_bundle(uuid) is
  'Returns one normalized room bundle for trusted backend reads only.';
