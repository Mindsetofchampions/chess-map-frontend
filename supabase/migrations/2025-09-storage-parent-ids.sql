-- Migration: storage bucket policies for parent_ids
-- Ensure you create a bucket named 'parent_ids' (public: false) in Supabase Storage

-- Policy: allow student (auth.uid) to upload/read objects under student_id/ prefix
DROP POLICY IF EXISTS sp_parent_ids_student_rw ON storage.objects;
CREATE POLICY sp_parent_ids_student_rw
ON storage.objects
FOR ALL
USING (
  bucket_id = 'parent_ids'
  AND ( auth.uid()::text || '/' ) = ( substring(name from 1 for 37) )
)
WITH CHECK (
  bucket_id = 'parent_ids'
  AND ( auth.uid()::text || '/' ) = ( substring(name from 1 for 37) )
);

-- Policy: allow admins to read any file in parent_ids
DROP POLICY IF EXISTS sp_parent_ids_admin_read ON storage.objects;
CREATE POLICY sp_parent_ids_admin_read
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'parent_ids'
  AND exists (
    select 1 from public.profiles p where p.user_id = auth.uid()::uuid and p.role in ('org_admin','master_admin')
  )
);
