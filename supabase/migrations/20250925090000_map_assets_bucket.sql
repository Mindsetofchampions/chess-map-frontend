-- Create public storage bucket for map assets (logos/images)
insert into storage.buckets (id, name, public)
values ('map_assets', 'map_assets', true)
on conflict (id) do nothing;

-- Policies
-- Public read access to objects in map_assets
create policy if not exists "Public read access (map_assets)"
  on storage.objects for select
  using (bucket_id = 'map_assets');

-- Allow authenticated users to upload to map_assets
create policy if not exists "Authenticated insert (map_assets)"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'map_assets');

-- Allow authenticated users to update their own objects (optional)
create policy if not exists "Authenticated update own (map_assets)"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'map_assets' and (auth.uid() = owner or owner is null))
  with check (bucket_id = 'map_assets');

-- Optionally restrict delete to service role only; omit general delete policy
-- If you want authenticated delete, uncomment below
-- create policy if not exists "Authenticated delete own (map_assets)"
--   on storage.objects for delete
--   to authenticated
--   using (bucket_id = 'map_assets' and (auth.uid() = owner or owner is null));
