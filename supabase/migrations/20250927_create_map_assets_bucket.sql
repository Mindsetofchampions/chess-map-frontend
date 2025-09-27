-- Create `map_assets` bucket if not exists and attach policies.
-- Safe to run multiple times.

do $$
begin
  if not exists (
    select 1 from storage.buckets where name = 'map_assets'
  ) then
    insert into storage.buckets (id, name, public) values ('map_assets', 'map_assets', true);
  end if;
end$$;

-- Policies are defined in supabase/storage_policies.sql as CREATE POLICY IF NOT EXISTS
-- For convenience, re-apply here to ensure they exist in environments that only run migrations.

create policy if not exists "map_assets_select_public" on storage.objects
  for select using (bucket_id = 'map_assets');

create policy if not exists "map_assets_insert_authenticated" on storage.objects
  for insert
  using (
    bucket_id = 'map_assets' AND auth.role() = 'authenticated' AND (metadata->>'uploader_id') = auth.uid()
  )
  with check (
    bucket_id = 'map_assets' AND auth.role() = 'authenticated' AND (metadata->>'uploader_id') = auth.uid()
  );

create policy if not exists "map_assets_update_owner_or_master" on storage.objects
  for update
  using (
    bucket_id = 'map_assets' AND (
      (metadata->>'uploader_id') = auth.uid()
      OR public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin'])
    )
  )
  with check (
    bucket_id = 'map_assets' AND (
      (metadata->>'uploader_id') = auth.uid()
      OR public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin'])
    )
  );

create policy if not exists "map_assets_delete_owner_or_master" on storage.objects
  for delete
  using (
    bucket_id = 'map_assets' AND (
      (metadata->>'uploader_id') = auth.uid()
      OR public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin'])
    )
  );
