-- Reset wallet & ledger RPCs by removing any overloaded variants
-- and recreating unambiguous, qualified definitions.

do $$
declare
  r record;
begin
  for r in (
    select oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('get_my_wallet','get_my_ledger')
  ) loop
    execute 'drop function if exists ' || r.sig || ' cascade';
  end loop;
end$$;

-- Create get_my_wallet()
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
  -- Ensure a wallet exists for current user
  insert into public.coin_wallets as cw (user_id, balance, updated_at)
  values (auth.uid(), 0, now())
  on conflict (user_id) do update
    set updated_at = excluded.updated_at
  where cw.user_id = excluded.user_id;

  return query
  select cw.user_id, cw.balance, cw.updated_at
  from public.coin_wallets cw
  where cw.user_id = auth.uid();
end;
$$;

grant execute on function public.get_my_wallet() to anon, authenticated;

-- Create get_my_ledger(limit, offset)
create or replace function public.get_my_ledger(
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id bigint,
  user_id uuid,
  delta integer,
  kind text,
  quest_id uuid,
  created_by uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select 
    cl.id,
    cl.user_id,
    cl.delta,
    cl.kind,
    cl.quest_id,
    cl.created_by,
    cl.created_at
  from public.coin_ledger cl
  where cl.user_id = auth.uid()
  order by cl.created_at desc
  limit p_limit offset p_offset;
end;
$$;

grant execute on function public.get_my_ledger(integer, integer) to anon, authenticated;
