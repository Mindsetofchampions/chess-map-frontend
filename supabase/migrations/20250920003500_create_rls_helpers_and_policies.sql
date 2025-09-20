-- Migration: create SECURITY DEFINER helper functions and recreate policies to avoid RLS recursion

-- 1) Create helper functions
CREATE OR REPLACE FUNCTION public.is_user_in_roles(p_user uuid, p_roles text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p_user AND ur.role::text = ANY(p_roles)
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
DO $$
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
    EXECUTE 'CREATE POLICY "Master admin can read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin'']));';
  END IF;

  -- Master admin can insert/update roles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' AND policyname='Master admin can insert/update roles'
  ) THEN
    EXECUTE 'CREATE POLICY "Master admin can insert/update roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin''])) WITH CHECK (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin'']));';
  END IF;

  -- Admin & staff update quests
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quests' AND policyname='Admin and staff can update any quest'
  ) THEN
    EXECUTE 'CREATE POLICY "Admin and staff can update any quest" ON public.quests FOR UPDATE TO authenticated USING (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin'',''org_admin'',''staff''])) WITH CHECK (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin'',''org_admin'',''staff'']));';
  END IF;

  -- Master admin only platform ledger
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='platform_ledger' AND policyname='Master admin only platform ledger'
  ) THEN
    EXECUTE 'CREATE POLICY "Master admin only platform ledger" ON public.platform_ledger FOR ALL TO authenticated USING (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin''])) WITH CHECK (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin'']));';
  END IF;

  -- Master admin only platform balance
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='platform_balance' AND policyname='Master admin only platform balance'
  ) THEN
    EXECUTE 'CREATE POLICY "Master admin only platform balance" ON public.platform_balance FOR ALL TO authenticated USING (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin''])) WITH CHECK (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin'']));';
  END IF;

  -- platform_balance_master_only (legacy name)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='platform_balance' AND policyname='platform_balance_master_only'
  ) THEN
    EXECUTE 'CREATE POLICY platform_balance_master_only ON public.platform_balance FOR ALL USING (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin''])) WITH CHECK (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''master_admin'']));';
  END IF;

END$$;
