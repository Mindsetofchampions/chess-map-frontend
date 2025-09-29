-- Storage buckets and policies
insert into storage.buckets (id, name, public) values ('parent_ids','parent_ids', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) values ('signatures','signatures', false)
on conflict (id) do nothing;

-- Allow master full access
DO $do$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'master all parent_ids'
  ) THEN
    EXECUTE 'do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='master all parent_ids') then
    execute 'drop policy "master all parent_ids" on storage.objects';
  end if;
end $plpgsql$;
create policy "master all parent_ids" on storage.objects FOR ALL USING (public.jwt_role() = ''master_admin'') WITH CHECK (true)';
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'org read/write parent_ids'
  ) THEN
    EXECUTE 'do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='org read/write parent_ids') then
    execute 'drop policy "org read/write parent_ids" on storage.objects';
  end if;
end $plpgsql$;
create policy "org read/write parent_ids" on storage.objects FOR ALL USING (
      public.jwt_role() IN (''org_admin'',''staff'')
      AND bucket_id = ''parent_ids''
      AND (storage.foldername(name))[1] = coalesce(public.jwt_org_id()::text, '''')
    ) WITH CHECK (
      bucket_id = ''parent_ids''
      AND (storage.foldername(name))[1] = coalesce(public.jwt_org_id()::text, '''')
    )';
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'master all signatures'
  ) THEN
    EXECUTE 'do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='master all signatures') then
    execute 'drop policy "master all signatures" on storage.objects';
  end if;
end $plpgsql$;
create policy "master all signatures" on storage.objects FOR ALL USING (public.jwt_role() = ''master_admin'') WITH CHECK (true)';
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'org read/write signatures'
  ) THEN
    EXECUTE 'do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='org read/write signatures') then
    execute 'drop policy "org read/write signatures" on storage.objects';
  end if;
end $plpgsql$;
create policy "org read/write signatures" on storage.objects FOR ALL USING (
      public.jwt_role() IN (''org_admin'',''staff'')
      AND bucket_id = ''signatures''
      AND (storage.foldername(name))[1] = coalesce(public.jwt_org_id()::text, '''')
    ) WITH CHECK (
      bucket_id = ''signatures''
      AND (storage.foldername(name))[1] = coalesce(public.jwt_org_id()::text, '''')
    )';
  END IF;
END $do$;
