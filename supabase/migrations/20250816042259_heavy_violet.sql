/*
  # Create Core Enums

  1. Database Enums
    - `user_role` (master_admin, org_admin, staff, student)
    - `quest_type` (mcq, text, video)
    - `quest_status` (draft, submitted, approved, rejected, archived)
    - `submission_status` (pending, accepted, rejected, autograded)
    - `persona_key` (hootie, kittykat, gino, hammer, badge)

  2. Security
    - No RLS needed for enum types
    - Enums are global database objects
*/

-- Create user role enum if it doesn't exist
DO $CREATE_USER_ROLE$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('master_admin', 'org_admin', 'staff', 'student');
  END IF;
END $CREATE_USER_ROLE$;

-- Create quest type enum if it doesn't exist
DO $CREATE_QUEST_TYPE$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quest_type') THEN
    CREATE TYPE quest_type AS ENUM ('mcq', 'text', 'video');
  END IF;
END $CREATE_QUEST_TYPE$;

-- Create quest status enum if it doesn't exist
DO $CREATE_QUEST_STATUS$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quest_status') THEN
    CREATE TYPE quest_status AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'archived');
  END IF;
END $CREATE_QUEST_STATUS$;

-- Create submission status enum if it doesn't exist
DO $CREATE_SUBMISSION_STATUS$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_status') THEN
    CREATE TYPE submission_status AS ENUM ('pending', 'accepted', 'rejected', 'autograded');
  END IF;
END $CREATE_SUBMISSION_STATUS$;

-- Create persona key enum if it doesn't exist
DO $CREATE_PERSONA_KEY$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'persona_key') THEN
    CREATE TYPE persona_key AS ENUM ('hootie', 'kittykat', 'gino', 'hammer', 'badge');
  END IF;
END $CREATE_PERSONA_KEY$;