# Handoffs

This folder stores session handoff notes to help switch agents or machines smoothly. Each handoff is a concise, actionable snapshot of the repo state, what changed, and what to do next.

## Naming convention

- File format: `YYYY-MM-DD_AGENT_HANDOFF.md`
- Example: `2025-09-21_AGENT_HANDOFF.md`

## When to create a handoff

- At the end of a focused work session.
- Before switching developers/agents or machines.
- After major feature merges or environment changes.

## What to include (essentials)

- Date, branch, repo
- Context summary (stack, deployment, roles)
- What changed (code + infra)
- DB migrations and RPCs added/changed
- How to run (dev/build/typecheck/migrations) and required env vars
- Current status (build/tests/migrations)
- Open work / next steps
- Troubleshooting notes (gotchas, role routing, RLS/policies)
- Pointers to key files

## Workflow

1. Duplicate the most recent handoff in this folder.
2. Update the date in the filename and the header.
3. Skim recent commits and your changes; update sections accordingly.
4. Keep it tight (1–2 screens). Link to files instead of pasting large diffs.
5. Commit the new handoff and remove or archive any stale root-level copies.

## Template (copy/paste)

---

# Agent Handoff

Date: YYYY-MM-DD
Branch: dev
Repo: chess-map-frontend

## Context Summary

Briefly describe the stack, hosting, auth/roles, and any noteworthy architectural elements.

## Database & RPCs

List new/changed migrations and RPCs with one-line purposes and any role/RLS notes.

## Frontend Changes

Summarize key files touched and user-visible behavior changes.

## Deployment

Note configs (Netlify/Vercel/Cloudflare), redirects, security headers, serverless functions, and secrets handling.

## How to Run

- Dev: `npm run dev`
- Build: `npm run build`
- Typecheck: `npm run type-check`
- Apply DB migrations: `npx supabase db push --yes --include-all`

Required env vars:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- Any other tokens (e.g., VITE_MAPBOX_TOKEN)

## Current Status

- Build: PASS/FAIL (+ brief reason)
- Migrations: Applied/Pending
- Notable warnings: brief list

## Open Work / Next Steps

Bullet the most important follow-ups with clear owners or contexts.

## Troubleshooting

Common pitfalls and fixes (routing, RLS, storage policies, auth callbacks, etc.).

## Contact Points

List paths to the most relevant files changed in this session.

---

## Tips

- Prefer links and filenames over long code blocks.
- Keep sensitive values out of this folder; reference environment names instead.
- If you add runnable code or migrations, validate them before writing the handoff.
