-- Add editable location field to user profiles
alter table public.profiles
  add column if not exists location text not null default '';
