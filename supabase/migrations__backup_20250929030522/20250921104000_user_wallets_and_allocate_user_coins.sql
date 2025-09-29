-- User wallets and allocation RPC

create table if not exists public.user_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  coins bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.user_wallets enable row level security;

-- RLS: user can read own wallet, master admin can read/update
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_wallets' and policyname = 'wallet_select_own_or_master'
  ) then
    create policy wallet_select_own_or_master on public.user_wallets
      for select to authenticated
      using (user_id = auth.uid() or public.is_master_admin());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_wallets' and policyname = 'wallet_update_master'
  ) then
    create policy wallet_update_master on public.user_wallets
      for update to authenticated
      using (public.is_master_admin()) with check (public.is_master_admin());
  end if;
end $$;

-- Helper to resolve a user id by email
create or replace function public.get_user_id_by_email(p_email text)
returns uuid language sql security definer as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1
$$;
alter function public.get_user_id_by_email(text) owner to postgres;
grant execute on function public.get_user_id_by_email(text) to anon, authenticated;

-- Allocate coins to a user (master_admin or org_admin)
create or replace function public.allocate_user_coins(p_email text, p_amount bigint, p_reason text default null)
returns json language plpgsql security definer set search_path = public as $$
declare 
  v_user uuid; 
  current_platform bigint;
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

  -- ensure user wallet exists
  insert into public.user_wallets (user_id, coins)
  values (v_user, 0)
  on conflict (user_id) do nothing;

  -- transfer: debit platform, credit user
  update platform_balance set coins = coins - p_amount, updated_at = now() where id = 1;
  insert into platform_ledger(direction, amount_coins, reason, created_by)
  values ('DEBIT', p_amount, coalesce('Allocate to user: ' || p_reason, 'Allocate to user'), auth.uid());

  update public.user_wallets set coins = coins + p_amount, updated_at = now() where user_id = v_user;

  -- read remaining
  select coins into current_platform from platform_balance where id = 1;
  return json_build_object('ok', true, 'user_id', v_user, 'amount', p_amount, 'remaining_balance', current_platform);
end $$;
alter function public.allocate_user_coins(text, bigint, text) owner to postgres;
grant execute on function public.allocate_user_coins(text, bigint, text) to anon, authenticated;
