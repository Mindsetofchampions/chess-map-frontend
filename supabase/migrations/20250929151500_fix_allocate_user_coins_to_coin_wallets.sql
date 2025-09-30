-- Fix allocate_user_coins to credit canonical coin_wallets and coin_ledger
-- Context: Student Dashboard reads balance via get_my_wallet() which pulls from public.coin_wallets.
-- Previous implementation credited public.user_wallets, causing balances not to reflect on dashboard.

begin;

create or replace function public.allocate_user_coins(p_email text, p_amount bigint, p_reason text default null)
returns json language plpgsql security definer set search_path = public as $$
declare 
  v_user uuid; 
  current_platform bigint;
  v_reason text;
begin
  -- master admin only for direct user allocation
  if not public.is_master_admin() then
    raise exception 'forbidden';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid amount';
  end if;

  v_user := public.get_user_id_by_email(p_email);
  if v_user is null then
    raise exception 'user not found';
  end if;

  -- ensure platform balance row exists
  insert into platform_balance(id, coins, updated_at) values (1, 0, now()) on conflict (id) do nothing;
  select coins into current_platform from platform_balance where id = 1;
  if current_platform < p_amount then
    raise exception 'insufficient platform funds';
  end if;

  -- ensure user coin_wallet exists (canonical wallet used by get_my_wallet)
  insert into public.coin_wallets (user_id, balance, updated_at)
  values (v_user, 0, now())
  on conflict (user_id) do nothing;

  -- perform transfer: debit platform, credit user wallet, add ledger entries
  update platform_balance set coins = coins - p_amount, updated_at = now() where id = 1;
  insert into platform_ledger(direction, amount_coins, reason, created_by)
  values ('DEBIT', p_amount, coalesce('Allocate to user: ' || p_reason, 'Allocate to user'), auth.uid());

  -- coin_wallets.balance is integer; cast amount safely
  update public.coin_wallets set balance = balance + (p_amount::int), updated_at = now() where user_id = v_user;

  -- record user coin ledger for transparency
  v_reason := coalesce(p_reason, 'manual allocation');
  insert into public.coin_ledger(user_id, delta, kind, quest_id, created_by)
  values (v_user, (p_amount::int), 'manual_adjust', null, auth.uid());

  -- read remaining platform balance
  select coins into current_platform from platform_balance where id = 1;
  return json_build_object('ok', true, 'user_id', v_user, 'amount', p_amount, 'remaining_balance', current_platform);
end $$;

alter function public.allocate_user_coins(text, bigint, text) owner to postgres;
grant execute on function public.allocate_user_coins(text, bigint, text) to anon, authenticated;

commit;
