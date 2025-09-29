-- Qualify UPDATE clauses in quest RPCs to avoid ambiguous column references

-- reserve_seat
CREATE OR REPLACE FUNCTION public.reserve_seat(p_quest_id uuid)
RETURNS TABLE (reserved boolean, seats_taken integer, seats_total integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ins boolean := false;
  v_rc int;
  v_q public.quests;
BEGIN
  INSERT INTO public.quest_enrollments(quest_id, user_id)
  VALUES (p_quest_id, auth.uid())
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_rc = ROW_COUNT;
  v_ins := v_rc > 0;

  IF NOT v_ins THEN
    SELECT q.seats_taken, q.seats_total INTO seats_taken, seats_total FROM public.quests q WHERE q.id = p_quest_id;
    reserved := false;
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.quests q
  SET seats_taken = COALESCE(q.seats_taken,0) + 1
  WHERE q.id = p_quest_id
    AND (q.seats_total IS NULL OR COALESCE(q.seats_taken,0) < q.seats_total);

  IF NOT FOUND THEN
    DELETE FROM public.quest_enrollments WHERE quest_id = p_quest_id AND user_id = auth.uid();
    SELECT q.seats_taken, q.seats_total INTO seats_taken, seats_total FROM public.quests q WHERE q.id = p_quest_id;
    reserved := false;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT * INTO v_q FROM public.quests WHERE id = p_quest_id;
  reserved := true;
  seats_taken := v_q.seats_taken;
  seats_total := v_q.seats_total;
  RETURN NEXT;
END
$$;

REVOKE ALL ON FUNCTION public.reserve_seat(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_seat(uuid) TO authenticated;

-- cancel_seat
CREATE OR REPLACE FUNCTION public.cancel_seat(p_quest_id uuid)
RETURNS TABLE (canceled boolean, seats_taken integer, seats_total integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_del boolean := false;
  v_rc int;
  v_q public.quests;
BEGIN
  DELETE FROM public.quest_enrollments WHERE quest_id = p_quest_id AND user_id = auth.uid();
  GET DIAGNOSTICS v_rc = ROW_COUNT;
  v_del := v_rc > 0;

  IF NOT v_del THEN
    SELECT q.seats_taken, q.seats_total INTO seats_taken, seats_total FROM public.quests q WHERE q.id = p_quest_id;
    canceled := false;
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.quests q
  SET seats_taken = GREATEST(COALESCE(q.seats_taken,0) - 1, 0)
  WHERE q.id = p_quest_id;

  SELECT * INTO v_q FROM public.quests WHERE id = p_quest_id;
  canceled := true;
  seats_taken := v_q.seats_taken;
  seats_total := v_q.seats_total;
  RETURN NEXT;
END
$$;

REVOKE ALL ON FUNCTION public.cancel_seat(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_seat(uuid) TO authenticated;
