-- Migration: create organization_admins table and storage policies for org_admin_ids and org_logos
-- Timestamp: 2025-09-20 12:00:00

BEGIN;

-- Create organization_admins table: maps org -> admin users
CREATE TABLE IF NOT EXISTS public.organization_admins (
  org_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

-- Helper function: assign an organization admin (idempotent)
CREATE OR REPLACE FUNCTION public.assign_organization_admin(p_org_id uuid, p_user_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO public.organization_admins (org_id, user_id)
  VALUES (p_org_id, p_user_id)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql security definer set search_path = public$$
BEGIN
  DELETE FROM public.organization_admins WHERE org_id = p_org_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================
-- Storage policies for org_admin_ids and org_logos (applied to storage.objects)
-- These policies assume presence of public.is_user_in_roles(uid, roles_array) and the
-- optional public.organization_admins table created above.

-- INSERT: allow the authenticated uploader to create objects in org_admin_ids, or master_admins
drop policy if exists org_admin_ids_insert_uploader_or_master on storage.objects;
CREATE POLICY org_admin_ids_insert_uploader_or_master ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'org_admin_ids' AND (
  (auth.role() = 'authenticated' AND (metadata->>'uploader_id') = auth.uid()::text)
      OR public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin'])
    )
  );

-- SELECT: allow uploader, master_admins, and org_admins for the same org
drop policy if exists org_admin_ids_select_owner_master_orgadmin on storage.objects;
CREATE POLICY org_admin_ids_select_owner_master_orgadmin ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'org_admin_ids' AND (
  (metadata->>'uploader_id') = auth.uid()::text
      OR public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin'])
      OR (
        public.is_user_in_roles(auth.uid()::uuid, ARRAY['org_admin'])
        AND EXISTS (
          SELECT 1 FROM public.organization_admins oa
          WHERE oa.user_id = auth.uid()::uuid
            AND oa.org_id::text = metadata->>'org_id'
        )
      )
    )
  );

-- UPDATE / DELETE: restrict to master_admins by default
drop policy if exists org_admin_ids_modify_master_only on storage.objects;
CREATE POLICY org_admin_ids_modify_master_only ON storage.objects
  FOR UPDATE
  USING (public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin']))
  WITH CHECK (public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin']));

drop policy if exists org_admin_ids_delete_master_only on storage.objects;
CREATE POLICY org_admin_ids_delete_master_only ON storage.objects
  FOR DELETE
  USING (public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin']));

-- ==============================================================
-- org_logos policies: allow org_admins (for the org) and master_admins to manage logos
drop policy if exists org_logos_insert_orgadmin_or_master on storage.objects;
CREATE POLICY org_logos_insert_orgadmin_or_master ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'org_logos' AND (
      (
        public.is_user_in_roles(auth.uid()::uuid, ARRAY['org_admin'])
        AND EXISTS (
          SELECT 1 FROM public.organization_admins oa
          WHERE oa.user_id = auth.uid()::uuid
            AND oa.org_id::text = metadata->>'org_id'
        )
      )
      OR public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin'])
    )
  );

drop policy if exists org_logos_select_orgadmin_or_master on storage.objects;
CREATE POLICY org_logos_select_orgadmin_or_master ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'org_logos' AND (
      public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin'])
      OR (
        public.is_user_in_roles(auth.uid()::uuid, ARRAY['org_admin'])
        AND EXISTS (
          SELECT 1 FROM public.organization_admins oa
          WHERE oa.user_id = auth.uid()::uuid
            AND oa.org_id::text = metadata->>'org_id'
        )
      )
    )
  );

drop policy if exists org_logos_modify_orgadmin_or_master on storage.objects;
CREATE POLICY org_logos_modify_orgadmin_or_master ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'org_logos' AND (
      public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin'])
      OR (
        public.is_user_in_roles(auth.uid()::uuid, ARRAY['org_admin'])
        AND EXISTS (
          SELECT 1 FROM public.organization_admins oa
          WHERE oa.user_id = auth.uid()::uuid
            AND oa.org_id::text = metadata->>'org_id'
        )
      )
    )
  )
  WITH CHECK (
    bucket_id = 'org_logos' AND (
      public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin'])
      OR (
        public.is_user_in_roles(auth.uid()::uuid, ARRAY['org_admin'])
        AND EXISTS (
          SELECT 1 FROM public.organization_admins oa
          WHERE oa.user_id = auth.uid()::uuid
            AND oa.org_id::text = metadata->>'org_id'
        )
      )
    )
  );

drop policy if exists org_logos_delete_orgadmin_or_master on storage.objects;
CREATE POLICY org_logos_delete_orgadmin_or_master ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'org_logos' AND (
      public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin'])
      OR (
        public.is_user_in_roles(auth.uid()::uuid, ARRAY['org_admin'])
        AND EXISTS (
          SELECT 1 FROM public.organization_admins oa
          WHERE oa.user_id = auth.uid()::uuid
            AND oa.org_id::text = metadata->>'org_id'
        )
      )
    )
  );

COMMIT;
