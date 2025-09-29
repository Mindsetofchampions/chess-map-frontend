-- Admin controls and RPCs for parent_consents approval flow
-- - Adds admin_notes and review audit columns
-- - Grants admin update capability via RLS policy
-- - Creates approve_parent_consent / reject_parent_consent RPCs
-- - Ensures notifications trigger runs on status changes (not only consent_signed)

BEGIN;

-- Columns for admin review metadata
ALTER TABLE IF EXISTS public.parent_consents
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- Admins (org_admin, master_admin) can update parent_consents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='parent_consents' AND policyname='pc_admin_update'
  ) THEN
    EXECUTE 'CREATE POLICY pc_admin_update ON public.parent_consents
      FOR UPDATE TO authenticated
      USING (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''org_admin'',''master_admin'']))
      WITH CHECK (public.is_user_in_roles(auth.uid()::uuid, ARRAY[''org_admin'',''master_admin'']))';
  END IF;
END $$;

-- Approve RPC with optional coin award to the student's wallet
CREATE OR REPLACE FUNCTION public.approve_parent_consent(
  p_id uuid,
  p_admin_message text DEFAULT NULL,
  p_award_coins bigint DEFAULT 0
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.parent_consents;
  v_student uuid;
  v_email text;
  v_awarded bigint := 0;
BEGIN
  -- Lock the row to avoid race conditions
  SELECT * INTO v_row FROM public.parent_consents WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'parent_consents row not found for id=%', p_id;
  END IF;

  v_student := v_row.student_id;

  UPDATE public.parent_consents
     SET status = 'APPROVED',
         admin_notes = p_admin_message,
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   WHERE id = p_id
   RETURNING * INTO v_row;

  IF COALESCE(p_award_coins,0) > 0 THEN
    -- Fetch student email from auth.users
    SELECT email INTO v_email FROM auth.users WHERE id = v_student;
    IF v_email IS NOT NULL THEN
      PERFORM public.allocate_user_coins(v_email, p_award_coins, 'Parent consent approved');
      v_awarded := p_award_coins;
    END IF;
  END IF;

  RETURN json_build_object(
    'id', v_row.id,
    'student_id', v_student,
    'status', v_row.status,
    'admin_notes', v_row.admin_notes,
    'awarded', v_awarded
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_parent_consent(uuid, text, bigint) TO anon, authenticated;

-- Reject RPC (no coin award)
CREATE OR REPLACE FUNCTION public.reject_parent_consent(
  p_id uuid,
  p_admin_message text DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.parent_consents;
BEGIN
  UPDATE public.parent_consents
     SET status = 'REJECTED',
         admin_notes = p_admin_message,
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   WHERE id = p_id
   RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'parent_consents row not found for id=%', p_id;
  END IF;

  RETURN json_build_object(
    'id', v_row.id,
    'student_id', v_row.student_id,
    'status', v_row.status,
    'admin_notes', v_row.admin_notes
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_parent_consent(uuid, text) TO anon, authenticated;

-- Ensure notification payload includes admin_notes for observability
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
      'consent_status', NEW.status,
      'admin_notes', NEW.admin_notes
    ),
    NEW.student_id
  );

  payload := json_build_object(
    'event', 'consent_' || lower(NEW.status::text),
    'student_id', NEW.student_id,
    'parent_email', NEW.parent_email,
    'admin_notes', NEW.admin_notes
  )::jsonb;
  PERFORM pg_notify('system_notifications_channel', payload::text);

  RETURN NEW;
END;
$$;

-- Unify notifications trigger to run on any insert/update (drop predicate on consent_signed)
DROP TRIGGER IF EXISTS trg_enqueue_parent_consent_notification ON public.parent_consents;

CREATE TRIGGER trg_enqueue_parent_consent_notification
AFTER INSERT OR UPDATE ON public.parent_consents
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_parent_consent_notification();

COMMIT;
