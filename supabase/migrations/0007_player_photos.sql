-- Player photos on cards.
--
-- The image itself lives in Storage; profiles keeps only its public URL so
-- every card that already selects from profiles picks the photo up for free.

alter table public.profiles
  add column if not exists photo_url text;

-- Public read, because a card is shown to team-mates and opponents alike.
-- 3 MB is well above what the app uploads (it downsizes to 700px first).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'player-photos',
  'player-photos',
  true,
  3145728,
  array['image/png', 'image/jpeg']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Writes are confined to a folder named after the player's own id, so nobody
-- can overwrite or delete someone else's photo.
drop policy if exists "player photos are readable" on storage.objects;
create policy "player photos are readable"
  on storage.objects for select
  using (bucket_id = 'player-photos');

drop policy if exists "upload your own player photo" on storage.objects;
create policy "upload your own player photo"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'player-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "replace your own player photo" on storage.objects;
create policy "replace your own player photo"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'player-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'player-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "delete your own player photo" on storage.objects;
create policy "delete your own player photo"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'player-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
