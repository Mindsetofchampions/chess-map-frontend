-- Fix wallet and ledger RPCs to avoid ambiguous column references
-- and standardize return signatures for Supabase clients.

-- get_my_wallet: return a single row with user_id, balance, updated_at.
-- Ensure the wallet row exists and fully qualify column refs.
DROP FUNCTION IF EXISTS public.get_my_wallet();
CREATE OR REPLACE FUNCTION public.get_my_wallet()
RETURNS TABLE (
  user_id uuid,
  balance bigint,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure a wallet exists for current user
  INSERT INTO public.coin_wallets AS cw (user_id, balance, updated_at)
  VALUES (auth.uid(), 0, now())
  ON CONFLICT (user_id) DO UPDATE
    SET updated_at = EXCLUDED.updated_at
  WHERE cw.user_id = EXCLUDED.user_id;

  -- Return current wallet row
  RETURN QUERY
  SELECT cw.user_id, cw.balance, cw.updated_at
  FROM public.coin_wallets cw
  WHERE cw.user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_wallet() TO anon, authenticated;

-- get_my_ledger: return a page of rows for the current user.
DROP FUNCTION IF EXISTS public.get_my_ledger(integer, integer);
CREATE OR REPLACE FUNCTION public.get_my_ledger(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id bigint,
  user_id uuid,
  delta integer,
  kind text,
  quest_id uuid,
  created_by uuid,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.id,
    cl.user_id,
    cl.delta,
    cl.kind,
    cl.quest_id,
    cl.created_by,
    cl.created_at
  FROM public.coin_ledger cl
  WHERE cl.user_id = auth.uid()
  ORDER BY cl.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_ledger(integer, integer) TO anon, authenticated;
