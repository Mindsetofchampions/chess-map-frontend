
-- Add metadata column to platform_ledger if missing (after all policy drops)
ALTER TABLE public.platform_ledger
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
