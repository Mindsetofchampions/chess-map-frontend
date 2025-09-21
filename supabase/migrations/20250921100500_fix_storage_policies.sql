-- Recreate storage insert policies using storage.foldername token checks
do $$ begin
  if exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'org_upload_logo'
  ) then
    drop policy org_upload_logo on storage.objects;
  end if;

  if exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'org_upload_admin_id'
  ) then
    drop policy org_upload_admin_id on storage.objects;
  end if;
end $$;

-- Allow authenticated uploads only to orgs/<uid>/... within the specified buckets
create policy org_upload_logo on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'org_logos'
    and (storage.foldername(name))[1] = 'orgs'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy org_upload_admin_id on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'org_admin_ids'
    and (storage.foldername(name))[1] = 'orgs'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
