# Agent Handoff

Date: 2025-09-21
Branch: dev
Repo: chess-map-frontend

## Context Summary
This project is a React 18 + Vite + TypeScript frontend with Tailwind and Supabase (Postgres + RLS). It deploys to Netlify. The app supports roles (master_admin, org_admin, staff, student). There are wallet/ledger tables for coins, organization-level engagements (funding pools), and flows for onboarding and admin approvals.

Key functional areas implemented recently:
- Toast UX and self-guarding admin actions
- Netlify deployment config and a Neon-backed Netlify Function
- Org onboarding: private storage buckets + RLS, table, RPCs, and master approvals UI (+ notifications)
- Master admin coin ops: top up platform balance; allocate to orgs; allocate directly to users
- Org engagements: schema + RPCs to create/fund engagements, manage recipients, and distribute coins
- Org Dashboard: robust UI to manage wallet, engagements, funding, recipients, and distributions
- Routing fixes: org users now route to /org/dashboard

## Database & RPCs
Recent migrations (applied to remote with `supabase db push --include-all`):
- 20250921104000_user_wallets_and_allocate_user_coins.sql
  - user_wallets table
  - get_user_id_by_email(email)
  - allocate_user_coins(email, amount, reason) [master-only]
- 20250921112000_org_engagements_and_rpcs.sql
  - org_engagements, org_engagement_recipients tables
  - get_my_org(), list_org_engagements()
  - create_org_engagement(name, description)
  - fund_org_engagement(engagement_id, amount, reason)
  - upsert_engagement_recipient(engagement_id, user_email, amount)
  - remove_engagement_recipient(engagement_id, user_email)
  - distribute_engagement(engagement_id)
- 20250921123000_org_admin_helpers.sql
  - get_my_org_wallet() – allows org_admin, staff, master_admin
  - list_engagement_recipients(engagement_id)

Notes:
- Distribution deducts from engagement.remaining (not the org wallet at distribution time). The org wallet is debited during fund_org_engagement.
- Views like v_org_coin_balance already exist from prior migrations.

## Frontend Changes
- `src/lib/supabase.ts`:
  - Added helpers: getMyOrg, listOrgEngagements, createOrgEngagement, fundOrgEngagement,
    upsertEngagementRecipient, removeEngagementRecipient, distributeEngagement,
    getMyOrgWallet, listEngagementRecipients, allocateUserCoins
- `src/pages/org/OrgDashboard.tsx`:
  - Replaced placeholder with full UI for wallet, engagements, funding, recipients, distribution
  - Access widened to requiredRole='staff' (covers org_admin, staff, master_admin)
- `src/pages/auth/Login.tsx`:
  - Redirects: org_admin/staff → /org/dashboard; master_admin → /master/dashboard; others → /dashboard
- `src/pages/onboarding/StudentOnboarding.tsx`, `ParentConsent.tsx`, `Start.tsx`:
  - Removed redirects to /master/quests/approvals for org users; now route to appropriate dashboards
- `src/App.tsx`:
  - Landing redirect ensures org_admin/staff → /org/dashboard; master_admin → /master/dashboard
- `src/index.css`:
  - Added .btn-secondary (Tailwind @apply used; LS warns about @apply but build is fine)

## Deployment
- `netlify.toml` configured with:
  - build: npm run build; publish: dist; Node 20
  - headers (security)
  - functions dir + esbuild bundler
  - redirect: /api/* → /.netlify/functions/:splat
  - Secrets scanning allowlist keys/paths to avoid false positives

## How to Run
- Dev: `npm run dev`
- Build: `npm run build`
- Typecheck: `npm run type-check`
- Apply DB migrations: `npx supabase db push --yes --include-all`

Ensure local .env vars exist (not committed):
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_MAPBOX_TOKEN

## Current Status
- Build: PASS
- Migrations: Applied
- Known warnings: Tailwind CSS LS flags @tailwind/@apply; non-blocking
- Org routing: Fixed to direct org users to /org/dashboard
- Engagements: End-to-end funded distribution works as designed

## Open Work / Next Steps
1) Org ledger and analytics
- Add an org ledger panel (org_coin_txns) to OrgDashboard for transparency
- Simple charts for budget vs remaining, distribution totals

2) Recipient UX refinements
- Autocomplete recipients by email (org members)
- Inline editing of planned amounts

3) Master/Admin separation polish
- Ensure master-only links/components are hidden from org/staff contexts

4) Tests
- Add unit/integration tests for new helpers and UI flows

## Troubleshooting
- If org wallet doesn’t update: ensure funding via Fund action (not only distribute). Wallet decreases on fund, distribution reduces engagement remaining.
- If routing appears stuck on a master page for org users: confirm changes in Login.tsx, onboarding pages, and App.tsx are in use and that the role is correctly resolved from user_roles/profiles.

## Contact Points
- Org dashboards: `src/pages/org/OrgDashboard.tsx`
- RPC helpers: `src/lib/supabase.ts`
- Auth/role: `src/contexts/AuthContext.tsx`
- Netlify/Deploy: `netlify.toml`
- Migrations: `supabase/migrations/*`
