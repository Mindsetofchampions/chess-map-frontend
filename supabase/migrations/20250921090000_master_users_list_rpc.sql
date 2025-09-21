-- Master Admin Users List RPC
-- Provides a secure way for master_admin to list users with emails and roles
-- Uses SECURITY DEFINER and explicit master check via public.is_master_admin()

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
begin
  -- Only master admins may call this
  if not public.is_master_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
    select u.id,
           u.email,
           coalesce(r.role, p.role) as role
    from auth.users u
    left join public.user_roles r on r.user_id = u.id
    left join public.profiles p on p.user_id = u.id
    order by u.email;
end;
$$;

-- Lock down execute to authenticated users only; function enforces its own check
revoke all on function public.get_admin_user_list from public;
grant execute on function public.get_admin_user_list to authenticated;
