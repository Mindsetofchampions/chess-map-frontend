/*
  # Quest System Policies

  1. Quest Policies
    - Students can view approved quests
    - Admins can manage all quests
    - Master admins can approve quests

  2. Submission Policies
    - Students can submit their own quest answers
    - Staff and above can review submissions

  3. Evidence Policies
    - Users can manage their own evidence uploads
*/

-- Quest table policies
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quests' and policyname='quests: select by role') then
    execute 'drop policy "quests: select by role" on public.quests';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quests' and policyname='quests: select by role') then
    execute 'drop policy "quests: select by role" on public.quests';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quests' and policyname='quests: select by role') then
    execute 'drop policy "quests: select by role" on public.quests';
  end if;
end $plpgsql$;
create policy "quests: select by role" on public.quests 
  for select
  to public
  using (
    (status = 'approved'::quest_status and active = true) 
    or actor_at_least('org_admin'::user_role)
  );

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quests' and policyname='quests: master update any') then
    execute 'drop policy "quests: master update any" on public.quests';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quests' and policyname='quests: master update any') then
    execute 'drop policy "quests: master update any" on public.quests';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quests' and policyname='quests: master update any') then
    execute 'drop policy "quests: master update any" on public.quests';
  end if;
end $plpgsql$;
create policy "quests: master update any" on public.quests 
  for update
  to public
  using (actor_is_master_admin())
  with check (actor_is_master_admin());

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quests' and policyname='Admins manage quests') then
    execute 'drop policy "Admins manage quests" on public.quests';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quests' and policyname='Admins manage quests') then
    execute 'drop policy "Admins manage quests" on public.quests';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quests' and policyname='Admins manage quests') then
    execute 'drop policy "Admins manage quests" on public.quests';
  end if;
end $plpgsql$;
create policy "Admins manage quests" on public.quests 
  for all
  to authenticated
  using (actor_is_master_admin())
  with check (actor_is_master_admin());

-- Quest submissions policies
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quest_submissions' and policyname='subs: insert own') then
    execute 'drop policy "subs: insert own" on public.quest_submissions';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quest_submissions' and policyname='subs: insert own') then
    execute 'drop policy "subs: insert own" on public.quest_submissions';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quest_submissions' and policyname='subs: insert own') then
    execute 'drop policy "subs: insert own" on public.quest_submissions';
  end if;
end $plpgsql$;
create policy "subs: insert own" on public.quest_submissions 
  for insert
  to public
  with check (user_id = auth.uid());

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quest_submissions' and policyname='subs: select own or staff+') then
    execute 'drop policy "subs: select own or staff+" on public.quest_submissions';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quest_submissions' and policyname='subs: select own or staff+') then
    execute 'drop policy "subs: select own or staff+" on public.quest_submissions';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quest_submissions' and policyname='subs: select own or staff+') then
    execute 'drop policy "subs: select own or staff+" on public.quest_submissions';
  end if;
end $plpgsql$;
create policy "subs: select own or staff+" on public.quest_submissions 
  for select
  to public
  using (
    user_id = auth.uid() 
    or actor_at_least('staff'::user_role)
  );

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quest_submissions' and policyname='subs: update own pending or staff+') then
    execute 'drop policy "subs: update own pending or staff+" on public.quest_submissions';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quest_submissions' and policyname='subs: update own pending or staff+') then
    execute 'drop policy "subs: update own pending or staff+" on public.quest_submissions';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quest_submissions' and policyname='subs: update own pending or staff+') then
    execute 'drop policy "subs: update own pending or staff+" on public.quest_submissions';
  end if;
end $plpgsql$;
create policy "subs: update own pending or staff+" on public.quest_submissions 
  for update
  to public
  using (
    (user_id = auth.uid() and status = 'pending'::submission_status) 
    or actor_at_least('staff'::user_role)
  )
  with check (true);

