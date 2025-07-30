/*
  # Create Users and Admins Management System

  1. Database Setup
    - Enable pgcrypto extension for UUID generation
    - Create users table with proper authentication references
    - Create admins table for role-based access control

  2. Security Implementation
    - Enable Row Level Security (RLS) on users table
    - Create policies for user profile access and admin management
    - Implement proper foreign key relationships with cascade deletion

  3. Automation
    - Create trigger functions for automatic user creation from auth.users
    - Implement automatic updated_at timestamp management
    - Set up triggers for seamless user management

  4. Data Seeding
    - Insert master admin account for initial system access
    - Handle conflicts gracefully for existing records
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table with proper structure and constraints
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'student',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraint to ensure only valid roles are allowed
  CONSTRAINT users_role_check CHECK (role IN ('student', 'admin', 'master_admin'))
);

-- Create admins table for role-based access control
CREATE TABLE IF NOT EXISTS admins (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
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

-- Create trigger function for automatic user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
  user_role text;
  user_email text;
BEGIN
  -- Extract role from user metadata, default to 'student'
  user_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    NEW.user_metadata->>'role',
    'student'
  );
  
  -- Extract email
  user_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email');
  
  -- Insert into users table
  INSERT INTO users (id, email, role, created_at, updated_at)
  VALUES (
    NEW.id,
    user_email,
    user_role,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
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
$$;

-- Create trigger function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_users_updated_at ON users;

-- Create trigger for automatic user creation when auth user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create trigger for automatic updated_at timestamp management
CREATE TRIGGER handle_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Seed master admin account
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  user_metadata,
  confirmation_token,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(),
  'master_admin@test.com',
  crypt('Master123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"role": "master_admin", "email_verified": true}'::jsonb,
  '{"role": "master_admin"}'::jsonb,
  '',
  '',
  ''
) ON CONFLICT (email) DO UPDATE SET
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  user_metadata = EXCLUDED.user_metadata,
  updated_at = NOW();

-- Insert corresponding users table record for master admin
INSERT INTO users (
  id,
  email,
  role,
  created_at,
  updated_at
) 
SELECT 
  id,
  email,
  'master_admin',
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'master_admin@test.com'
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  updated_at = NOW();

-- Insert into admins table for master admin
INSERT INTO admins (
  user_id,
  created_at
)
SELECT 
  id,
  NOW()
FROM auth.users 
WHERE email = 'master_admin@test.com'
ON CONFLICT (user_id) DO NOTHING;