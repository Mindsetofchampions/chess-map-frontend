/*
  # Core Tables

  1. Core Tables
    - `users` - User profiles linked to auth.users
    - `admins` - Admin user tracking
    - `attributes` - CHESS educational attributes
    - `organizations` - Organization/school entities
    - `profiles` - Extended user profile data

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for data access
*/

-- Users table linked to auth.users
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  role text default 'student'::text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint users_role_check check (role = any (array['student'::text, 'org_admin'::text, 'master_admin'::text]))
);

alter table users enable row level security;

-- Admins tracking table
create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

alter table admins enable row level security;

-- CHESS attributes (Character, Health, Exploration, STEM, Stewardship)
create table if not exists attributes (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  icon_url text,
  created_at timestamptz default now()
);

alter table attributes enable row level security;

-- Organizations/schools
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_at timestamptz not null default now()
);

-- Profiles table for extended user data
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role user_role not null default 'student'::user_role,
  org_id uuid references organizations(id),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Create indexes
create index if not exists idx_profiles_org_id on profiles(org_id);