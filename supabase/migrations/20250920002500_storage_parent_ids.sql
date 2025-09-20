-- Storage policies for parent_ids bucket
-- Make sure to create a bucket named 'parent_ids' (public=false) in the Supabase UI before relying on these policies.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'sp_parent_ids_student_rw'
  ) THEN
    EXECUTE 'CREATE POLICY sp_parent_ids_student_rw ON storage.objects FOR ALL TO authenticated USING (bucket_id = ''parent_ids'' AND (auth.uid()::text || ''/'') = substring(name from 1 for 37)) WITH CHECK (bucket_id = ''parent_ids'' AND (auth.uid()::text || ''/'') = substring(name from 1 for 37));';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'sp_parent_ids_admin_read'
  ) THEN
    EXECUTE 'CREATE POLICY sp_parent_ids_admin_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id = ''parent_ids'' AND exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in (''org_admin'',''master_admin'')));';
  END IF;
END $$;
