# CHESS Map Frontend — Engineering Handoff (2025-09-22)

This document captures the current state of the frontend, how to run and deploy it, required configuration, and the fixes applied today to resolve production crashes and improve stability.

- Repo: Mindsetofchampions/chess-map-frontend
- Stack: React 18 + Vite 5 + TypeScript, Tailwind, Framer Motion, React Router 7, Supabase (Auth/DB/Realtime), Netlify (SPA + Functions), Mapbox GL with MapLibre fallback

---

## What’s Live
- Netlify production: chesscompanions.app
- Auto-deploys: `main` branch via `netlify.toml` (build: `npm run build`, publish: `dist`, Node 20)
- SPA redirects: `public/_redirects` contains `/*   /index.html   200`

## Latest Commits
- b9e7108: build(vite): move cacheDir to OS temp to prevent OneDrive EPERM on Windows
- 571b495: fix(router): render MobileNav inside Router; guard missing env to show EnvMissing; move vite cache to OS temp

---

## Required Environment Variables (Frontend)
Configure in Netlify → Site settings → Environment (and locally via `.env`):
- `VITE_SUPABASE_URL`: Supabase project URL (https://xxxx.supabase.co)
- `VITE_SUPABASE_ANON_KEY`: Supabase anon key

Optional (maps/styles):
- `VITE_MAPBOX_TOKEN` or `VITE_MAPBOX_TOKEN_PK`: Mapbox token (enables Mapbox tiles)
- `VITE_MAP_STYLE_URL`: Mapbox style (defaults to `mapbox://styles/mapbox/dark-v11`)
- `VITE_MAPLIBRE_STYLE_URL`: MapLibre style URL if using open tiles

Optional (functions/testing):
- `REACT_APP_SUPABASE_FUNCTIONS_URL`: Base for outbound function calls (falls back to `/.netlify/functions`)
- Netlify Functions Neon demo: `NETLIFY_DATABASE_URL`

Notes:
- Realtime/WebSockets are not supported in Netlify Edge Functions; the app uses standard Supabase client connections.

---

## Runbook
Node: `>=20 <21` (enforced in `package.json` engines)

Local development:
```bash
npm ci
npm run dev   # starts Vite
npm test      # Jest test suite
npm run build && npm run preview
```

Deployment (Netlify):
- Push to `main` triggers CI/CD. To force a deploy:
```bash
git commit --allow-empty -m "chore: redeploy" && git push origin main
```

---

## Recent Fixes (Today)
- Dev crash on Windows/OneDrive (EPERM removing `.vite-cache`):
  - Vite `cacheDir` moved to OS temp (`os.tmpdir()`). File: `vite.config.ts`.
- Production white screen when envs missing:
  - Removed hard throws at import-time in `src/lib/supabase.ts`. If `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` are absent, we create a no-op Supabase client and expose `SUPABASE_ENV_VALID=false`.
  - `App.tsx` gates the app: when envs are missing, renders `EnvMissing` rather than crashing.
- Router error: `useLocation()` outside of `<Router>`:
  - Moved `MobileNav` inside `BrowserRouter` (rendered at bottom of `AppRouter`) and removed outer instance in `App`.
- Tests: suites pass locally; production build completes with large-chunk warnings only.

---

## Architecture Notes
- Routing/Auth:
  - `AuthProvider` manages Supabase auth and role resolution.
  - `ProtectedRoute` + `OnboardingGate` for org onboarding and dashboards.
  - Authenticated users are redirected to role-based dashboards.
- Maps:
  - Mapbox GL primary, MapLibre fallback; persona GIF sprites overlay; clustering and filters.
  - If Mapbox token missing, map falls back to bubbles-only or MapLibre style if provided.
- Netlify Functions:
  - Examples in `netlify/functions/` (Neon-backed samples). Requires `NETLIFY_DATABASE_URL` if used.

---

## Key Commands
```bash
npm run type-check
npm run lint:check
npm run format:check
# Optional data scripts
npm run sanity:cams
npm run sanity:quests
npm run seed:test
```

---

## Troubleshooting
- White screen on production:
  - Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Netlify env.
  - If missing, the app shows the `EnvMissing` screen (by design) instead of crashing.
- Dev fails on Windows/OneDrive with EPERM:
  - Mitigated by `cacheDir` change; if encountered, delete `.vite-cache` and restart.
- Map not loading:
  - Ensure `VITE_MAPBOX_TOKEN` or provide `VITE_MAPLIBRE_STYLE_URL`.
- Realtime in Netlify Edge Functions:
  - Not supported; rely on standard serverless/client-side Supabase.

---

## Performance & Bundle Notes
- Large vendor chunks (Mapbox/MapLibre, Supabase) produce size warnings but build is healthy.
- Potential improvements:
  - Lazy-load map libraries on non-map routes
  - Fine-tune manual chunking in Vite Rollup config

---

## Next Steps (Optional)
- Monitor Netlify deploy of commit `571b495`; validate https://chesscompanions.app
- Add CI check to fail build if `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are missing
- Further mobile responsive polish on org/master dashboards (collapsible panels, sticky tabs)
- Code splitting for map routes to improve initial TTI

---

## Key Files
- App shell/routing: `src/App.tsx`, `src/main.tsx`
- Auth: `src/contexts/AuthContext.tsx`, `src/components/ProtectedRoute.tsx`, `src/components/auth/OnboardingGate.tsx`
- Supabase client: `src/lib/supabase.ts`
- Maps: `src/components/MapView.tsx`, `src/components/SpritesOverlay.tsx`, `src/components/BubbleMarker.tsx`
- UI: `src/components/ui/MobileNav.tsx`, `src/components/GlassContainer.tsx`
- Diagnostics: `src/pages/admin/SystemDiagnostics.tsx`
- Netlify config: `netlify.toml`, `public/_redirects`
- Functions (examples): `netlify/functions/*.ts`
- Build tooling: `vite.config.ts`, `tailwind.config.js`

If you want me to validate the live deploy or configure Netlify env variables, I can handle that next.
