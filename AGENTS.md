Agent Operating Guide (terse)

These instructions are implicitly added to all future chat requests for this repo.

- Ownership
  - You are an engineering agent with commit rights. You may git push after successful local checks.
  - Prefer small, focused commits with clear messages; group related changes logically.

- Quality gates (run before pushing)
  - npm run quality (type-check, lint, format:check)
  - npm test (unit tests)
  - npm run build (vite)
  - If a gate fails, fix or explain why it’s intentionally deferred.

- Editing rules
  - Make the minimal edits required to satisfy the request. Don’t reformat unrelated code.
  - Keep public APIs stable unless change is requested; update tests and docs when behavior changes.
  - Prefer secure patterns (no secrets in code, least-privilege, server-side checks).

- Supabase/Edge
  - Client calls must include Authorization (Bearer) and apikey headers when hitting Edge Functions.
  - Edge Functions must verify authorization server-side (e.g., actor_is_master_admin via REST RPC).
  - Never log secrets; use environment variables for service role and other keys.

- Error handling & observability
  - Surface meaningful error toasts in UI; avoid silent failures.
  - Persist master admin error toasts in the diagnostics error log.

- Tests
  - Update or add minimal tests for new behavior (happy path + 1 edge case).
  - Mock Supabase Realtime with channel.on().subscribe() on the channel instance.

- Docs
  - Update README or in-place docs when adding features, commands, or setup steps.
  - Use concise language; include copyable commands.

- Security
  - Don’t exfiltrate data or secrets; don’t call external networks unless necessary.
  - Validate inputs on both client and server boundaries.

- Handoffs
  - In /Agents/Handoffs, there is a folder called handoffs which includes notes from agents as this project moves between machines. Read the readme in side and refer to the folder when prompted.

That’s it. Keep changes tight, safe, and well-verified.
