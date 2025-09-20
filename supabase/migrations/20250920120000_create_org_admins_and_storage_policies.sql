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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: remove an organization admin
CREATE OR REPLACE FUNCTION public.remove_organization_admin(p_org_id uuid, p_user_id uuid)
RETURNS void AS $$
BEGIN
  DELETE FROM public.organization_admins WHERE org_id = p_org_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================
-- Storage policies for org_admin_ids and org_logos (applied to storage.objects)
-- These policies assume presence of public.is_user_in_roles(uid, roles_array) and the
-- optional public.organization_admins table created above.

-- INSERT: allow the authenticated uploader to create objects in org_admin_ids, or master_admins
CREATE POLICY IF NOT EXISTS org_admin_ids_insert_uploader_or_master ON storage.objects
  FOR INSERT
  USING (
    bucket_id = 'org_admin_ids' AND (
      (auth.role() = 'authenticated' AND (metadata->>'uploader_id') = auth.uid())
      OR public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin'])
    )
  )
  WITH CHECK (
    bucket_id = 'org_admin_ids' AND (
      (auth.role() = 'authenticated' AND (metadata->>'uploader_id') = auth.uid())
      OR public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin'])
    )
  );

-- SELECT: allow uploader, master_admins, and org_admins for the same org
CREATE POLICY IF NOT EXISTS org_admin_ids_select_owner_master_orgadmin ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'org_admin_ids' AND (
      (metadata->>'uploader_id') = auth.uid()
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
CREATE POLICY IF NOT EXISTS org_admin_ids_modify_master_only ON storage.objects
  FOR UPDATE
  USING (public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin']))
  WITH CHECK (public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin']));

CREATE POLICY IF NOT EXISTS org_admin_ids_delete_master_only ON storage.objects
  FOR DELETE
  USING (public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin']));

-- ==============================================================
-- org_logos policies: allow org_admins (for the org) and master_admins to manage logos
CREATE POLICY IF NOT EXISTS org_logos_insert_orgadmin_or_master ON storage.objects
  FOR INSERT
  USING (
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
  )
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

CREATE POLICY IF NOT EXISTS org_logos_select_orgadmin_or_master ON storage.objects
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

CREATE POLICY IF NOT EXISTS org_logos_modify_orgadmin_or_master ON storage.objects
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

CREATE POLICY IF NOT EXISTS org_logos_delete_orgadmin_or_master ON storage.objects
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
