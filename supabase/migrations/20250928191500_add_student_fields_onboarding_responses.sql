-- Add basic student profile fields to onboarding_responses
-- Captures student_name, student_age, and student_school during student onboarding

BEGIN;

ALTER TABLE IF EXISTS public.onboarding_responses
  ADD COLUMN IF NOT EXISTS student_name text,
  ADD COLUMN IF NOT EXISTS student_age integer,
  ADD COLUMN IF NOT EXISTS student_school text;

-- Optional: simple sanity check for age
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'onboarding_responses_student_age_nonneg'
  ) THEN
    ALTER TABLE public.onboarding_responses
      ADD CONSTRAINT onboarding_responses_student_age_nonneg CHECK (student_age IS NULL OR student_age >= 0);
  END IF;
END $$;

COMMIT;
