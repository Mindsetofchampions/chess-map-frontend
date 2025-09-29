-- Add policy to allow consent_* notifications to be inserted by the student (trigger context),
-- while keeping other notifications restricted to master_admin.

DO $plpgsql$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'system_notifications' AND policyname = 'system_notifications_consent_insert'
  ) THEN
    EXECUTE 'CREATE POLICY system_notifications_consent_insert
      ON public.system_notifications
      FOR INSERT
      TO authenticated
      WITH CHECK (
        (metadata ? ''event'')
        AND (metadata->>''event'') LIKE ''consent_%''
        AND created_by = auth.uid()
      )';
  END IF;
END $plpgsql$;
