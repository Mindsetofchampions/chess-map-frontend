/*
  # Quest System Tables

  1. Quest Tables
    - `quest_templates` - Template quests for reuse
    - `quests` - Individual quest instances
    - `quest_submissions` - Student quest submissions
    - `quest_evidence` - Evidence uploads for quests

  2. MCQ Tables
    - `mc_questions` - Multiple choice questions
    - `mcq_answers` - Student MCQ answers

  3. Security
    - Enable RLS on all tables
    - Add role-based access policies
*/

-- Quest templates for reuse
create table if not exists quest_templates (
  id uuid primary key default gen_random_uuid(),
  attribute_id uuid references attributes(id) on delete cascade,
  type text not null,
  question text not null,
  options jsonb,
  answer jsonb,
  description text,
  difficulty integer default 1,
  media_type text default 'none'::text,
  media_url text,
  is_active boolean default true,
  org_id uuid references organizations(id) on delete set null,
  created_at timestamptz default now(),
  constraint quest_templates_type_check check (type = any (array['mcq'::text, 'true_false'::text, 'fill_blank'::text, 'text_response'::text, 'ticket'::text]))
);

alter table quest_templates enable row level security;

-- Quest instances
create table if not exists quests (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references quest_templates(id) on delete set null,
  title text not null,
  description text,
  attribute_id uuid references attributes(id) on delete set null,
  coins integer default 0 not null,
  location geography(point,4326),
  start_time timestamptz,
  end_time timestamptz,
  created_at timestamptz default now(),
  config jsonb default '{}'::jsonb not null,
  qtype quest_type default 'mcq'::quest_type not null,
  status quest_status default 'draft'::quest_status not null,
  active boolean default true not null,
  reward_coins integer default 0 not null
);

alter table quests enable row level security;

-- Quest submissions
create table if not exists quest_submissions (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references quests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status submission_status default 'pending'::submission_status not null,
  mcq_choice text,
  text_answer text,
  video_url text,
  score integer,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(quest_id, user_id)
);

alter table quest_submissions enable row level security;

-- Quest evidence uploads
create table if not exists quest_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id uuid not null,
  url text not null,
  created_at timestamptz not null default now()
);

alter table quest_evidence enable row level security;

-- Multiple choice questions
create table if not exists mc_questions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references quest_templates(id) on delete cascade,
  question_text text not null,
  choices jsonb not null,
  correct_key text not null,
  org_id uuid references organizations(id),
  created_at timestamptz not null default now(),
  persona_key text,
  difficulty text default 'easy'::text,
  tags text[] default array[]::text[],
  constraint mc_questions_difficulty_check check (difficulty = any (array['easy'::text, 'medium'::text, 'hard'::text]))
);

alter table mc_questions enable row level security;

-- MCQ answers tracking
create table if not exists mcq_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mcq_id uuid not null references mc_questions(id) on delete cascade,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

alter table mcq_answers enable row level security;

-- Create indexes
create index if not exists idx_quest_templates_org_id on quest_templates(org_id);
create index if not exists ix_quests_status_active on quests(status, active);
create index if not exists ix_submissions_user_status on quest_submissions(user_id, status);
create index if not exists quest_submissions_quest_id_user_id_key on quest_submissions(quest_id, user_id);
create index if not exists idx_quest_evidence_user_time on quest_evidence(user_id, created_at desc);
create index if not exists idx_mc_questions_org_id on mc_questions(org_id);
create index if not exists idx_mcq_persona_diff on mc_questions(persona_key, difficulty);
create index if not exists idx_mcq_answers_user_time on mcq_answers(user_id, created_at desc);