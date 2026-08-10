-- Consolidate multiple permissive SELECT policies into one OR policy per table.
-- Already applied remotely as gamibar_rls_consolidate_select.
-- Kept for local migration history parity on fresh databases that used the
-- earlier split-policy version of gamibar_core.

drop policy if exists "participants_select_as_author" on public.gamibar_participants;
drop policy if exists "participants_select_own" on public.gamibar_participants;
drop policy if exists "participants_select" on public.gamibar_participants;
create policy "participants_select"
  on public.gamibar_participants
  for select
  to authenticated
  using (
    (select private.is_room_author(room_id))
    or (user_id is not null and user_id = (select auth.uid()))
  );

drop policy if exists "quiz_answers_select_as_author" on public.gamibar_quiz_answers;
drop policy if exists "quiz_answers_select_own" on public.gamibar_quiz_answers;
drop policy if exists "quiz_answers_select" on public.gamibar_quiz_answers;
create policy "quiz_answers_select"
  on public.gamibar_quiz_answers
  for select
  to authenticated
  using (
    (select private.is_room_author(room_id))
    or exists (
      select 1
      from public.gamibar_participants p
      where p.id = participant_id
        and p.user_id = (select auth.uid())
    )
  );

drop policy if exists "attempts_select_as_author" on public.gamibar_attempts;
drop policy if exists "attempts_select_own" on public.gamibar_attempts;
drop policy if exists "attempts_select" on public.gamibar_attempts;
create policy "attempts_select"
  on public.gamibar_attempts
  for select
  to authenticated
  using (
    (select private.is_room_author(room_id))
    or exists (
      select 1
      from public.gamibar_participants p
      where p.id = participant_id
        and p.user_id = (select auth.uid())
    )
  );

drop policy if exists "jigsaw_assets_select_as_author" on public.gamibar_jigsaw_assets;
drop policy if exists "jigsaw_assets_select_as_participant" on public.gamibar_jigsaw_assets;
drop policy if exists "jigsaw_assets_select" on public.gamibar_jigsaw_assets;
create policy "jigsaw_assets_select"
  on public.gamibar_jigsaw_assets
  for select
  to authenticated
  using (
    (select private.is_room_author(room_id))
    or (select private.is_room_participant(room_id))
  );
