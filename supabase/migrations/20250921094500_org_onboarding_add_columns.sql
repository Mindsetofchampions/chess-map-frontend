-- Add review and submitter metadata columns to org_onboardings
alter table if exists public.org_onboardings
  add column if not exists admin_notes text,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists submitter_email text;

create index if not exists idx_org_onboardings_status_created on public.org_onboardings (status, created_at desc);
