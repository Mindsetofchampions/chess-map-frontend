-- Migration: Add processing columns and trigger to create notifications from parent_consents

-- Add processing columns to system_notifications so a worker can mark when handled
ALTER TABLE IF EXISTS public.system_notifications
  ADD COLUMN IF NOT EXISTS processed boolean default false,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz;

-- Trigger function: insert notification when parent_consents is created or updated
CREATE OR REPLACE FUNCTION public.enqueue_parent_consent_notification()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  payload jsonb;
BEGIN
  -- Only enqueue when consent_signed is true (or status changed)
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- Build a notification row
    INSERT INTO public.system_notifications (title, body, metadata, created_by)
    VALUES (
      concat('Parent consent ', NEW.status, ' for ', COALESCE(NEW.student_id::text, '')),
      concat('Parent consent for ', COALESCE(NEW.student_id::text, ''), ' is ', NEW.status),
      jsonb_build_object('event', 'consent_'+lower(NEW.status::text), 'parent_email', NEW.parent_email, 'student_id', NEW.student_id, 'consent_status', NEW.status),
      NEW.submitted_by
    );

    -- Emit a NOTIFY so realtime listeners or a worker can react immediately
    payload := json_build_object('event', 'consent_' || lower(NEW.status::text), 'student_id', NEW.student_id, 'parent_email', NEW.parent_email)::jsonb;
    PERFORM pg_notify('system_notifications_channel', payload::text);
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to parent_consents
DROP TRIGGER IF EXISTS trg_enqueue_parent_consent_notification ON public.parent_consents;
CREATE TRIGGER trg_enqueue_parent_consent_notification
AFTER INSERT OR UPDATE ON public.parent_consents
FOR EACH ROW
WHEN (NEW.consent_signed IS TRUE)
EXECUTE FUNCTION public.enqueue_parent_consent_notification();
