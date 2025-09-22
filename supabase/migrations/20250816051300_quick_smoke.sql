/*
  # Fix get_my_ledger RPC function

  1. Database Changes
    - Fix GROUP BY clause error in get_my_ledger function
    - Remove problematic GROUP BY and return simple ledger entries
    - Ensure proper ordering by created_at DESC

  2. Security
    - Maintains RLS security through user_id filtering
    - Only returns current user's ledger entries
*/

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_my_ledger(integer, integer);

-- Recreate get_my_ledger function without GROUP BY issues
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
  -- Return ledger entries for the current user
  RETURN QUERY
  SELECT 
    cl.id,
    cl.user_id,
    cl.delta,
    cl.kind,
    cl.quest_id,
    cl.created_by,
    cl.created_at
  FROM coin_ledger cl
  WHERE cl.user_id = auth.uid()
  ORDER BY cl.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;