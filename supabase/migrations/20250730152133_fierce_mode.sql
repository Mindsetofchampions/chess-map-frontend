/*
  # Complete User Management System

  1. Database Setup
    - Enable pgcrypto extension for UUID generation
    - Create users and admins tables with proper relationships
    - Implement cascade deletion and constraints

  2. Security Implementation
    - Enable Row Level Security (RLS) on users table
    - Create 4 specific policies for user and admin access
    - Ensure proper authentication and authorization

  3. Automation System
    - handle_new_user() trigger for automatic user creation
    - handle_updated_at() trigger for timestamp management
    - Automatic admin table population based on roles

  4. Data Seeding
    - Master admin account creation
    - Conflict handling for existing records
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table with proper constraints
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'student',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT users_role_check CHECK (role IN ('student', 'admin', 'master_admin'))
);

-- Create admins table for role-based access control
CREATE TABLE IF NOT EXISTS admins (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;

-- Create RLS policies for users table
CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage users"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  );

-- Create trigger function for handling new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_email text;
  user_role text;
BEGIN
  -- Extract email from the new auth user
  user_email := NEW.email;
  
  -- Extract role from raw_user_meta_data, default to 'student'
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  
  -- Ensure role is valid
  IF user_role NOT IN ('student', 'admin', 'master_admin') THEN
    user_role := 'student';
  END IF;
  
  -- Insert into users table
  INSERT INTO users (id, email, role, created_at, updated_at)
  VALUES (NEW.id, user_email, user_role, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    updated_at = NOW();
  
  -- If user is admin or master_admin, add to admins table
  IF user_role IN ('admin', 'master_admin') THEN
    INSERT INTO admins (user_id, created_at)
    VALUES (NEW.id, NOW())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers to ensure clean state
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_users_updated_at ON users;

-- Create trigger for automatic user creation when auth user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create trigger for automatic timestamp updates
CREATE TRIGGER handle_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Seed master admin account
DO $$
DECLARE
  master_admin_id uuid;
BEGIN
  -- Check if master admin already exists in auth.users
  SELECT id INTO master_admin_id
  FROM auth.users
  WHERE email = 'master_admin@test.com';
  
  -- If not found, insert into auth.users first
  IF master_admin_id IS NULL THEN
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
      crypt('Master123!', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"role": "master_admin", "email_verified": true}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO master_admin_id;
  ELSE
    -- Update existing user's metadata to ensure role is set
    UPDATE auth.users
    SET 
      raw_user_meta_data = '{"role": "master_admin", "email_verified": true}',
      updated_at = NOW()
    WHERE id = master_admin_id;
  END IF;
  
  -- Insert or update in users table
  INSERT INTO users (id, email, role, created_at, updated_at)
  VALUES (master_admin_id, 'master_admin@test.com', 'master_admin', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    role = 'master_admin',
    updated_at = NOW();
  
  -- Insert into admins table
  INSERT INTO admins (user_id, created_at)
  VALUES (master_admin_id, NOW())
  ON CONFLICT (user_id) DO NOTHING;
  
END $$;