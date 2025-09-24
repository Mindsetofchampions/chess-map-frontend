#!/usr/bin/env bash
set -euo pipefail

# Usage: ./deploy.sh [project-ref]
# If your Supabase CLI is already linked (supabase link), you can omit the ref.

REF="${1-}"
REF_ARG=()
if [ -n "$REF" ]; then
  REF_ARG=(--project-ref "$REF")
fi

echo "Deploying send_onboarding_notification..."
npx supabase functions deploy send_onboarding_notification "${REF_ARG[@]}"

echo "Deploying process_notifications..."
npx supabase functions deploy process_notifications "${REF_ARG[@]}"

echo "Deploying admin_create_user..."
npx supabase functions deploy admin_create_user "${REF_ARG[@]}"

echo "Deploying admin_generate_link..."
npx supabase functions deploy admin_generate_link "${REF_ARG[@]}"

echo "Deploying admin_set_password..."
npx supabase functions deploy admin_set_password "${REF_ARG[@]}"

echo "Deploying admin_delete_user..."
npx supabase functions deploy admin_delete_user "${REF_ARG[@]}"

if [ -n "$REF" ]; then
  echo "Done. To set secrets run:
npx supabase secrets set RESEND_API_KEY=... SENDGRID_API_KEY=... FROM_EMAIL=... SUPABASE_SERVICE_ROLE_KEY=... ALLOWED_REDIRECT_HOSTS=chesscompanions.app,www.chesscompanions.app --project-ref $REF"
else
  echo "Done. To set secrets run:
npx supabase secrets set RESEND_API_KEY=... SENDGRID_API_KEY=... FROM_EMAIL=... SUPABASE_SERVICE_ROLE_KEY=... ALLOWED_REDIRECT_HOSTS=chesscompanions.app,www.chesscompanions.app"
fi
