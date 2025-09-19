-- Ensure platform_ledger has metadata column before any inserts
ALTER TABLE IF EXISTS public.platform_ledger
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
/*
-- Ensure platform_ledger has metadata column before any inserts
ALTER TABLE IF EXISTS public.platform_ledger
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
  # Master Admin System Implementation

  This migration implements a comprehensive master admin system with:
  - Platform-level coin management
  - Quest approval workflow with security functions
  - Enhanced role-based access control
  - Real-time approval queue support
  
  ## New Tables
  
  1. **platform_balance**
     - Single-row table for managing platform coin reserves
     - Used for funding quest rewards during approval process
     - Only accessible to master_admin role
  
  2. **platform_ledger** 
     - Transaction log for platform coin movements
     - Tracks quest funding, manual adjustments, and system operations
     - Provides audit trail for all platform financial operations
  
  ## Security Functions
  
  1. **approve_quest(uuid)** - SECURITY DEFINER function for quest approval
     - Validates caller permissions and quest state
     - Handles coin deduction and status updates atomically
     - Returns structured success/error responses
  
  2. **reject_quest(uuid, text)** - SECURITY DEFINER function for quest rejection
     - Allows master admins to reject quests with reason tracking
     - Maintains audit trail of approval decisions
  
  ## Enhanced RLS Policies
  
  - All new tables restricted to master_admin access only
  - Quest table policies updated for enhanced admin workflow
  - Proper permission revocation for security functions
  
  ## Performance Optimizations
  
  - Optimized indexes for admin dashboard queries
  - Real-time subscription support for approval workflows
*/

-- ============================================================================
-- HELPER FUNCTIONS FOR ROLE CHECKING
-- ============================================================================

-- Create helper function to check if current user is master admin
create or replace function public.is_master_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.profiles 
    where user_id = auth.uid() 
    and role = 'master_admin'
  );
end;
$$;

-- Create helper function to check minimum role level
create or replace function public.has_role_level(required_role user_role)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role_value user_role;
  role_hierarchy integer;
  required_hierarchy integer;
begin
  -- Get user's current role
  select role into user_role_value
  from public.profiles
  where user_id = auth.uid();
  
  if user_role_value is null then
    return false;
  end if;
  
  -- Define role hierarchy (higher number = more permissions)
  case user_role_value
    when 'master_admin' then role_hierarchy := 4;
    when 'org_admin' then role_hierarchy := 3;
    when 'staff' then role_hierarchy := 2;
    when 'student' then role_hierarchy := 1;
    else role_hierarchy := 0;
  end case;
  
  case required_role
    when 'master_admin' then required_hierarchy := 4;
    when 'org_admin' then required_hierarchy := 3;
    when 'staff' then required_hierarchy := 2;
    when 'student' then required_hierarchy := 1;
    else required_hierarchy := 0;
  end case;
  
  return role_hierarchy >= required_hierarchy;
end;
$$;

-- ============================================================================
-- PLATFORM FINANCIAL MANAGEMENT TABLES
-- ============================================================================

-- Platform balance table for managing system coin reserves
create table if not exists public.platform_balance (
  id integer primary key default 1,
  coins bigint not null default 0,
  updated_at timestamptz default now(),
  constraint platform_balance_single_row check (id = 1),
  constraint platform_balance_non_negative check (coins >= 0)
);

-- Platform ledger for tracking all system coin movements
create table if not exists public.platform_ledger (
  id bigserial primary key,
  direction text not null,
  amount_coins bigint not null,
  reason text not null,
  quest_id uuid references public.quests(id) on delete set null,
  metadata jsonb default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  constraint platform_ledger_direction_check check (direction in ('DEBIT', 'CREDIT')),
  constraint platform_ledger_amount_positive check (amount_coins > 0)
);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

alter table public.platform_balance enable row level security;
alter table public.platform_ledger enable row level security;

-- ============================================================================
-- PLATFORM BALANCE RLS POLICIES (MASTER ADMIN ONLY)
-- ============================================================================

