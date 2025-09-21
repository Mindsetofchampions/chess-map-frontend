/*
  # User Management System with Authentication and Authorization

  This migration establishes the complete user management system for the CHESS Map application.

  ## 1. New Tables
  
  ### users
  - `id` (uuid, primary key) - References auth.users(id) with cascade deletion
  - `email` (text, unique, not null) - User email address
  - `role` (text, not null, default 'student') - User role with constraint
  - `created_at` (timestamptz, default now()) - Account creation timestamp
  - `updated_at` (timestamptz, default now()) - Last modification timestamp

  ### admins
  - `user_id` (uuid, primary key) - References users(id) with cascade deletion
  - `created_at` (timestamptz, default now()) - Admin assignment timestamp

  ## 2. Security

  ### Row Level Security
  - Enable RLS on users table
  - Four comprehensive policies:
    1. Users can view own profile
    2. Users can update own profile  
    3. Admins can view all users
    4. Admins can manage users (full CRUD)

  ## 3. Automation

  ### Trigger Functions
  - `handle_new_user()` - Automatically creates user record when auth.users entry is created
  - `handle_updated_at()` - Automatically updates timestamp on user modifications

  ### Triggers
  - Auto-create user records from auth.users
  - Auto-update timestamps on user changes

  ## 4. Data Seeding
  - Master admin account (master_admin@test.com)
  - Proper conflict handling for existing records
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table with comprehensive structure
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'student',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Role constraint
  CONSTRAINT users_role_check CHECK (role IN ('student', 'org_admin', 'master_admin'))
);

-- Create admins table for role-based access control
CREATE TABLE IF NOT EXISTS public.admins (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean slate
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users" ON public.users;

-- Create RLS policies for users table

-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 2: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 3: Admins can view all users
CREATE POLICY "Admins can view all users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE admins.user_id = auth.uid()
    )
  );

-- Policy 4: Admins can manage all users (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage users"
  ON public.users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE admins.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE admins.user_id = auth.uid()
    )
  );

-- Create trigger function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Extract user data from auth.users
  INSERT INTO public.users (id, email, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NOW(),
    NOW()
  );

  -- If user is admin or master_admin, add to admins table
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'student') IN ('org_admin', 'master_admin') THEN
    INSERT INTO public.admins (user_id, created_at)
    VALUES (NEW.id, NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for updated_at timestamp
DROP TRIGGER IF EXISTS handle_users_updated_at ON public.users;
CREATE TRIGGER handle_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Seed master admin account
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'master_admin@test.com',
  crypt('admin123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"master_admin"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO UPDATE SET
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = NOW();

-- Insert corresponding user record for master admin
INSERT INTO public.users (id, email, role, created_at, updated_at)
SELECT 
  auth.users.id,
  'master_admin@test.com',
  'master_admin',
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'master_admin@test.com'
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  updated_at = NOW();

-- Insert admin record for master admin
INSERT INTO public.admins (user_id, created_at)
SELECT 
  auth.users.id,
  NOW()
FROM auth.users 
WHERE email = 'master_admin@test.com'
ON CONFLICT (user_id) DO NOTHING;