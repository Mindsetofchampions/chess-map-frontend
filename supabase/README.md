Supabase setup notes

This folder contains SQL migrations and notes for additional Supabase setup required by the org onboarding feature.

Required migrations (already added):

- 20250920094500_create_org_onboardings.sql
- 20250920094510_create_system_notifications.sql

Storage buckets required:

- org_logos (public read for logos; or private with signed URLs depending on privacy needs)
- org_admin_ids (PRIVATE — should be private and accessible only by admins via signed URLs)

Create buckets (supabase CLI or dashboard):

1. Via supabase CLI:
   supabase storage create-bucket org_logos --public
   supabase storage create-bucket org_admin_ids --public=false

2. Via dashboard: Storage -> Create new bucket

Recommended storage policies (SQL) for private admin ID bucket (example):

-- Allow authenticated users to upload to their own folder
create policy if not exists "Allow upload own id" on storage.objects
for insert
using (auth.role() = 'authenticated' and (metadata->>'uploader_id') = auth.uid())
with check (auth.role() = 'authenticated' and (metadata->>'uploader_id') = auth.uid());

-- Allow master_admins to read any admin id
-- Replace with your own role-check if you use profiles/user_roles table
-- This example assumes a public.profiles table with role
-- Read policy example (pseudocode, test in your environment):
-- create policy "Allow master read" on storage.objects
-- for select using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'master_admin'));

Notes on running migrations:

- Use the supabase CLI or your database migration runner to apply the SQL files in the "migrations" directory.
- After migrations, consider tightening RLS policies to restrict who can insert/select/update these tables.

Edge functions and notification providers:

- The project includes an Edge Function to send onboarding notifications. If using Resend, ensure domain verification is completed in Resend before switching from the fallback provider.

If you'd like, I can generate exact CLI commands or a script to apply these migrations and create buckets; tell me your preference (CLI script vs manual dashboard steps).
