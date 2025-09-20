-- Migration: storage bucket policies for parent_ids
-- Ensure you create a bucket named 'parent_ids' (public: false) in Supabase Storage

-- Policy: allow student (auth.uid) to upload/read objects under student_id/ prefix
create policy if not exists sp_parent_ids_student_rw
on storage.objects
for all
to authenticated
using (
  bucket_id = 'parent_ids'
  and ( auth.uid()::text || '/' ) = ( substring(name from 1 for 37) )
)
with check (
  bucket_id = 'parent_ids'
  and ( auth.uid()::text || '/' ) = ( substring(name from 1 for 37) )
);

-- Policy: allow admins to read any file in parent_ids
create policy if not exists sp_parent_ids_admin_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'parent_ids'
  and exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('org_admin','master_admin'))
);
