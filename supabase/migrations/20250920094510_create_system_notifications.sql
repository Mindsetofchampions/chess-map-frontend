-- Migration: create_system_notifications
-- Table to store system-wide or targeted notifications

create table if not exists public.system_notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_by uuid references auth.users(id) on delete set null,
  target_role text,
  metadata jsonb,
  created_at timestamptz with time zone default now()
);

alter table public.system_notifications enable row level security;

-- Only master_admins should be able to create or modify system notifications
create policy if not exists "system_notifications_master_rw" on public.system_notifications
  for all
  to authenticated
  using (public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin']))
  with check (public.is_user_in_roles(auth.uid()::uuid, ARRAY['master_admin']));

-- Allow everyone to select notifications
create policy if not exists "system_notifications_select_public" on public.system_notifications
  for select
  using (true);

-- Note: if you need org_admins to create notifications scoped to their org, add a more granular policy.
