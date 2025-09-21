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
create policy org_master_all on public.organizations for all using (jwt_role() = 'master_admin') with check (true);
create policy students_master_all on public.students for all using (jwt_role() = 'master_admin') with check (true);
create policy parents_master_all on public.parents for all using (jwt_role() = 'master_admin') with check (true);
create policy staff_master_all on public.staff for all using (jwt_role() = 'master_admin') with check (true);
create policy services_master_all on public.services for all using (jwt_role() = 'master_admin') with check (true);
create policy service_plans_master_all on public.service_plans for all using (jwt_role() = 'master_admin') with check (true);
create policy attendance_master_all on public.attendance for all using (jwt_role() = 'master_admin') with check (true);
create policy credits_rewards_master_all on public.credits_rewards for all using (jwt_role() = 'master_admin') with check (true);

-- Org policies
create policy org_org_read on public.organizations for select using (jwt_role() in ('org_admin','staff') and id = jwt_org_id());
create policy org_org_update on public.organizations for update using (jwt_role() in ('org_admin') and id = jwt_org_id()) with check (id = jwt_org_id());

create policy students_org_scope on public.students for all using (jwt_role() in ('org_admin','staff') and org_id = jwt_org_id()) with check (org_id = jwt_org_id());
create policy parents_org_scope on public.parents for all using (
  jwt_role() in ('org_admin','staff') and exists (
    select 1 from public.students st where st.id = parents.student_id and st.org_id = jwt_org_id()
  )
) with check (exists (select 1 from public.students st where st.id = parents.student_id and st.org_id = jwt_org_id()));
create policy staff_org_scope on public.staff for all using (jwt_role() in ('org_admin','staff') and org_id = jwt_org_id()) with check (org_id = jwt_org_id());
create policy services_org_scope on public.services for all using (jwt_role() in ('org_admin','staff') and org_id = jwt_org_id()) with check (org_id = jwt_org_id());
create policy service_plans_org_scope on public.service_plans for all using (
  jwt_role() in ('org_admin','staff') and exists (
    select 1 from public.students st
    join public.services sv on sv.id = service_plans.service_id
    where st.id = service_plans.student_id and st.org_id = jwt_org_id() and sv.org_id = jwt_org_id()
  )
) with check (true);
create policy attendance_org_scope on public.attendance for all using (
  jwt_role() in ('org_admin','staff') and exists (
    select 1 from public.students st
    join public.services sv on sv.id = attendance.service_id
    where st.id = attendance.student_id and st.org_id = jwt_org_id() and sv.org_id = jwt_org_id()
  )
) with check (true);
create policy credits_rewards_org_scope on public.credits_rewards for all using (
  jwt_role() in ('org_admin','staff') and exists (
    select 1 from public.students st where st.id = credits_rewards.student_id and st.org_id = jwt_org_id()
  )
) with check (true);
