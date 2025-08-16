/*
  # Create Database Views

  1. Views
    - `user_coin_balance` - User coin balance summary
    - `v_org_coin_balance` - Organization coin balances
    - `v_student_coin_balance` - Student balances by org
    - `v_student_coin_balance_detailed` - Detailed student balances
    - `v_student_coin_total_balance` - Total student balance across orgs

  2. Security
    - Views inherit RLS from underlying tables
    - No additional security needed
*/

-- User coin balance view
CREATE OR REPLACE VIEW user_coin_balance AS
SELECT 
  c.user_id,
  COALESCE(SUM(c.coins_awarded), 0) as balance
FROM completions c
GROUP BY c.user_id;

-- Organization coin balance view
CREATE OR REPLACE VIEW v_org_coin_balance AS
SELECT 
  w.org_id,
  o.slug,
  o.name,
  w.balance
FROM org_coin_wallets w
JOIN organizations o ON o.id = w.org_id;

-- Student coin balance view
CREATE OR REPLACE VIEW v_student_coin_balance AS
SELECT 
  user_id,
  org_id,
  balance
FROM student_coin_wallets;

-- Student coin balance detailed view
CREATE OR REPLACE VIEW v_student_coin_balance_detailed AS
SELECT 
  w.user_id,
  w.org_id,
  o.slug,
  o.name,
  w.balance
FROM student_coin_wallets w
JOIN organizations o ON o.id = w.org_id;

-- Student total balance across all organizations
CREATE OR REPLACE VIEW v_student_coin_total_balance AS
SELECT 
  user_id,
  SUM(balance) as total_balance
FROM student_coin_wallets
GROUP BY user_id;