-- Master admin can read platform balance
drop policy if exists "platform_balance_master_select" on public.platform_balance;
create policy "platform_balance_master_select"
  on public.platform_balance
  for select
  using (public.is_master_admin());

-- Master admin can update platform balance
drop policy if exists "platform_balance_master_update" on public.platform_balance;
create policy "platform_balance_master_update"
  on public.platform_balance
  for update
  using (public.is_master_admin())
  with check (public.is_master_admin());

-- ============================================================================
-- PLATFORM LEDGER RLS POLICIES (MASTER ADMIN ONLY)
-- ============================================================================

-- Master admin can read all ledger entries
drop policy if exists "platform_ledger_master_select" on public.platform_ledger;
create policy "platform_ledger_master_select"
  on public.platform_ledger
  for select
  using (public.is_master_admin());

-- Master admin can insert ledger entries
drop policy if exists "platform_ledger_master_insert" on public.platform_ledger;
create policy "platform_ledger_master_insert"
  on public.platform_ledger
  for insert
  with check (public.is_master_admin());

-- ============================================================================
-- ENHANCED QUEST TABLE POLICIES
-- ============================================================================

-- Update existing quest policies for better admin workflow
-- Note: These policies work with existing quest table structure

-- Drop existing policies if they exist to recreate them
drop policy if exists "quests_admin_all" on public.quests;
drop policy if exists "quests_creator_own" on public.quests;
drop policy if exists "quests_creator_update" on public.quests;

-- Admin users can read all quests
create policy "quests_admin_read_all"
  on public.quests
  for select
  using (
    public.has_role_level('org_admin'::user_role) or
    status = 'approved' and active = true
  );

-- Any authenticated user can create quests
create policy "quests_authenticated_create"
  on public.quests
  for insert
  to authenticated
  with check (true);

-- Creators can update their own quests when in draft/rejected status
create policy "quests_creator_update_own"
  on public.quests
  for update
  using (
    auth.uid() = created_by and
    status in ('draft', 'rejected')
  )
  with check (
    auth.uid() = created_by and
    status in ('draft', 'rejected')
  );

-- Admins can update any quest
create policy "quests_admin_update_any"
  on public.quests
  for update
  using (public.has_role_level('org_admin'::user_role))
  with check (public.has_role_level('org_admin'::user_role));

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Index for efficient quest approval queue queries
create index if not exists idx_quests_status_created_at 
on public.quests(status, created_at desc);

-- Index for platform ledger queries
create index if not exists idx_platform_ledger_created_at 
on public.platform_ledger(created_at desc);

-- Index for quest approval lookups
create index if not exists idx_platform_ledger_quest_id 
on public.platform_ledger(quest_id);

-- ============================================================================
-- QUEST APPROVAL SQL FUNCTION
-- ============================================================================

