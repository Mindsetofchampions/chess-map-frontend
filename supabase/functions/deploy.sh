#!/usr/bin/env bash
set -euo pipefail

if [ -z "${1-}" ]; then
  echo "Usage: $0 <project-ref>"
  exit 2
fi
REF="$1"

echo "Deploying send_onboarding_notification..."
npx supabase functions deploy send_onboarding_notification --project-ref "$REF"

echo "Deploying process_notifications..."
npx supabase functions deploy process_notifications --project-ref "$REF"

echo "Done. To set secrets run:
npx supabase secrets set RESEND_API_KEY=... SENDGRID_API_KEY=... FROM_EMAIL=... --project-ref $REF"
