/*
  # Create RPC Functions

  1. Public RPC Functions
    - `submit_mcq_answer(uuid, text)` - Submit MCQ answer with auto-grading
    - `approve_quest(uuid)` - Approve quest with budget validation
    - `get_my_wallet()` - Get current user's wallet balance
    - `get_my_ledger(integer, integer)` - Get paginated transaction history

  2. Security
    - All RPCs use SECURITY DEFINER for controlled access
    - Proper permission checks within each function
    - Input validation and error handling
*/

-- Submit MCQ answer with auto-grading
CREATE OR REPLACE FUNCTION submit_mcq_answer(
  p_quest_id uuid,
  p_choice text
)
RETURNS json AS $FUNC$
DECLARE
  quest_record record;
  submission_id uuid;
  is_correct boolean := false;
  result json;
BEGIN
  -- Get quest details
  SELECT q.*, q.config->>'correct_answer' as correct_answer
  INTO quest_record
  FROM quests q
  WHERE q.id = p_quest_id 
  AND q.status = 'approved'::quest_status 
  AND q.active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quest not found or not available';
  END IF;
  
  -- Check if user already submitted
  IF EXISTS (
    SELECT 1 FROM quest_submissions 
    WHERE quest_id = p_quest_id AND user_id = uid()
  ) THEN
    RAISE EXCEPTION 'You have already submitted an answer for this quest';
  END IF;
  
  -- Auto-grade MCQ
  IF quest_record.qtype = 'mcq'::quest_type THEN
    is_correct := (quest_record.correct_answer = p_choice);
  END IF;
  
  -- Insert submission
  INSERT INTO quest_submissions (
    quest_id, user_id, mcq_choice, 
    status, score
  ) VALUES (
    p_quest_id, uid(), p_choice,
    CASE WHEN is_correct THEN 'autograded'::submission_status ELSE 'rejected'::submission_status END,
    CASE WHEN is_correct THEN 100 ELSE 0 END
  ) RETURNING id INTO submission_id;
  
  -- Build result
  SELECT json_build_object(
    'id', submission_id,
    'quest_id', p_quest_id,
    'user_id', uid(),
    'status', CASE WHEN is_correct THEN 'autograded' ELSE 'rejected' END,
    'mcq_choice', p_choice,
    'score', CASE WHEN is_correct THEN 100 ELSE 0 END,
    'created_at', now()
  ) INTO result;
  
  RETURN result;
END;
$FUNC$ LANGUAGE plpgsql SECURITY DEFINER;

-- Approve quest with budget validation
CREATE OR REPLACE FUNCTION approve_quest(p_quest_id uuid)
RETURNS json AS $FUNC$
DECLARE
  quest_record record;
  current_balance integer;
  result json;
BEGIN
  -- Check master admin permission
  IF NOT actor_is_master_admin() THEN
    RAISE EXCEPTION 'Only master_admin can approve quests';
  END IF;
  
  -- Get quest details
  SELECT * INTO quest_record
  FROM quests 
  WHERE id = p_quest_id 
  AND status = 'submitted'::quest_status;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quest not found or not in submitted status';
  END IF;
  
  -- Check wallet balance
  SELECT COALESCE(balance, 0) INTO current_balance
  FROM coin_wallets 
  WHERE user_id = uid();
  
  IF current_balance < quest_record.reward_coins THEN
    RAISE EXCEPTION 'Insufficient balance. Need % coins but have %', 
      quest_record.reward_coins, current_balance;
  END IF;
  
  -- Update quest status
  UPDATE quests 
  SET status = 'approved'::quest_status,
      approved_at = now(),
      approved_by = uid()
  WHERE id = p_quest_id;
  
  -- Build result
  SELECT json_build_object(
    'id', p_quest_id,
    'status', 'approved',
    'approved_at', now(),
    'approved_by', uid(),
    'reward_coins', quest_record.reward_coins
  ) INTO result;
  
  RETURN result;
END;
$FUNC$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user's wallet
CREATE OR REPLACE FUNCTION get_my_wallet()
RETURNS json AS $FUNC$
DECLARE
  wallet_record record;
  result json;
BEGIN
  -- Get or create wallet
  INSERT INTO coin_wallets (user_id, balance, updated_at)
  VALUES (uid(), 0, now())
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get wallet data
  SELECT * INTO wallet_record
  FROM coin_wallets 
  WHERE user_id = uid();
  
  SELECT json_build_object(
    'user_id', wallet_record.user_id,
    'balance', wallet_record.balance,
    'updated_at', wallet_record.updated_at
  ) INTO result;
  
  RETURN result;
END;
$FUNC$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's transaction ledger
CREATE OR REPLACE FUNCTION get_my_ledger(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS json AS $FUNC$
DECLARE
  result json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', id,
      'user_id', user_id,
      'delta', delta,
      'kind', kind,
      'quest_id', quest_id,
      'created_by', created_by,
      'created_at', created_at
    ) ORDER BY created_at DESC
  ) INTO result
  FROM coin_ledger
  WHERE user_id = uid()
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
  
  RETURN COALESCE(result, '[]'::json);
END;
$FUNC$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create auth trigger if not exists
DO $CREATE_AUTH_TRIGGER$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user();
  END IF;
END $CREATE_AUTH_TRIGGER$;