drop function if exists public.approve_quest(uuid);
drop function if exists public.approve_quest(uuid);
create or replace function public.approve_quest(p_quest_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quest_record record;
  v_platform_balance bigint;
  v_result json;
begin
  -- Verify caller is master admin
  if not public.is_master_admin() then
    raise exception 'FORBIDDEN: Only master administrators can approve quests';
  end if;
  
  -- Lock and validate quest exists and is in submitted status
  select id, title, reward_coins, status, created_by
  into v_quest_record
  from public.quests
  where id = p_quest_id
  for update;
  
  if not found then
    raise exception 'NOT_FOUND: Quest not found';
  end if;
  
  if v_quest_record.status != 'submitted' then
    raise exception 'INVALID_STATE: Quest status is % but must be submitted', v_quest_record.status;
  end if;
  
  -- Check and deduct platform balance
  select coins into v_platform_balance
  from public.platform_balance
  where id = 1
  for update;
  
  if v_platform_balance < v_quest_record.reward_coins then
    raise exception 'INSUFFICIENT_FUNDS: Platform has % coins but quest requires %', 
      v_platform_balance, v_quest_record.reward_coins;
  end if;
  
  -- Deduct coins from platform balance
  update public.platform_balance
  set coins = coins - v_quest_record.reward_coins,
      updated_at = now()
  where id = 1;
  
  -- Log the deduction in platform ledger
  insert into public.platform_ledger (
    direction,
    amount_coins,
    reason,
    quest_id,
    created_by,
    metadata
  ) values (
    'DEBIT',
    v_quest_record.reward_coins,
    'Quest approval funding',
    p_quest_id,
    auth.uid(),
    json_build_object(
      'quest_title', v_quest_record.title,
      'quest_creator', v_quest_record.created_by,
      'approved_at', now()
    )
  );
  
  -- Update quest status to approved
  update public.quests
  set status = 'approved',
      approved_at = now(),
      approved_by = auth.uid()
  where id = p_quest_id;
  
  -- Return success response
  v_result := json_build_object(
    'success', true,
    'quest_id', p_quest_id,
    'quest_title', v_quest_record.title,
    'coins_deducted', v_quest_record.reward_coins,
    'remaining_balance', v_platform_balance - v_quest_record.reward_coins,
    'approved_at', now(),
    'approved_by', auth.uid()
  );
  
  return v_result;
  
exception
  when others then
    -- Re-raise with original error message for client error mapping
    raise exception '%', sqlerrm;
end;
$$;

-- ============================================================================
-- QUEST REJECTION SQL FUNCTION
-- ============================================================================

drop function if exists public.reject_quest(uuid, text);
drop function if exists public.reject_quest(uuid, text);
create or replace function public.reject_quest(p_quest_id uuid, p_reason text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quest_record record;
  v_result json;
begin
  -- Verify caller is master admin
  if not public.is_master_admin() then
    raise exception 'FORBIDDEN: Only master administrators can reject quests';
  end if;
  
  -- Validate reason is provided
  if p_reason is null or trim(p_reason) = '' then
    raise exception 'INVALID_INPUT: Rejection reason is required';
  end if;
  
  -- Lock and validate quest exists and is in submitted status
  select id, title, status, created_by
  into v_quest_record
  from public.quests
  where id = p_quest_id
  for update;
  
  if not found then
    raise exception 'NOT_FOUND: Quest not found';
  end if;
  
  if v_quest_record.status != 'submitted' then
    raise exception 'INVALID_STATE: Quest status is % but must be submitted', v_quest_record.status;
  end if;
  
  -- Update quest status to rejected with reason
  update public.quests
  set status = 'rejected',
      rejection_reason = p_reason,
      rejected_at = now(),
      rejected_by = auth.uid()
  where id = p_quest_id;
  
  -- Return success response
  v_result := json_build_object(
    'success', true,
    'quest_id', p_quest_id,
    'quest_title', v_quest_record.title,
    'rejection_reason', p_reason,
    'rejected_at', now(),
    'rejected_by', auth.uid()
  );
  
  return v_result;
  
exception
  when others then
    -- Re-raise with original error message for client error mapping
    raise exception '%', sqlerrm;
end;
$$;

-- ============================================================================
-- PLATFORM BALANCE MANAGEMENT FUNCTIONS
-- ============================================================================

-- Function to get current platform balance (master admin only)
create or replace function public.get_platform_balance()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance bigint;
  v_updated_at timestamptz;
begin
  -- Verify caller is master admin
  if not public.is_master_admin() then
    raise exception 'FORBIDDEN: Only master administrators can view platform balance';
  end if;
  
  select coins, updated_at
  into v_balance, v_updated_at
  from public.platform_balance
  where id = 1;
  
  return json_build_object(
    'balance', coalesce(v_balance, 0),
    'updated_at', v_updated_at
  );
end;
$$;

-- Function to adjust platform balance (master admin only)
create or replace function public.adjust_platform_balance(
  p_amount bigint,
  p_reason text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_balance bigint;
  v_new_balance bigint;
  v_direction text;
begin
  -- Verify caller is master admin
  if not public.is_master_admin() then
    raise exception 'FORBIDDEN: Only master administrators can adjust platform balance';
  end if;
  
  -- Validate inputs
  if p_amount = 0 then
    raise exception 'INVALID_INPUT: Amount must be non-zero';
  end if;
  
  if p_reason is null or trim(p_reason) = '' then
    raise exception 'INVALID_INPUT: Reason is required';
  end if;
  
  -- Get current balance
  select coins into v_old_balance
  from public.platform_balance
  where id = 1
  for update;
  
  if not found then
    -- Initialize if not exists
    insert into public.platform_balance (id, coins) values (1, 0);
    v_old_balance := 0;
  end if;
  
  -- Calculate new balance and validate
  v_new_balance := v_old_balance + p_amount;
  
  if v_new_balance < 0 then
    raise exception 'INSUFFICIENT_FUNDS: Cannot deduct % coins from balance of %', 
      abs(p_amount), v_old_balance;
  end if;
  
  -- Determine transaction direction
  v_direction := case when p_amount > 0 then 'CREDIT' else 'DEBIT' end;
  
  -- Update platform balance
  update public.platform_balance
  set coins = v_new_balance,
      updated_at = now()
  where id = 1;
  
  -- Log the adjustment
  insert into public.platform_ledger (
    direction,
    amount_coins,
    reason,
    created_by,
    metadata
  ) values (
    v_direction,
    abs(p_amount),
    p_reason,
    auth.uid(),
    json_build_object(
      'adjustment_type', 'manual',
      'old_balance', v_old_balance,
      'new_balance', v_new_balance
    )
  );
  
  return json_build_object(
    'success', true,
    'old_balance', v_old_balance,
    'new_balance', v_new_balance,
    'amount_changed', p_amount,
    'direction', v_direction
  );
end;
$$;

-- ============================================================================
-- ADD QUEST TABLE ENHANCEMENTS
-- ============================================================================

-- Add columns for approval/rejection tracking if they don't exist
do $$
begin
  -- Add approved_at column
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' 
    and table_name = 'quests' 
    and column_name = 'approved_at'
  ) then
    alter table public.quests add column approved_at timestamptz;
  end if;
  
  -- Add approved_by column
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' 
    and table_name = 'quests' 
    and column_name = 'approved_by'
  ) then
    alter table public.quests add column approved_by uuid references auth.users(id) on delete set null;
  end if;
  
  -- Add rejected_at column
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' 
    and table_name = 'quests' 
    and column_name = 'rejected_at'
  ) then
    alter table public.quests add column rejected_at timestamptz;
  end if;
  
  -- Add rejected_by column
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' 
    and table_name = 'quests' 
    and column_name = 'rejected_by'
  ) then
    alter table public.quests add column rejected_by uuid references auth.users(id) on delete set null;
  end if;
  
  -- Add rejection_reason column
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' 
    and table_name = 'quests' 
    and column_name = 'rejection_reason'
  ) then
    alter table public.quests add column rejection_reason text;
  end if;
  
  -- Add created_by column if it doesn't exist
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' 
    and table_name = 'quests' 
    and column_name = 'created_by'
  ) then
    alter table public.quests add column created_by uuid references auth.users(id) on delete set null;
  end if;
