-- Fix: parent consent notifications trigger should not reference NEW.student_name
-- Reason: parent_consents table has no student_name column, causing
--   ERROR: record "new" has no field "student_name"
-- This migration replaces the trigger function to use only NEW.student_id.

BEGIN;

CREATE OR REPLACE FUNCTION public.enqueue_parent_consent_notification()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  payload jsonb;
  student_ident text;
BEGIN
  -- Prefer student_id as the identifier; avoid referencing non-existent columns
  student_ident := COALESCE(NEW.student_id::text, '');

  INSERT INTO public.system_notifications (title, body, metadata, created_by)
  VALUES (
    concat('Parent consent ', NEW.status, ' for ', student_ident),
    concat('Parent consent for ', student_ident, ' is ', NEW.status),
    jsonb_build_object(
      'event', 'consent_' || lower(NEW.status::text),
      'parent_email', NEW.parent_email,
      'student_id', NEW.student_id,
      'consent_status', NEW.status
    ),
    NEW.submitted_by
  );

  -- Notify listeners
  payload := json_build_object(
    'event', 'consent_' || lower(NEW.status::text),
    'student_id', NEW.student_id,
    'parent_email', NEW.parent_email
  )::jsonb;
  PERFORM pg_notify('system_notifications_channel', payload::text);

  RETURN NEW;
END;
$$;

-- Note: trigger remains attached to public.parent_consents; replacing the function is sufficient

COMMIT;
