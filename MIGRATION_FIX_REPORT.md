# MIGRATION FIX REPORT

**Generated:** 2025-09-29T03:05:22.208Z
**Root Directory:** `supabase/migrations`
**Backup Location:** `supabase/migrations__backup_20250929030522`

## Files Processed

- **2025-09-create-notifications.sql** → no changes
- **2025-09-setup-onboarding.sql** → no changes
- **2025-09-storage-parent-ids.sql** → no changes
- **20250816050427_black_flower.sql** → no changes
- **20250816050439_late_dune.sql** → no changes
- **20250816050448_old_wildflower.sql** → no changes
- **20250816050458_little_limit.sql** → no changes
- **20250816050505_raspy_rain.sql** → no changes
- **20250816050522_curly_temple.sql** → no changes
- **20250816050528_solitary_resonance.sql** → no changes
- **20250816050533_rapid_desert.sql** → no changes
- **20250816050546_small_cliff.sql** → no changes
- **20250816050601_fragrant_king.sql** → rules applied: 5, 8
- **20250816050621_winter_resonance.sql** → rules applied: 5, 8
- **20250816050642_old_hat.sql** → rules applied: 5, 8
- **20250816050654_gentle_shape.sql** → rules applied: 5, 8
- **20250816050711_broad_resonance.sql** → rules applied: 5, 8
- **20250816050722_calm_fountain.sql** → no changes
- **20250816050756_winter_bread.sql** → no changes
- **20250816050803_young_salad.sql** → no changes
- **20250816050810_mellow_truth.sql** → no changes
- **20250816051127_autumn_hat.sql** → no changes
- **20250816051300_quick_smoke.sql** → no changes
- **20250910015445_tight_lodge.sql** → rules applied: 5, 8
- **20250910125516_orange_crystal.sql** → rules applied: 5, 8
- **20250910154712_mellow_desert.sql** → rules applied: 5, 8
- **20250918000000_allocate_org_coins.sql** → no changes
- **20250918001000_seed_test_org.sql** → no changes
- **20250918002000_seed_test_user.sql** → no changes
- **20250918003000_fix_user_roles_type.sql** → rules applied: 5, 8
- **20250918004000_add_metadata_to_platform_ledger.sql** → no changes
- **20250919000000_add_100k_platform_coins.sql** → no changes
- **20250920000000_rpc_aggregate_progress.sql** → no changes
- **20250920000500_add_org_id_to_safe_spaces.sql** → no changes
- **20250920000750_add_missing_safe_spaces_columns.sql** → no changes
- **20250920001000_create_safe_spaces_and_store_items.sql** → no changes
- **20250920002000_setup_onboarding.sql** → no changes
- **20250920002500_storage_parent_ids.sql** → no changes
- **20250920003000_create_notifications.sql** → no changes
- **20250920003500_create_rls_helpers_and_policies.sql** → rules applied: 5, 8
- **20250920004000_replace_policies_with_helper.sql** → rules applied: 5, 8
- **20250920094500_create_org_onboardings.sql** → rules applied: 5, 8
- **20250920094510_create_system_notifications.sql** → rules applied: 5, 8
- **20250920094520_indexes.sql** → no changes
- **20250920100000_notifications_trigger.sql** → no changes
- **20250920120000_create_org_admins_and_storage_policies.sql** → no changes
- **20250920121000_promote_self_to_master.sql** → no changes
- **20250920121500_fix_promote_self_to_master.sql** → no changes
- **20250920122000_fix_admin_rpcs.sql** → no changes
- **20250920123000_fix_helpers_and_ownership.sql** → no changes
- **20250920123500_harden_master_checks.sql** → no changes
- **20250921090000_master_users_list_rpc.sql** → no changes
- **20250921093000_org_onboarding_storage.sql** → no changes
- **20250921094500_org_onboarding_add_columns.sql** → no changes
- **20250921095500_org_onboarding_rpcs.sql** → no changes
- **20250921100500_fix_storage_policies.sql** → no changes
- **20250921104000_user_wallets_and_allocate_user_coins.sql** → no changes
- **20250921112000_org_engagements_and_rpcs.sql** → no changes
- **20250921120000_cams_schema.sql** → no changes
- **20250921120100_cams_reports.sql** → no changes
- **20250921120200_storage_buckets.sql** → rules applied: 5, 8
- **20250921123000_org_admin_helpers.sql** → no changes
- **20250921130000_quest_schema_upgrades.sql** → no changes
- **20250921130500_quest_enrollments_and_rpcs.sql** → rules applied: 5, 8
- **20250921150000_normalize_user_roles_and_master_rpcs.sql** → no changes
- **20250921151000_seed_master_admin.sql** → no changes
- **20250921152000_fix_admin_list_return_type.sql** → no changes
- **20250921153000_admin_list_role_as_text.sql** → no changes
- **20250921154000_fix_admin_list_left_join.sql** → no changes
- **20250921154500_drop_and_recreate_admin_list.sql** → no changes
- **20250921160000_add_org_status.sql** → no changes
- **20250921231500_fix_quest_rpcs_selects.sql** → no changes
- **20250921232500_fix_quest_rpcs_ambiguity.sql** → no changes
- **20250921T120000_cams_schema.sql** → no changes
- **20250921T120100_cams_reports.sql** → no changes
- **20250921T120200_storage_buckets.sql** → rules applied: 5, 8
- **20250923094500_fix_is_user_in_roles.sql** → no changes
- **20250923123000_create_safe_spaces.sql** → rules applied: 5, 8
- **20250923123100_create_events.sql** → rules applied: 5, 8
- **20250923124500_normalize_map_tables.sql** → no changes
- **20250925090000_map_assets_bucket.sql** → rules applied: 1, 5, 8
- **20250927130500_fix_wallet_ledger_ambiguous_user_id.sql** → no changes
- **20250927170000_reset_wallet_ledger_functions.sql** → no changes
- **20250927173000_fix_get_my_wallet_no_conflict.sql** → no changes
- **20250927T130500_fix_wallet_ledger_ambiguous_user_id.sql** → no changes
- **20250927_create_map_assets_bucket.sql** → rules applied: 1, 5, 8
- **20250928120000_fix_get_my_org_prefer_admin_active.sql** → no changes
- **20250928123000_fix_get_my_org_include_staff.sql** → no changes
- **20250928124500_fix_get_my_org_wallet_role_check.sql** → no changes
- **20250928190500_fix_notifications_trigger_no_student_name.sql** → no changes
- **20250928191500_add_student_fields_onboarding_responses.sql** → no changes
- **20250928T120500_add_safe_spaces_public_view.sql** → no changes
- **20250928T190000_fix_notifications_trigger_no_student_name.sql** → no changes

## Summary

- **Files processed:** 93
- **Files modified:** 20
- **Total fixes applied:** 42
- **Total warnings:** 0

## Fix Rules Applied

1. Remove IF NOT EXISTS from CREATE POLICY statements
2. Convert CREATE TYPE IF NOT EXISTS to conditional DO blocks
3. Convert execute $$...$$ to execute '...' with proper quoting
4. Fix INSERT policies to use WITH CHECK instead of USING
5. Add drop-if-exists before CREATE POLICY for idempotency
6. Convert CREATE TRIGGER IF NOT EXISTS to drop + create pattern
7. Ensure SECURITY DEFINER functions have search_path set
8. Normalize DO block ending format
9. Remove verification SELECT statements