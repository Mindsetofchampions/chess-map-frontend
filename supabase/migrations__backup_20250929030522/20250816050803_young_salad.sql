/*
  # Database Views

  1. Wallet Views
    - `user_coin_balance` - Simple user balance view
    - `v_org_coin_balance` - Organization balance with details
    - `v_student_coin_balance` - Student balance per organization
    - `v_student_coin_balance_detailed` - Student balance with org details
    - `v_student_coin_total_balance` - Total balance across all organizations

  2. Security
    - Views inherit RLS from underlying tables
*/

-- Simple user coin balance view
create or replace view user_coin_balance as
select 
  user_id,
  coalesce(sum(coins_awarded), 0) as balance
from completions
group by user_id;

-- Organization coin balance view
create or replace view v_org_coin_balance as
select 
  ocw.org_id,
  o.slug,
  o.name,
  ocw.balance
from org_coin_wallets ocw
join organizations o on o.id = ocw.org_id;

-- Student coin balance view
create or replace view v_student_coin_balance as
select 
  user_id,
  org_id,
  balance
from student_coin_wallets;

-- Student coin balance with organization details
create or replace view v_student_coin_balance_detailed as
select 
  scw.user_id,
  scw.org_id,
  o.slug,
  o.name,
  scw.balance
from student_coin_wallets scw
join organizations o on o.id = scw.org_id;

-- Student total balance across all organizations
create or replace view v_student_coin_total_balance as
select 
  user_id,
  sum(balance) as total_balance
from student_coin_wallets
group by user_id;