/*
  # Store System Tables

  1. Store Tables
    - `store_items` - Items available for purchase
    - `store_orders` - Purchase records
    - `personas` - Character sprite definitions

  2. System Tables
    - `analytics_logs` - User interaction tracking
    - `completions` - Quest completion records
    - `app_routes` - Application routing configuration
    - `app_defaults` - Default settings per role
    - `audit_role_changes` - Role change audit trail

  3. Security
    - Enable RLS on all tables
    - Add appropriate access policies
*/

-- Store items
create table if not exists store_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  price bigint not null,
  inventory integer default 0 not null,
  active boolean default true not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_items_price_check check (price >= 0),
  constraint store_items_inventory_check check (inventory >= 0)
);

alter table store_items enable row level security;

-- Store orders
create table if not exists store_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references store_items(id),
  qty integer not null,
  total_price bigint not null,
  status text default 'completed'::text not null,
  created_at timestamptz not null default now(),
  constraint store_orders_qty_check check (qty > 0),
  constraint store_orders_total_price_check check (total_price >= 0)
);

alter table store_orders enable row level security;

-- Persona character definitions
create table if not exists personas (
  key persona_key primary key,
  label text not null,
  sprite_path text unique not null,
  active boolean default true not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personas_sprite_format check (sprite_path ~* '^/personas/[a-z0-9_]+\.gif$'::text),
  constraint personas_sprite_matches_key check (split_part(split_part(sprite_path, '/personas/'::text, 2), '.gif'::text, 1) = (key)::text)
);

alter table personas enable row level security;

-- Analytics logging
create table if not exists analytics_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  user_id uuid references auth.users(id),
  data jsonb,
  created_at timestamptz default now()
);

alter table analytics_logs enable row level security;

-- Quest completions
create table if not exists completions (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid references quests(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  response jsonb,
  coins_awarded integer default 0 not null,
  completed_at timestamptz default now()
);

alter table completions enable row level security;

-- Application routes
create table if not exists app_routes (
  path text primary key,
  label text not null,
  min_role user_role not null
);

alter table app_routes enable row level security;

-- Create sequences
create sequence if not exists audit_role_changes_id_seq;

-- Role change audit trail
create table if not exists audit_role_changes (
  id bigint primary key default nextval('audit_role_changes_id_seq'),
  changed_user_id uuid references auth.users(id) on delete cascade,
  actor_user_id uuid,
  old_role user_role,
  new_role user_role,
  reason text,
  created_at timestamptz not null default now()
);

alter table audit_role_changes enable row level security;

-- Application defaults per role
create table if not exists app_defaults (
  role user_role primary key,
  home_path text not null references app_routes(path)
);

alter table app_defaults enable row level security;

-- Create indexes
create index if not exists store_items_org on store_items(org_id);
create index if not exists store_orders_user_time on store_orders(user_id, created_at desc);