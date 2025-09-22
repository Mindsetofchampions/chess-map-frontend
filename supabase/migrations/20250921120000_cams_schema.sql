-- CAMS schema additive migration
-- Helpers
create or replace function public.jwt_role() returns text
language sql stable as $$
  select coalesce((auth.jwt()->>'role')::text, 'anonymous')
$$;

create or replace function public.jwt_uid() returns uuid
language sql stable as $$
  select nullif(auth.uid(), '00000000-0000-0000-0000-000000000000')::uuid
$$;

create or replace function public.jwt_org_id() returns uuid
language sql stable as $$
  select nullif((auth.jwt()->>'org_id'), '')::uuid
$$;

-- Tables
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'pending',
  settings jsonb not null default '{}'::jsonb,
  contact_info jsonb not null default '{}'::jsonb,
  branding jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id),
  demographics jsonb not null default '{}'::jsonb,
  intake_data jsonb not null default '{}'::jsonb,
  parent_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.parents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  consent_signed boolean not null default false,
  signature_url text,
  id_doc_url text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid unique references auth.users(id),
  demographics jsonb not null default '{}'::jsonb,
  qualifications jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  category text not null,
  description text,
  schedule jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.service_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  goal text,
  outcome text,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  date date not null,
  status text not null check (status in ('present','absent','tardy','excused')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.credits_rewards (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  type text not null,
  points integer not null default 0,
  redeemed boolean not null default false,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Views
create or replace view public.v_master_services_ledger as
select s.org_id, sv.category, a.date, a.status, s.id as student_id, sv.id as service_id
from public.attendance a
join public.students s on s.id = a.student_id
join public.services sv on sv.id = a.service_id;

-- RLS enable
alter table public.organizations enable row level security;
alter table public.students enable row level security;
alter table public.parents enable row level security;
alter table public.staff enable row level security;
alter table public.services enable row level security;
alter table public.service_plans enable row level security;
alter table public.attendance enable row level security;
alter table public.credits_rewards enable row level security;

-- Master policies
DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='organizations' AND policyname='org_master_all') THEN
    EXECUTE 'CREATE POLICY org_master_all ON public.organizations FOR ALL USING (jwt_role() = ''master_admin'') WITH CHECK (true)';
  END IF;
END $do$;
DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='students' AND policyname='students_master_all') THEN
    EXECUTE 'CREATE POLICY students_master_all ON public.students FOR ALL USING (jwt_role() = ''master_admin'') WITH CHECK (true)';
  END IF;
END $do$;
DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='parents' AND policyname='parents_master_all') THEN
    EXECUTE 'CREATE POLICY parents_master_all ON public.parents FOR ALL USING (jwt_role() = ''master_admin'') WITH CHECK (true)';
  END IF;
END $do$;
DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='staff' AND policyname='staff_master_all') THEN
    EXECUTE 'CREATE POLICY staff_master_all ON public.staff FOR ALL USING (jwt_role() = ''master_admin'') WITH CHECK (true)';
  END IF;
END $do$;
DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='services' AND policyname='services_master_all') THEN
    EXECUTE 'CREATE POLICY services_master_all ON public.services FOR ALL USING (jwt_role() = ''master_admin'') WITH CHECK (true)';
  END IF;
END $do$;
DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='service_plans' AND policyname='service_plans_master_all') THEN
    EXECUTE 'CREATE POLICY service_plans_master_all ON public.service_plans FOR ALL USING (jwt_role() = ''master_admin'') WITH CHECK (true)';
  END IF;
END $do$;
DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='attendance' AND policyname='attendance_master_all') THEN
    EXECUTE 'CREATE POLICY attendance_master_all ON public.attendance FOR ALL USING (jwt_role() = ''master_admin'') WITH CHECK (true)';
  END IF;
