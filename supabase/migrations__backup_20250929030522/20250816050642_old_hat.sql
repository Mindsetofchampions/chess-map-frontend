/*
  # Wallet and Coin System Policies

  1. Wallet Policies
    - Users can view their own wallet data
    - Admins can view organization wallet data
    - Staff and above can view student wallets

  2. Transaction Policies
    - Users can view their own transaction history
    - Admins can view organization transactions
*/

-- Coin wallets policies
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='coin_wallets' and policyname='wallets: select own or staff+') then
    execute 'drop policy "wallets: select own or staff+" on public.coin_wallets';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='coin_wallets' and policyname='wallets: select own or staff+') then
    execute 'drop policy "wallets: select own or staff+" on public.coin_wallets';
  end if;
end $plpgsql$;
create policy "wallets: select own or staff+" on public.coin_wallets 
  for select
  to public
  using (
    user_id = auth.uid() 
    or actor_at_least('staff'::user_role)
  );

-- Coin ledger policies
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='coin_ledger' and policyname='ledger: select own or staff+') then
    execute 'drop policy "ledger: select own or staff+" on public.coin_ledger';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='coin_ledger' and policyname='ledger: select own or staff+') then
    execute 'drop policy "ledger: select own or staff+" on public.coin_ledger';
  end if;
end $plpgsql$;
create policy "ledger: select own or staff+" on public.coin_ledger 
  for select
  to public
  using (
    user_id = auth.uid() 
    or actor_at_least('staff'::user_role)
  );

-- Organization coin wallets policies
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='org_coin_wallets' and policyname='org_wallet_select_admins') then
    execute 'drop policy "org_wallet_select_admins" on public.org_coin_wallets';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='org_coin_wallets' and policyname='org_wallet_select_admins') then
    execute 'drop policy "org_wallet_select_admins" on public.org_coin_wallets';
  end if;
end $plpgsql$;
create policy "org_wallet_select_admins" on public.org_coin_wallets 
  for select
  to authenticated
  using (actor_is_master_admin());

-- Organization coin transactions policies  
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='org_coin_txns' and policyname='org_txn_select_admins') then
    execute 'drop policy "org_txn_select_admins" on public.org_coin_txns';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='org_coin_txns' and policyname='org_txn_select_admins') then
    execute 'drop policy "org_txn_select_admins" on public.org_coin_txns';
  end if;
end $plpgsql$;
create policy "org_txn_select_admins" on public.org_coin_txns 
  for select
  to authenticated
  using (actor_is_master_admin());

-- Student coin wallets policies
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='student_coin_wallets' and policyname='scw_select_self_or_org') then
    execute 'drop policy "scw_select_self_or_org" on public.student_coin_wallets';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='student_coin_wallets' and policyname='scw_select_self_or_org') then
    execute 'drop policy "scw_select_self_or_org" on public.student_coin_wallets';
  end if;
end $plpgsql$;
create policy "scw_select_self_or_org" on public.student_coin_wallets 
  for select
  to authenticated
  using (
    user_id = auth.uid() 
    or actor_is_master_admin()
  );

-- Student coin transactions policies
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='student_coin_txns' and policyname='sct_select_self_or_org') then
    execute 'drop policy "sct_select_self_or_org" on public.student_coin_txns';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='student_coin_txns' and policyname='sct_select_self_or_org') then
    execute 'drop policy "sct_select_self_or_org" on public.student_coin_txns';
  end if;
end $plpgsql$;
create policy "sct_select_self_or_org" on public.student_coin_txns 
  for select
  to authenticated
  using (
    user_id = auth.uid() 
    or actor_is_master_admin()
  );