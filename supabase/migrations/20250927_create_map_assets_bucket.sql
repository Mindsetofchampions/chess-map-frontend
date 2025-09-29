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

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'map_assets_select_public'
  ) then
    do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='map_assets_select_public') then
    execute 'drop policy "map_assets_select_public" on storage.objects';
  end if;
end $plpgsql$;
create policy "map_assets_select_public" on storage.objects 
      for select using (bucket_id = 'map_assets');
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'map_assets_insert_authenticated'
  ) then
    do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='map_assets_insert_authenticated') then
    execute 'drop policy "map_assets_insert_authenticated" on storage.objects';
  end if;
end $plpgsql$;
create policy "map_assets_insert_authenticated" on storage.objects 
      for insert
      with check (
        bucket_id = 'map_assets' AND auth.role() = 'authenticated' AND (metadata->>'uploader_id')::uuid = auth.uid()
      );
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'map_assets_update_owner_or_master'
  ) then
    -- Only reference helper if it exists
    if exists (
      select 1 from pg_proc
      join pg_namespace n on n.oid = pg_proc.pronamespace
      where n.nspname = 'public' and proname = 'is_user_in_roles'
    ) then
      execute $ddl$do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='map_assets_update_owner_or_master') then
    execute 'drop policy "map_assets_update_owner_or_master" on storage.objects';
  end if;
end $plpgsql$;
create policy "map_assets_update_owner_or_master" on storage.objects 
        for update
        using (
          bucket_id = 'map_assets' AND (
            (metadata->>'uploader_id')::uuid = auth.uid()
            OR public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin'])
          )
        )
        with check (
          bucket_id = 'map_assets' AND (
            (metadata->>'uploader_id')::uuid = auth.uid()
            OR public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin'])
          )
        );$ddl$;
    else
      execute $ddl$do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='map_assets_update_owner_or_master') then
    execute 'drop policy "map_assets_update_owner_or_master" on storage.objects';
  end if;
end $plpgsql$;
create policy "map_assets_update_owner_or_master" on storage.objects 
        for update
        using (
          bucket_id = 'map_assets' AND (
            (metadata->>'uploader_id')::uuid = auth.uid()
          )
        )
        with check (
          bucket_id = 'map_assets' AND (
            (metadata->>'uploader_id')::uuid = auth.uid()
          )
        );$ddl$;
    end if;
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'map_assets_delete_owner_or_master'
  ) then
    if exists (
      select 1 from pg_proc
      join pg_namespace n on n.oid = pg_proc.pronamespace
      where n.nspname = 'public' and proname = 'is_user_in_roles'
    ) then
      execute $ddl$do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='map_assets_delete_owner_or_master') then
    execute 'drop policy "map_assets_delete_owner_or_master" on storage.objects';
  end if;
end $plpgsql$;
create policy "map_assets_delete_owner_or_master" on storage.objects 
        for delete
        using (
          bucket_id = 'map_assets' AND (
            (metadata->>'uploader_id')::uuid = auth.uid()
            OR public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin'])
          )
        );$ddl$;
    else
      execute $ddl$do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='map_assets_delete_owner_or_master') then
    execute 'drop policy "map_assets_delete_owner_or_master" on storage.objects';
  end if;
end $plpgsql$;
create policy "map_assets_delete_owner_or_master" on storage.objects 
        for delete
        using (
          bucket_id = 'map_assets' AND (
            (metadata->>'uploader_id')::uuid = auth.uid()
          )
        );$ddl$;
    end if;
  end if;
end$$;
