-- Storage buckets and policies
insert into storage.buckets (id, name, public) values ('parent_ids','parent_ids', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) values ('signatures','signatures', false)
on conflict (id) do nothing;

-- Allow master full access
create policy if not exists "master all parent_ids" on storage.objects
for all using (public.jwt_role() = 'master_admin') with check (true);

create policy if not exists "org read/write parent_ids" on storage.objects
for all using (
  public.jwt_role() in ('org_admin','staff')
  and bucket_id = 'parent_ids'
  and (storage.foldername(name))[1] = coalesce(public.jwt_org_id()::text, '')
) with check (
  bucket_id = 'parent_ids'
  and (storage.foldername(name))[1] = coalesce(public.jwt_org_id()::text, '')
);

create policy if not exists "master all signatures" on storage.objects
for all using (public.jwt_role() = 'master_admin') with check (true);

create policy if not exists "org read/write signatures" on storage.objects
for all using (
  public.jwt_role() in ('org_admin','staff')
  and bucket_id = 'signatures'
  and (storage.foldername(name))[1] = coalesce(public.jwt_org_id()::text, '')
) with check (
  bucket_id = 'signatures'
  and (storage.foldername(name))[1] = coalesce(public.jwt_org_id()::text, '')
);
