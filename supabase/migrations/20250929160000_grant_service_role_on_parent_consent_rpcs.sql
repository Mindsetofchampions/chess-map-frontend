-- Grant service_role execute on RPCs used by automation/smoke tests
BEGIN;

DO $$
BEGIN
  -- approve_parent_consent(uuid, text, bigint)
  IF to_regprocedure('public.approve_parent_consent(uuid, text, bigint)') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.approve_parent_consent(uuid, text, bigint) TO service_role';
  END IF;

  -- reject_parent_consent(uuid, text)
  IF to_regprocedure('public.reject_parent_consent(uuid, text)') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.reject_parent_consent(uuid, text) TO service_role';
  END IF;

  -- allocate_user_coins(text, bigint, text)
  IF to_regprocedure('public.allocate_user_coins(text, bigint, text)') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.allocate_user_coins(text, bigint, text) TO service_role';
  END IF;
END$$;

COMMIT;
