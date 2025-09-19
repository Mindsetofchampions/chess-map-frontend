
DROP POLICY IF EXISTS "Admin and staff can update any quest" ON public.quests;
DROP POLICY IF EXISTS "quests_admin_select" ON public.quests;
DROP POLICY IF EXISTS "quests_admin_update" ON public.quests;
DROP POLICY IF EXISTS "quests_select_approved_or_admin" ON public.quests;
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_master" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_master_write" ON public.user_roles;
DROP POLICY IF EXISTS "Master admin can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Master admin can insert/update roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_master_rw" ON public.user_roles;
DROP POLICY IF EXISTS "platform_balance_master_only" ON public.platform_balance;
DROP POLICY IF EXISTS "platform_balance_master_insert" ON public.platform_balance;
DROP POLICY IF EXISTS "Master admin only platform balance" ON public.platform_balance;
DROP POLICY IF EXISTS "Master admin only platform ledger" ON public.platform_ledger;
DROP POLICY IF EXISTS "platform_ledger_master_delete" ON public.platform_ledger;
DROP POLICY IF EXISTS "platform_ledger_master_only" ON public.platform_ledger;
-- Recreate Admin and staff can update any quest policy after type change (guaranteed after ALTER TABLE)
-- Policy will be recreated after ALTER TABLE below
-- Drop Master admin only platform ledger policy before altering user_roles.role
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'platform_ledger' AND policyname = 'Master admin only platform ledger'
  ) THEN
    EXECUTE 'DROP POLICY "Master admin only platform ledger" ON public.platform_ledger';
  END IF;
END $$;
-- Policy will be recreated after ALTER TABLE below
-- Drop Master admin only platform balance policy before altering user_roles.role
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'platform_balance' AND policyname = 'Master admin only platform balance'
  ) THEN
    EXECUTE 'DROP POLICY "Master admin only platform balance" ON public.platform_balance';
  END IF;
END $$;
-- Policy will be recreated after ALTER TABLE below
-- Drop platform_balance_master_only policy before altering user_roles.role
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'platform_balance' AND policyname = 'platform_balance_master_only'
  ) THEN
    EXECUTE 'DROP POLICY "platform_balance_master_only" ON public.platform_balance';
  END IF;
END $$;
-- Policy will be recreated after ALTER TABLE below
-- Recreate legacy master admin policies after type change
-- Recreate legacy master admin policies after type change
-- Policy will be recreated after ALTER TABLE below

-- Force drop policy using DO block to avoid duplicate error
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Master admin can insert/update roles'
  ) THEN
    EXECUTE 'DROP POLICY "Master admin can insert/update roles" ON public.user_roles';
  END IF;
END $$;
-- Policy will be recreated after ALTER TABLE below
-- Drop legacy master admin policies if present
DROP POLICY IF EXISTS "Master admin can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Master admin can insert/update roles" ON public.user_roles;
/*
  # Fix user_roles role type and constraint

  Align user_roles.role with enum user_role including org_admin and staff.
  Drops legacy check constraint and converts column to enum.
*/

-- Ensure enum exists with required values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'user_role'
  ) THEN
    CREATE TYPE public.user_role AS ENUM ('master_admin', 'org_admin', 'staff', 'student');
  END IF;
END $$;


-- Drop legacy check constraint if present
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Convert role column to enum type (from text)
ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE user_role USING role::user_role,
  ALTER COLUMN role SET DEFAULT 'student'::user_role;

-- Recreate policies after type change
CREATE POLICY "Admin and staff can update any quest"
  ON public.quests
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('master_admin', 'org_admin', 'staff')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('master_admin', 'org_admin', 'staff')
  ));

CREATE POLICY "Master admin only platform ledger"
  ON public.platform_ledger
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'master_admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'master_admin'
  ));

CREATE POLICY "Master admin only platform balance"
  ON public.platform_balance
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'master_admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'master_admin'
  ));

CREATE POLICY "platform_balance_master_only" ON public.platform_balance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'master_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'master_admin'
    )
  );

CREATE POLICY "Master admin can read all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'master_admin'
  ));

CREATE POLICY "Master admin can insert/update roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'master_admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'master_admin'
  ));