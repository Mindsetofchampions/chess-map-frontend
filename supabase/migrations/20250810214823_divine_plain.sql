/*
  # Complete Philadelphia CHESS Quest Data

  1. Sample Data Creation
     - Creates sample Philadelphia CHESS quests for all 5 categories
     - Adds safe spaces at real Philadelphia locations
     - Includes community events with proper geographic data
     
  2. Geographic Features
     - Uses actual Philadelphia coordinates
     - Covers major landmarks and educational institutions
     - Includes community centers and libraries
     
  3. CHESS Categories
     - Character quests with wisdom themes
     - Health quests with wellness activities
     - Exploration quests with discovery elements
     - STEM quests with innovation focus
     - Stewardship quests with environmental themes
*/

-- Create sample attributes for CHESS categories if they don't exist
INSERT INTO attributes (name, icon_url) VALUES 
  ('Character', '/sprites/owl.gif/HOOTIE_WINGLIFT.gif'),
  ('Health', '/sprites/cat.gif/KITTY_BOUNCE.gif'),
  ('Exploration', '/sprites/dog.gif/GINO_COMPASSSPIN.gif'),
  ('STEM', '/sprites/robot.gif/HAMMER_SWING.gif'),
  ('Stewardship', '/sprites/badge.gif/BADGE_SHINE.gif')
ON CONFLICT (name) DO UPDATE SET
  icon_url = EXCLUDED.icon_url;

-- Get attribute IDs for quest creation
DO $$
DECLARE
  character_attr_id uuid;
  health_attr_id uuid;
  exploration_attr_id uuid;
  stem_attr_id uuid;
  stewardship_attr_id uuid;
BEGIN
  -- Get attribute IDs
  SELECT id INTO character_attr_id FROM attributes WHERE name = 'Character';
  SELECT id INTO health_attr_id FROM attributes WHERE name = 'Health';
  SELECT id INTO exploration_attr_id FROM attributes WHERE name = 'Exploration';
  SELECT id INTO stem_attr_id FROM attributes WHERE name = 'STEM';
  SELECT id INTO stewardship_attr_id FROM attributes WHERE name = 'Stewardship';

  -- Insert CHESS Quest samples for Philadelphia
  INSERT INTO quests (title, description, attribute_id, coins, location) VALUES
    (
      'Liberty Bell Character Challenge',
      'Learn about honesty and integrity through the story of the Liberty Bell with Hootie the Owl. Discover how the founders'' commitment to truth shaped our nation.',
      character_attr_id,
      100,
      ST_GeogFromText('POINT(-75.1502 39.9496)')
    ),
    (
      'Schuylkill River Fitness Trail',
      'Complete wellness challenges with Brenda the Cat along Philadelphia''s scenic river trail. Explore healthy living through outdoor activities.',
      health_attr_id,
      75,
      ST_GeogFromText('POINT(-75.1810 39.9656)')
    ),
    (
      'Historic Philadelphia Discovery',
      'Explore hidden gems and historic sites with Gino the Dog through Old City Philadelphia. Uncover stories of America''s birthplace.',
      exploration_attr_id,
      125,
      ST_GeogFromText('POINT(-75.1503 39.9551)')
    ),
    (
      'Franklin Institute Innovation Lab',
      'Build robots and conduct experiments with Hammer the Robot at Philadelphia''s premier science museum. Hands-on STEM learning experience.',
      stem_attr_id,
      200,
      ST_GeogFromText('POINT(-75.1738 39.9580)')
    ),
    (
      'Fairmount Park Conservation Quest',
      'Learn environmental stewardship and community leadership with the MOC Badge in America''s largest urban park system.',
      stewardship_attr_id,
      150,
      ST_GeogFromText('POINT(-75.1723 39.9495)')
    ),
    (
      'Philadelphia Museum Character Quest',
      'Discover moral courage and character development with Hootie through Philadelphia''s rich cultural heritage at the Museum of the American Revolution.',
      character_attr_id,
      120,
      ST_GeogFromText('POINT(-75.1459 39.9487)')
    ),
    (
      'City Hall Wellness Challenge',
      'Complete health and wellness activities with Brenda the Cat around Philadelphia''s iconic City Hall and surrounding areas.',
      health_attr_id,
      90,
      ST_GeogFromText('POINT(-75.1638 39.9526)')
    )
  ON CONFLICT (title) DO NOTHING;

