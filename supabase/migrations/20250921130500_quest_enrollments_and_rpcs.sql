/*
  Quest enrollments and RPCs

  - Create table quest_enrollments
  - Add numeric_answer to quest_submissions
  - RPCs:
      create_quest(...)
      reserve_seat(quest_id)
      cancel_seat(quest_id)
      submit_text(quest_id, text)
      submit_numeric(quest_id, value)
*/

-- 0) quest_submissions: add numeric_answer if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='quest_submissions' and column_name='numeric_answer'
  ) then
    alter table public.quest_submissions add column numeric_answer numeric;
  end if;
end$$;

-- 1) Enrollments table
create table if not exists public.quest_enrollments (
  quest_id uuid not null references public.quests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (quest_id, user_id)
);

alter table public.quest_enrollments enable row level security;

-- RLS policies
do $$
begin
  if exists (
    select 1 from pg_policies where schemaname='public' and tablename='quest_enrollments' and policyname='enroll: insert own'
  ) then execute 'drop policy "enroll: insert own" on public.quest_enrollments'; end if;
  do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quest_enrollments' and policyname='enroll: insert own') then
    execute 'drop policy "enroll: insert own" on public.quest_enrollments';
  end if;
end $plpgsql$;
create policy "enroll: insert own" on public.quest_enrollments 
    for insert to authenticated with check (user_id = auth.uid());

  if exists (
    select 1 from pg_policies where schemaname='public' and tablename='quest_enrollments' and policyname='enroll: select own or staff+'
  ) then execute 'drop policy "enroll: select own or staff+" on public.quest_enrollments'; end if;
  do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quest_enrollments' and policyname='enroll: select own or staff+') then
    execute 'drop policy "enroll: select own or staff+" on public.quest_enrollments';
  end if;
end $plpgsql$;
create policy "enroll: select own or staff+" on public.quest_enrollments 
    for select to authenticated using (
      user_id = auth.uid() or public.is_user_in_roles(auth.uid()::uuid, array['master_admin','org_admin','staff'])
    );

  if exists (
    select 1 from pg_policies where schemaname='public' and tablename='quest_enrollments' and policyname='enroll: delete own or staff+'
  ) then execute 'drop policy "enroll: delete own or staff+" on public.quest_enrollments'; end if;
  do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='quest_enrollments' and policyname='enroll: delete own or staff+') then
    execute 'drop policy "enroll: delete own or staff+" on public.quest_enrollments';
  end if;
end $plpgsql$;
create policy "enroll: delete own or staff+" on public.quest_enrollments 
    for delete to authenticated using (
      user_id = auth.uid() or public.is_user_in_roles(auth.uid()::uuid, array['master_admin','org_admin','staff'])
    );
end$$;

create index if not exists idx_enrollments_quest on public.quest_enrollments(quest_id);

-- 2) create_quest RPC
create or replace function public.create_quest(
  p_title text,
  p_description text,
  p_attribute_id uuid,
  p_reward_coins integer,
  p_qtype public.quest_type,
  p_grade_bands text[] default array[]::text[],
  p_seats_total integer default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_config jsonb default '{}'::jsonb
)
returns public.quests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec public.quests;
begin
  if not public.is_user_in_roles(auth.uid()::uuid, array['org_admin','staff','master_admin']) then
    raise exception 'FORBIDDEN: Only org staff/admin or master can create quests';
  end if;

  insert into public.quests (
    title, description, attribute_id, reward_coins, qtype,
    grade_bands, seats_total, lat, lng, config, created_by, status
  ) values (
    p_title, p_description, p_attribute_id, coalesce(p_reward_coins,0), p_qtype,
    coalesce(p_grade_bands, array[]::text[]), p_seats_total, p_lat, p_lng, coalesce(p_config, '{}'::jsonb), auth.uid(), 'submitted'::quest_status
  ) returning * into v_rec;

  return v_rec;
end
$$;

revoke all on function public.create_quest(text, text, uuid, integer, public.quest_type, text[], integer, double precision, double precision, jsonb) from public;
grant execute on function public.create_quest(text, text, uuid, integer, public.quest_type, text[], integer, double precision, double precision, jsonb) to authenticated;

