/*
  # Initial Data Seeding

  1. CHESS Attributes
    - Character, Health, Exploration, STEM, Stewardship

  2. Persona Characters
    - Hootie, Kittykat, Gino, Hammer, Badge

  3. App Routes
    - Define application routes with role requirements

  4. App Defaults
    - Set default home paths for each role
*/

-- Insert CHESS attributes
insert into attributes (name, icon_url) values
  ('Character', '/icons/character.svg'),
  ('Health', '/icons/health.svg'),
  ('Exploration', '/icons/exploration.svg'),
  ('STEM', '/icons/stem.svg'),
  ('Stewardship', '/icons/stewardship.svg')
on conflict (name) do nothing;

-- Insert persona characters
insert into personas (key, label, sprite_path, active) values
  ('hootie', 'Hootie the Owl', '/personas/hootie.gif', true),
  ('kittykat', 'Kitty Kat', '/personas/kittykat.gif', true),
  ('gino', 'Gino the Dog', '/personas/gino.gif', true),
  ('hammer', 'Hammer the Robot', '/personas/hammer.gif', true),
  ('badge', 'MOC Badge', '/personas/badge.gif', true)
on conflict (key) do nothing;

-- Insert app routes
insert into app_routes (path, label, min_role) values
  ('/', 'Home', 'student'),
  ('/dashboard', 'Dashboard', 'student'),
  ('/quests', 'Quests', 'student'),
  ('/map', 'Map', 'student'),
  ('/master/dashboard', 'Master Dashboard', 'master_admin'),
  ('/master/quests/approvals', 'Quest Approvals', 'master_admin'),
  ('/admin/diagnostics', 'System Diagnostics', 'staff')
on conflict (path) do nothing;

-- Insert app defaults
insert into app_defaults (role, home_path) values
  ('student', '/dashboard'),
  ('staff', '/dashboard'),
  ('org_admin', '/dashboard'),
  ('master_admin', '/master/dashboard')
on conflict (role) do nothing;