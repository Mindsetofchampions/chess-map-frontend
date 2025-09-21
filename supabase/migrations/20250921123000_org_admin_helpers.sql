-- Org admin helper RPCs: get_my_org_wallet and list_engagement_recipients

-- Get current org's wallet balance for the authenticated org admin
create or replace function public.get_my_org_wallet()
returns json language plpgsql security definer set search_path=public as $$
declare v_org uuid; v_balance bigint; begin
  -- Identify caller's org
  select org_id into v_org from public.get_my_org();
  if v_org is null then raise exception 'no org'; end if;

  -- Ensure caller is org_admin or master_admin within this org
  if not exists (
    select 1 from public.profiles p where p.user_id = auth.uid() and p.org_id = v_org and p.role in ('org_admin','master_admin')
  ) then
    raise exception 'forbidden';
  end if;

  -- Ensure wallet row exists
  insert into public.org_coin_wallets(org_id, balance) values (v_org, 0)
  on conflict (org_id) do nothing;

  select balance into v_balance from public.org_coin_wallets where org_id = v_org;
  return json_build_object('org_id', v_org, 'balance', v_balance);
end $$;
alter function public.get_my_org_wallet() owner to postgres;
grant execute on function public.get_my_org_wallet() to authenticated;

-- List recipients for an engagement with their emails
create or replace function public.list_engagement_recipients(p_engagement_id uuid)
returns table (user_id uuid, email text, planned_amount bigint)
language plpgsql security definer set search_path=public as $$
declare v_org uuid; begin
  select org_id into v_org from public.org_engagements where id = p_engagement_id;
  if v_org is null then raise exception 'engagement not found'; end if;

  -- Ensure caller is admin of that org
  if not exists (
    select 1 from public.profiles p where p.user_id = auth.uid() and p.org_id = v_org and p.role in ('org_admin','master_admin')
  ) then raise exception 'forbidden'; end if;

  return query
  select r.user_id, u.email, r.planned_amount
  from public.org_engagement_recipients r
  join auth.users u on u.id = r.user_id
  where r.engagement_id = p_engagement_id
  order by u.email;
end $$;
alter function public.list_engagement_recipients(uuid) owner to postgres;
grant execute on function public.list_engagement_recipients(uuid) to authenticated;