END $do$;
DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='credits_rewards' AND policyname='credits_rewards_master_all') THEN
    EXECUTE 'CREATE POLICY credits_rewards_master_all ON public.credits_rewards FOR ALL USING (jwt_role() = ''master_admin'') WITH CHECK (true)';
  END IF;
END $do$;

-- Org policies
DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='organizations' AND policyname='org_org_read') THEN
    EXECUTE 'CREATE POLICY org_org_read ON public.organizations FOR SELECT USING (jwt_role() IN (''org_admin'',''staff'') AND id = jwt_org_id())';
  END IF;
END $do$;
DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='organizations' AND policyname='org_org_update') THEN
    EXECUTE 'CREATE POLICY org_org_update ON public.organizations FOR UPDATE USING (jwt_role() IN (''org_admin'') AND id = jwt_org_id()) WITH CHECK (id = jwt_org_id())';
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='students' AND policyname='students_org_scope') THEN
    EXECUTE 'CREATE POLICY students_org_scope ON public.students FOR ALL USING (jwt_role() IN (''org_admin'',''staff'') AND org_id = jwt_org_id()) WITH CHECK (org_id = jwt_org_id())';
  END IF;
END $do$;
DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='parents' AND policyname='parents_org_scope') THEN
    EXECUTE 'CREATE POLICY parents_org_scope ON public.parents FOR ALL USING (
      jwt_role() IN (''org_admin'',''staff'') AND EXISTS (
        SELECT 1 FROM public.students st WHERE st.id = parents.student_id AND st.org_id = jwt_org_id()
      )
    ) WITH CHECK (EXISTS (SELECT 1 FROM public.students st WHERE st.id = parents.student_id AND st.org_id = jwt_org_id()))';
  END IF;
END $do$;
DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='staff' AND policyname='staff_org_scope') THEN
    EXECUTE 'CREATE POLICY staff_org_scope ON public.staff FOR ALL USING (jwt_role() IN (''org_admin'',''staff'') AND org_id = jwt_org_id()) WITH CHECK (org_id = jwt_org_id())';
  END IF;
END $do$;
DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='services' AND policyname='services_org_scope') THEN
    EXECUTE 'CREATE POLICY services_org_scope ON public.services FOR ALL USING (jwt_role() IN (''org_admin'',''staff'') AND org_id = jwt_org_id()) WITH CHECK (org_id = jwt_org_id())';
  END IF;
END $do$;
DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='service_plans' AND policyname='service_plans_org_scope') THEN
    EXECUTE 'CREATE POLICY service_plans_org_scope ON public.service_plans FOR ALL USING (
      jwt_role() IN (''org_admin'',''staff'') AND EXISTS (
        SELECT 1 FROM public.students st
        JOIN public.services sv ON sv.id = service_plans.service_id
        WHERE st.id = service_plans.student_id AND st.org_id = jwt_org_id() AND sv.org_id = jwt_org_id()
      )
    ) WITH CHECK (true)';
  END IF;
END $do$;
DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='attendance' AND policyname='attendance_org_scope') THEN
    EXECUTE 'CREATE POLICY attendance_org_scope ON public.attendance FOR ALL USING (
      jwt_role() IN (''org_admin'',''staff'') AND EXISTS (
        SELECT 1 FROM public.students st
        JOIN public.services sv ON sv.id = attendance.service_id
        WHERE st.id = attendance.student_id AND st.org_id = jwt_org_id() AND sv.org_id = jwt_org_id()
      )
    ) WITH CHECK (true)';
  END IF;
END $do$;
DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='credits_rewards' AND policyname='credits_rewards_org_scope') THEN
    EXECUTE 'CREATE POLICY credits_rewards_org_scope ON public.credits_rewards FOR ALL USING (
      jwt_role() IN (''org_admin'',''staff'') AND EXISTS (
        SELECT 1 FROM public.students st WHERE st.id = credits_rewards.student_id AND st.org_id = jwt_org_id()
      )
    ) WITH CHECK (true)';
  END IF;
END $do$;
