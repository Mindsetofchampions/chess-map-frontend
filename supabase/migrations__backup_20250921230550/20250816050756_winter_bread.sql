/*
  # Database Triggers

  1. Update Triggers
    - Handle updated_at timestamp columns
    - Profile audit triggers
    - Persona path canonicalization

  2. User Management Triggers
    - New user profile creation
    - Role change auditing
    - Submission rewards

  3. Business Logic Triggers
    - Quest approval budget handling
    - Completion coin awards
*/

-- Users updated_at trigger
drop trigger if exists handle_users_updated_at on users;
create trigger handle_users_updated_at
  before update on users
  for each row
  execute function handle_updated_at();

-- Profile audit triggers
drop trigger if exists trg_profiles_audit_role on profiles;
create trigger trg_profiles_audit_role
  after update on profiles
  for each row
  execute function audit_profile_role_change();

drop trigger if exists trg_profiles_role_guard on profiles;
create trigger trg_profiles_role_guard
  before update on profiles
  for each row
  execute function prevent_role_escalation();

-- Personas triggers
drop trigger if exists trg_personas_canon on personas;
create trigger trg_personas_canon
  before insert or update on personas
  for each row
  execute function personas_canon_path();

drop trigger if exists trg_personas_updated on personas;
create trigger trg_personas_updated
  before update on personas
  for each row
  execute function set_updated_at();

-- Quest approval budget trigger
drop trigger if exists trg_quest_approved_budget on quests;
create trigger trg_quest_approved_budget
  before update on quests
  for each row
  execute function on_quest_approved_budget();

-- Submission reward trigger
drop trigger if exists trg_submission_reward on quest_submissions;
create trigger trg_submission_reward
  after insert or update on quest_submissions
  for each row
  execute function on_submission_reward();

-- Completion award trigger
drop trigger if exists trg_completions_award on completions;
create trigger trg_completions_award
  after insert on completions
  for each row
  execute function completions_award_coins();

-- New user profile creation trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();