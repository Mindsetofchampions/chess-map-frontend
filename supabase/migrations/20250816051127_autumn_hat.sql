/*
  # Fix RPC Functions

  1. Fix get_my_ledger GROUP BY issue
  2. Fix get_my_wallet duplicate key issue
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_my_ledger();
DROP FUNCTION IF EXISTS get_my_wallet();

-- Fixed get_my_ledger function with proper GROUP BY
CREATE OR REPLACE FUNCTION get_my_ledger()
RETURNS TABLE (
  id bigint,
  delta integer,
  kind text,
  quest_id uuid,
  created_by uuid,
  created_at timestamptz
)
LANGUAGE plpgsql security definer set search_path = public$$
BEGIN
  RETURN QUERY
  SELECT 
    cl.id,
    cl.delta,
    cl.kind,
    cl.quest_id,
    cl.created_by,
    cl.created_at
  FROM coin_ledger cl
  WHERE cl.user_id = auth.uid()
  ORDER BY cl.created_at DESC
  LIMIT 50;
END;
$$;

-- Fixed get_my_wallet function with UPSERT logic
CREATE OR REPLACE FUNCTION get_my_wallet()
RETURNS TABLE (
  user_id uuid,
  balance integer,
  updated_at timestamptz
)
LANGUAGE plpgsql security definer set search_path = public$$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  -- Try to get existing wallet first
  RETURN QUERY
  SELECT 
    cw.user_id,
    cw.balance,
    cw.updated_at
  FROM coin_wallets cw
  WHERE cw.user_id = current_user_id;
  
  -- If no wallet found, create one and return it
  IF NOT FOUND THEN
    INSERT INTO coin_wallets (user_id, balance, updated_at)
    VALUES (current_user_id, 0, now())
    ON CONFLICT (user_id) DO UPDATE SET
      updated_at = now()
    RETURNING 
      coin_wallets.user_id,
      coin_wallets.balance,
      coin_wallets.updated_at;
  END IF;
END;
$$;