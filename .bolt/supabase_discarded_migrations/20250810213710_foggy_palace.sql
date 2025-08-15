/*
  # Create quest bubbles and enhanced quests schema

  1. New Tables
    - `quest_bubbles` - Interactive map bubbles for quests
      - `id` (uuid, primary key)
      - `quest_id` (uuid, foreign key to quests)
      - `category` (text, CHESS attribute category)
      - `position` (jsonb, screen coordinates)
      - `coordinates` (geography, map coordinates)
      - `sprite_url` (text, character sprite path)
      - `character_name` (text, CHESS character name)
      - `is_active` (boolean, bubble visibility)
      - `created_at` (timestamp)

  2. Enhanced Tables
    - Update `quests` table with CHESS categories
    - Add category field for quest organization
    - Add bubble-specific metadata

  3. Security
    - Enable RLS on all new tables
    - Add policies for public viewing and admin management

  4. Sample Data
    - Insert Philadelphia CHESS quest examples
    - Create sample bubbles for each category
*/

-- Add CHESS category to quests table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quests' AND column_name = 'category'
  ) THEN
    ALTER TABLE quests ADD COLUMN category text;
  END IF;
END $$;

-- Add check constraint for quest categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'quests_category_check'
  ) THEN
    ALTER TABLE quests ADD CONSTRAINT quests_category_check 
    CHECK (category IN ('character', 'health', 'exploration', 'stem', 'stewardship', 'safe_space', 'event'));
  END IF;
END $$;

-- Create quest_bubbles table
CREATE TABLE IF NOT EXISTS quest_bubbles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid REFERENCES quests(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('character', 'health', 'exploration', 'stem', 'stewardship', 'safe_space', 'event')),
  position jsonb NOT NULL DEFAULT '{}',
  coordinates geography(Point,4326),
  sprite_url text,
  character_name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE quest_bubbles ENABLE ROW LEVEL SECURITY;

-- Policies for quest_bubbles
CREATE POLICY "Public can view active bubbles"
  ON quest_bubbles
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage bubbles"
  ON quest_bubbles
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admins WHERE admins.user_id = uid()
  ));

-- Insert sample Philadelphia CHESS quests
INSERT INTO quests (title, description, category, coins, location) VALUES
  (
    'Liberty Bell Character Challenge',
    'Learn about honesty and integrity through the story of the Liberty Bell with Hootie the Owl.',
    'character',
    100,
    ST_SetSRID(ST_MakePoint(-75.1502, 39.9496), 4326)
  ),
  (
    'Schuylkill River Fitness Trail',
    'Complete wellness challenges with Brenda the Cat along Philadelphia''s scenic river trail.',
    'health',
    75,
    ST_SetSRID(ST_MakePoint(-75.1810, 39.9656), 4326)
  ),
  (
    'Historic Philadelphia Discovery',
    'Explore hidden gems and historic sites with Gino the Dog through Old City Philadelphia.',
    'exploration',
    125,
    ST_SetSRID(ST_MakePoint(-75.1503, 39.9551), 4326)
  ),
  (
    'Franklin Institute Innovation Lab',
    'Build robots and conduct experiments with Hammer the Robot at Philadelphia''s premier science museum.',
    'stem',
    200,
    ST_SetSRID(ST_MakePoint(-75.1738, 39.9580), 4326)
  ),
  (
    'Fairmount Park Conservation',
    'Learn environmental stewardship and community leadership with the MOC Badge in America''s largest urban park.',
    'stewardship',
    150,
    ST_SetSRID(ST_MakePoint(-75.1723, 39.9495), 4326)
  )
ON CONFLICT (title) DO NOTHING;

-- Insert sample safe spaces
INSERT INTO safe_spaces (name, description, location) VALUES
  (
    'Free Library Study Sanctuary',
    'A quiet, safe learning environment with free tutoring and study resources available to all students.',
    ST_SetSRID(ST_MakePoint(-75.1635, 39.9611), 4326)
  ),
  (
    'Community Learning Center',
    'Welcoming space for collaborative learning, homework help, and peer mentoring programs.',
    ST_SetSRID(ST_MakePoint(-75.1580, 39.9800), 4326)
  )
