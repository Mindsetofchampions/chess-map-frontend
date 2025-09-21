/*
  # Events and Locations Tables

  1. Location Tables
    - `safe_spaces` - Safe learning environments
    - `events` - Public events and activities
    - `video_resources` - Educational video content

  2. Security
    - Enable RLS on all tables
    - Add public read access where appropriate
*/

-- Safe spaces for learning
create table if not exists safe_spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  location geography(point,4326),
  created_at timestamptz default now()
);

alter table safe_spaces enable row level security;

-- Public events
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  attribute_id uuid references attributes(id) on delete set null,
  location geography(point,4326),
  start_time timestamptz,
  end_time timestamptz,
  total_tickets integer,
  created_at timestamptz default now(),
  org_id uuid references organizations(id) on delete set null,
  lat double precision,
  lng double precision,
  starts_at timestamptz,
  url text,
  persona_key text
);

alter table events enable row level security;

-- Video resources
create table if not exists video_resources (
  id uuid primary key default gen_random_uuid(),
  persona_key text not null,
  title text not null,
  video_url text not null,
  source text not null,
  org_id uuid references organizations(id),
  fetched_at timestamptz not null default now()
);

alter table video_resources enable row level security;

-- Create indexes
create index if not exists idx_events_org_id on events(org_id);
create index if not exists idx_events_org_time on events(org_id, start_time);
create index if not exists idx_video_resources_org_id on video_resources(org_id);
create index if not exists idx_video_resources_persona on video_resources(persona_key);