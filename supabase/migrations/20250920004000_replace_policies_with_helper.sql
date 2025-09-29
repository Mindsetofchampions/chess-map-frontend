-- Migration: Replace policies that reference public.user_roles inline with helper calls

DO $do$ BEGIN
  -- Drop and recreate policies on user_roles to ensure they don't reference user_roles inline
  -- proceed to drop and recreate user_roles policies

  -- Drop specific policies on user_roles
  PERFORM pg_catalog.set_config('search_path', 'public', false);
  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "Master admin can read all roles" ON public.user_roles';
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "Master admin can insert/update roles" ON public.user_roles';
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS user_roles_master_rw ON public.user_roles';
  EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Recreate policies on user_roles using helper
  EXECUTE 'do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='user_roles' and policyname='Master admin can read all roles') then
    execute 'drop policy "Master admin can read all roles" on public.user_roles';
  end if;
end $plpgsql$;
create policy "Master admin can read all roles" on public.user_roles FOR SELECT TO authenticated USING (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin'']))';
  EXECUTE 'do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='user_roles' and policyname='Master admin can insert/update roles') then
    execute 'drop policy "Master admin can insert/update roles" on public.user_roles';
  end if;
end $plpgsql$;
create policy "Master admin can insert/update roles" on public.user_roles FOR ALL TO authenticated USING (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin''])) WITH CHECK (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin'']))';
  EXECUTE 'CREATE POLICY user_roles_master_rw ON public.user_roles FOR ALL TO authenticated USING (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin''])) WITH CHECK (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin'']))';

  -- Replace onboarding/admin policies that used inline exists(... user_roles ...)
  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS onb_admin_read ON public.onboarding_responses';
  EXCEPTION WHEN OTHERS THEN NULL; END;
  EXECUTE 'CREATE POLICY onb_admin_read ON public.onboarding_responses FOR SELECT TO authenticated USING (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''org_admin'',''master_admin'']))';

  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS pc_admin_read ON public.parent_consents';
  EXCEPTION WHEN OTHERS THEN NULL; END;
  EXECUTE 'CREATE POLICY pc_admin_read ON public.parent_consents FOR SELECT TO authenticated USING (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''org_admin'',''master_admin'']))';

  -- Storage policy: recreate admin read for parent_ids
  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS sp_parent_ids_admin_read ON storage.objects';
  EXCEPTION WHEN OTHERS THEN NULL; END;
  EXECUTE 'CREATE POLICY sp_parent_ids_admin_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id = ''parent_ids'' AND public.is_user_in_roles(auth.uid()::uuid, ARRAY[''org_admin'',''master_admin'']))';

END $do$ LANGUAGE plpgsql;
