-- ============================================================
-- Migration 009: Create public activity-images storage bucket
-- ============================================================
-- Activity cover photos need their own PUBLIC bucket so that
-- Expo Go / React Native <Image> can load them without auth headers.
-- The chat-images bucket is not public, causing silent 403 errors.
-- ============================================================

-- Create the bucket (idempotent)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'activity-images',
  'activity-images',
  true,                                        -- PUBLIC: no auth required to read
  10485760,                                    -- 10 MB max per file
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================
-- Storage RLS Policies
-- ============================================================

-- Anyone can read/download activity images (bucket is public)
create policy "activity-images: public read"
  on storage.objects for select
  using (bucket_id = 'activity-images');

-- Only authenticated users can upload
create policy "activity-images: authenticated upload"
  on storage.objects for insert
  with check (
    bucket_id = 'activity-images'
    and auth.role() = 'authenticated'
  );

-- Users can only delete their own uploads (path starts with their uid)
create policy "activity-images: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'activity-images'
    and (storage.foldername(name))[1] = 'activity-covers'
    and auth.uid()::text = split_part(storage.filename(name), '-', 1)
  );
