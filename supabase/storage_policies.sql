-- Tuned storage policies for CHESS Map
-- This file provides example policies for two private buckets used by org onboarding:
--   - org_admin_ids  (stores uploaded admin photo IDs / PII)  -> private
--   - org_logos      (stores organization logos)            -> private (can be made public if desired)

-- Assumptions / helpers used here (adjust to your schema):
--  - public.is_user_in_roles(user_uuid, roles_array) returns boolean (existing helper in this project)
--  - You may have a table like public.organization_admins(org_id uuid, user_id uuid) that maps org admins to orgs
--  - Uploads to a bucket should include metadata keys: "uploader_id" (auth.uid()) and "org_id" (org's uuid as text)

-- SAFETY: these policies keep the buckets private by default. Consider using signed URLs for public access to object contents.

-- ==============================================================
-- Policies for bucket: org_admin_ids
-- Purpose: store sensitive admin photo IDs. Only the uploader, org admins for the same org, and master_admins
--          should be able to insert/read these objects.

-- INSERT: allow the authenticated uploader to create objects and allow master_admins
create policy if not exists "org_admin_ids_insert_uploader_or_master" on storage.objects
  for insert
  using (
    bucket_id = 'org_admin_ids' AND (
      (auth.role() = 'authenticated' AND (metadata->>'uploader_id') = auth.uid())
      OR public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin'])
    )
  )
  with check (
    bucket_id = 'org_admin_ids' AND (
      (auth.role() = 'authenticated' AND (metadata->>'uploader_id') = auth.uid())
      OR public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin'])
    )
  );

-- SELECT: allow uploader, master_admins, and org_admins for the same org (requires an org admin mapping)
create policy if not exists "org_admin_ids_select_owner_master_orgadmin" on storage.objects
  for select
  using (
    bucket_id = 'org_admin_ids' AND (
      (metadata->>'uploader_id') = auth.uid()
      OR public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin'])
      OR (
        public.is_user_in_roles(auth.uid()::uuid, ARRAY['org_admin'])
        AND exists (
          select 1 from public.organization_admins oa
          where oa.user_id = auth.uid()::uuid
            and oa.org_id::text = metadata->>'org_id'
        )
      )
    )
  );

-- UPDATE / DELETE: restrict to master_admins only (or implement a stricter rule if needed)
create policy if not exists "org_admin_ids_modify_master_only" on storage.objects
  for update
  using (public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin']))
  with check (public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin']));

create policy if not exists "org_admin_ids_delete_master_only" on storage.objects
  for delete
  using (public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin']));

-- ==============================================================
-- Policies for bucket: org_logos
-- Purpose: store organization logos. Logos may be considered less sensitive, but keep them private
--          so only org_admins and master_admins can manage them. You can expose them via signed URLs for public display.

-- INSERT: allow org_admins to upload a logo for their org (metadata must include org_id), or master_admins
create policy if not exists "org_logos_insert_orgadmin_or_master" on storage.objects
  for insert
  using (
    bucket_id = 'org_logos' AND (
      (public.is_user_in_roles(auth.uid()::uuid, ARRAY['org_admin'])
        AND exists (select 1 from public.organization_admins oa where oa.user_id = auth.uid()::uuid and oa.org_id::text = metadata->>'org_id'))
      OR public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin'])
    )
  )
  with check (
    bucket_id = 'org_logos' AND (
      (public.is_user_in_roles(auth.uid()::uuid, ARRAY['org_admin'])
        AND exists (select 1 from public.organization_admins oa where oa.user_id = auth.uid()::uuid and oa.org_id::text = metadata->>'org_id'))
      OR public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin'])
    )
  );

-- SELECT: allow org_admins for the org and master_admins to read logo objects
create policy if not exists "org_logos_select_orgadmin_or_master" on storage.objects
  for select
  using (
    bucket_id = 'org_logos' AND (
      public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin'])
      OR (
        public.is_user_in_roles(auth.uid()::uuid, ARRAY['org_admin'])
        AND exists (select 1 from public.organization_admins oa where oa.user_id = auth.uid()::uuid and oa.org_id::text = metadata->>'org_id')
      )
    )
  );

-- UPDATE / DELETE: restrict to master_admins and org_admins for the org
create policy if not exists "org_logos_modify_orgadmin_or_master" on storage.objects
  for update
  using (
    bucket_id = 'org_logos' AND (
      public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin'])
      OR (
        public.is_user_in_roles(auth.uid()::uuid, ARRAY['org_admin'])
        AND exists (select 1 from public.organization_admins oa where oa.user_id = auth.uid()::uuid and oa.org_id::text = metadata->>'org_id')
      )
    )
  )
  with check (
    bucket_id = 'org_logos' AND (
      public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin'])
      OR (
        public.is_user_in_roles(auth.uid()::uuid, ARRAY['org_admin'])
        AND exists (select 1 from public.organization_admins oa where oa.user_id = auth.uid()::uuid and oa.org_id::text = metadata->>'org_id')
      )
    )
  );

create policy if not exists "org_logos_delete_orgadmin_or_master" on storage.objects
  for delete
  using (
    bucket_id = 'org_logos' AND (
      public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin'])
      OR (
        public.is_user_in_roles(auth.uid()::uuid, ARRAY['org_admin'])
        AND exists (select 1 from public.organization_admins oa where oa.user_id = auth.uid()::uuid and oa.org_id::text = metadata->>'org_id')
      )
    )
  );

-- ==============================================================
-- Helper: example organization_admins table (optional)
-- If you don't have an org->admins mapping, create one similar to the example below and maintain it from your onboarding flow.
--
-- CREATE TABLE public.organization_admins (
--   org_id uuid not null,
--   user_id uuid not null,
--   primary key (org_id, user_id)
-- );

-- Final notes:
-- - These are example policies. Adjust the checks to match your actual schema and helper functions.
-- - Testing: use the Supabase SQL editor and the Storage UI to confirm uploads/downloads behave as expected.
-- - For public-facing images (logos), prefer generating signed URLs with an expiry and serving those instead of making the bucket public.
