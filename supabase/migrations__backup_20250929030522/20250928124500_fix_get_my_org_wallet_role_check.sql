-- Make get_my_org_wallet authorization robust by accepting user_roles (org_admin, master_admin)
-- in addition to profiles-based org role. This fixes cases where profiles.role is 'student'
-- but the canonical role is stored in user_roles.

create or replace function public.get_my_org_wallet()
returns json language plpgsql security definer set search_path=public as $$
declare v_org uuid; v_balance bigint; begin
  -- Identify caller's org
  select org_id into v_org from public.get_my_org();
  if v_org is null then raise exception 'no org'; end if;

  -- Ensure caller has permissions: either org-level via profiles or global via user_roles
  if not (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.org_id = v_org and p.role in ('org_admin','master_admin','staff')
    )
    or exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('org_admin','master_admin')
    )
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
