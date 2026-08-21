-- Reconciled with the migration version recorded by the live Supabase project.
-- Author portal Google OAuth: claim author role after OAuth callback.

create or replace function public.claim_author_role_for_portal()
returns public.gamibar_user_role
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  current_role public.gamibar_user_role;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select role into current_role
  from public.gamibar_profiles
  where id = uid;

  if current_role is null then
    raise exception 'Profile not found';
  end if;

  if current_role = 'author'::public.gamibar_user_role then
    return current_role;
  end if;

  update public.gamibar_profiles
  set role = 'author'::public.gamibar_user_role,
      updated_at = now()
  where id = uid
    and role = 'student'::public.gamibar_user_role;

  return 'author'::public.gamibar_user_role;
end;
$$;

revoke all on function public.claim_author_role_for_portal() from public;
grant execute on function public.claim_author_role_for_portal() to authenticated;

-- Prefer Google profile name on OAuth signup.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_role public.gamibar_user_role;
  chosen_name text;
begin
  chosen_role := case
    when coalesce(new.raw_app_meta_data ->> 'role', '') = 'author'
      then 'author'::public.gamibar_user_role
    when coalesce(new.raw_user_meta_data ->> 'signup_role', '') = 'author'
      then 'author'::public.gamibar_user_role
    else 'student'::public.gamibar_user_role
  end;

  chosen_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'Player'
  );

  insert into public.gamibar_profiles (id, display_name, role)
  values (new.id, left(chosen_name, 80), chosen_role)
  on conflict (id) do update
    set display_name = excluded.display_name,
        role = excluded.role,
        updated_at = now()
  where public.gamibar_profiles.role is distinct from excluded.role
     or public.gamibar_profiles.display_name is distinct from excluded.display_name;

  return new;
end;
$$;
