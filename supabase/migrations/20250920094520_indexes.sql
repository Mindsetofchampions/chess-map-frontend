-- Add indexes to improve lookup performance for onboarding and notifications

create index if not exists idx_org_onboardings_submitted_by on public.org_onboardings(submitted_by);
create index if not exists idx_system_notifications_created_at on public.system_notifications(created_at desc);
