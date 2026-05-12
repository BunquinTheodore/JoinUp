-- ============================================================
-- Migration 013: Host-managed join requests
-- ============================================================
-- Host approval should be manual, and request notifications must be
-- created server-side because notification inserts are RLS-protected.
-- ============================================================

-- Restore host permission to approve/reject participant rows.
drop policy if exists "Hosts can manage participants" on public.participants;

create policy "Hosts can manage participants"
  on public.participants for update
  using (
    auth.uid() = (
      select host_id
      from public.activities
      where id = activity_id
    )
  )
  with check (
    auth.uid() = (
      select host_id
      from public.activities
      where id = activity_id
    )
  );

-- Keep the old resolver available as a compatibility no-op so pending
-- requests are no longer auto-decided by the client or the database.
create or replace function public.resolve_due_join_requests(
  p_user_id uuid default null,
  p_limit int default 100
)
returns int
language plpgsql
security definer
set search_path = public
as $$
begin
  return 0;
end;
$$;

grant execute on function public.resolve_due_join_requests(uuid, int) to authenticated;

-- Notify the host when a join request is created.
create or replace function public.notify_host_on_join_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  host_user_id uuid;
  requester_name text;
begin
  if new.status <> 'pending' then
    return new;
  end if;

  select host_id into host_user_id
  from public.activities
  where id = new.activity_id;

  if host_user_id is null then
    return new;
  end if;

  select coalesce(display_name, 'Someone') into requester_name
  from public.profiles
  where id = new.user_id;

  insert into public.notifications (user_id, type, title, body, activity_id, read)
  values (
    host_user_id,
    'join',
    'New join request',
    requester_name || ' wants to join your activity.',
    new.activity_id,
    false
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_host_on_join_request on public.participants;
create trigger trg_notify_host_on_join_request
  after insert on public.participants
  for each row
  execute function public.notify_host_on_join_request();

-- Notify the joiner when the host approves or rejects them.
create or replace function public.notify_joiner_on_participant_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = new.status then
    return new;
  end if;

  if old.status <> 'pending' or new.status not in ('approved', 'rejected') then
    return new;
  end if;

  insert into public.notifications (user_id, type, title, body, activity_id, read)
  values (
    new.user_id,
    'approval',
    case
      when new.status = 'approved' then 'Join request approved'
      else 'Join request not approved'
    end,
    case
      when new.status = 'approved' then 'You can now access the activity chat.'
      else 'Your join request was not approved.'
    end,
    new.activity_id,
    false
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_joiner_on_participant_decision on public.participants;
create trigger trg_notify_joiner_on_participant_decision
  after update on public.participants
  for each row
  execute function public.notify_joiner_on_participant_decision();
