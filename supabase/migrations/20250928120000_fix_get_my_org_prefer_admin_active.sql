-- Prefer admin roles and active/approved orgs when resolving the caller's org
-- This fixes non-deterministic selection when a user belongs to multiple orgs,
-- ensuring OrgDashboard shows the correct wallet balance.

create or replace function public.get_my_org()
returns table (org_id uuid, name text)
language sql security definer set search_path=public as $$
  select o.id, o.name
  from public.profiles p
  join public.organizations o on o.id = p.org_id
  where p.user_id = auth.uid()
  order by
    case when p.role in ('org_admin','master_admin') then 0 else 1 end,
    case when o.status in ('active','approved') then 0 else 1 end,
    o.created_at desc
  limit 1;
$$;
alter function public.get_my_org() owner to postgres;
grant execute on function public.get_my_org() to anon, authenticated;
