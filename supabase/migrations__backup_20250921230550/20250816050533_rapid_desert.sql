/*
  # Coin System Tables

  1. Wallet Tables
    - `coin_wallets` - Individual user coin balances
    - `org_coin_wallets` - Organization coin balances
    - `student_coin_wallets` - Student balances per organization

  2. Transaction Tables
    - `coin_ledger` - Transaction history
    - `org_coin_txns` - Organization transactions
    - `student_coin_txns` - Student transactions

  3. Security
    - Enable RLS on all tables
    - Add role-based access policies
*/

-- Individual user coin wallets
create table if not exists coin_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer default 0 not null,
  updated_at timestamptz not null default now(),
  constraint coin_wallets_balance_check check (balance >= 0)
);

alter table coin_wallets enable row level security;

-- Organization coin wallets
create table if not exists org_coin_wallets (
  org_id uuid primary key references organizations(id) on delete cascade,
  balance bigint default 0 not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint org_coin_wallets_balance_check check (balance >= 0)
);

alter table org_coin_wallets enable row level security;

-- Student coin wallets per organization
create table if not exists student_coin_wallets (
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  balance bigint default 0 not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, org_id),
  constraint student_coin_wallets_balance_check check (balance >= 0)
);

alter table student_coin_wallets enable row level security;

-- Create sequences
create sequence if not exists coin_ledger_id_seq;

-- Coin transaction ledger
create table if not exists coin_ledger (
  id bigint primary key default nextval('coin_ledger_id_seq'),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,
  kind text not null,
  quest_id uuid references quests(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint coin_ledger_kind_check check (kind = any (array['quest_award'::text, 'quest_budget'::text, 'manual_adjust'::text]))
);

alter table coin_ledger enable row level security;

-- Organization coin transactions
create table if not exists org_coin_txns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  amount bigint not null,
  reason text not null,
  note text,
  ref_type text,
  ref_id uuid,
  user_id uuid,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint org_coin_txns_amount_check check (amount <> 0)
);

alter table org_coin_txns enable row level security;

-- Student coin transactions
create table if not exists student_coin_txns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  amount bigint not null,
  reason text not null,
  note text,
  ref_type text,
  ref_id uuid,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint student_coin_txns_amount_check check (amount <> 0)
);

alter table student_coin_txns enable row level security;

-- Create indexes
create index if not exists ix_ledger_user_time on coin_ledger(user_id, created_at desc);
create unique index if not exists uq_coin_ledger_budget_one_per_quest on coin_ledger(quest_id) where kind = 'quest_budget'::text;
create index if not exists org_coin_txns_org_time on org_coin_txns(org_id, created_at desc);
create index if not exists student_coin_txns_org_user on student_coin_txns(org_id, user_id);
create index if not exists student_coin_txns_user_time on student_coin_txns(user_id, created_at desc);