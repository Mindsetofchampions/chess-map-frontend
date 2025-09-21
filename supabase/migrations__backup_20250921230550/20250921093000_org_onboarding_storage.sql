-- Create org_onboardings table
create table if not exists public.org_onboardings (
  id uuid primary key default gen_random_uuid(),
  org_name text not null,
  org_logo_path text not null,
  admin_id_path text not null,
  submitted_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

alter table public.org_onboardings enable row level security;

-- Policies: submitter can insert/select own; master admin can select/update
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'org_onboardings' and policyname = 'org_onboardings_insert_own'
  ) then
    create policy org_onboardings_insert_own on public.org_onboardings
      for insert to authenticated
      with check (auth.uid() = submitted_by);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'org_onboardings' and policyname = 'org_onboardings_select_own_or_master'
  ) then
    create policy org_onboardings_select_own_or_master on public.org_onboardings
      for select to authenticated
      using (submitted_by = auth.uid() or public.is_master_admin());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'org_onboardings' and policyname = 'org_onboardings_update_master'
  ) then
    create policy org_onboardings_update_master on public.org_onboardings
      for update to authenticated
      using (public.is_master_admin()) with check (public.is_master_admin());
  end if;
end $$;

-- Ensure private buckets exist (idempotent)
insert into storage.buckets (id, name, public) values
  ('org_logos', 'org_logos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) values
  ('org_admin_ids', 'org_admin_ids', false)
on conflict (id) do nothing;

-- RLS policies on storage.objects for these buckets
-- Allow org admins (authenticated users) to upload into paths prefixed with orgs/<uid>/
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'org_upload_logo'
  ) then
    create policy org_upload_logo on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'org_logos'
        and position(('orgs/' || auth.uid()::text || '/') in name) = 1
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'org_upload_admin_id'
  ) then
    create policy org_upload_admin_id on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'org_admin_ids'
        and position(('orgs/' || auth.uid()::text || '/') in name) = 1
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'org_read_own_or_master'
  ) then
    create policy org_read_own_or_master on storage.objects
      for select to authenticated
      using (
        (bucket_id in ('org_logos','org_admin_ids') and position(('orgs/' || auth.uid()::text || '/') in name) = 1)
        or public.is_master_admin()
      );
  end if;
end $$;
