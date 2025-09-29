/*
  # Row Level Security Policies

  1. Core Table Policies
    - Users can manage their own data
    - Admins can manage organization data
    - Public read access where appropriate

  2. Non-Recursive Design
    - Avoid circular references between tables
    - Use direct role checks from profiles
    - Use helper functions for complex checks
*/

-- Users table policies
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='users' and policyname='Users can view own profile') then
    execute 'drop policy "Users can view own profile" on public.users';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='users' and policyname='Users can view own profile') then
    execute 'drop policy "Users can view own profile" on public.users';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='users' and policyname='Users can view own profile') then
    execute 'drop policy "Users can view own profile" on public.users';
  end if;
end $plpgsql$;
create policy "Users can view own profile" on public.users 
  for select
  to authenticated
  using (auth.uid() = id);

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='users' and policyname='Users can update own profile') then
    execute 'drop policy "Users can update own profile" on public.users';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='users' and policyname='Users can update own profile') then
    execute 'drop policy "Users can update own profile" on public.users';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='users' and policyname='Users can update own profile') then
    execute 'drop policy "Users can update own profile" on public.users';
  end if;
end $plpgsql$;
create policy "Users can update own profile" on public.users 
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='users' and policyname='Admins can manage users') then
    execute 'drop policy "Admins can manage users" on public.users';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='users' and policyname='Admins can manage users') then
    execute 'drop policy "Admins can manage users" on public.users';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='users' and policyname='Admins can manage users') then
    execute 'drop policy "Admins can manage users" on public.users';
  end if;
end $plpgsql$;
create policy "Admins can manage users" on public.users 
  for all
  to authenticated
  using (actor_is_master_admin())
  with check (actor_is_master_admin());

-- Admins table policies
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='admins' and policyname='Allow users to view own admin record') then
    execute 'drop policy "Allow users to view own admin record" on public.admins';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='admins' and policyname='Allow users to view own admin record') then
    execute 'drop policy "Allow users to view own admin record" on public.admins';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='admins' and policyname='Allow users to view own admin record') then
    execute 'drop policy "Allow users to view own admin record" on public.admins';
  end if;
end $plpgsql$;
create policy "Allow users to view own admin record" on public.admins 
  for select
  to authenticated
  using (user_id = auth.uid());

-- Profiles table policies (non-recursive)
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='Profiles: insert own row') then
    execute 'drop policy "Profiles: insert own row" on public.profiles';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='Profiles: insert own row') then
    execute 'drop policy "Profiles: insert own row" on public.profiles';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='Profiles: insert own row') then
    execute 'drop policy "Profiles: insert own row" on public.profiles';
  end if;
end $plpgsql$;
create policy "Profiles: insert own row" on public.profiles 
  for insert
  to public
  with check (user_id = auth.uid());

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='Profiles: update own row') then
    execute 'drop policy "Profiles: update own row" on public.profiles';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='Profiles: update own row') then
    execute 'drop policy "Profiles: update own row" on public.profiles';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='Profiles: update own row') then
    execute 'drop policy "Profiles: update own row" on public.profiles';
  end if;
end $plpgsql$;
create policy "Profiles: update own row" on public.profiles 
  for update
  to public
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='Profiles: admin update any') then
    execute 'drop policy "Profiles: admin update any" on public.profiles';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='Profiles: admin update any') then
    execute 'drop policy "Profiles: admin update any" on public.profiles';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='Profiles: admin update any') then
    execute 'drop policy "Profiles: admin update any" on public.profiles';
  end if;
end $plpgsql$;
create policy "Profiles: admin update any" on public.profiles 
  for update
  to public
  using (actor_is_master_admin())
  with check (actor_is_master_admin());

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_self_or_admin') then
    execute 'drop policy "profiles_self_or_admin" on public.profiles';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_self_or_admin') then
    execute 'drop policy "profiles_self_or_admin" on public.profiles';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_self_or_admin') then
    execute 'drop policy "profiles_self_or_admin" on public.profiles';
  end if;
end $plpgsql$;
create policy "profiles_self_or_admin" on public.profiles 
  for select
  to authenticated
  using (user_id = auth.uid() or actor_is_master_admin());

-- Attributes table policies
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='attributes' and policyname='Public view attributes') then
    execute 'drop policy "Public view attributes" on public.attributes';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='attributes' and policyname='Public view attributes') then
    execute 'drop policy "Public view attributes" on public.attributes';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='attributes' and policyname='Public view attributes') then
    execute 'drop policy "Public view attributes" on public.attributes';
  end if;
end $plpgsql$;
create policy "Public view attributes" on public.attributes 
  for select
  to public
  using (true);

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='attributes' and policyname='Admins manage attributes') then
    execute 'drop policy "Admins manage attributes" on public.attributes';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='attributes' and policyname='Admins manage attributes') then
    execute 'drop policy "Admins manage attributes" on public.attributes';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='attributes' and policyname='Admins manage attributes') then
    execute 'drop policy "Admins manage attributes" on public.attributes';
  end if;
end $plpgsql$;
create policy "Admins manage attributes" on public.attributes 
  for all
  to authenticated
  using (actor_is_master_admin())
  with check (actor_is_master_admin());

-- Safe spaces policies
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='safe_spaces' and policyname='Public view safe_spaces') then
    execute 'drop policy "Public view safe_spaces" on public.safe_spaces';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='safe_spaces' and policyname='Public view safe_spaces') then
    execute 'drop policy "Public view safe_spaces" on public.safe_spaces';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='safe_spaces' and policyname='Public view safe_spaces') then
    execute 'drop policy "Public view safe_spaces" on public.safe_spaces';
  end if;
end $plpgsql$;
create policy "Public view safe_spaces" on public.safe_spaces 
  for select
  to public
  using (true);

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='safe_spaces' and policyname='Admins manage safe_spaces') then
    execute 'drop policy "Admins manage safe_spaces" on public.safe_spaces';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='safe_spaces' and policyname='Admins manage safe_spaces') then
    execute 'drop policy "Admins manage safe_spaces" on public.safe_spaces';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='safe_spaces' and policyname='Admins manage safe_spaces') then
    execute 'drop policy "Admins manage safe_spaces" on public.safe_spaces';
  end if;
end $plpgsql$;
create policy "Admins manage safe_spaces" on public.safe_spaces 
  for all
  to authenticated
  using (actor_is_master_admin())
  with check (actor_is_master_admin());

-- Events policies
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='Public view events') then
    execute 'drop policy "Public view events" on public.events';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='Public view events') then
    execute 'drop policy "Public view events" on public.events';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='Public view events') then
    execute 'drop policy "Public view events" on public.events';
  end if;
end $plpgsql$;
create policy "Public view events" on public.events 
  for select
  to public
  using (true);

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='Admins manage events') then
    execute 'drop policy "Admins manage events" on public.events';
  end if;
end $plpgsql$;

do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='Admins manage events') then
    execute 'drop policy "Admins manage events" on public.events';
  end if;
end $plpgsql$;
do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='Admins manage events') then
    execute 'drop policy "Admins manage events" on public.events';
  end if;
end $plpgsql$;
create policy "Admins manage events" on public.events 
  for all
  to authenticated
  using (actor_is_master_admin())
  with check (actor_is_master_admin());