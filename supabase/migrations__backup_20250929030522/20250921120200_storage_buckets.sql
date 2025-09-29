-- Storage buckets and policies
insert into storage.buckets (id, name, public) values ('parent_ids','parent_ids', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) values ('signatures','signatures', false)
on conflict (id) do nothing;

-- Drop existing policies to avoid duplicates
do $plpgsql$ begin
  if exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='master all parent_ids') then
    execute 'drop policy "master all parent_ids" on storage.objects';
  end if;
  if exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='org read/write parent_ids') then
    execute 'drop policy "org read/write parent_ids" on storage.objects';
  end if;
  if exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='master all signatures') then
    execute 'drop policy "master all signatures" on storage.objects';
  end if;
  if exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='org read/write signatures') then
    execute 'drop policy "org read/write signatures" on storage.objects';
  end if;
end $plpgsql$;

-- Allow master full access
create policy "master all parent_ids" on storage.objects
for all using (public.jwt_role() = 'master_admin') with check (true);

create policy "org read/write parent_ids" on storage.objects
for all using (
  public.jwt_role() in ('org_admin','staff')
  and bucket_id = 'parent_ids'
  and (storage.foldername(name))[1] = coalesce(public.jwt_org_id()::text, '')
) with check (
  bucket_id = 'parent_ids'
  and (storage.foldername(name))[1] = coalesce(public.jwt_org_id()::text, '')
);

create policy "master all signatures" on storage.objects
for all using (public.jwt_role() = 'master_admin') with check (true);

create policy "org read/write signatures" on storage.objects
for all using (
  public.jwt_role() in ('org_admin','staff')
  and bucket_id = 'signatures'
  and (storage.foldername(name))[1] = coalesce(public.jwt_org_id()::text, '')
) with check (
  bucket_id = 'signatures'
  and (storage.foldername(name))[1] = coalesce(public.jwt_org_id()::text, '')
);