-- Quest evidence policies
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quest_evidence' and policyname='qe_insert_self') then
    execute 'drop policy "qe_insert_self" on public.quest_evidence';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quest_evidence' and policyname='qe_insert_self') then
    execute 'drop policy "qe_insert_self" on public.quest_evidence';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quest_evidence' and policyname='qe_insert_self') then
    execute 'drop policy "qe_insert_self" on public.quest_evidence';
  end if;
end $plpgsql$;
create policy "qe_insert_self" on public.quest_evidence 
  for insert
  to authenticated
  with check (user_id = auth.uid());

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quest_evidence' and policyname='qe_select_self') then
    execute 'drop policy "qe_select_self" on public.quest_evidence';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quest_evidence' and policyname='qe_select_self') then
    execute 'drop policy "qe_select_self" on public.quest_evidence';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quest_evidence' and policyname='qe_select_self') then
    execute 'drop policy "qe_select_self" on public.quest_evidence';
  end if;
end $plpgsql$;
create policy "qe_select_self" on public.quest_evidence 
  for select
  to authenticated
  using (user_id = auth.uid());

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quest_evidence' and policyname='qe_admin_read_all') then
    execute 'drop policy "qe_admin_read_all" on public.quest_evidence';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quest_evidence' and policyname='qe_admin_read_all') then
    execute 'drop policy "qe_admin_read_all" on public.quest_evidence';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quest_evidence' and policyname='qe_admin_read_all') then
    execute 'drop policy "qe_admin_read_all" on public.quest_evidence';
  end if;
end $plpgsql$;
create policy "qe_admin_read_all" on public.quest_evidence 
  for select
  to authenticated
  using (actor_is_master_admin() or actor_at_least('org_admin'::user_role));

-- MCQ tables policies
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='mc_questions' and policyname='mcq_select_by_org') then
    execute 'drop policy "mcq_select_by_org" on public.mc_questions';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='mc_questions' and policyname='mcq_select_by_org') then
    execute 'drop policy "mcq_select_by_org" on public.mc_questions';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='mc_questions' and policyname='mcq_select_by_org') then
    execute 'drop policy "mcq_select_by_org" on public.mc_questions';
  end if;
end $plpgsql$;
create policy "mcq_select_by_org" on public.mc_questions 
  for select
  to authenticated
  using (org_id is null or actor_is_master_admin());

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='mcq_answers' and policyname='mcqa_insert_self') then
    execute 'drop policy "mcqa_insert_self" on public.mcq_answers';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='mcq_answers' and policyname='mcqa_insert_self') then
    execute 'drop policy "mcqa_insert_self" on public.mcq_answers';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='mcq_answers' and policyname='mcqa_insert_self') then
    execute 'drop policy "mcqa_insert_self" on public.mcq_answers';
  end if;
end $plpgsql$;
create policy "mcqa_insert_self" on public.mcq_answers 
  for insert
  to authenticated
  with check (user_id = auth.uid());

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='mcq_answers' and policyname='mcqa_select_self') then
    execute 'drop policy "mcqa_select_self" on public.mcq_answers';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='mcq_answers' and policyname='mcqa_select_self') then
    execute 'drop policy "mcqa_select_self" on public.mcq_answers';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='mcq_answers' and policyname='mcqa_select_self') then
    execute 'drop policy "mcqa_select_self" on public.mcq_answers';
  end if;
end $plpgsql$;
create policy "mcqa_select_self" on public.mcq_answers 
  for select
  to authenticated
  using (user_id = auth.uid());

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='mcq_answers' and policyname='mcqa_admin_read_all') then
    execute 'drop policy "mcqa_admin_read_all" on public.mcq_answers';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='mcq_answers' and policyname='mcqa_admin_read_all') then
    execute 'drop policy "mcqa_admin_read_all" on public.mcq_answers';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='mcq_answers' and policyname='mcqa_admin_read_all') then
    execute 'drop policy "mcqa_admin_read_all" on public.mcq_answers';
  end if;
end $plpgsql$;
create policy "mcqa_admin_read_all" on public.mcq_answers 
  for select
  to authenticated
  using (actor_is_master_admin());