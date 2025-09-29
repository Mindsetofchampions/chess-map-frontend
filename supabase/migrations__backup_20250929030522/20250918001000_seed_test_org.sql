/*
  # Seed Test Organization

  Inserts a test organization and ensures it has an org coin wallet entry.
*/

-- Create test organization if not exists
insert into organizations (id, name, slug)
values (
  coalesce((select id from organizations where slug = 'test-org'), gen_random_uuid()),
  'Test Organization',
  'test-org'
)
on conflict (slug) do update set name = excluded.name;

-- Ensure org coin wallet row exists for the test org
insert into org_coin_wallets (org_id, balance)
select id, 0 from organizations where slug = 'test-org'
on conflict (org_id) do nothing;