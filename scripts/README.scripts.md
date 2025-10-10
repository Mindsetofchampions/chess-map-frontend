# Scripts quickstart

This folder contains Node/TypeScript scripts that interact with your Supabase project and app database.

## Setup

1. Duplicate `.env.scripts.example` to `.env.scripts.local` and fill in values.
2. Ensure Node 20 and npm 10+ per `package.json` engines.

The scripts auto-load env from `.env.scripts.local` if present, otherwise fall back to `.env`.

## Common scripts

- `npm run sanity:quests` – Checks quest RPCs and key columns exist.
- `npm run smoke:quests` – Authenticates as an org account, creates a quest, and optionally approves it as master.
- `npm run smoke:map` – Authenticates as master, inserts a safe space and an event, verifies presence, and optionally cleans up with `SMOKE_CLEANUP=1`.
- `npm run consent:pending` – Lists recent PENDING rows from `parent_consents` (requires service role key).
- `npm run consent:approve` – Approves a PENDING consent via RPC and awards coins, then verifies wallet/ledger.

### Required env for smoke

- `SUPABASE_URL` and `SUPABASE_ANON_KEY` (or Vite `VITE_*` equivalents)
- EITHER provide `ORG_EMAIL` and `ORG_PASSWORD` (org_admin or staff)
- OR provide `SUPABASE_SERVICE_ROLE_KEY` and the script will auto-provision a temporary `org_admin`, run, and clean it up.
- Optional: `MASTER_EMAIL`, `MASTER_PASSWORD` to try approval step
- Optional: `SMOKE_ATTRIBUTE_ID` if your `attributes` table is empty

For map smoke:

- `MASTER_EMAIL`, `MASTER_PASSWORD` required for inserts (due to RLS). Without these, the script warns and inserts will likely fail.
- Optional: `SMOKE_CLEANUP=1` to delete the inserted rows after verification.

### How to run the map smoke

1. Ensure envs are set for a master admin account:

```
MASTER_EMAIL='you@example.com' MASTER_PASSWORD='yourpassword' npm run -s smoke:map
```

2. To remove seeded rows after verification, add the cleanup flag:

```
SMOKE_CLEANUP=1 MASTER_EMAIL='you@example.com' MASTER_PASSWORD='yourpassword' npm run -s smoke:map
```

3. The script will print inserted IDs and verify that they can be read back. If the `attributes` table is empty, the script will proceed without attribute dependencies (safe spaces and events only).

## Parent consent helpers

Quickly inspect and approve parent consents from the command line.

List pending consents (top 10):

```
npm run -s consent:pending
```

Approve the most recent pending consent with a 50-coin award and a note:

```
npm run -s consent:approve -- --coins 50 --notes "approved via script"
```

Approve a specific consent by ID and award 77 coins:

```
npm run -s consent:approve -- --id 77498a4f-25ef-464a-b928-df7aaa84995b --coins 77 --notes "QA pass"
```

Notes:

- These scripts load env from `.env.scripts.local` if present; otherwise they fall back to `.env`.
- `consent:pending` requires a service role key to read pending rows.
- `consent:approve` will try MASTER_EMAIL/PASSWORD; if missing, it will create a temporary master admin using the service role key and clean it up (unless `SMOKE_CLEANUP=0`).

## Notes

- These scripts use `@supabase/supabase-js` with ephemeral sessions (no persisted auth).
- Approval step will be skipped if the `approve_quest` RPC is not present in your database.

## Magic link smoke

Use this to verify the admin_generate_link Edge Function end-to-end.

Prereqs:

- Set SUPABASE*URL and SUPABASE_ANON_KEY (or VITE*\* equivalents) in `.env.scripts.local`.
- Ensure the account in MASTER_EMAIL is a master_admin. If not, use the grant script below.
- Optionally set `ALLOWED_REDIRECT_HOSTS` as a Function secret so `redirectTo` is honored.

Grant master role (requires service role key):

```
# Add to .env.scripts.local
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
MASTER_EMAIL=masteradmin@test.com

# Then run
npm run -s admin:grant:master
```

Run smoke test:

```
# Uses .env.scripts.local MASTER_EMAIL/PASSWORD to auth, TARGET_EMAIL defaults to MASTER_EMAIL
npm run -s smoke:magic-link

# Optionally specify target and redirect
TARGET_EMAIL=someone@example.com REDIRECT_ORIGIN=https://chesscompanions.app npm run -s smoke:magic-link
```

Expected output:

- On success: prints `Magic link URL: <link>` and exits 0.
- On failure: prints error JSON (e.g., `{ error: 'FORBIDDEN' }`) and exits 1.
