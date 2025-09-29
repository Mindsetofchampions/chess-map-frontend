-- Ensure org_id exists on safe_spaces and store_items before indexing
-- This migration is safe: it adds the column if missing and leaves data null; index creation occurs in later migration.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'safe_spaces' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.safe_spaces ADD COLUMN org_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'store_items' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.store_items ADD COLUMN org_id uuid;
  END IF;
END $$;
