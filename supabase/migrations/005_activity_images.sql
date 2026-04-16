-- Add multi-image support for activity galleries
alter table public.activities
  add column if not exists images text[] not null default '{}';

-- Backfill legacy cover image into gallery for existing rows
update public.activities
set images = array[cover_image]
where cover_image is not null
  and coalesce(array_length(images, 1), 0) = 0;
