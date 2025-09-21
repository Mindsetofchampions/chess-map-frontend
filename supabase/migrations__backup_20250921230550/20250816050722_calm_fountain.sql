/*
  # Business Logic Functions

  1. Quest Functions
    - `submit_mcq_answer()` - Submit MCQ with auto-grading
    - `approve_quest()` - Approve quest and deduct budget
    - `on_quest_approved_budget()` - Trigger for budget deduction
    - `on_submission_reward()` - Trigger for coin rewards

  2. Profile Functions
    - `audit_profile_role_change()` - Audit role changes
    - `prevent_role_escalation()` - Prevent unauthorized role changes
    - `handle_new_user()` - Initialize new user profile

  3. Utility Functions
    - `completions_award_coins()` - Award coins for completions
    - `personas_canon_path()` - Canonicalize persona paths
*/

-- Submit MCQ answer with auto-grading
create or replace function submit_mcq_answer(
  p_quest_id uuid,
  p_choice text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quest record;
  v_config jsonb;
  v_options jsonb;
  v_correct_choice text;
  v_is_correct boolean := false;
  v_submission_id uuid;
  v_status submission_status;
begin
  -- Get quest config
  select id, config, reward_coins into v_quest
  from quests 
  where id = p_quest_id and status = 'approved' and active = true;
  
  if not found then
    raise exception 'Quest not found or not available';
  end if;
  
  v_config := v_quest.config;
  v_options := v_config->'options';
  
  -- Check if choice exists in options
  if not (v_options ? p_choice) then
    raise exception 'Invalid choice';
  end if;
  
  -- Determine if answer is correct (server-side only)
  select into v_correct_choice 
    key from jsonb_each(v_options) 
    where value->>'isCorrect' = 'true' 
    limit 1;
  
  v_is_correct := (p_choice = v_correct_choice);
  v_status := case when v_is_correct then 'autograded'::submission_status else 'rejected'::submission_status end;
  
  -- Insert submission
  insert into quest_submissions (
    quest_id, user_id, status, mcq_choice, score
  ) values (
    p_quest_id, auth.uid(), v_status, p_choice, case when v_is_correct then 100 else 0 end
  ) returning id into v_submission_id;
  
  -- Award coins if correct
  if v_is_correct then
    insert into coin_ledger (user_id, delta, kind, quest_id, created_by)
    values (auth.uid(), v_quest.reward_coins, 'quest_award', p_quest_id, auth.uid());
    
    -- Update wallet
    insert into coin_wallets (user_id, balance, updated_at)
    values (auth.uid(), v_quest.reward_coins, now())
    on conflict (user_id) 
    do update set 
      balance = coin_wallets.balance + v_quest.reward_coins,
      updated_at = now();
  end if;
  
  return jsonb_build_object(
    'id', v_submission_id,
    'quest_id', p_quest_id,
    'user_id', auth.uid(),
    'status', v_status,
    'mcq_choice', p_choice,
    'score', case when v_is_correct then 100 else 0 end,
    'created_at', now()
  );
end
$$;

-- Approve quest and deduct budget
create or replace function approve_quest(p_quest_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quest record;
  v_admin_wallet integer;
begin
  -- Only master admins can approve
  if not actor_is_master_admin() then
    raise exception 'Only master_admin can approve quests';
  end if;
  
  -- Get quest details
  select id, reward_coins, status into v_quest
  from quests where id = p_quest_id;
  
  if not found then
    raise exception 'Quest not found';
  end if;
  
  if v_quest.status != 'submitted' then
    raise exception 'Quest must be in submitted status to approve';
  end if;
  
  -- Check admin wallet balance
  select balance into v_admin_wallet 
  from coin_wallets 
  where user_id = auth.uid();
  
  if v_admin_wallet < v_quest.reward_coins then
    raise exception 'Insufficient balance to approve quest (need % coins)', v_quest.reward_coins;
  end if;
  
  -- Deduct budget from admin wallet
  insert into coin_ledger (user_id, delta, kind, quest_id, created_by)
  values (auth.uid(), -v_quest.reward_coins, 'quest_budget', p_quest_id, auth.uid());
  
  update coin_wallets 
  set balance = balance - v_quest.reward_coins, updated_at = now()
  where user_id = auth.uid();
  
  -- Approve the quest
  update quests 
  set status = 'approved'::quest_status
  where id = p_quest_id;
  
  return jsonb_build_object(
    'id', p_quest_id,
    'status', 'approved',
    'budget_deducted', v_quest.reward_coins
  );
end
$$;

-- Get user wallet
create or replace function get_my_wallet()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet record;
begin
  select user_id, balance, updated_at into v_wallet
  from coin_wallets 
  where user_id = auth.uid();
  
  if not found then
    -- Create wallet if doesn't exist
    insert into coin_wallets (user_id, balance, updated_at)
    values (auth.uid(), 0, now())
    returning user_id, balance, updated_at into v_wallet;
  end if;
  
  return jsonb_build_object(
    'user_id', v_wallet.user_id,
    'balance', v_wallet.balance,
    'updated_at', v_wallet.updated_at
  );
end
$$;

-- Get user transaction ledger
create or replace function get_my_ledger(p_limit integer default 50, p_offset integer default 0)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ledger jsonb;
begin
  select jsonb_agg(
    jsonb_build_object(
      'id', id,
      'user_id', user_id,
      'delta', delta,
      'kind', kind,
      'quest_id', quest_id,
      'created_by', created_by,
      'created_at', created_at
    )
  ) into v_ledger
  from coin_ledger
  where user_id = auth.uid()
  order by created_at desc
  limit p_limit offset p_offset;
  
  return coalesce(v_ledger, '[]'::jsonb);
end
$$;

-- Trigger function for quest approval budget
create or replace function on_quest_approved_budget()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- This trigger function is called when quest status changes to approved
  -- Budget deduction is handled in approve_quest() function
  return NEW;
end
$$;

-- Trigger function for submission rewards
create or replace function on_submission_reward()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Rewards are handled in submit_mcq_answer() function
  return NEW;
end
$$;

-- Audit profile role changes
create or replace function audit_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if OLD.role != NEW.role then
    insert into audit_role_changes (
      changed_user_id, actor_user_id, old_role, new_role, reason
    ) values (
      NEW.user_id, auth.uid(), OLD.role, NEW.role, 'Profile role change'
    );
  end if;
  return NEW;
end
$$;

-- Prevent unauthorized role escalation
create or replace function prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only master admin can change roles
  if OLD.role != NEW.role and not actor_is_master_admin() then
    raise exception 'Only master_admin can change user roles';
  end if;
  return NEW;
end
$$;

-- Handle new user profile creation
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Create profile for new user
  insert into profiles (user_id, role, created_at)
  values (NEW.id, 'student'::user_role, now());
  
  -- Create coin wallet
  insert into coin_wallets (user_id, balance, updated_at)
  values (NEW.id, 0, now());
  
  return NEW;
end
$$;

-- Completions award coins
create or replace function completions_award_coins()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Award coins handled elsewhere for now
  return NEW;
end
$$;

-- Personas canonical path
create or replace function personas_canon_path()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Ensure sprite path matches key
  NEW.sprite_path := '/personas/' || NEW.key::text || '.gif';
  return NEW;
end
$$;