end $$;

-- ============================================================================
-- ADDITIONAL PERFORMANCE INDEXES
-- ============================================================================

-- Index for efficient admin dashboard approval queue
create index if not exists idx_quests_submitted_created_at 
on public.quests(created_at desc) 
where status = 'submitted';

-- Index for quest creator queries
create index if not exists idx_quests_created_by_status 
on public.quests(created_by, status, created_at desc);

-- Index for approved quests with rewards
create index if not exists idx_quests_approved_rewards 
on public.quests(approved_at desc, reward_coins) 
where status = 'approved';

-- ============================================================================
-- REALTIME CONFIGURATION
-- ============================================================================

-- Enable realtime for quest approval workflow
-- Note: Also enable in Supabase Dashboard -> Database -> Realtime
alter publication supabase_realtime add table public.quests;
alter publication supabase_realtime add table public.platform_balance;
alter publication supabase_realtime add table public.platform_ledger;

-- ============================================================================
-- FUNCTION PERMISSIONS & SECURITY HARDENING
-- ============================================================================

-- Revoke public access to security-sensitive functions
revoke all on function public.approve_quest(uuid) from public;
revoke all on function public.reject_quest(uuid, text) from public;
revoke all on function public.get_platform_balance() from public;
revoke all on function public.adjust_platform_balance(bigint, text) from public;

