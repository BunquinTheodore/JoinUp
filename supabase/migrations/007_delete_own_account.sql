-- Allow authenticated users to permanently delete their own account.
-- Deleting auth.users cascades into public.profiles and related records via FKs.

create or replace function public.delete_my_account()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
  affected_rows int := 0;
begin
  target_user_id := auth.uid();

  if target_user_id is null then
    raise exception 'Not authenticated';
  end if;

  delete from auth.users
  where id = target_user_id;

  get diagnostics affected_rows = row_count;
  return affected_rows > 0;
end;
$$;

grant execute on function public.delete_my_account() to authenticated;
