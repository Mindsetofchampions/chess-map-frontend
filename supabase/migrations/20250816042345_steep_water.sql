/*
  # Create Coin and Wallet System

  1. New Tables
    - `coin_wallets` - User coin balances
    - `coin_ledger` - Transaction history
    - `student_coin_wallets` - Organization-specific balances
    - `student_coin_txns` - Organization-specific transactions
    - `org_coin_wallets` - Organization balances
    - `org_coin_txns` - Organization transaction history
    - `completions` - Quest completion records

  2. Security
    - Enable RLS on all wallet tables
    - Add policies for user balance access
    - Ensure transaction isolation
*/

-- Create coin wallets table
CREATE TABLE IF NOT EXISTS coin_wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer DEFAULT 0 NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT coin_wallets_balance_check CHECK (balance >= 0)
);

-- Create coin ledger table
CREATE TABLE IF NOT EXISTS coin_ledger (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  kind text NOT NULL,
  quest_id uuid REFERENCES quests(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT coin_ledger_kind_check CHECK (
    kind = ANY (ARRAY['quest_award'::text, 'quest_budget'::text, 'manual_adjust'::text])
  )
);

-- Create student coin wallets table
CREATE TABLE IF NOT EXISTS student_coin_wallets (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  balance bigint DEFAULT 0 NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, org_id),
  CONSTRAINT student_coin_wallets_balance_check CHECK (balance >= 0)
);

-- Create student coin transactions table
CREATE TABLE IF NOT EXISTS student_coin_txns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount bigint NOT NULL,
  reason text NOT NULL,
  note text,
  ref_type text,
  ref_id uuid,
  created_by uuid DEFAULT uid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT student_coin_txns_amount_check CHECK (amount <> 0)
);

-- Create organization coin wallets table
CREATE TABLE IF NOT EXISTS org_coin_wallets (
  org_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  balance bigint DEFAULT 0 NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT org_coin_wallets_balance_check CHECK (balance >= 0)
);

-- Create organization coin transactions table
CREATE TABLE IF NOT EXISTS org_coin_txns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount bigint NOT NULL,
  reason text NOT NULL,
  note text,
  ref_type text,
  ref_id uuid,
  user_id uuid,
  created_by uuid DEFAULT uid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT org_coin_txns_amount_check CHECK (amount <> 0)
);

-- Create completions table
CREATE TABLE IF NOT EXISTS completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid REFERENCES quests(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  response jsonb,
  coins_awarded integer DEFAULT 0 NOT NULL,
  completed_at timestamptz DEFAULT now()
);

-- Enable RLS on wallet tables
ALTER TABLE coin_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_coin_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_coin_txns ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_coin_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_coin_txns ENABLE ROW LEVEL SECURITY;
ALTER TABLE completions ENABLE ROW LEVEL SECURITY;

-- Coin wallets policies
CREATE POLICY IF NOT EXISTS "wallets: select own or staff+"
  ON coin_wallets FOR SELECT
  TO public
  USING (
    user_id = uid() OR 
    role_rank(actor_role()) >= role_rank('staff'::user_role)
  );

-- Coin ledger policies
CREATE POLICY IF NOT EXISTS "ledger: select own or staff+"
  ON coin_ledger FOR SELECT
  TO public
  USING (
    user_id = uid() OR 
    role_rank(actor_role()) >= role_rank('staff'::user_role)
  );

-- Student coin wallet policies
CREATE POLICY IF NOT EXISTS "scw_select_self_or_org"
  ON student_coin_wallets FOR SELECT
  TO authenticated
  USING (
    user_id = uid() OR 
    is_master_admin(uid()) OR 
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = uid() 
      AND m.org_id = student_coin_wallets.org_id 
      AND m.role = 'org_admin'::user_role
    )
  );

-- Student coin transactions policies
CREATE POLICY IF NOT EXISTS "sct_select_self_or_org"
  ON student_coin_txns FOR SELECT
  TO authenticated
  USING (
    user_id = uid() OR 
    is_master_admin(uid()) OR 
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = uid() 
      AND m.org_id = student_coin_txns.org_id 
      AND m.role = 'org_admin'::user_role
    )
  );

-- Organization wallet policies
CREATE POLICY IF NOT EXISTS "org_wallet_select_admins"
  ON org_coin_wallets FOR SELECT
  TO authenticated
  USING (
    is_master_admin(uid()) OR 
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = uid() 
      AND m.org_id = org_coin_wallets.org_id 
      AND m.role = 'org_admin'::user_role
    )
  );

-- Organization transactions policies
CREATE POLICY IF NOT EXISTS "org_txn_select_admins"
  ON org_coin_txns FOR SELECT
  TO authenticated
  USING (
    is_master_admin(uid()) OR 
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = uid() 
      AND m.org_id = org_coin_txns.org_id 
      AND m.role = 'org_admin'::user_role
    )
  );

-- Completions policies
CREATE POLICY IF NOT EXISTS "Students view own completions"
  ON completions FOR SELECT
  TO authenticated
  USING (user_id = uid());

CREATE POLICY IF NOT EXISTS "Students insert completions"
  ON completions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = uid());

CREATE POLICY IF NOT EXISTS "Admins manage completions"
  ON completions FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = uid()
  ));

-- Create performance indexes
CREATE INDEX IF NOT EXISTS ix_ledger_user_time ON coin_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS student_coin_txns_user_time ON student_coin_txns(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS student_coin_txns_org_user ON student_coin_txns(org_id, user_id);
CREATE INDEX IF NOT EXISTS org_coin_txns_org_time ON org_coin_txns(org_id, created_at DESC);

-- Create unique constraint for quest budget tracking
CREATE UNIQUE INDEX IF NOT EXISTS uq_coin_ledger_budget_one_per_quest 
  ON coin_ledger(quest_id) 
  WHERE kind = 'quest_budget'::text;