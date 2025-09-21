-- Fix get_admin_user_list return type by explicitly casting subselects to user_role
-- Idempotent: function replaced in place

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
             (select (ur.role)::public.user_role from public.user_roles ur where ur.user_id = u.id limit 1),
             'student'::public.user_role
           ) as role
    from auth.users u
    order by u.email;

  elsif has_user_roles_user_role then
    return query
    select u.id,
           u.email,
           coalesce(
             (select (ur.user_role::text)::public.user_role from public.user_roles ur where ur.user_id = u.id limit 1),
             'student'::public.user_role
           ) as role
    from auth.users u
    order by u.email;

  elsif has_profiles_role then
    return query
    select u.id,
           u.email,
           coalesce(
             (select (p.role::text)::public.user_role from public.profiles p where p.user_id = u.id limit 1),
             'student'::public.user_role
           ) as role
    from auth.users u
    order by u.email;

  else
    return query
    select u.id, u.email, 'student'::public.user_role
    from auth.users u
    order by u.email;
  end if;
end;
$$;

revoke all on function public.get_admin_user_list() from public;
grant execute on function public.get_admin_user_list() to authenticated;
alter function public.get_admin_user_list() owner to postgres;