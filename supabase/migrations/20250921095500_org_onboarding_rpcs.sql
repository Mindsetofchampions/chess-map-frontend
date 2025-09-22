-- List org onboardings for master admins
create or replace function public.list_org_onboardings(p_status text default null)
returns table (
  id uuid,
  org_name text,
  org_logo_path text,
  admin_id_path text,
  submitted_by uuid,
  submitter_email text,
  status text,
  admin_notes text,
  created_at timestamptz
) language sql security definer as $$
  select o.id, o.org_name, o.org_logo_path, o.admin_id_path, o.submitted_by, o.submitter_email, o.status, o.admin_notes, o.created_at
  from public.org_onboardings o
  where public.is_master_admin() and (p_status is null or o.status = p_status)
  order by o.created_at desc
$$;
alter function public.list_org_onboardings(text) owner to postgres;
grant execute on function public.list_org_onboardings(text) to anon, authenticated;

-- Approve org onboarding
create or replace function public.approve_org_onboarding(p_id uuid, p_notes text default null)
returns json
AS $$
DECLARE
  v_email text;
  v_org text;
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT submitter_email, org_name INTO v_email, v_org FROM public.org_onboardings WHERE id = p_id;
  UPDATE public.org_onboardings
    SET status = 'approved', admin_notes = p_notes, reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = p_id;
  RETURN json_build_object('ok', true, 'email', v_email, 'org', v_org);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
alter function public.approve_org_onboarding(uuid, text) owner to postgres;
grant execute on function public.approve_org_onboarding(uuid, text) to anon, authenticated;

-- Reject org onboarding
create or replace function public.reject_org_onboarding(p_id uuid, p_notes text)
returns json
AS $$
DECLARE
  v_email text;
  v_org text;
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT submitter_email, org_name INTO v_email, v_org FROM public.org_onboardings WHERE id = p_id;
  UPDATE public.org_onboardings
    SET status = 'rejected', admin_notes = p_notes, reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = p_id;
  RETURN json_build_object('ok', true, 'email', v_email, 'org', v_org);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
alter function public.reject_org_onboarding(uuid, text) owner to postgres;
grant execute on function public.reject_org_onboarding(uuid, text) to anon, authenticated;
