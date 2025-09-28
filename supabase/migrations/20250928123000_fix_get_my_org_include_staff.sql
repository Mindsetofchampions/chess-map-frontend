-- Update get_my_org to prioritize staff along with org_admin and master_admin
-- Context: Org Dashboard wallet refresh showed FORBIDDEN for staff users when
-- get_my_org selected a different org where their role was only 'student'.
-- By prioritizing ('org_admin','master_admin','staff'), we ensure staff users
-- resolve to an org where they have administrative privileges for wallet access.

create or replace function public.get_my_org()
returns table (org_id uuid, name text)
language sql security definer set search_path=public as $$
  select o.id, o.name
  from public.profiles p
  join public.organizations o on o.id = p.org_id
  where p.user_id = auth.uid()
  order by
    case when p.role in ('org_admin','master_admin','staff') then 0 else 1 end,
    case when o.status in ('active','approved') then 0 else 1 end,
    o.created_at desc
  limit 1;
$$;
alter function public.get_my_org() owner to postgres;
grant execute on function public.get_my_org() to anon, authenticated;
