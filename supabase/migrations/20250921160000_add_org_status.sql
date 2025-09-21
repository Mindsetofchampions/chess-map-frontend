-- Ensure organizations table has status column expected by CAMS
alter table if exists public.organizations
  add column if not exists status text not null default 'pending';
