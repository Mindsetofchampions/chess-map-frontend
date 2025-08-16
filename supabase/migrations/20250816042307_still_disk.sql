/*
  # Create Core Tables

  1. New Tables
    - `users` - User profiles with roles
    - `admins` - Master admin users
    - `attributes` - Educational attributes
    - `organizations` - Organizations and groups
    - `profiles` - Extended user profiles
    - `allowlisted_domains` - Email domain allowlist

  2. Security
    - Enable RLS on all user-facing tables
    - Add policies for role-based access control
    - Ensure proper foreign key constraints
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text DEFAULT 'student' NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT users_role_check CHECK (role = ANY (ARRAY['student'::text, 'admin'::text, 'master_admin'::text]))
);

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create attributes table
CREATE TABLE IF NOT EXISTS attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  icon_url text,
  created_at timestamptz DEFAULT now()
);

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  role user_role DEFAULT 'student' NOT NULL,
  org_id uuid REFERENCES organizations(id),
  created_at timestamptz DEFAULT now()
);

-- Create allowlisted domains table
CREATE TABLE IF NOT EXISTS allowlisted_domains (
  domain text PRIMARY KEY,
  label text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on user-facing tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY IF NOT EXISTS "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (uid() = id)
  WITH CHECK (uid() = id);

CREATE POLICY IF NOT EXISTS "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = uid()
  ));

CREATE POLICY IF NOT EXISTS "Admins can manage users"
  ON users FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = uid()
  ));

-- Create RLS policies for admins table
CREATE POLICY IF NOT EXISTS "Allow users to view own admin record"
  ON admins FOR SELECT
  TO authenticated
  USING (user_id = uid());

-- Create RLS policies for attributes table
CREATE POLICY IF NOT EXISTS "Public view attributes"
  ON attributes FOR SELECT
  TO public
  USING (true);

CREATE POLICY IF NOT EXISTS "Admins manage attributes"
  ON attributes FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = uid()
  ));

-- Create RLS policies for profiles table
CREATE POLICY IF NOT EXISTS "profiles_self_or_admin"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    user_id = uid() OR 
    EXISTS (
      SELECT 1 FROM memberships am
      WHERE am.user_id = uid() 
      AND (am.role = 'master_admin'::user_role OR 
           (am.role = 'org_admin'::user_role AND am.org_id = profiles.org_id))
    )
  );

CREATE POLICY IF NOT EXISTS "Profiles: insert own row"
  ON profiles FOR INSERT
  TO public
  WITH CHECK (user_id = uid());

CREATE POLICY IF NOT EXISTS "Profiles: update own row"
  ON profiles FOR UPDATE
  TO public
  USING (user_id = uid())
  WITH CHECK (user_id = uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON profiles(org_id);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);