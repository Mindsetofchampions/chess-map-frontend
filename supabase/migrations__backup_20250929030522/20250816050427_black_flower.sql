/*
  # Complete Database Reset

  This migration completely removes all existing database objects
  to provide a clean slate for rebuilding the schema.

  ## Destructive Operations
  1. Drop all tables with CASCADE to remove dependencies
  2. Drop all custom types
  3. Drop all functions and triggers
  4. Reset to clean state

  **WARNING: This will destroy all data**
*/

-- Drop all tables with CASCADE to handle dependencies
drop table if exists coin_ledger cascade;
drop table if exists coin_wallets cascade;
drop table if exists quest_submissions cascade;
drop table if exists quests cascade;
drop table if exists app_routes cascade;
drop table if exists app_defaults cascade;
drop table if exists audit_role_changes cascade;
drop table if exists personas cascade;
drop table if exists store_orders cascade;
drop table if exists store_items cascade;
drop table if exists student_coin_txns cascade;
drop table if exists student_coin_wallets cascade;
drop table if exists org_coin_txns cascade;
drop table if exists org_coin_wallets cascade;
drop table if exists allowlisted_domains cascade;
drop table if exists quest_evidence cascade;
drop table if exists profiles cascade;
drop table if exists mcq_answers cascade;
drop table if exists mc_questions cascade;
drop table if exists memberships cascade;
drop table if exists events cascade;
drop table if exists video_resources cascade;
drop table if exists organizations cascade;
drop table if exists analytics_logs cascade;
drop table if exists completions cascade;
drop table if exists safe_spaces cascade;
drop table if exists quest_templates cascade;
drop table if exists attributes cascade;
drop table if exists admins cascade;
drop table if exists users cascade;

-- Drop all custom types
drop type if exists persona_key cascade;
drop type if exists submission_status cascade;
drop type if exists quest_status cascade;
drop type if exists quest_type cascade;
drop type if exists user_role cascade;

-- Drop all custom functions
drop function if exists handle_updated_at() cascade;
drop function if exists set_updated_at() cascade;
drop function if exists audit_profile_role_change() cascade;
drop function if exists handle_new_user() cascade;
drop function if exists completions_award_coins() cascade;
drop function if exists on_quest_approved_budget() cascade;
drop function if exists prevent_role_escalation() cascade;
drop function if exists personas_canon_path() cascade;
drop function if exists on_submission_reward() cascade;
drop function if exists submit_mcq_answer(uuid, text) cascade;
drop function if exists approve_quest(uuid) cascade;
drop function if exists get_my_wallet() cascade;
drop function if exists get_my_ledger(integer, integer) cascade;
drop function if exists actor_is_master_admin() cascade;
drop function if exists actor_role() cascade;
drop function if exists actor_at_least(user_role) cascade;
drop function if exists is_master_admin(uuid) cascade;
drop function if exists role_rank(user_role) cascade;

-- Drop all views
drop view if exists user_coin_balance cascade;
drop view if exists v_org_coin_balance cascade;
drop view if exists v_student_coin_balance cascade;
drop view if exists v_student_coin_balance_detailed cascade;
drop view if exists v_student_coin_total_balance cascade;

-- Reset sequences
drop sequence if exists audit_role_changes_id_seq cascade;
drop sequence if exists coin_ledger_id_seq cascade;