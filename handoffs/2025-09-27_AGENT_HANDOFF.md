# CHESS Map Frontend — Agent Handoff (2025-09-27)

Date: 2025-09-27
Branch: dev
Repo: chess-map-frontend

## What’s Live
- Production: https://chesscompanions.app (confirm domains match ALLOWED_REDIRECT_HOSTS)
- Supabase Project Ref: cpfcnauiuceialwdbzms
- Edge Functions deployed: send_onboarding_notification, process_notifications, admin_create_user, admin_generate_link, admin_set_password, admin_delete_user

## Context Summary
- Stack: React 18 + Vite 5 + TypeScript; Tailwind; Framer Motion; React Router 7
- Maps: Mapbox GL primary → MapLibre GL fallback → OSM raster fallback; overlays are engine-agnostic and guarded
- Backend: Supabase (Auth, DB, RPCs, Realtime, Storage, Edge Functions)
- Roles: master_admin, org_admin, staff, student

## Database & RPCs
- Helper functions (public schema):
  - actor_is_master_admin() – used by admin_* edge functions for authorization
- Storage:
  - Bucket: map_assets (public read, authenticated write) — migration present at supabase/migrations/20250925090000_map_assets_bucket.sql
- Quests/events/safe_spaces tables and related RPCs exist (create_quest, approve/reject, etc.) — unchanged in this session

## Frontend Changes (this session)
- Master Map: create-then-place flow
  - Modal forms for Quest/Event/Safe Space, upload images to `map_assets`, then click on map to place
- Map container hardening
  - Engine fallback chain, telemetry disabled, overlay rendering wrapped in try/catch to avoid crashes
- Admin flows & scripts
  - Promotion script grants master_admin and ensures profiles/user_roles rows
  - Magic link smoke script for `admin_generate_link` (now successful)
- Edge Function fixes
  - Added `apikey` header to PostgREST and GoTrue calls (admin_generate_link, admin_set_password, admin_delete_user)

## Deployment
- Edge deploy script: supabase/functions/deploy.sh
  - Usage: `bash supabase/functions/deploy.sh cpfcnauiuceialwdbzms`
- Required function secrets (set via Supabase CLI or Dashboard):
  - SUPABASE_SERVICE_ROLE_KEY (or SERVICE_ROLE_KEY)
  - SUPABASE_URL (or INTERNAL_SUPABASE_URL)
  - FROM_EMAIL and email provider key (RESEND_API_KEY or SENDGRID_API_KEY)
  - ALLOWED_REDIRECT_HOSTS (comma-separated hosts, e.g. `chesscompanions.app,www.chesscompanions.app,localhost:5173`)

## How to Run
- Dev: `npm run dev`
- Build: `npm run build && npm run preview`
- Typecheck: `npm run type-check`
- Tests: `npm test`
- Apply DB migrations: `npx supabase db push --yes`

Required local env (.env.local, git-ignored):
- SUPABASE_URL, SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (for scripts)
- MASTER_EMAIL, MASTER_PASSWORD
- Optional: VITE_MAPBOX_TOKEN or VITE_MAPLIBRE_STYLE_URL

## Verification / Smokes
- Promote master admin: `npm run -s admin:grant:master`
- Magic link: `REDIRECT_ORIGIN=http://localhost:5173 npm run -s smoke:magic-link`
  - Expected: logs a valid Magic link URL
- Check admin RPC: `npm run -s check:master-admin`
- Map layers: `npm run -s smoke:map`

## Current Status
- Functions redeployed with apikey header fixes
- master_admin promotion: successful for MASTER_EMAIL
- Magic link smoke: SUCCESS (valid URL returned)
- Tests: PASS (86/86); minor React act() warnings remain (non-blocking)

## Open Work / Next Steps
- Confirm ALLOWED_REDIRECT_HOSTS covers all production domains
- Optional: add CI smoke for magic link using ephemeral user and env-provided secrets
- Clean up act() warnings in tests (wrap async updates)

## Troubleshooting
- FORBIDDEN from admin_* functions → caller not recognized by `actor_is_master_admin`; promote caller and ensure `profiles` row exists
- No API key found in request → missing `apikey` header; ensure functions include `apikey: SERVICE_ROLE` (already patched)
- Invalid API key in scripts → update local `.env.local` with correct SUPABASE_SERVICE_ROLE_KEY (never commit)
- Redirect ignored/blocked → ensure `ALLOWED_REDIRECT_HOSTS` includes the requested host (e.g., localhost:5173)

## Contact Points (files)
- Map container: `src/components/MapView.tsx`
- Master Map: `src/pages/master/tabs/MasterMap.tsx`
- Public/Student overlays: `src/pages/common/PublicMapOverlay.tsx`, `src/pages/student/QuestMapOverlay.tsx`
- Supabase client: `src/lib/supabase.ts`
- Edge Functions: `supabase/functions/*`
- Scripts: `scripts/grant-master-admin.ts`, `scripts/smoke-magic-link.ts`, `scripts/check-master-admin.ts`, `scripts/smoke-map-layers.ts`
