/*
  # Create Helper Functions and Triggers

  1. Helper Functions
    - `handle_updated_at()` - Auto-update timestamp trigger
    - `set_updated_at()` - Generic timestamp updater
    - `handle_new_user()` - New user profile creation
    - `actor_role()` - Get current user's role
    - `actor_is_master_admin()` - Check master admin status
    - `is_master_admin()` - Alternative master admin check
    - `role_rank()` - Get role hierarchy rank
    - `actor_at_least()` - Check minimum role requirement

  2. Trigger Functions
    - Quest completion coin awards
    - Quest approval budget handling
    - Role change auditing
    - Persona path canonicalization

  3. RPC Functions
    - `submit_mcq_answer()` - Submit and grade MCQ
    - `approve_quest()` - Approve quest with budget check
    - `get_my_wallet()` - Get user wallet balance
    - `get_my_ledger()` - Get user transaction history
*/

-- Helper function for updating timestamps
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $FUNC$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$FUNC$ LANGUAGE plpgsql;

-- Generic timestamp updater
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $FUNC$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$FUNC$ LANGUAGE plpgsql;

-- Get current user's role
CREATE OR REPLACE FUNCTION actor_role()
RETURNS user_role AS $FUNC$
BEGIN
  RETURN COALESCE(
    (SELECT role FROM profiles WHERE user_id = uid()),
    'student'::user_role
  );
END;
$FUNC$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user is master admin
CREATE OR REPLACE FUNCTION actor_is_master_admin()
RETURNS boolean AS $FUNC$
BEGIN
  RETURN actor_role() = 'master_admin'::user_role;
END;
$FUNC$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alternative master admin check
CREATE OR REPLACE FUNCTION is_master_admin(user_uuid uuid)
RETURNS boolean AS $FUNC$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = user_uuid AND role = 'master_admin'::user_role
  );
END;
$FUNC$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get role hierarchy rank
CREATE OR REPLACE FUNCTION role_rank(r user_role)
RETURNS integer AS $FUNC$
BEGIN
  RETURN CASE 
    WHEN r = 'student'::user_role THEN 1
    WHEN r = 'staff'::user_role THEN 2
    WHEN r = 'org_admin'::user_role THEN 3
    WHEN r = 'master_admin'::user_role THEN 4
    ELSE 0
  END;
END;
$FUNC$ LANGUAGE plpgsql IMMUTABLE;

-- Check minimum role requirement
CREATE OR REPLACE FUNCTION actor_at_least(min_role user_role)
RETURNS boolean AS $FUNC$
BEGIN
  RETURN role_rank(actor_role()) >= role_rank(min_role);
END;
$FUNC$ LANGUAGE plpgsql SECURITY DEFINER;

-- Handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $FUNC$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$FUNC$ LANGUAGE plpgsql SECURITY DEFINER;

