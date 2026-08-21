-- Reconciled with the migration version recorded by the live Supabase project.
-- Scale author onboarding: confirm author emails on signup so sign-in works immediately.
-- Adds profile index for role-based lookups at scale.

create or replace function private.auto_confirm_author_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.raw_app_meta_data ->> 'role', '') = 'author'
     or coalesce(new.raw_user_meta_data ->> 'signup_role', '') = 'author' then
    new.email_confirmed_at := coalesce(new.email_confirmed_at, timezone('utc', now()));
    new.confirmed_at := coalesce(new.confirmed_at, timezone('utc', now()));
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_before_insert_auto_confirm_author on auth.users;

create trigger on_auth_user_before_insert_auto_confirm_author
  before insert on auth.users
  for each row
  execute function private.auto_confirm_author_email();

revoke all on function private.auto_confirm_author_email() from public;

create index if not exists gamibar_profiles_role_created_idx
  on public.gamibar_profiles (role, created_at desc);

comment on index public.gamibar_profiles_role_created_idx is
  'Supports author/student listings and analytics at scale.';
