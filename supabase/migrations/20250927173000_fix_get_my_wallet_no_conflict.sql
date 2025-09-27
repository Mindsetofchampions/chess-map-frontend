-- Reimplement get_my_wallet without ON CONFLICT to eliminate any ambiguity around user_id
drop function if exists public.get_my_wallet();
create or replace function public.get_my_wallet()
returns table (
  user_id uuid,
  balance bigint,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Try to update existing wallet
  update public.coin_wallets cw
    set updated_at = now()
  where cw.user_id = auth.uid();

  -- If no row updated, insert a new wallet
  if not found then
    insert into public.coin_wallets (user_id, balance, updated_at)
    values (auth.uid(), 0, now());
  end if;

  -- Return the wallet row
  return query
  select cw.user_id, cw.balance, cw.updated_at
  from public.coin_wallets cw
  where cw.user_id = auth.uid();
end;
$$;

grant execute on function public.get_my_wallet() to anon, authenticated;
