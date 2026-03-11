-- ===================================================================
-- JoinUp — Supabase Schema Migration
-- ===================================================================

-- Enable required extensions
create extension if not exists "pgcrypto";

-- ===================================================================
-- 1. PROFILES (extends auth.users)
-- ===================================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null default '',
  photo_url     text not null default '',
  bio           text not null default '',
  age_range     text not null default '18-24'
                  check (age_range in ('18-24','25-30','31-40','40+')),
  interests     text[] not null default '{}',
  rating        numeric(3,2) not null default 0,
  rating_count  int not null default 0,
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Anyone can read profiles
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

-- Users can update only their own profile
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Users can insert their own profile (on sign-up)
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- ===================================================================
-- 2. ACTIVITIES
-- ===================================================================
create table if not exists public.activities (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  description       text not null default '',
  category          text not null
                      check (category in ('Fitness','Study','Café','Outdoors','Gaming','Social','Food','Other')),
  location_name     text not null default '',
  location_lat      double precision not null default 0,
  location_lng      double precision not null default 0,
  date_time         timestamptz not null,
  max_slots         int not null default 8,
  cover_image       text,
  requires_approval boolean not null default false,
  status            text not null default 'active'
                      check (status in ('active','cancelled','completed')),
  host_id           uuid not null references public.profiles(id) on delete cascade,
  created_at        timestamptz not null default now()
);

alter table public.activities enable row level security;

create policy "Activities are viewable by everyone"
  on public.activities for select using (true);

create policy "Authenticated users can create activities"
  on public.activities for insert
  with check (auth.uid() = host_id);

create policy "Hosts can update own activities"
  on public.activities for update
  using (auth.uid() = host_id);

create policy "Hosts can delete own activities"
  on public.activities for delete
  using (auth.uid() = host_id);

-- ===================================================================
-- 3. PARTICIPANTS (join table)
-- ===================================================================
create table if not exists public.participants (
  id          uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  status      text not null default 'joined'
                check (status in ('joined','pending','rejected')),
  joined_at   timestamptz not null default now(),
  unique (activity_id, user_id)
);

alter table public.participants enable row level security;

create policy "Participants are viewable by everyone"
  on public.participants for select using (true);

create policy "Authenticated users can join activities"
  on public.participants for insert
  with check (auth.uid() = user_id);

create policy "Users can update own participation"
  on public.participants for update
  using (auth.uid() = user_id);

create policy "Users can leave activities"
  on public.participants for delete
  using (auth.uid() = user_id);

-- Hosts can also manage participants (approve/reject)
create policy "Hosts can manage participants"
  on public.participants for update
  using (
    auth.uid() = (
      select host_id from public.activities where id = activity_id
    )
  );

create policy "Hosts can remove participants"
  on public.participants for delete
  using (
    auth.uid() = (
      select host_id from public.activities where id = activity_id
    )
  );

-- ===================================================================
-- 4. REACTIONS
-- ===================================================================
create table if not exists public.reactions (
  id          uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null check (type in ('fire','heart','like')),
  created_at  timestamptz not null default now(),
  unique (activity_id, user_id, type)
);

alter table public.reactions enable row level security;

create policy "Reactions are viewable by everyone"
  on public.reactions for select using (true);

create policy "Authenticated users can react"
  on public.reactions for insert
  with check (auth.uid() = user_id);

create policy "Users can remove own reactions"
  on public.reactions for delete
  using (auth.uid() = user_id);

-- ===================================================================
-- 5. MESSAGES
-- ===================================================================
create table if not exists public.messages (
  id            uuid primary key default gen_random_uuid(),
  activity_id   uuid not null references public.activities(id) on delete cascade,
  sender_id     uuid not null references public.profiles(id) on delete cascade,
  text          text,
  location_lat  double precision,
  location_lng  double precision,
  type          text not null default 'text'
                  check (type in ('text','location','system')),
  is_pinned     boolean not null default false,
  created_at    timestamptz not null default now()
);

alter table public.messages enable row level security;

-- Only participants of an activity can read its messages
create policy "Participants can read messages"
  on public.messages for select
  using (
    auth.uid() in (
      select user_id from public.participants where activity_id = messages.activity_id
    )
    or auth.uid() = (
      select host_id from public.activities where id = messages.activity_id
    )
  );

create policy "Participants can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and (
      auth.uid() in (
        select user_id from public.participants where activity_id = messages.activity_id
      )
      or auth.uid() = (
        select host_id from public.activities where id = messages.activity_id
      )
    )
  );

-- ===================================================================
-- 6. NOTIFICATIONS
-- ===================================================================
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null
                check (type in ('join','comment','reminder','approval','chat','update')),
  title       text not null,
  body        text not null default '',
  activity_id uuid references public.activities(id) on delete set null,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- ===================================================================
-- 7. VIEWS (convenient joined data)
-- ===================================================================

-- Activity with computed slot counts and reactions
create or replace view public.activities_full as
select
  a.*,
  p.display_name as host_name,
  p.photo_url    as host_photo,
  a.max_slots - coalesce(pc.joined_count, 0) as current_slots,
  coalesce(pc.joined_count, 0)                as joined_count,
  coalesce(rc.fire, 0)  as reaction_fire,
  coalesce(rc.heart, 0) as reaction_heart,
  coalesce(rc.like, 0)  as reaction_like
from public.activities a
join public.profiles p on p.id = a.host_id
left join (
  select activity_id, count(*) as joined_count
  from public.participants
  where status = 'joined'
  group by activity_id
) pc on pc.activity_id = a.id
left join (
  select
    activity_id,
    count(*) filter (where type = 'fire')  as fire,
    count(*) filter (where type = 'heart') as heart,
    count(*) filter (where type = 'like')  as like
  from public.reactions
  group by activity_id
) rc on rc.activity_id = a.id;

-- Message with sender info
create or replace view public.messages_full as
select
  m.*,
  p.display_name as sender_name,
  p.photo_url    as sender_photo
from public.messages m
join public.profiles p on p.id = m.sender_id;

-- ===================================================================
-- 8. INDEXES for performance
-- ===================================================================
create index if not exists idx_activities_host      on public.activities(host_id);
create index if not exists idx_activities_status     on public.activities(status);
create index if not exists idx_activities_category   on public.activities(category);
create index if not exists idx_activities_date_time  on public.activities(date_time);
create index if not exists idx_participants_activity on public.participants(activity_id);
create index if not exists idx_participants_user     on public.participants(user_id);
create index if not exists idx_reactions_activity    on public.reactions(activity_id);
create index if not exists idx_messages_activity     on public.messages(activity_id);
create index if not exists idx_messages_created      on public.messages(activity_id, created_at);
create index if not exists idx_notifications_user    on public.notifications(user_id);

-- ===================================================================
-- 9. FUNCTION: Auto-create profile on signup
-- ===================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, photo_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', '')
  );
  return new;
end;
$$;

-- Trigger: fire after each new user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===================================================================
-- 10. REALTIME: Enable for messages (chat) and notifications
-- ===================================================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
