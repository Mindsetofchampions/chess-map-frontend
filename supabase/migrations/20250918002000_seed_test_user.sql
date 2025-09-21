/*
  # Seed Test User and Membership

  Creates a test user via SQL (placeholder) and associates them with test-org.
  Note: In a real environment, create auth.users via Admin API or Edge Function.
*/

-- Create profile-only placeholder if auth.users user already exists; else no-op here.
-- This seed assumes an existing auth user with known UUID. Replace with a real UUID after creating the user.
-- For local dev, you can update TEST_USER_ID using your auth user's id.

do $$ begin
  if not exists (select 1 from organizations where slug = 'test-org') then
    raise notice 'Test org missing. Run org seed first.';
  end if;
end $$;

-- Variables (manually update after creating a test user in auth)
-- Example: select id from auth.users where email = 'test.user@example.com';
-- For safety, we create a dummy profile entry only if the user id exists.

-- Replace this with your actual test user email when available
-- This block attempts to find a user with a known test email and link membership

do $$
declare
  v_user_id uuid;
  v_org_id uuid;
begin
  select id into v_org_id from organizations where slug = 'test-org';
  -- Try to find a common dev email; change as needed
  select id into v_user_id from auth.users where email in ('test.user@example.com', 'tester@example.com') limit 1;

  if v_user_id is null then
    raise notice 'No test auth user found. Create one via edge function or Supabase dashboard, then rerun seed.';
    return;
  end if;

  -- Upsert profile
  insert into profiles(user_id, display_name, role, org_id)
  values (v_user_id, 'Test User', 'student', v_org_id)
  on conflict (user_id) do update set display_name = excluded.display_name, org_id = excluded.org_id;

  -- Upsert membership as student
  insert into memberships(user_id, org_id, role)
  values (v_user_id, v_org_id, 'student')
  on conflict (user_id, org_id) do update set role = excluded.role;
end $$;