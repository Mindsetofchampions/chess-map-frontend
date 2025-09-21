-- Migration: create onboarding_responses and parent_consents tables, RLS, triggers
-- Onboarding responses for a student
create table if not exists public.onboarding_responses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  checkboxes jsonb not null default '{}'::jsonb,
  eligible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Parent consent & identity
create table if not exists public.parent_consents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  parent_name text not null,
  parent_email text not null,
  signature_image_url text,
  parent_id_image_url text,
  consent_signed boolean not null default false,
  status text not null default 'PENDING',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Recommended indexes
create index if not exists idx_onboarding_responses_student on public.onboarding_responses(student_id);
create index if not exists idx_parent_consents_student on public.parent_consents(student_id);

-- Add unique constraints to allow UPSERT by student_id
do $$ begin
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'uq_onboarding_responses_student') then
    alter table public.onboarding_responses add constraint uq_onboarding_responses_student unique (student_id);
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'uq_parent_consents_student') then
    alter table public.parent_consents add constraint uq_parent_consents_student unique (student_id);
  end if;
end $$;

-- RLS
alter table public.onboarding_responses enable row level security;
alter table public.parent_consents enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename='onboarding_responses' and policyname='onb_student_rw') then
    create policy onb_student_rw on public.onboarding_responses
      for all
      using (auth.uid() = student_id)
      with check (auth.uid() = student_id);
  end if;

  if not exists (select 1 from pg_policies where tablename='onboarding_responses' and policyname='onb_admin_read') then
    create policy onb_admin_read on public.onboarding_responses
      for select
      using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('org_admin','master_admin')));
  end if;

  if not exists (select 1 from pg_policies where tablename='parent_consents' and policyname='pc_student_rw') then
    create policy pc_student_rw on public.parent_consents
      for all
      using (auth.uid() = student_id)
      with check (auth.uid() = student_id);
  end if;

  if not exists (select 1 from pg_policies where tablename='parent_consents' and policyname='pc_admin_read') then
    create policy pc_admin_read on public.parent_consents
      for select
      using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('org_admin','master_admin')));
  end if;
end $$;

-- Updated timestamp trigger
create or replace function public.tg_set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname='trg_onb_updated_at') then
    create trigger trg_onb_updated_at before update on public.onboarding_responses
    for each row execute function public.tg_set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname='trg_pc_updated_at') then
    create trigger trg_pc_updated_at before update on public.parent_consents
    for each row execute function public.tg_set_updated_at();
  end if;
end $$;
