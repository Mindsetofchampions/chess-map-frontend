/*
  # Store System Policies

  1. Store Item Policies
    - Active items can be viewed by authenticated users
    - Admins can manage store items

  2. Store Order Policies
    - Users can view their own orders
    - Admins can view organization orders

  3. Persona Policies
    - Authenticated users can view personas
    - Master admins can manage personas
*/

-- Store items policies
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='store_items' and policyname='store_items_read') then
    execute 'drop policy "store_items_read" on public.store_items';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='store_items' and policyname='store_items_read') then
    execute 'drop policy "store_items_read" on public.store_items';
  end if;
end $plpgsql$;
create policy "store_items_read" on public.store_items 
  for select
  to authenticated
  using (active = true);

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='store_items' and policyname='store_items_admin_cud') then
    execute 'drop policy "store_items_admin_cud" on public.store_items';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='store_items' and policyname='store_items_admin_cud') then
    execute 'drop policy "store_items_admin_cud" on public.store_items';
  end if;
end $plpgsql$;
create policy "store_items_admin_cud" on public.store_items 
  for all
  to authenticated
  using (actor_is_master_admin())
  with check (actor_is_master_admin());

-- Store orders policies
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='store_orders' and policyname='store_orders_select_self_or_org') then
    execute 'drop policy "store_orders_select_self_or_org" on public.store_orders';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='store_orders' and policyname='store_orders_select_self_or_org') then
    execute 'drop policy "store_orders_select_self_or_org" on public.store_orders';
  end if;
end $plpgsql$;
create policy "store_orders_select_self_or_org" on public.store_orders 
  for select
  to authenticated
  using (
    user_id = auth.uid() 
    or actor_is_master_admin()
  );

-- Personas policies
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='personas' and policyname='personas: select (jwt authed)') then
    execute 'drop policy "personas: select (jwt authed)" on public.personas';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='personas' and policyname='personas: select (jwt authed)') then
    execute 'drop policy "personas: select (jwt authed)" on public.personas';
  end if;
end $plpgsql$;
create policy "personas: select (jwt authed)" on public.personas 
  for select
  to public
  using (auth.uid() is not null);

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='personas' and policyname='personas: insert (master only)') then
    execute 'drop policy "personas: insert (master only)" on public.personas';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='personas' and policyname='personas: insert (master only)') then
    execute 'drop policy "personas: insert (master only)" on public.personas';
  end if;
end $plpgsql$;
create policy "personas: insert (master only)" on public.personas 
  for insert
  to public
  with check (actor_is_master_admin());

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='personas' and policyname='personas: update (master only)') then
    execute 'drop policy "personas: update (master only)" on public.personas';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='personas' and policyname='personas: update (master only)') then
    execute 'drop policy "personas: update (master only)" on public.personas';
  end if;
end $plpgsql$;
create policy "personas: update (master only)" on public.personas 
  for update
  to public
  using (actor_is_master_admin())
  with check (actor_is_master_admin());

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='personas' and policyname='personas: delete (master only)') then
    execute 'drop policy "personas: delete (master only)" on public.personas';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='personas' and policyname='personas: delete (master only)') then
    execute 'drop policy "personas: delete (master only)" on public.personas';
  end if;
end $plpgsql$;
create policy "personas: delete (master only)" on public.personas 
  for delete
  to public
  using (actor_is_master_admin());

-- Analytics logs policies
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='analytics_logs' and policyname='Allow users to insert own analytics logs') then
    execute 'drop policy "Allow users to insert own analytics logs" on public.analytics_logs';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='analytics_logs' and policyname='Allow users to insert own analytics logs') then
    execute 'drop policy "Allow users to insert own analytics logs" on public.analytics_logs';
  end if;
end $plpgsql$;
create policy "Allow users to insert own analytics logs" on public.analytics_logs 
  for insert
  to authenticated
  with check (user_id = auth.uid());

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='analytics_logs' and policyname='Admins manage analytics') then
    execute 'drop policy "Admins manage analytics" on public.analytics_logs';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='analytics_logs' and policyname='Admins manage analytics') then
    execute 'drop policy "Admins manage analytics" on public.analytics_logs';
  end if;
end $plpgsql$;
create policy "Admins manage analytics" on public.analytics_logs 
  for all
  to authenticated
  using (actor_is_master_admin())
  with check (actor_is_master_admin());

-- Completions policies
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='completions' and policyname='Students insert completions') then
    execute 'drop policy "Students insert completions" on public.completions';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='completions' and policyname='Students insert completions') then
    execute 'drop policy "Students insert completions" on public.completions';
  end if;
end $plpgsql$;
create policy "Students insert completions" on public.completions 
  for insert
  to authenticated
  with check (user_id = auth.uid());

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='completions' and policyname='Students view own completions') then
    execute 'drop policy "Students view own completions" on public.completions';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='completions' and policyname='Students view own completions') then
    execute 'drop policy "Students view own completions" on public.completions';
  end if;
end $plpgsql$;
create policy "Students view own completions" on public.completions 
  for select
  to authenticated
  using (user_id = auth.uid());

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='completions' and policyname='Admins manage completions') then
    execute 'drop policy "Admins manage completions" on public.completions';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='completions' and policyname='Admins manage completions') then
    execute 'drop policy "Admins manage completions" on public.completions';
  end if;
end $plpgsql$;
create policy "Admins manage completions" on public.completions 
  for all
  to authenticated
  using (actor_is_master_admin())
  with check (actor_is_master_admin());