-- Grant execute only to authenticated users (RLS + function logic will handle authorization)
grant execute on function public.approve_quest(uuid) to authenticated;
grant execute on function public.reject_quest(uuid, text) to authenticated;
grant execute on function public.get_platform_balance() to authenticated;
grant execute on function public.adjust_platform_balance(bigint, text) to authenticated;

-- ============================================================================
-- SEED DATA & INITIAL SETUP
-- ============================================================================

-- Initialize platform balance with starting coins
insert into public.platform_balance (id, coins)
values (1, 10000)
on conflict (id) do update set
  coins = greatest(platform_balance.coins, 10000);

-- Create initial ledger entry for seed funding
insert into public.platform_ledger (
  direction,
  amount_coins,
  reason,
  metadata
) values (
  'CREDIT',
  10000,
  'Initial platform funding',
  json_build_object(
    'initialization', true,
    'seed_amount', 10000,
    'created_at', now()
  )
) on conflict do nothing;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all tables exist with correct structure
do $$
begin
  -- Check platform_balance table
  if not exists (select 1 from information_schema.tables 
                where table_schema = 'public' and table_name = 'platform_balance') then
    raise exception 'MISSING: platform_balance table not created';
  end if;
  
  -- Check platform_ledger table
  if not exists (select 1 from information_schema.tables 
                where table_schema = 'public' and table_name = 'platform_ledger') then
    raise exception 'MISSING: platform_ledger table not created';
  end if;
  
  -- Check quest approval function
  if not exists (select 1 from information_schema.routines 
                where routine_schema = 'public' 
                and routine_name = 'approve_quest' 
                and routine_type = 'FUNCTION') then
    raise exception 'MISSING: approve_quest function not created';
  end if;
  
  -- Check quest rejection function
  if not exists (select 1 from information_schema.routines 
                where routine_schema = 'public' 
                and routine_name = 'reject_quest' 
                and routine_type = 'FUNCTION') then
    raise exception 'MISSING: reject_quest function not created';
  end if;
  
  raise notice 'SUCCESS: Master admin system migration completed successfully';
end $$;

-- ============================================================================
-- POST-MIGRATION INSTRUCTIONS
-- ============================================================================

/*
  ## POST-MIGRATION SETUP INSTRUCTIONS
  
  1. **Assign Initial Master Admin**
     Replace {your_user_id} with your actual auth.users.id:
     
     ```sql
     insert into public.profiles(user_id, role) 
     values ('{your_user_id}', 'master_admin')
     on conflict(user_id) do update set role = 'master_admin';
     ```
  
  2. **Enable Realtime (Supabase Dashboard)**
     - Navigate to Database -> Realtime
     - Enable realtime for: quests, platform_balance, platform_ledger
     - Apply filters: quests (status = 'submitted')
  
  3. **Verify Installation**
     Run this query to check everything is working:
     
     ```sql
     select 
       (select count(*) from public.platform_balance) as balance_rows,
       (select coins from public.platform_balance where id = 1) as initial_coins,
       (select count(*) from public.platform_ledger) as ledger_entries,
       (select count(*) from information_schema.routines 
        where routine_schema = 'public' 
        and routine_name in ('approve_quest', 'reject_quest')) as functions_count;
     ```
     
     Expected: balance_rows=1, initial_coins=10000, ledger_entries=1, functions_count=2
  
  4. **Test Functions (as master_admin)**
     ```sql
     -- Test platform balance access
     select public.get_platform_balance();
     
     -- Test balance adjustment
     select public.adjust_platform_balance(1000, 'Test funding');
     ```
*/