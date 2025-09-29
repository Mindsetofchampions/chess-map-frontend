/*
  # Allocate Coins to Organization RPC

  Creates a SECURITY DEFINER function `allocate_org_coins` which transfers coins
  from platform_balance to org_coin_wallets and records org_coin_txns and platform_ledger.
  Access: master_admin only (checked via is_master_admin_check() or equivalent).
*/

-- Ensure no conflicting existing function with different defaults
drop function if exists public.allocate_org_coins(uuid, bigint, text);
create or replace function public.allocate_org_coins(
  p_org_id uuid,
  p_amount bigint,
  p_reason text
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  current_platform bigint;
  new_balance bigint;
  org_exists boolean;
begin
  -- require master admin
  if not is_master_admin_check() then
    return json_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Only master administrators can allocate coins');
  end if;

  if p_amount <= 0 then
    return json_build_object('success', false, 'error', 'INVALID_INPUT', 'message', 'Amount must be positive');
  end if;

  -- verify org wallet exists
  select exists(select 1 from org_coin_wallets where org_id = p_org_id) into org_exists;
  if not org_exists then
    -- lazily create org wallet if missing
    insert into org_coin_wallets(org_id, balance) values (p_org_id, 0)
    on conflict (org_id) do nothing;
  end if;

  -- check platform funds
  select coins into current_platform from platform_balance where id = 1;
  if not found then
    -- Initialize platform balance record if missing
    insert into platform_balance(id, coins, updated_at) values (1, 0, now()) on conflict (id) do nothing;
    current_platform := 0;
  end if;

  if current_platform < p_amount then
    return json_build_object('success', false, 'error', 'INSUFFICIENT_FUNDS', 'message', 'Platform balance too low');
  end if;

  begin
    -- deduct from platform
    update platform_balance set coins = coins - p_amount, updated_at = now() where id = 1;
    insert into platform_ledger(direction, amount_coins, reason, created_by)
    values ('DEBIT', p_amount, 'Allocate to org: ' || p_reason, auth.uid());

    -- credit to org wallet
    update org_coin_wallets set balance = balance + p_amount, updated_at = now() where org_id = p_org_id;
    select balance into new_balance from org_coin_wallets where org_id = p_org_id;

    -- record org txn
    insert into org_coin_txns(org_id, amount, reason)
    values (p_org_id, p_amount, p_reason);

    -- Read back platform balance after deduction
    select coins into current_platform from platform_balance where id = 1;

    return json_build_object(
      'success', true,
      'org_id', p_org_id,
      'amount', p_amount,
      'org_balance', new_balance,
      'remaining_balance', current_platform
    );
  exception when others then
    return json_build_object('success', false, 'error', 'UNKNOWN', 'message', 'Unexpected error: ' || sqlerrm);
  end;
end;
$$;

revoke all on function public.allocate_org_coins(uuid, bigint, text) from public;
grant execute on function public.allocate_org_coins(uuid, bigint, text) to authenticated;