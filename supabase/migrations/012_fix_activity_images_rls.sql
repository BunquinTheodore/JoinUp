-- ============================================================
-- Migration 012: Fix activity-images bucket RLS policies
-- ============================================================
-- Ensure chat image uploads are publicly readable and properly configured
-- ============================================================

-- Recreate the chat message view so it includes the image_url column.
-- The old view was created before image_url existed, so m.* no longer exposes it.
create or replace view public.messages_full as
select
  m.id,
  m.activity_id,
  m.sender_id,
  m.text,
  m.location_lat,
  m.location_lng,
  m.image_url,
  m.type,
  m.is_pinned,
  m.created_at,
  p.display_name as sender_name,
  p.photo_url as sender_photo
from public.messages m
join public.profiles p on p.id = m.sender_id;

-- Drop existing policies to recreate them properly
drop policy if exists "activity-images: public read" on storage.objects;
drop policy if exists "activity-images: authenticated read" on storage.objects;
drop policy if exists "activity-images: authenticated upload" on storage.objects;
drop policy if exists "activity-images: owner delete" on storage.objects;

-- Recreate policies with explicit public/authenticated roles

-- Public (unauthenticated) users can read all activity images
create policy "activity-images: public read"
  on storage.objects for select
  to public
  using (bucket_id = 'activity-images');

-- Authenticated users can read all activity images
create policy "activity-images: authenticated read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'activity-images');

-- Only authenticated users can upload
create policy "activity-images: authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'activity-images');

-- Authenticated users can delete their own uploads
create policy "activity-images: owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'activity-images'
    and auth.uid()::text = split_part(storage.filename(name), '-', 1)
  );
