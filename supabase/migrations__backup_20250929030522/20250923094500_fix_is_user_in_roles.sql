-- Migration: Make is_user_in_roles robust across user_roles and profiles
-- Date: 2025-09-23

-- Create robust role helper that checks user_roles.role, user_roles.user_role, or profiles.role
create or replace function public.is_user_in_roles(p_user uuid, p_roles text[])
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
      where ur.user_id = p_user and (ur.role)::text = any(p_roles)
    ) into res;
    return coalesce(res, false);
  elsif has_user_roles_user_role then
    select exists (
      select 1 from public.user_roles ur
      where ur.user_id = p_user and (ur.user_role::text) = any(p_roles)
    ) into res;
    return coalesce(res, false);
  elsif has_profiles_role then
    select exists (
      select 1 from public.profiles p
      where p.user_id = p_user and (p.role)::text = any(p_roles)
    ) into res;
    return coalesce(res, false);
  else
    return false;
  end if;
end;
$$;

-- Overload for single role text
create or replace function public.is_user_in_roles(p_user uuid, p_role text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_user_in_roles(p_user, array[p_role]);
$$;

-- Grants
revoke all on function public.is_user_in_roles(uuid, text[]) from public;
revoke all on function public.is_user_in_roles(uuid, text) from public;
grant execute on function public.is_user_in_roles(uuid, text[]) to authenticated;
grant execute on function public.is_user_in_roles(uuid, text) to authenticated;
