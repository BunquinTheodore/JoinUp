-- Add image support for chat messages
alter table public.messages
  add column if not exists image_url text;

-- Expand allowed message types to include image payloads
alter table public.messages
  drop constraint if exists messages_type_check;

alter table public.messages
  add constraint messages_type_check
  check (type in ('text', 'image', 'location', 'system'));

-- Create storage bucket for chat image attachments
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can upload chat images" on storage.objects;
drop policy if exists "Authenticated users can read chat images" on storage.objects;

-- Allow authenticated users to upload chat images
create policy "Authenticated users can upload chat images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'chat-images'
    and auth.uid() is not null
  );

-- Allow authenticated users to view chat images
create policy "Authenticated users can read chat images"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'chat-images');
