-- Redefine get_admin_user_list with explicit casts and left join to avoid structure mismatches

create or replace function public.get_admin_user_list()
returns table (
  id uuid,
  email text,
  role user_role
)
language sql
security definer
set search_path = public, auth
as $$
  select 
    u.id::uuid as id,
    u.email::text as email,
    coalesce(ur.role, 'student'::public.user_role) as role
  from auth.users u
  left join public.user_roles ur on ur.user_id = u.id
  where public.is_master_admin()
  order by u.email::text
$$;

revoke all on function public.get_admin_user_list() from public;
grant execute on function public.get_admin_user_list() to authenticated;
alter function public.get_admin_user_list() owner to postgres;