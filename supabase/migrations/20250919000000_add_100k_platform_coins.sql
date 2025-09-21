-- 20250919_add_100k_platform_coins.sql
-- Add 100,000 coins to the platform balance for master admin testing and org distribution

-- Insert a ledger entry for auditability
insert into public.platform_ledger (amount_coins, direction, reason, metadata)
values (100000, 'CREDIT', 'Initial test funding for master admin', jsonb_build_object('source', 'migration', 'by', 'system', 'date', now()));

-- Update the platform balance
update public.platform_balance
set coins = coins + 100000;
