-- Lock the Data API to the Express backend and harden privileged functions.
-- Browser clients use Supabase Auth and Realtime Broadcast, not direct table writes.

-- The current frontend has no caller for this legacy self-promotion RPC.
drop function if exists public.claim_author_role_for_portal();

-- Email verification must be performed by Supabase Auth. The previous trigger
-- trusted user-editable metadata and automatically confirmed author signups.
drop trigger if exists on_auth_user_before_insert_auto_confirm_author on auth.users;
drop function if exists private.auto_confirm_author_email();

-- Every account created by this author-only portal is an author. Do not use
-- raw_user_meta_data for authorization decisions; it remains display data only.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  chosen_name text;
begin
  chosen_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'Player'
  );

  insert into public.gamibar_authors (id, display_name, role)
  values (new.id, left(chosen_name, 80), 'author'::public.gamibar_user_role)
  on conflict (id) do update
    set display_name = excluded.display_name,
        updated_at = now()
  where public.gamibar_authors.display_name is distinct from excluded.display_name;

  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated, service_role;

-- This counter is called only by the Express backend's service-role client.
-- SECURITY INVOKER is sufficient because service_role bypasses RLS.
create or replace function public.increment_jigsaw_library_usage(p_image_id uuid)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  update public.jigsaw_library_images
  set usage_count = usage_count + 1
  where id = p_image_id
    and status = 'active';
end;
$$;

revoke execute on function public.increment_jigsaw_library_usage(uuid)
  from public, anon, authenticated;
grant execute on function public.increment_jigsaw_library_usage(uuid)
  to service_role;

-- Trigger helpers are not public RPC endpoints.
create or replace function public.set_jigsaw_library_images_updated_at()
returns trigger
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.set_jigsaw_library_images_updated_at()
  from public, anon, authenticated, service_role;
revoke execute on function private.enforce_session_file_limit()
  from public, anon, authenticated, service_role;
revoke execute on function private.set_updated_at()
  from public, anon, authenticated, service_role;

