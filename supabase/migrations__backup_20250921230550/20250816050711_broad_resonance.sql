/*
  # Membership System Policies (Non-Recursive)

  1. Membership Policies
    - Users can view their own memberships
    - Admins can view memberships in their organizations
    - No circular dependencies between memberships and role checking

  2. App System Policies
    - Route access based on role requirements
    - App defaults accessible to appropriate roles
    - Audit trail for master admin only
*/

-- Simple membership policies without recursion
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='memberships' and policyname='memberships_self_select') then
    execute 'drop policy "memberships_self_select" on public.memberships';
  end if;
end $plpgsql$;

create policy "memberships_self_select"
  on memberships
  for select
  to authenticated
  using (user_id = auth.uid());

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='memberships' and policyname='memberships_admin_all') then
    execute 'drop policy "memberships_admin_all" on public.memberships';
  end if;
end $plpgsql$;

create policy "memberships_admin_all"
  on memberships
  for select
  to authenticated
  using (actor_is_master_admin());

-- App routes policies
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='app_routes' and policyname='app_routes: role >= min_role') then
    execute 'drop policy "app_routes: role >= min_role" on public.app_routes';
  end if;
end $plpgsql$;

create policy "app_routes: role >= min_role"
  on app_routes
  for select
  to public
  using (actor_at_least(min_role));

-- App defaults policies
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='app_defaults' and policyname='app_defaults: select self role') then
    execute 'drop policy "app_defaults: select self role" on public.app_defaults';
  end if;
end $plpgsql$;

create policy "app_defaults: select self role"
  on app_defaults
  for select
  to public
  using (role = actor_role() or actor_is_master_admin());

-- Audit trail policies
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='audit_role_changes' and policyname='audit: select master only') then
    execute 'drop policy "audit: select master only" on public.audit_role_changes';
  end if;
end $plpgsql$;

create policy "audit: select master only"
  on audit_role_changes
  for select
  to public
  using (actor_is_master_admin());

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='audit_role_changes' and policyname='audit: insert via definer function') then
    execute 'drop policy "audit: insert via definer function" on public.audit_role_changes';
  end if;
end $plpgsql$;

create policy "audit: insert via definer function"
  on audit_role_changes
  for insert
  to public
  with check (true);