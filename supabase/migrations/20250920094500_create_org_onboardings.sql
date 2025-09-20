-- Migration: create_org_onboardings
-- Creates table to hold organization onboarding submissions

create table if not exists public.org_onboardings (
  id uuid primary key default gen_random_uuid(),
  org_name text not null,
  org_logo_path text,
  admin_id_path text,
  submitted_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending',
  notes text,
  created_at timestamptz with time zone default now()
);

-- Enable Row Level Security so policies can be added safely afterwards
alter table public.org_onboardings enable row level security;

create policy if not exists "Allow authenticated inserts" on public.org_onboardings
  for insert
  using (auth.uid() IS NOT NULL)
  with check (auth.uid() IS NOT NULL);

create policy if not exists "Select own or master_admins" on public.org_onboardings
  for select
  using (
    -- allow if the row was submitted by the current user
    (submitted_by IS NOT NULL AND submitted_by::text = auth.uid())
    OR
    -- NOTE: the master_admin check below assumes a profiles table with role; adjust to your system as needed
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'master_admin')
  );

-- Allow authenticated users to insert their own onboarding submission
create policy if not exists "org_onboardings_insert_own" on public.org_onboardings
  for insert
  to authenticated
  using (auth.uid() IS NOT NULL)
  with check (submitted_by::text = auth.uid());

-- Allow the submitting user to select their own onboarding submission
create policy if not exists "org_onboardings_select_owner" on public.org_onboardings
  for select
  to authenticated
  using (submitted_by::text = auth.uid());

-- Allow master_admins to select and update all onboarding rows
create policy if not exists "org_onboardings_master_admin_rw" on public.org_onboardings
  for all
  to authenticated
  using (public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin']))
  with check (public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin']));

-- Note: you may want org_admins to be able to see their own org_onboardings as well; adjust policies accordingly.
