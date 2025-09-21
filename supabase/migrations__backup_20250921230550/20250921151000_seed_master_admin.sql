-- Seed master admin role for known account if present
-- Idempotent upsert based on email match in auth.users

do $$
declare
  master_id uuid;
begin
  select id into master_id from auth.users where email = 'masteradmin@test.com' limit 1;
  if master_id is not null then
    insert into public.user_roles (user_id, role, assigned_at, updated_at)
    values (master_id, 'master_admin', now(), now())
    on conflict (user_id) do update
      set role = excluded.role,
          updated_at = now();
  end if;
end $$;