END $$;

-- Insert Philadelphia Safe Spaces
INSERT INTO safe_spaces (name, description, location) VALUES
  (
    'Free Library Central Branch Study Sanctuary',
    'A quiet, safe learning environment with free tutoring, study resources, and Wi-Fi available to all Philadelphia students and community members.',
    ST_GeogFromText('POINT(-75.1635 39.9611)')
  ),
  (
    'North Philadelphia Community Learning Center',
    'Welcoming space for collaborative learning, homework help, peer mentoring programs, and community workshops in North Philadelphia.',
    ST_GeogFromText('POINT(-75.1580 39.9800)')
  ),
  (
    'South Philadelphia Recreation Center Study Hub',
    'Safe after-school study space with supervised homework help, computer access, and educational programming for local youth.',
    ST_GeogFromText('POINT(-75.1590 39.9200)')
  ),
  (
    'University City Learning Commons',
    'Multi-purpose learning space near universities offering study areas, group collaboration rooms, and educational technology access.',
    ST_GeogFromText('POINT(-75.1932 39.9522)')
  )
ON CONFLICT (name) DO NOTHING;

-- Insert Philadelphia Community Events
INSERT INTO events (title, description, location, start_time, end_time, total_tickets) VALUES
  (
    'Philadelphia Maker Festival',
    'Join the community for hands-on STEM activities, 3D printing demos, collaborative learning workshops, and innovation showcases.',
    ST_GeogFromText('POINT(-75.1437 39.9537)'),
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '8 days',
    200
  ),
  (
    'Young Scientists Expo',
    'Students showcase their research projects and compete in science fair competitions with community judges and mentors.',
    ST_GeogFromText('POINT(-75.1400 39.9650)'),
    NOW() + INTERVAL '14 days',
    NOW() + INTERVAL '15 days',
    150
  ),
  (
    'Philadelphia Community Code-a-thon',
    'Weekend coding event where students of all levels learn programming, build apps, and collaborate on community technology projects.',
    ST_GeogFromText('POINT(-75.1570 39.9500)'),
    NOW() + INTERVAL '21 days',
    NOW() + INTERVAL '23 days',
    100
  ),
  (
    'Environmental Stewardship Workshop',
    'Hands-on workshop about urban gardening, sustainability, and environmental leadership in partnership with local environmental groups.',
    ST_GeogFromText('POINT(-75.1680 39.9440)'),
    NOW() + INTERVAL '10 days',
    NOW() + INTERVAL '10 days',
    75
  )
ON CONFLICT (title) DO NOTHING;

-- Create view for map bubble data
CREATE OR REPLACE VIEW map_bubble_data AS
SELECT 
  'quest-' || q.id as bubble_id,
  q.title,
  q.description,
  ST_X(q.location::geometry) as lng,
  ST_Y(q.location::geometry) as lat,
  a.name as category,
  a.icon_url as sprite_url,
  q.coins as reward,
  'quest' as bubble_type,
  q.created_at
FROM quests q
JOIN attributes a ON q.attribute_id = a.id
WHERE q.location IS NOT NULL

UNION ALL

SELECT 
  'safe-' || s.id as bubble_id,
  s.name as title,
  s.description,
  ST_X(s.location::geometry) as lng,
  ST_Y(s.location::geometry) as lat,
  'Safe Space' as category,
  '/sprites/badge.gif/BADGE_SHINE.gif' as sprite_url,
  NULL as reward,
  'safe_space' as bubble_type,
  s.created_at
FROM safe_spaces s
WHERE s.location IS NOT NULL

UNION ALL

SELECT 
  'event-' || e.id as bubble_id,
  e.title,
  e.description,
  ST_X(e.location::geometry) as lng,
  ST_Y(e.location::geometry) as lat,
  'Community Event' as category,
  '/sprites/owl.gif/HOOTIE_WINGLIFT.gif' as sprite_url,
  NULL as reward,
  'event' as bubble_type,
  e.created_at
FROM events e
WHERE e.location IS NOT NULL
ORDER BY created_at DESC;