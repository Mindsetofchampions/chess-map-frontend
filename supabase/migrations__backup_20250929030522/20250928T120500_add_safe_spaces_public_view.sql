-- Create a safe public view for safe spaces with derived logo_url
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='safe_spaces' AND column_name='contact_info'
  ) THEN
    ALTER TABLE public.safe_spaces ADD COLUMN contact_info jsonb;
  END IF;
  -- Some environments may be missing the address column; add it defensively
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='safe_spaces' AND column_name='address'
  ) THEN
    ALTER TABLE public.safe_spaces ADD COLUMN address text;
  END IF;
END $$;

-- Ensure contact_info is a JSON object by default (avoid null->> access errors)
ALTER TABLE public.safe_spaces ALTER COLUMN contact_info SET DEFAULT '{}'::jsonb;
UPDATE public.safe_spaces SET contact_info = '{}'::jsonb WHERE contact_info IS NULL;

-- Create or replace the view exposing address and a best-effort logo_url
CREATE OR REPLACE VIEW public.v_safe_spaces_public AS
SELECT
  id,
  name,
  description,
  address,
  lat,
  lng,
  approved,
  COALESCE(
    NULLIF(contact_info->>'logo_url', ''),
    NULLIF(contact_info->>'image_url', ''),
    NULLIF((contact_info->'branding')::jsonb->>'logo_url', '')
  ) AS logo_url
FROM public.safe_spaces;

GRANT SELECT ON public.v_safe_spaces_public TO anon, authenticated;
