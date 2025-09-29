-- Fix: notifications trigger should not reference NEW.submitted_by (column doesn't exist on parent_consents)
-- Set created_by to NEW.student_id which references auth.users(id) and is always available on parent_consents

BEGIN;

CREATE OR REPLACE FUNCTION public.enqueue_parent_consent_notification()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  payload jsonb;
  student_ident text;
BEGIN
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
    NEW.student_id
  );

  payload := json_build_object(
    'event', 'consent_' || lower(NEW.status::text),
    'student_id', NEW.student_id,
    'parent_email', NEW.parent_email
  )::jsonb;
  PERFORM pg_notify('system_notifications_channel', payload::text);

  RETURN NEW;
END;
$$;

COMMIT;