-- RLS lookup helpers are retained for migration compatibility but are no
-- longer directly executable now that browser Data API access is disabled.
revoke execute on function private.is_room_author(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function private.is_room_participant(uuid)
  from public, anon, authenticated, service_role;
revoke usage on schema private from anon, authenticated;

-- Remove legacy anonymous access that exposed room configuration, answers,
-- participant data, reconnect hashes, and the plaintext legacy author token.
drop policy if exists "live_rooms_select_anon" on public.gamibar_live_rooms;
drop policy if exists "live_rooms_insert_anon" on public.gamibar_live_rooms;
drop policy if exists "live_rooms_update_anon" on public.gamibar_live_rooms;

drop policy if exists "rooms_select_anon" on public.gamibar_rooms;
drop policy if exists "rooms_insert_anon" on public.gamibar_rooms;
drop policy if exists "rooms_update_anon" on public.gamibar_rooms;

drop policy if exists "participants_select_anon" on public.gamibar_participants;
drop policy if exists "participants_insert_anon" on public.gamibar_participants;
drop policy if exists "participants_update_anon" on public.gamibar_participants;

drop policy if exists "quiz_answers_select_anon" on public.gamibar_quiz_answers;
drop policy if exists "quiz_answers_insert_anon" on public.gamibar_quiz_answers;
drop policy if exists "quiz_answers_update_anon" on public.gamibar_quiz_answers;

drop policy if exists "attempts_select_anon" on public.gamibar_attempts;
drop policy if exists "attempts_insert_anon" on public.gamibar_attempts;
drop policy if exists "attempts_update_anon" on public.gamibar_attempts;

drop policy if exists "jigsaw_assets_select_anon" on public.gamibar_jigsaw_assets;
drop policy if exists "jigsaw_assets_insert_anon" on public.gamibar_jigsaw_assets;
drop policy if exists "jigsaw_assets_update_anon" on public.gamibar_jigsaw_assets;

drop policy if exists "visual_point_assets_select_anon" on public.gamibar_visual_point_assets;
drop policy if exists "visual_point_assets_insert_anon" on public.gamibar_visual_point_assets;
drop policy if exists "visual_point_assets_update_anon" on public.gamibar_visual_point_assets;

drop policy if exists "visual_point_answers_select_anon" on public.gamibar_visual_point_answers;
drop policy if exists "visual_point_answers_insert_anon" on public.gamibar_visual_point_answers;
drop policy if exists "visual_point_answers_update_anon" on public.gamibar_visual_point_answers;

-- All reads and mutations now go through the Express backend. RLS stays
-- enabled with no browser policies, which is deny-by-default defense in depth.
drop policy if exists "authors_select_own" on public.gamibar_authors;
drop policy if exists "authors_update_own" on public.gamibar_authors;
drop policy if exists "rooms_select_own" on public.gamibar_rooms;
drop policy if exists "rooms_insert_own" on public.gamibar_rooms;
drop policy if exists "rooms_update_own" on public.gamibar_rooms;
drop policy if exists "rooms_delete_own" on public.gamibar_rooms;
drop policy if exists "participants_select" on public.gamibar_participants;
drop policy if exists "participants_update_own" on public.gamibar_participants;
drop policy if exists "participants_insert_as_author" on public.gamibar_participants;
drop policy if exists "participants_update_as_author" on public.gamibar_participants;
drop policy if exists "attempts_select" on public.gamibar_attempts;
drop policy if exists "attempts_insert_as_author" on public.gamibar_attempts;
drop policy if exists "attempts_update_as_author" on public.gamibar_attempts;
drop policy if exists "quiz_answers_select" on public.gamibar_quiz_answers;
drop policy if exists "quiz_answers_insert_as_author" on public.gamibar_quiz_answers;
drop policy if exists "quiz_answers_update_as_author" on public.gamibar_quiz_answers;
drop policy if exists "jigsaw_assets_select" on public.gamibar_jigsaw_assets;
drop policy if exists "jigsaw_assets_insert_as_author" on public.gamibar_jigsaw_assets;
drop policy if exists "jigsaw_assets_update_as_author" on public.gamibar_jigsaw_assets;
drop policy if exists "visual_point_assets_select" on public.gamibar_visual_point_assets;
drop policy if exists "visual_point_assets_insert_as_author" on public.gamibar_visual_point_assets;
drop policy if exists "visual_point_assets_update_as_author" on public.gamibar_visual_point_assets;
drop policy if exists "visual_point_answers_select" on public.gamibar_visual_point_answers;
drop policy if exists "visual_point_answers_insert_as_author" on public.gamibar_visual_point_answers;
drop policy if exists "visual_point_answers_update_as_author" on public.gamibar_visual_point_answers;
drop policy if exists "jigsaw_categories_select_active" on public.jigsaw_categories;
drop policy if exists "jigsaw_subtopics_select_active" on public.jigsaw_subtopics;
drop policy if exists "jigsaw_library_images_select_active" on public.jigsaw_library_images;
drop policy if exists "Authors can read session file shares" on public.gamibar_session_file_shares;
drop policy if exists "Authors can read session files" on public.gamibar_session_files;

-- Storage reads remain available for public educational images, but browser
-- clients can no longer upload, overwrite, or delete bucket objects directly.
drop policy if exists "jigsaw_storage_insert_anon" on storage.objects;
drop policy if exists "jigsaw_storage_update_anon" on storage.objects;
drop policy if exists "jigsaw_storage_select_anon" on storage.objects;
drop policy if exists "jigsaw_storage_select_authenticated" on storage.objects;
drop policy if exists "jigsaw_storage_insert_author" on storage.objects;
drop policy if exists "jigsaw_storage_update_author" on storage.objects;
drop policy if exists "jigsaw_storage_delete_author" on storage.objects;
drop policy if exists "jigsaw_library_storage_select" on storage.objects;
drop policy if exists "visual_point_storage_insert_anon" on storage.objects;
drop policy if exists "visual_point_storage_update_anon" on storage.objects;
drop policy if exists "visual_point_storage_select_anon" on storage.objects;
drop policy if exists "visual_point_storage_select_authenticated" on storage.objects;
drop policy if exists "visual_point_storage_insert_author" on storage.objects;
drop policy if exists "visual_point_storage_update_author" on storage.objects;
drop policy if exists "visual_point_storage_delete_author" on storage.objects;

-- Remove direct Data API privileges. The backend service role keeps its
-- existing access and continues to be constrained by server-side validation.
revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.gamibar_append_room_events(uuid, jsonb) to service_role;
grant execute on function public.increment_jigsaw_library_usage(uuid) to service_role;

-- Make future public objects opt-in instead of automatically Data API exposed.
alter default privileges for role postgres in schema public
  revoke all privileges on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all privileges on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
