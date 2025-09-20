-- Ensure safe_spaces and store_items have expected columns before index creation
DO $$ BEGIN
  -- safe_spaces columns
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='safe_spaces') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='safe_spaces' AND column_name='grade_level') THEN
      ALTER TABLE public.safe_spaces ADD COLUMN grade_level text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='safe_spaces' AND column_name='contact_info') THEN
      ALTER TABLE public.safe_spaces ADD COLUMN contact_info jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='safe_spaces' AND column_name='approved') THEN
      ALTER TABLE public.safe_spaces ADD COLUMN approved boolean DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='safe_spaces' AND column_name='approved_by') THEN
      ALTER TABLE public.safe_spaces ADD COLUMN approved_by uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='safe_spaces' AND column_name='approved_at') THEN
      ALTER TABLE public.safe_spaces ADD COLUMN approved_at timestamptz;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='safe_spaces' AND column_name='created_by') THEN
      ALTER TABLE public.safe_spaces ADD COLUMN created_by uuid DEFAULT auth.uid();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='safe_spaces' AND column_name='created_at') THEN
      ALTER TABLE public.safe_spaces ADD COLUMN created_at timestamptz DEFAULT now();
    END IF;
  END IF;

  -- store_items columns
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='store_items') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='store_items' AND column_name='org_id') THEN
      ALTER TABLE public.store_items ADD COLUMN org_id uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='store_items' AND column_name='title') THEN
      ALTER TABLE public.store_items ADD COLUMN title text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='store_items' AND column_name='price_coins') THEN
      ALTER TABLE public.store_items ADD COLUMN price_coins integer DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='store_items' AND column_name='created_by') THEN
      ALTER TABLE public.store_items ADD COLUMN created_by uuid DEFAULT auth.uid();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='store_items' AND column_name='created_at') THEN
      ALTER TABLE public.store_items ADD COLUMN created_at timestamptz DEFAULT now();
    END IF;
  END IF;
END $$;
