/*
  # Create Quest System Tables

  1. New Tables
    - `quest_templates` - Template definitions for quests
    - `quests` - Active quest instances
    - `quest_submissions` - User quest submissions
    - `quest_evidence` - Evidence uploads for quests

  2. Security
    - Enable RLS on all quest tables
    - Add policies for role-based quest access
    - Ensure submission isolation per user
*/

-- Create quest templates table
CREATE TABLE IF NOT EXISTS quest_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id uuid REFERENCES attributes(id) ON DELETE CASCADE,
  type text NOT NULL,
  question text NOT NULL,
  options jsonb,
  answer jsonb,
  created_at timestamptz DEFAULT now(),
  org_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  description text,
  difficulty integer DEFAULT 1,
  media_type text DEFAULT 'none',
  media_url text,
  is_active boolean DEFAULT true,
  CONSTRAINT quest_templates_type_check CHECK (
    type = ANY (ARRAY['mcq'::text, 'true_false'::text, 'fill_blank'::text, 'text_response'::text, 'ticket'::text])
  )
);

-- Create quests table
CREATE TABLE IF NOT EXISTS quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES quest_templates(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  attribute_id uuid REFERENCES attributes(id) ON DELETE SET NULL,
  coins integer DEFAULT 0 NOT NULL,
  location geography(Point,4326),
  start_time timestamptz,
  end_time timestamptz,
  created_at timestamptz DEFAULT now(),
  config jsonb DEFAULT '{}' NOT NULL,
  qtype quest_type DEFAULT 'mcq' NOT NULL,
  status quest_status DEFAULT 'draft' NOT NULL,
  active boolean DEFAULT true NOT NULL,
  reward_coins integer DEFAULT 0 NOT NULL
);

-- Create quest submissions table
CREATE TABLE IF NOT EXISTS quest_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status submission_status DEFAULT 'pending' NOT NULL,
  mcq_choice text,
  text_answer text,
  video_url text,
  score integer,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(quest_id, user_id)
);

-- Create quest evidence table
CREATE TABLE IF NOT EXISTS quest_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id uuid NOT NULL,
  url text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on all quest tables
ALTER TABLE quest_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_evidence ENABLE ROW LEVEL SECURITY;

-- Quest templates policies
CREATE POLICY IF NOT EXISTS "qt_select_by_org"
  ON quest_templates FOR SELECT
  TO authenticated
  USING (
    org_id IS NULL OR 
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = uid() 
      AND (m.org_id = quest_templates.org_id OR 
           m.role = 'org_admin'::user_role OR 
           m.role = 'master_admin'::user_role)
    )
  );

CREATE POLICY IF NOT EXISTS "Admins manage templates"
  ON quest_templates FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = uid()
  ));

-- Quests policies
CREATE POLICY IF NOT EXISTS "quests: select by role"
  ON quests FOR SELECT
  TO public
  USING (
    (status = 'approved'::quest_status AND active = true) OR 
    (role_rank(actor_role()) >= role_rank('org_admin'::user_role))
  );

CREATE POLICY IF NOT EXISTS "quests: master update any"
  ON quests FOR UPDATE
  TO public
  USING (role_rank(actor_role()) >= role_rank('master_admin'::user_role))
  WITH CHECK (role_rank(actor_role()) >= role_rank('master_admin'::user_role));

CREATE POLICY IF NOT EXISTS "Admins manage quests"
  ON quests FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = uid()
  ));

-- Quest submissions policies
CREATE POLICY IF NOT EXISTS "subs: insert own"
  ON quest_submissions FOR INSERT
  TO public
  WITH CHECK (user_id = uid());

CREATE POLICY IF NOT EXISTS "subs: select own or staff+"
  ON quest_submissions FOR SELECT
  TO public
  USING (
    user_id = uid() OR 
    role_rank(actor_role()) >= role_rank('staff'::user_role)
  );

CREATE POLICY IF NOT EXISTS "subs: update own pending or staff+"
  ON quest_submissions FOR UPDATE
  TO public
  USING (
    (user_id = uid() AND status = 'pending'::submission_status) OR 
    role_rank(actor_role()) >= role_rank('staff'::user_role)
  )
  WITH CHECK (true);

-- Quest evidence policies
CREATE POLICY IF NOT EXISTS "qe_insert_self"
  ON quest_evidence FOR INSERT
  TO authenticated
  WITH CHECK (user_id = uid());

CREATE POLICY IF NOT EXISTS "qe_select_self"
  ON quest_evidence FOR SELECT
  TO authenticated
  USING (user_id = uid());

CREATE POLICY IF NOT EXISTS "qe_admin_read_all"
  ON quest_evidence FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = uid() AND u.role = 'master_admin'::text
    ) OR
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = uid() AND m.role = 'org_admin'::user_role
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quest_templates_org_id ON quest_templates(org_id);
CREATE INDEX IF NOT EXISTS ix_quests_status_active ON quests(status, active);
CREATE INDEX IF NOT EXISTS ix_submissions_user_status ON quest_submissions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_quest_evidence_user_time ON quest_evidence(user_id, created_at DESC);