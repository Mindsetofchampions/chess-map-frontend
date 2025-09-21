-- Normalize user_roles table and harden master admin RPCs
-- This migration is idempotent and safe to re-run.

-- 1) Ensure enum exists
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'user_role'
  ) then
    create type public.user_role as enum ('master_admin','org_admin','staff','student');
  end if;
end $$;

-- 2) Ensure user_roles has expected columns used by triggers/policies
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='user_roles' and column_name='role'
  ) then
    alter table public.user_roles add column role public.user_role default 'student';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='user_roles' and column_name='assigned_at'
  ) then
    alter table public.user_roles add column assigned_at timestamptz default now();
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='user_roles' and column_name='updated_at'
  ) then
    alter table public.user_roles add column updated_at timestamptz default now();
  end if;
end $$;

-- 3) Optional: If profiles.role exists, sync any existing master admins into user_roles.role
do $$
declare
  has_profiles_role boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='role'
  ) into has_profiles_role;

  if has_profiles_role then
    insert into public.user_roles (user_id, role)
    select p.user_id, 'master_admin'::public.user_role
    from public.profiles p
    where p.role = 'master_admin'
    on conflict (user_id) do update
      set role = excluded.role,
          updated_at = now();
  end if;
end $$;

-- 4) Drop unintended overloads of is_master_admin to avoid ambiguity (safe if not present)
drop function if exists public.is_master_admin(uuid);
drop function if exists public.is_master_admin(text);

-- 5) Robust is_master_admin(): supports user_roles.role, user_roles.user_role, or profiles.role
create or replace function public.is_master_admin()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  has_user_roles_role boolean := false;
  has_user_roles_user_role boolean := false;
  has_profiles_role boolean := false;
  res boolean := false;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_roles' and column_name = 'role'
  ) into has_user_roles_role;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_roles' and column_name = 'user_role'
  ) into has_user_roles_user_role;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'role'
  ) into has_profiles_role;

  if has_user_roles_role then
    select exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'master_admin'
    ) into res;
    return coalesce(res, false);
  elsif has_user_roles_user_role then
    select exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.user_role = 'master_admin'
    ) into res;
    return coalesce(res, false);
  elsif has_profiles_role then
    select exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role = 'master_admin'
    ) into res;
    return coalesce(res, false);
  else
    return false;
  end if;
end;
$$;

revoke all on function public.is_master_admin() from public;
grant execute on function public.is_master_admin() to authenticated;
alter function public.is_master_admin() owner to postgres;

-- 6) Robust admin list RPC using whichever role column exists; defaults to 'student'
create or replace function public.get_admin_user_list()
returns table (
  id uuid,
  email text,
  role user_role
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  has_user_roles_role boolean := false;
  has_user_roles_user_role boolean := false;
  has_profiles_role boolean := false;
begin
  if not public.is_master_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_roles' and column_name = 'role'
  ) into has_user_roles_role;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_roles' and column_name = 'user_role'
  ) into has_user_roles_user_role;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'role'
  ) into has_profiles_role;

  if has_user_roles_role then
    return query
    select u.id,
           u.email,
           coalesce(
             (select ur.role from public.user_roles ur where ur.user_id = u.id limit 1),
             'student'::user_role
           ) as role
    from auth.users u
    order by u.email;

  elsif has_user_roles_user_role then
    return query
    select u.id,
           u.email,
           coalesce(
             (select ur.user_role from public.user_roles ur where ur.user_id = u.id limit 1),
             'student'::user_role
           ) as role
    from auth.users u
    order by u.email;

  elsif has_profiles_role then
    return query
    select u.id,
           u.email,
           coalesce(
             (select p.role from public.profiles p where p.user_id = u.id limit 1),
             'student'::user_role
           ) as role
    from auth.users u
    order by u.email;

  else
    return query
    select u.id, u.email, 'student'::user_role
    from auth.users u
    order by u.email;
  end if;
end;
$$;

revoke all on function public.get_admin_user_list() from public;
grant execute on function public.get_admin_user_list() to authenticated;
alter function public.get_admin_user_list() owner to postgres;
