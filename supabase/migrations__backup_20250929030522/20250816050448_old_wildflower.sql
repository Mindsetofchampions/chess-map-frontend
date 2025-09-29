/*
  # Core Helper Functions

  1. Role and Authentication Functions
    - `actor_is_master_admin()` - Check if current user is master admin
    - `actor_role()` - Get current user's role
    - `actor_at_least(user_role)` - Check minimum role requirement
    - `is_master_admin(uuid)` - Check if specific user is master admin
    - `role_rank(user_role)` - Get role hierarchy rank

  2. Utility Functions
    - `handle_updated_at()` - Trigger function for updated_at columns
    - `set_updated_at()` - Alternative updated_at trigger function
*/

-- Updated timestamp trigger function
create or replace function handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  NEW.updated_at = now();
  return NEW;
end
$$;

-- Alternative updated timestamp function
create or replace function set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  NEW.updated_at = now();
  return NEW;
end
$$;

-- Get current user's role without circular references
create or replace function actor_role()
returns user_role
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  -- Direct lookup in profiles table without recursive policy checks
  return (
    select role from profiles 
    where user_id = auth.uid()
    limit 1
  );
exception when others then
  return 'student'::user_role;
end
$$;

-- Check if current user is master admin
create or replace function actor_is_master_admin()
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return actor_role() = 'master_admin'::user_role;
end
$$;

-- Check if specific user is master admin
create or replace function is_master_admin(user_uuid uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return (
    select role from profiles 
    where user_id = user_uuid
    limit 1
  ) = 'master_admin'::user_role;
exception when others then
  return false;
end
$$;

-- Role hierarchy ranking
create or replace function role_rank(role user_role)
returns integer
language plpgsql
security definer
set search_path = public
immutable
as $$
begin
  case role
    when 'student' then return 1;
    when 'staff' then return 2;
    when 'org_admin' then return 3;
    when 'master_admin' then return 4;
    else return 0;
  end case;
end
$$;

-- Check minimum role requirement
create or replace function actor_at_least(min_role user_role)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return role_rank(actor_role()) >= role_rank(min_role);
end
$$;