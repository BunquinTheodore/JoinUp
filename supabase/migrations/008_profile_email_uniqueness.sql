-- Enforce one profile/account per email and sync from auth.users

alter table public.profiles
  add column if not exists email text;

update public.profiles p
set email = lower(u.email)
from auth.users u
where p.id = u.id
  and u.email is not null
  and (p.email is null or p.email = '');

create unique index if not exists idx_profiles_email_unique
  on public.profiles (lower(email))
  where email is not null and email <> '';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  interests_array text[];
begin
  -- Parse interests from JSON string if provided
  interests_array := ARRAY[]::text[];
  if new.raw_user_meta_data ->> 'interests' is not null then
    begin
      interests_array := array(select jsonb_array_elements_text((new.raw_user_meta_data -> 'interests')));
    exception when others then
      interests_array := ARRAY[]::text[];
    end;
  end if;

  insert into public.profiles (id, email, display_name, photo_url, age_range, interests)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', ''),
    coalesce(new.raw_user_meta_data ->> 'age_range', '18-24'),
    interests_array
  );
  return new;
end;
$$;

-- Keep profile email in sync if user changes auth email
create or replace function public.sync_profile_email_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
    set email = lower(new.email)
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.sync_profile_email_from_auth();