-- 3) reserve_seat RPC
create or replace function public.reserve_seat(p_quest_id uuid)
returns table (reserved boolean, seats_taken integer, seats_total integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ins boolean := false;
  v_rc int;
  v_q public.quests;
begin
  -- Try to insert enrollment first (idempotent for same user)
  insert into public.quest_enrollments(quest_id, user_id)
  values (p_quest_id, auth.uid())
  on conflict do nothing;
  GET DIAGNOSTICS v_rc = ROW_COUNT;
  v_ins := v_rc > 0;

  if not v_ins then
    -- Already enrolled; return current counts
    select seats_taken, seats_total into seats_taken, seats_total from public.quests where id = p_quest_id;
    reserved := false;
    return next;
    return;
  end if;

  -- Increment seats_taken with capacity check
  update public.quests
  set seats_taken = coalesce(seats_taken,0) + 1
  where id = p_quest_id
    and (seats_total is null or coalesce(seats_taken,0) < seats_total);

  if not found then
    -- Capacity full; undo enrollment and signal failure
    delete from public.quest_enrollments where quest_id = p_quest_id and user_id = auth.uid();
    select seats_taken, seats_total into seats_taken, seats_total from public.quests where id = p_quest_id;
    reserved := false;
    return next;
    return;
  end if;

  select * into v_q from public.quests where id = p_quest_id;
  reserved := true;
  seats_taken := v_q.seats_taken;
  seats_total := v_q.seats_total;
  return next;
end
$$;

revoke all on function public.reserve_seat(uuid) from public;
grant execute on function public.reserve_seat(uuid) to authenticated;

-- 4) cancel_seat RPC
create or replace function public.cancel_seat(p_quest_id uuid)
returns table (canceled boolean, seats_taken integer, seats_total integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_del boolean := false;
  v_rc int;
  v_q public.quests;
begin
  delete from public.quest_enrollments where quest_id = p_quest_id and user_id = auth.uid();
  GET DIAGNOSTICS v_rc = ROW_COUNT;
  v_del := v_rc > 0;

  if not v_del then
    select seats_taken, seats_total into seats_taken, seats_total from public.quests where id = p_quest_id;
    canceled := false;
    return next;
    return;
  end if;

  update public.quests
  set seats_taken = greatest(coalesce(seats_taken,0) - 1, 0)
  where id = p_quest_id;

  select * into v_q from public.quests where id = p_quest_id;
  canceled := true;
  seats_taken := v_q.seats_taken;
  seats_total := v_q.seats_total;
  return next;
end
$$;

revoke all on function public.cancel_seat(uuid) from public;
grant execute on function public.cancel_seat(uuid) to authenticated;

-- 5) submit_text RPC
create or replace function public.submit_text(p_quest_id uuid, p_text text)
returns public.quest_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec public.quest_submissions;
begin
  insert into public.quest_submissions(quest_id, user_id, status, text_answer)
  values (p_quest_id, auth.uid(), 'pending'::submission_status, p_text)
  on conflict (quest_id, user_id) do update
    set text_answer = excluded.text_answer,
        status = 'pending'::submission_status,
        created_at = now()
  returning * into v_rec;
  return v_rec;
end
$$;

revoke all on function public.submit_text(uuid, text) from public;
grant execute on function public.submit_text(uuid, text) to authenticated;

-- 6) submit_numeric RPC
create or replace function public.submit_numeric(p_quest_id uuid, p_value numeric)
returns public.quest_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec public.quest_submissions;
begin
  insert into public.quest_submissions(quest_id, user_id, status, numeric_answer)
  values (p_quest_id, auth.uid(), 'pending'::submission_status, p_value)
  on conflict (quest_id, user_id) do update
    set numeric_answer = excluded.numeric_answer,
        status = 'pending'::submission_status,
        created_at = now()
  returning * into v_rec;
  return v_rec;
end
$$;

revoke all on function public.submit_numeric(uuid, numeric) from public;
grant execute on function public.submit_numeric(uuid, numeric) to authenticated;
