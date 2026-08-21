-- Reconciled with the migration version recorded by the live Supabase project.
-- Author self-registration: set profile role when signup_role metadata is author.

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
