# Supabase Edge Functions (helper)

This folder contains Deno-based Edge Functions used by the project. The local `tsconfig.json` helps editors avoid false positives.

Deployment (recommended):

1. Install Supabase CLI and ensure Docker is running (Windows: Docker Desktop).
2. From the repository root run:

```bash
npx supabase functions deploy send_onboarding_notification --project-ref <ref>
npx supabase functions deploy process_notifications --project-ref <ref>
```

3. Set secrets for the functions (either in Supabase dashboard or via CLI). Required secrets:

- RESEND_API_KEY (optional if using Resend)
- SENDGRID_API_KEY (fallback if not using Resend)
- FROM_EMAIL (the verified sender email/domain)
- SUPABASE_URL (project URL) - often already set by Supabase
- SUPABASE_SERVICE_ROLE_KEY (service role key for internal calls)

Example CLI to set secrets:

```bash
npx supabase secrets set RESEND_API_KEY="..." SENDGRID_API_KEY="..." FROM_EMAIL="no-reply@yourdomain.com" --project-ref <ref>
```

Windows tips:

- Ensure Docker Desktop is installed and running before using the Supabase CLI local dev or deploy commands.
- Run the `deploy.sh` script from Git Bash or WSL so `npx` and the shell behave consistently.

If you cannot run the CLI locally, deploy via the Supabase dashboard Functions page and add the same secrets there.
