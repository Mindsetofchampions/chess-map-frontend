-- Migration: create SECURITY DEFINER helper functions and recreate policies to avoid RLS recursion

-- 1) Create helper functions
CREATE OR REPLACE FUNCTION public.is_user_in_roles(p_user uuid, p_roles text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = p_user AND p.role::text = ANY(p_roles)
  );
$$;

-- convenience overload accepting a single text role
CREATE OR REPLACE FUNCTION public.is_user_in_roles(p_user uuid, p_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT public.is_user_in_roles(p_user, ARRAY[p_role]);
$$;

-- 2) Safely create policies that call the helper (use pg_policies checks and EXECUTE)
DO $do$
BEGIN
  -- user_roles_master_rw
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' AND policyname='user_roles_master_rw'
  ) THEN
    EXECUTE 'CREATE POLICY user_roles_master_rw ON public.user_roles FOR ALL TO authenticated USING (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin''])) WITH CHECK (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin'']));';
  END IF;

  -- Master admin can read all roles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' AND policyname='Master admin can read all roles'
  ) THEN
    EXECUTE 'do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='user_roles' and policyname='Master admin can read all roles') then
    execute 'drop policy "Master admin can read all roles" on public.user_roles';
  end if;
end $plpgsql$;
create policy "Master admin can read all roles" on public.user_roles FOR SELECT TO authenticated USING (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin'']));';
  END IF;

  -- Master admin can insert/update roles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' AND policyname='Master admin can insert/update roles'
  ) THEN
    EXECUTE 'do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='user_roles' and policyname='Master admin can insert/update roles') then
    execute 'drop policy "Master admin can insert/update roles" on public.user_roles';
  end if;
end $plpgsql$;
create policy "Master admin can insert/update roles" on public.user_roles FOR ALL TO authenticated USING (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin''])) WITH CHECK (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin'']));';
  END IF;

  -- Admin & staff update quests
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quests' AND policyname='Admin and staff can update any quest'
  ) THEN
    EXECUTE 'do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quests' and policyname='Admin and staff can update any quest') then
    execute 'drop policy "Admin and staff can update any quest" on public.quests';
  end if;
end $plpgsql$;
create policy "Admin and staff can update any quest" on public.quests FOR UPDATE TO authenticated USING (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin'',''org_admin'',''staff''])) WITH CHECK (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin'',''org_admin'',''staff'']));';
  END IF;

  -- Master admin only platform ledger
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='platform_ledger' AND policyname='Master admin only platform ledger'
  ) THEN
    EXECUTE 'do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='platform_ledger' and policyname='Master admin only platform ledger') then
    execute 'drop policy "Master admin only platform ledger" on public.platform_ledger';
  end if;
end $plpgsql$;
create policy "Master admin only platform ledger" on public.platform_ledger FOR ALL TO authenticated USING (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin''])) WITH CHECK (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin'']));';
  END IF;

  -- Master admin only platform balance
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='platform_balance' AND policyname='Master admin only platform balance'
  ) THEN
    EXECUTE 'do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='platform_balance' and policyname='Master admin only platform balance') then
    execute 'drop policy "Master admin only platform balance" on public.platform_balance';
  end if;
end $plpgsql$;
create policy "Master admin only platform balance" on public.platform_balance FOR ALL TO authenticated USING (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin''])) WITH CHECK (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin'']));';
  END IF;

  -- platform_balance_master_only (legacy name)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='platform_balance' AND policyname='platform_balance_master_only'
  ) THEN
    EXECUTE 'CREATE POLICY platform_balance_master_only ON public.platform_balance FOR ALL USING (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin''])) WITH CHECK (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin'']));';
  END IF;

END
$do$ LANGUAGE plpgsql;
