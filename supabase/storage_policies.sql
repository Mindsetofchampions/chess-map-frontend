-- Example storage policies for org_admin_ids (private) and org_logos

-- Allow users to upload to their own folder under org_admin_ids by tagging metadata.uploader_id
create policy if not exists "storage_insert_own" on storage.objects
  for insert
  using (auth.role() = 'authenticated' and (metadata->>'uploader_id') = auth.uid())
  with check (auth.role() = 'authenticated' and (metadata->>'uploader_id') = auth.uid());

-- Allow select (read) on org_logos for public bucket (public buckets don't need a policy)

-- Allow master_admins to read any object in org_admin_ids
-- This policy is example-only and assumes public.profiles exists with role
create policy if not exists "storage_select_master" on storage.objects
  for select
  using (
    (bucket_id = 'org_admin_ids' and exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'master_admin'))
  );

-- Allow authenticated users to list their own files
create policy if not exists "storage_list_own" on storage.objects
  for select
  using (
    (metadata->>'uploader_id') = auth.uid()
  );

-- Notes:
-- 1) Test policies carefully in your environment. Supabase storage policy syntax may require slight adjustments.
-- 2) You may prefer signed URLs for private access rather than direct select policies for objects.