-- Award coins on quest completion
CREATE OR REPLACE FUNCTION completions_award_coins()
RETURNS TRIGGER AS $FUNC$
BEGIN
  -- Insert ledger entry for quest award
  INSERT INTO coin_ledger (user_id, delta, kind, quest_id)
  VALUES (NEW.user_id, NEW.coins_awarded, 'quest_award', NEW.quest_id);
  
  -- Update or create wallet balance
  INSERT INTO coin_wallets (user_id, balance, updated_at)
  VALUES (NEW.user_id, NEW.coins_awarded, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    balance = coin_wallets.balance + NEW.coins_awarded,
    updated_at = now();
    
  RETURN NEW;
END;
$FUNC$ LANGUAGE plpgsql SECURITY DEFINER;

-- Handle quest approval with budget deduction
CREATE OR REPLACE FUNCTION on_quest_approved_budget()
RETURNS TRIGGER AS $FUNC$
BEGIN
  -- Only process when status changes to approved
  IF OLD.status != 'approved'::quest_status AND NEW.status = 'approved'::quest_status THEN
    -- Deduct budget from master admin wallet
    INSERT INTO coin_ledger (user_id, delta, kind, quest_id, created_by)
    VALUES (uid(), -NEW.reward_coins, 'quest_budget', NEW.id, uid());
    
    -- Update wallet balance
    UPDATE coin_wallets 
    SET balance = balance - NEW.reward_coins, updated_at = now()
    WHERE user_id = uid();
  END IF;
  
  RETURN NEW;
END;
$FUNC$ LANGUAGE plpgsql SECURITY DEFINER;

-- Handle submission rewards
CREATE OR REPLACE FUNCTION on_submission_reward()
RETURNS TRIGGER AS $FUNC$
DECLARE
  quest_reward integer;
BEGIN
  -- Only award on successful auto-grading
  IF NEW.status = 'autograded'::submission_status AND 
     (OLD IS NULL OR OLD.status != 'autograded'::submission_status) THEN
    
    -- Get quest reward amount
    SELECT reward_coins INTO quest_reward
    FROM quests 
    WHERE id = NEW.quest_id;
    
    IF quest_reward > 0 THEN
      -- Award coins via completion record
      INSERT INTO completions (quest_id, user_id, coins_awarded)
      VALUES (NEW.quest_id, NEW.user_id, quest_reward);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$FUNC$ LANGUAGE plpgsql SECURITY DEFINER;

-- Prevent unauthorized role escalation
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $FUNC$
BEGIN
  -- Only master admins can change roles
  IF OLD.role != NEW.role AND NOT actor_is_master_admin() THEN
    RAISE EXCEPTION 'Only master_admin can change user roles';
  END IF;
  
  RETURN NEW;
END;
$FUNC$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit role changes
CREATE OR REPLACE FUNCTION audit_profile_role_change()
RETURNS TRIGGER AS $FUNC$
BEGIN
  IF OLD.role != NEW.role THEN
    INSERT INTO audit_role_changes (changed_user_id, actor_user_id, old_role, new_role)
    VALUES (NEW.user_id, uid(), OLD.role, NEW.role);
  END IF;
  
  RETURN NEW;
END;
$FUNC$ LANGUAGE plpgsql SECURITY DEFINER;

-- Canonicalize persona sprite paths
CREATE OR REPLACE FUNCTION personas_canon_path()
RETURNS TRIGGER AS $FUNC$
BEGIN
  NEW.sprite_path = '/personas/' || NEW.key || '.gif';
  RETURN NEW;
END;
$FUNC$ LANGUAGE plpgsql;

-- Create triggers
DO $CREATE_TRIGGERS$
BEGIN
  -- Users updated at trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'handle_users_updated_at' AND tgrelid = 'users'::regclass
  ) THEN
    CREATE TRIGGER handle_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;
  
  -- New user trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created' AND tgrelid = 'auth.users'::regclass
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user();
  END IF;
  
  -- Completion coins trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_completions_award' AND tgrelid = 'completions'::regclass
  ) THEN
    CREATE TRIGGER trg_completions_award
      AFTER INSERT ON completions
      FOR EACH ROW EXECUTE FUNCTION completions_award_coins();
  END IF;
  
  -- Quest approval budget trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_quest_approved_budget' AND tgrelid = 'quests'::regclass
  ) THEN
    CREATE TRIGGER trg_quest_approved_budget
      BEFORE UPDATE ON quests
      FOR EACH ROW EXECUTE FUNCTION on_quest_approved_budget();
  END IF;
  
  -- Submission reward trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_submission_reward' AND tgrelid = 'quest_submissions'::regclass
  ) THEN
    CREATE TRIGGER trg_submission_reward
      AFTER INSERT OR UPDATE ON quest_submissions
      FOR EACH ROW EXECUTE FUNCTION on_submission_reward();
  END IF;
  
  -- Profile role change triggers
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_profiles_role_guard' AND tgrelid = 'profiles'::regclass
  ) THEN
    CREATE TRIGGER trg_profiles_role_guard
      BEFORE UPDATE ON profiles
      FOR EACH ROW EXECUTE FUNCTION prevent_role_escalation();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_profiles_audit_role' AND tgrelid = 'profiles'::regclass
  ) THEN
    CREATE TRIGGER trg_profiles_audit_role
      AFTER UPDATE ON profiles
      FOR EACH ROW EXECUTE FUNCTION audit_profile_role_change();
  END IF;
  
  -- Persona canonicalization trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_personas_canon' AND tgrelid = 'personas'::regclass
  ) THEN
    CREATE TRIGGER trg_personas_canon
      BEFORE INSERT OR UPDATE ON personas
      FOR EACH ROW EXECUTE FUNCTION personas_canon_path();
  END IF;
  
  -- Persona updated at trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_personas_updated' AND tgrelid = 'personas'::regclass
  ) THEN
    CREATE TRIGGER trg_personas_updated
      BEFORE UPDATE ON personas
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $CREATE_TRIGGERS$;