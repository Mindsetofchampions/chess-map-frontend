/*
  # Master Admin System Setup

  1. New Tables
    - `user_roles` table for role-based access control
    - `platform_balance` single-row table for system coin balance
    - `platform_ledger` table for platform transaction history

  2. Enhanced Tables
    - `quests` table with status constraints and performance index
    - Proper RLS policies for role-based data access

  3. Security Functions
    - `approve_quest()` SECURITY DEFINER function for quest approval
    - `reject_quest()` SECURITY DEFINER function for quest rejection
    - `is_master_admin()` helper function for role checking

  4. Security
    - Enable RLS on all new tables
    - Add comprehensive policies for role-based access
    - Secure SQL functions with proper access controls

  5. Performance
    - Add optimized index for quest status queries
    - Efficient role checking functions
*/

-- Create user role enum
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

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'student',
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles (idempotent)
drop policy if exists "Users can read own role" on public.user_roles;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='user_roles' and policyname='Users can read own role') then
    execute 'drop policy "Users can read own role" on public.user_roles';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='user_roles' and policyname='Users can read own role') then
    execute 'drop policy "Users can read own role" on public.user_roles';
  end if;
end $plpgsql$;
create policy "Users can read own role" on public.user_roles 
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

drop policy if exists "Master admin can read all roles" on public.user_roles;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='user_roles' and policyname='Master admin can read all roles') then
    execute 'drop policy "Master admin can read all roles" on public.user_roles';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='user_roles' and policyname='Master admin can read all roles') then
    execute 'drop policy "Master admin can read all roles" on public.user_roles';
  end if;
end $plpgsql$;
create policy "Master admin can read all roles" on public.user_roles 
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'master_admin'
  ));

drop policy if exists "Master admin can insert/update roles" on public.user_roles;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='user_roles' and policyname='Master admin can insert/update roles') then
    execute 'drop policy "Master admin can insert/update roles" on public.user_roles';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='user_roles' and policyname='Master admin can insert/update roles') then
    execute 'drop policy "Master admin can insert/update roles" on public.user_roles';
  end if;
end $plpgsql$;
create policy "Master admin can insert/update roles" on public.user_roles 
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'master_admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'master_admin'
  ));

-- Create platform_balance table (single row for platform coins)
CREATE TABLE IF NOT EXISTS public.platform_balance (
  id integer PRIMARY KEY DEFAULT 1,
  coins bigint NOT NULL DEFAULT 0 CHECK (coins >= 0),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on platform_balance
ALTER TABLE public.platform_balance ENABLE ROW LEVEL SECURITY;

-- Only master_admin can access platform_balance
DROP POLICY IF EXISTS "Master admin only platform balance" ON public.platform_balance;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='platform_balance' and policyname='Master admin only platform balance') then
    execute 'drop policy "Master admin only platform balance" on public.platform_balance';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='platform_balance' and policyname='Master admin only platform balance') then
    execute 'drop policy "Master admin only platform balance" on public.platform_balance';
  end if;
end $plpgsql$;
create policy "Master admin only platform balance" on public.platform_balance 
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'master_admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'master_admin'
  ));

-- Create platform_ledger table
-- Ensure platform_ledger has metadata column before any inserts
ALTER TABLE IF EXISTS public.platform_ledger
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
CREATE TABLE IF NOT EXISTS public.platform_ledger (
  id bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  direction text NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),
  amount_coins bigint NOT NULL CHECK (amount_coins > 0),
  reason text NOT NULL,
  quest_id uuid REFERENCES public.quests(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on platform_ledger
ALTER TABLE public.platform_ledger ENABLE ROW LEVEL SECURITY;

-- Only master_admin can access platform ledger
DROP POLICY IF EXISTS "Master admin only platform ledger" ON public.platform_ledger;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='platform_ledger' and policyname='Master admin only platform ledger') then
    execute 'drop policy "Master admin only platform ledger" on public.platform_ledger';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='platform_ledger' and policyname='Master admin only platform ledger') then
    execute 'drop policy "Master admin only platform ledger" on public.platform_ledger';
  end if;
end $plpgsql$;
create policy "Master admin only platform ledger" on public.platform_ledger 
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'master_admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'master_admin'
  ));

-- Ensure quests table has proper status constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'public' 
    AND table_name = 'quests' 
    AND constraint_name = 'quests_status_check'
  ) THEN
    ALTER TABLE public.quests 
    ADD CONSTRAINT quests_status_check 
    CHECK (status IN ('draft', 'submitted', 'approved', 'rejected'));
  END IF;
END $$;

-- Add performance index for quest status queries
CREATE INDEX IF NOT EXISTS idx_quests_status_created_at 
ON public.quests(status, created_at DESC);

-- Add rejection reason column to quests if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quests' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE public.quests ADD COLUMN rejection_reason text;
  END IF;
END $$;

-- Add approved_by and approved_at columns to quests if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quests' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE public.quests ADD COLUMN approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quests' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE public.quests ADD COLUMN approved_at timestamptz;
  END IF;
