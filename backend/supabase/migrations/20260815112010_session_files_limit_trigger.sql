-- Reconciled with the migration version recorded by the live Supabase project.
create or replace function private.enforce_session_file_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  active_count integer;
begin
  if new.deleted_at is null and new.expires_at > now() then
    select count(*)
      into active_count
    from public.gamibar_session_files
    where room_id = new.room_id
      and deleted_at is null
      and expires_at > now()
      and id <> new.id;

    if active_count >= 10 then
      raise exception 'A session can have at most 10 active shared files.' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists gamibar_session_files_limit_trigger on public.gamibar_session_files;
create trigger gamibar_session_files_limit_trigger
  before insert or update of room_id, expires_at, deleted_at
  on public.gamibar_session_files
  for each row
  execute function private.enforce_session_file_limit();
