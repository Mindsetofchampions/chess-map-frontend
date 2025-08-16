/*
  # Create Additional System Tables

  1. New Tables
    - `memberships` - Organization memberships
    - `mc_questions` - Multiple choice questions
    - `mcq_answers` - MCQ answer records
    - `safe_spaces` - Safe learning spaces
    - `events` - Educational events
    - `video_resources` - Video learning resources
    - `store_items` - Store inventory
    - `store_orders` - Purchase history
    - `personas` - Character personas
    - `app_defaults` - Application defaults
    - `app_routes` - Route definitions
    - `audit_role_changes` - Role change audit log
    - `analytics_logs` - User analytics

  2. Security
    - Enable RLS on all tables
    - Add appropriate access policies
*/

-- Create memberships table
CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  UNIQUE(user_id, org_id),
  CONSTRAINT memberships_role_check CHECK (
    role = ANY (ARRAY['org_admin'::user_role, 'staff'::user_role, 'student'::user_role])
  )
);

-- Create multiple choice questions table
CREATE TABLE IF NOT EXISTS mc_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES quest_templates(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  choices jsonb NOT NULL,
  correct_key text NOT NULL,
  org_id uuid REFERENCES organizations(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  persona_key text,
  difficulty text DEFAULT 'easy',
  tags text[] DEFAULT ARRAY[]::text[],
  CONSTRAINT mc_questions_difficulty_check CHECK (
    difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text])
  )
);

-- Create MCQ answers table
CREATE TABLE IF NOT EXISTS mcq_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mcq_id uuid NOT NULL REFERENCES mc_questions(id) ON DELETE CASCADE,
  is_correct boolean NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create safe spaces table
CREATE TABLE IF NOT EXISTS safe_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  location geography(Point,4326),
  created_at timestamptz DEFAULT now()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  attribute_id uuid REFERENCES attributes(id) ON DELETE SET NULL,
  location geography(Point,4326),
  start_time timestamptz,
  end_time timestamptz,
  total_tickets integer,
  created_at timestamptz DEFAULT now(),
  org_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  lat double precision,
  lng double precision,
  starts_at timestamptz,
  url text,
  persona_key text
);

-- Create video resources table
CREATE TABLE IF NOT EXISTS video_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_key text NOT NULL,
  title text NOT NULL,
  video_url text NOT NULL,
  source text NOT NULL,
  org_id uuid REFERENCES organizations(id),
  fetched_at timestamptz DEFAULT now() NOT NULL
);

-- Create store items table
CREATE TABLE IF NOT EXISTS store_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  price bigint NOT NULL,
  inventory integer DEFAULT 0 NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT store_items_price_check CHECK (price >= 0),
  CONSTRAINT store_items_inventory_check CHECK (inventory >= 0)
);

-- Create store orders table
CREATE TABLE IF NOT EXISTS store_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES store_items(id),
  qty integer NOT NULL,
  total_price bigint NOT NULL,
  status text DEFAULT 'completed' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT store_orders_qty_check CHECK (qty > 0),
  CONSTRAINT store_orders_total_price_check CHECK (total_price >= 0)
);

-- Create personas table
CREATE TABLE IF NOT EXISTS personas (
  key persona_key PRIMARY KEY,
  label text NOT NULL,
  sprite_path text UNIQUE NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT personas_sprite_format CHECK (
    sprite_path ~* '^/personas/[a-z0-9_]+\.gif$'::text
  ),
  CONSTRAINT personas_sprite_matches_key CHECK (
    split_part(split_part(sprite_path, '/personas/'::text, 2), '.gif'::text, 1) = key::text
  )
);

-- Create app defaults table
CREATE TABLE IF NOT EXISTS app_defaults (
  role user_role PRIMARY KEY,
  home_path text NOT NULL REFERENCES app_routes(path)
);

-- Create app routes table
CREATE TABLE IF NOT EXISTS app_routes (
  path text PRIMARY KEY,
  label text NOT NULL,
  min_role user_role NOT NULL
);

-- Create audit role changes table
CREATE TABLE IF NOT EXISTS audit_role_changes (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  changed_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_user_id uuid,
  old_role user_role,
  new_role user_role,
  reason text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create analytics logs table
CREATE TABLE IF NOT EXISTS analytics_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcq_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE safe_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_role_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_logs ENABLE ROW LEVEL SECURITY;

-- Memberships policies
CREATE POLICY IF NOT EXISTS "memberships_self_or_admin"
  ON memberships FOR SELECT
  TO authenticated
  USING (
    user_id = uid() OR 
    EXISTS (
      SELECT 1 FROM memberships am
      WHERE am.user_id = uid() 
      AND (am.role = 'master_admin'::user_role OR 
           (am.role = 'org_admin'::user_role AND am.org_id = memberships.org_id))
    )
  );

-- MC questions policies
CREATE POLICY IF NOT EXISTS "mcq_select_by_org"
  ON mc_questions FOR SELECT
  TO authenticated
  USING (
    org_id IS NULL OR 
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = uid() AND m.org_id = mc_questions.org_id
    )
  );

-- MCQ answers policies
CREATE POLICY IF NOT EXISTS "mcqa_select_self"
  ON mcq_answers FOR SELECT
  TO authenticated
  USING (user_id = uid());

CREATE POLICY IF NOT EXISTS "mcqa_insert_self"
  ON mcq_answers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = uid());

-- Safe spaces policies
CREATE POLICY IF NOT EXISTS "Public view safe_spaces"
  ON safe_spaces FOR SELECT
  TO public
  USING (true);

CREATE POLICY IF NOT EXISTS "Admins manage safe_spaces"
  ON safe_spaces FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = uid()
  ));

-- Events policies
CREATE POLICY IF NOT EXISTS "Public view events"
  ON events FOR SELECT
  TO public
  USING (true);

CREATE POLICY IF NOT EXISTS "Admins manage events"
  ON events FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = uid()
  ));

-- Personas policies
CREATE POLICY IF NOT EXISTS "personas: select (jwt authed)"
  ON personas FOR SELECT
  TO public
  USING (uid() IS NOT NULL);

-- App routes policies
CREATE POLICY IF NOT EXISTS "app_routes: role >= min_role"
  ON app_routes FOR SELECT
  TO public
  USING (actor_at_least(min_role));

-- Analytics policies
CREATE POLICY IF NOT EXISTS "Allow users to insert own analytics logs"
  ON analytics_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = uid());

CREATE POLICY IF NOT EXISTS "Admins manage analytics"
  ON analytics_logs FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = uid()
  ));

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_mc_questions_org_id ON mc_questions(org_id);
CREATE INDEX IF NOT EXISTS idx_mcq_persona_diff ON mc_questions(persona_key, difficulty);
CREATE INDEX IF NOT EXISTS idx_mcq_answers_user_time ON mcq_answers(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_org_id ON events(org_id);
CREATE INDEX IF NOT EXISTS idx_events_org_time ON events(org_id, start_time);
CREATE INDEX IF NOT EXISTS idx_video_resources_org_id ON video_resources(org_id);
CREATE INDEX IF NOT EXISTS idx_video_resources_persona ON video_resources(persona_key);
CREATE INDEX IF NOT EXISTS store_items_org ON store_items(org_id);
CREATE INDEX IF NOT EXISTS store_orders_user_time ON store_orders(user_id, created_at DESC);