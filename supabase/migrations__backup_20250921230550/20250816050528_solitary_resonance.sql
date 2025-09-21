/*
  # Membership and Organization Tables

  1. Membership Tables
    - `memberships` - User organization memberships
    - `allowlisted_domains` - Email domain restrictions

  2. Security
    - Enable RLS with non-recursive policies
    - Use direct role checks to avoid circular references
*/

-- User organization memberships
create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  role user_role not null,
  unique(user_id, org_id),
  constraint memberships_role_check check (role = any (array['org_admin'::user_role, 'staff'::user_role, 'student'::user_role]))
);

alter table memberships enable row level security;

-- Allowlisted email domains
create table if not exists allowlisted_domains (
  domain text primary key,
  label text,
  created_at timestamptz default now()
);

-- Create indexes
create unique index if not exists memberships_user_id_org_id_key on memberships(user_id, org_id);