END $$;

-- Helper function to check if current user is master admin
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'master_admin'
  );
END;
$$;

-- Revoke public access to is_master_admin function
REVOKE ALL ON FUNCTION public.is_master_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_master_admin() TO authenticated;

-- Function to approve quest with platform balance management
DROP FUNCTION IF EXISTS public.approve_quest(uuid);
CREATE OR REPLACE FUNCTION public.approve_quest(p_quest_id uuid)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_quest record;
  v_platform_balance bigint;
  v_result jsonb;
BEGIN
  -- Check if caller is master admin
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN: Only master administrators can approve quests';
  END IF;

  -- Get quest details
  SELECT id, title, reward_coins, status, created_by
  INTO v_quest
  FROM public.quests
  WHERE id = p_quest_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Quest not found';
  END IF;

  -- Validate quest status
  IF v_quest.status != 'submitted' THEN
    RAISE EXCEPTION 'INVALID_STATE: Quest status is % but must be submitted', v_quest.status;
  END IF;

  -- Check platform balance
  SELECT coins INTO v_platform_balance
  FROM public.platform_balance
  WHERE id = 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_STATE: Platform balance not initialized';
  END IF;

  IF v_platform_balance < v_quest.reward_coins THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS: Platform has % coins but quest requires %', 
      v_platform_balance, v_quest.reward_coins;
  END IF;

  -- Begin transaction (implicit in function)
  
  -- Deduct coins from platform balance
  UPDATE public.platform_balance 
  SET coins = coins - v_quest.reward_coins,
      updated_at = now()
  WHERE id = 1;

  -- Create ledger entry
  INSERT INTO public.platform_ledger (
    direction, amount_coins, reason, quest_id, created_by
  ) VALUES (
    'DEBIT', v_quest.reward_coins, 'Quest approval reward funding', 
    p_quest_id, auth.uid()
  );

  -- Approve the quest
  UPDATE public.quests
  SET status = 'approved',
      approved_by = auth.uid(),
      approved_at = now()
  WHERE id = p_quest_id;

  -- Return success response
  v_result := jsonb_build_object(
    'success', true,
    'quest_id', p_quest_id,
    'reward_coins', v_quest.reward_coins,
    'remaining_balance', v_platform_balance - v_quest.reward_coins,
    'approved_at', now()
  );

  RETURN v_result;
END;
$$;

-- Function to reject quest
DROP FUNCTION IF EXISTS public.reject_quest(uuid, text);
CREATE OR REPLACE FUNCTION public.reject_quest(p_quest_id uuid, p_reason text)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_quest record;
  v_result jsonb;
BEGIN
  -- Check if caller is master admin
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN: Only master administrators can reject quests';
  END IF;

  -- Get quest details
  SELECT id, title, status, created_by
  INTO v_quest
  FROM public.quests
  WHERE id = p_quest_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Quest not found';
  END IF;

  -- Validate quest status
  IF v_quest.status != 'submitted' THEN
    RAISE EXCEPTION 'INVALID_STATE: Quest status is % but must be submitted', v_quest.status;
  END IF;

  -- Reject the quest
  UPDATE public.quests
  SET status = 'rejected',
      rejection_reason = p_reason,
      approved_by = auth.uid(),
      approved_at = now()
  WHERE id = p_quest_id;

  -- Return success response
  v_result := jsonb_build_object(
    'success', true,
    'quest_id', p_quest_id,
    'reason', p_reason,
    'rejected_at', now()
  );

  RETURN v_result;
END;
$$;

-- Secure the functions
REVOKE ALL ON FUNCTION public.approve_quest(uuid) FROM public;
REVOKE ALL ON FUNCTION public.reject_quest(uuid,text) FROM public;

-- Grant execute permissions only to authenticated users
GRANT EXECUTE ON FUNCTION public.approve_quest(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_quest(uuid,text) TO authenticated;

-- Seed platform balance
INSERT INTO public.platform_balance (id, coins) 
VALUES (1, 10000)
ON CONFLICT (id) DO UPDATE SET coins = EXCLUDED.coins
WHERE platform_balance.coins < EXCLUDED.coins;

-- Update existing quests RLS policies if needed
DO $$
BEGIN
  -- Drop existing policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'quests_admin_update_any') THEN
    DROP POLICY quests_admin_update_any ON public.quests;
  END IF;
END $$;


do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quests' and policyname='Creators can update own draft/rejected quests') then
    execute 'drop policy "Creators can update own draft/rejected quests" on public.quests';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quests' and policyname='Creators can update own draft/rejected quests') then
    execute 'drop policy "Creators can update own draft/rejected quests" on public.quests';
  end if;
end $plpgsql$;
create policy "Creators can update own draft/rejected quests" on public.quests 
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() 
    AND status IN ('draft', 'rejected')
  )
  WITH CHECK (
    created_by = auth.uid() 
    AND status IN ('draft', 'rejected')
  );