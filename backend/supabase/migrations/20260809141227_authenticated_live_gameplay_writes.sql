-- Reconciled with the migration version recorded by the live Supabase project.
-- Signed-in authors use the authenticated role, but live session writes were only granted to anon.
-- This blocked persist() during start/stop game for logged-in hosts.

grant insert, update on table public.gamibar_participants to authenticated;
grant insert, update on table public.gamibar_attempts to authenticated;
grant insert on table public.gamibar_quiz_answers to authenticated;

drop policy if exists "participants_insert_as_author" on public.gamibar_participants;
create policy "participants_insert_as_author"
  on public.gamibar_participants
  for insert
  to authenticated
  with check ((select private.is_room_author(room_id)));

drop policy if exists "participants_update_as_author" on public.gamibar_participants;
create policy "participants_update_as_author"
  on public.gamibar_participants
  for update
  to authenticated
  using ((select private.is_room_author(room_id)))
  with check ((select private.is_room_author(room_id)));

drop policy if exists "attempts_insert_as_author" on public.gamibar_attempts;
create policy "attempts_insert_as_author"
  on public.gamibar_attempts
  for insert
  to authenticated
  with check ((select private.is_room_author(room_id)));

drop policy if exists "attempts_update_as_author" on public.gamibar_attempts;
create policy "attempts_update_as_author"
  on public.gamibar_attempts
  for update
  to authenticated
  using ((select private.is_room_author(room_id)))
  with check ((select private.is_room_author(room_id)));

drop policy if exists "quiz_answers_insert_as_author" on public.gamibar_quiz_answers;
create policy "quiz_answers_insert_as_author"
  on public.gamibar_quiz_answers
  for insert
  to authenticated
  with check ((select private.is_room_author(room_id)));
