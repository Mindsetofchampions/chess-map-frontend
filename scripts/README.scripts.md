# Scripts quickstart

This folder contains Node/TypeScript scripts that interact with your Supabase project and app database.

## Setup

1. Duplicate `.env.scripts.example` to `.env.scripts.local` and fill in values.
2. Ensure Node 20 and npm 10+ per `package.json` engines.

The scripts auto-load env from `.env.scripts.local` if present, otherwise fall back to `.env`.

## Common scripts

- `npm run sanity:quests` – Checks quest RPCs and key columns exist.
- `npm run smoke:quests` – Authenticates as an org account, creates a quest, and optionally approves it as master.

### Required env for smoke

- `SUPABASE_URL` and `SUPABASE_ANON_KEY` (or Vite `VITE_*` equivalents)
- EITHER provide `ORG_EMAIL` and `ORG_PASSWORD` (org_admin or staff)
- OR provide `SUPABASE_SERVICE_ROLE_KEY` and the script will auto-provision a temporary `org_admin`, run, and clean it up.
- Optional: `MASTER_EMAIL`, `MASTER_PASSWORD` to try approval step
- Optional: `SMOKE_ATTRIBUTE_ID` if your `attributes` table is empty

## Notes

- These scripts use `@supabase/supabase-js` with ephemeral sessions (no persisted auth).
- Approval step will be skipped if the `approve_quest` RPC is not present in your database.
