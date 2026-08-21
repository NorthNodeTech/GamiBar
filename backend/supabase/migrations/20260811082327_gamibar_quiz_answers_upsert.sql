-- Reconciled with the migration version recorded by the live Supabase project.
-- Upsert on gamibar_quiz_answers requires UPDATE policies (on_conflict=participant_id,question_id).
-- Without these, duplicate submits and persist() upserts fail for anon classroom players.

grant update on table public.gamibar_quiz_answers to anon;

drop policy if exists "quiz_answers_update_anon" on public.gamibar_quiz_answers;
create policy "quiz_answers_update_anon"
  on public.gamibar_quiz_answers
  for update
  to anon
  using (true)
  with check (true);

drop policy if exists "quiz_answers_update_as_author" on public.gamibar_quiz_answers;
create policy "quiz_answers_update_as_author"
  on public.gamibar_quiz_answers
  for update
  to authenticated
  using ((select private.is_room_author(room_id)))
  with check ((select private.is_room_author(room_id)));