ON CONFLICT (name) DO NOTHING;

-- Insert sample events
INSERT INTO events (title, description, location, start_time, end_time) VALUES
  (
    'Philadelphia Maker Festival',
    'Join the community for hands-on STEM activities, 3D printing demos, and collaborative learning workshops.',
    ST_SetSRID(ST_MakePoint(-75.1437, 39.9537), 4326),
    now() + interval '1 day',
    now() + interval '2 days'
  ),
  (
    'Young Scientists Expo',
    'Students showcase their research projects and compete in science fair competitions with community judges.',
    ST_SetSRID(ST_MakePoint(-75.1400, 39.9650), 4326),
    now() + interval '3 days',
    now() + interval '4 days'
  )
ON CONFLICT (title) DO NOTHING;

-- Create function to get all bubble data with coordinates
CREATE OR REPLACE FUNCTION get_map_bubbles()
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  category text,
  coordinates jsonb,
  character_name text,
  sprite_url text,
  reward integer,
  organization text,
  bubble_type text
) AS $$
BEGIN
  -- Return CHESS quests
  RETURN QUERY
  SELECT 
    q.id,
    q.title,
    q.description,
    q.category,
    jsonb_build_object(
      'lng', ST_X(q.location::geometry),
      'lat', ST_Y(q.location::geometry)
    ) as coordinates,
    CASE q.category
      WHEN 'character' THEN 'Hootie the Owl'
      WHEN 'health' THEN 'Brenda the Cat'
      WHEN 'exploration' THEN 'Gino the Dog'
      WHEN 'stem' THEN 'Hammer the Robot'
      WHEN 'stewardship' THEN 'MOC Badge'
      ELSE 'Unknown Character'
    END as character_name,
    CASE q.category
      WHEN 'character' THEN '/sprites/owl.gif/HOOTIE_WINGLIFT.gif'
      WHEN 'health' THEN '/sprites/cat.gif/KITTY_BOUNCE.gif'
      WHEN 'exploration' THEN '/sprites/dog.gif/GINO_COMPASSSPIN.gif'
      WHEN 'stem' THEN '/sprites/robot.gif/HAMMER_SWING.gif'
      WHEN 'stewardship' THEN '/sprites/badge.gif/BADGE_SHINE.gif'
      ELSE '/icons/default-sprite.png'
    END as sprite_url,
    q.coins as reward,
    'CHESS Quest Platform' as organization,
    'quest' as bubble_type
  FROM quests q
  WHERE q.location IS NOT NULL
    AND q.category IN ('character', 'health', 'exploration', 'stem', 'stewardship')
  
  UNION ALL
  
  -- Return Safe Spaces
  SELECT 
    ss.id,
    ss.name as title,
    ss.description,
    'safe_space' as category,
    jsonb_build_object(
      'lng', ST_X(ss.location::geometry),
      'lat', ST_Y(ss.location::geometry)
    ) as coordinates,
    'Protected Learning Zone' as character_name,
    '/icons/safe-space-icon.png' as sprite_url,
    0 as reward,
    'Philadelphia Safe Spaces Network' as organization,
    'safe_space' as bubble_type
  FROM safe_spaces ss
  WHERE ss.location IS NOT NULL
  
  UNION ALL
  
  -- Return Events
  SELECT 
    e.id,
    e.title,
    e.description,
    'event' as category,
    jsonb_build_object(
      'lng', ST_X(e.location::geometry),
      'lat', ST_Y(e.location::geometry)
    ) as coordinates,
    'Learning Event' as character_name,
    '/icons/event-icon.png' as sprite_url,
    0 as reward,
    'Philadelphia Learning Network' as organization,
    'event' as bubble_type
  FROM events e
  WHERE e.location IS NOT NULL
    AND e.start_time <= now()
    AND (e.end_time IS NULL OR e.end_time >= now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;