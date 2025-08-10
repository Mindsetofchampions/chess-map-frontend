/*
  # Populate Sample Quest Data for Philadelphia CHESS Map

  This migration adds sample quest data for testing the map bubble system.
  
  1. New Sample Data
    - Philadelphia-based CHESS quests for all 5 categories
    - Safe spaces at key locations (libraries, community centers)
    - Community events with learning focus
  2. Geographic Data
    - Real Philadelphia coordinates for authentic location experience
    - Strategic placement near landmarks and educational institutions
  3. Testing Data
    - Each CHESS category represented with engaging quest content
    - Safe spaces and events for complete bubble system testing
*/

-- Insert sample CHESS quests for each attribute
INSERT INTO quests (
  title, 
  description, 
  attribute_id, 
  coins,
  location,
  start_time,
  end_time
) VALUES 
-- Character quests with Hootie the Owl
(
  'Liberty Bell Character Challenge',
  'Learn about honesty and integrity through the story of the Liberty Bell with Hootie the Owl. Discover how this symbol represents the character values we build in ourselves.',
  (SELECT id FROM attributes WHERE name = 'Character' LIMIT 1),
  100,
  ST_SetSRID(ST_Point(-75.1502, 39.9496), 4326),
  NOW(),
  NOW() + INTERVAL '30 days'
),
-- Health quests with Brenda the Cat  
(
  'Schuylkill River Fitness Trail',
  'Complete wellness challenges with Brenda the Cat along Philadelphia''s scenic river trail. Learn about physical health, mental wellness, and community fitness.',
  (SELECT id FROM attributes WHERE name = 'Health' LIMIT 1),
  75,
  ST_SetSRID(ST_Point(-75.1810, 39.9656), 4326),
  NOW(),
  NOW() + INTERVAL '30 days'
),
-- Exploration quests with Gino the Dog
(
  'Historic Philadelphia Discovery',
  'Explore hidden gems and historic sites with Gino the Dog through Old City Philadelphia. Uncover stories and mysteries of America''s birthplace.',
  (SELECT id FROM attributes WHERE name = 'Exploration' LIMIT 1),
  125,
  ST_SetSRID(ST_Point(-75.1503, 39.9551), 4326),
  NOW(),
  NOW() + INTERVAL '30 days'
),
-- STEM quests with Hammer the Robot
(
  'Franklin Institute Innovation Lab',
  'Build robots and conduct experiments with Hammer the Robot at Philadelphia''s premier science museum. Create, innovate, and discover the future of technology.',
  (SELECT id FROM attributes WHERE name = 'STEM' LIMIT 1),
  200,
  ST_SetSRID(ST_Point(-75.1738, 39.9580), 4326),
  NOW(),
  NOW() + INTERVAL '30 days'
),
-- Stewardship quests with MOC Badge
(
  'Fairmount Park Conservation',
  'Learn environmental stewardship and community leadership with the MOC Badge in America''s largest urban park. Protect nature while building leadership skills.',
  (SELECT id FROM attributes WHERE name = 'Stewardship' LIMIT 1),
  150,
  ST_SetSRID(ST_Point(-75.1723, 39.9495), 4326),
  NOW(),
  NOW() + INTERVAL '30 days'
);

-- Insert sample safe spaces
INSERT INTO safe_spaces (
  name,
  description,
  location
) VALUES 
(
  'Free Library Study Sanctuary',
  'A quiet, safe learning environment with free tutoring and study resources available to all students. Features dedicated study rooms, computer access, and peer mentoring.',
  ST_SetSRID(ST_Point(-75.1635, 39.9611), 4326)
),
(
  'North Philadelphia Community Center',
  'Welcoming space for collaborative learning, homework help, and peer mentoring programs. Offers after-school programs and safe study environments.',
  ST_SetSRID(ST_Point(-75.1580, 39.9800), 4326)
),
(
  'South Philly Learning Hub',
  'Multilingual learning support center providing safe spaces for students of all backgrounds. Features cultural exchange programs and academic support.',
  ST_SetSRID(ST_Point(-75.1590, 39.9200), 4326)
);

-- Insert sample community events  
INSERT INTO events (
  title,
  description,
  location,
  start_time,
  end_time,
  total_tickets
) VALUES 
(
  'Philadelphia Maker Festival',
  'Join the community for hands-on STEM activities, 3D printing demos, and collaborative learning workshops. Meet local innovators and try new technologies.',
  ST_SetSRID(ST_Point(-75.1437, 39.9537), 4326),
  NOW() + INTERVAL '7 days',
  NOW() + INTERVAL '8 days',
  150
),
(
  'Young Scientists Expo',
  'Students showcase their research projects and compete in science fair competitions with community judges. Celebrate learning and innovation.',
  ST_SetSRID(ST_Point(-75.1400, 39.9650), 4326),
  NOW() + INTERVAL '14 days',
  NOW() + INTERVAL '15 days',
  200
),
(
  'Community Art & Learning Festival',
  'Express creativity through collaborative art projects while learning about Philadelphia''s rich cultural history. All ages welcome for this family-friendly event.',
  ST_SetSRID(ST_Point(-75.1620, 39.9440), 4326),
  NOW() + INTERVAL '21 days',
  NOW() + INTERVAL '22 days',
  100
);