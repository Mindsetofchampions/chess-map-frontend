// src/types/index.ts
export type Role = 'master_admin' | 'org_admin' | 'student';

export interface UserProfile {
  id: string;
  display_name?: string;
  age?: number;
  role?: Role;
  org_id?: string | null;
  persona_streaks?: Record<string, number>;
}

export interface PersonaDef {
  key: 'atlas' | 'hootie' | 'kittykat' | 'gino' | 'hammer' | 'moc_badge';
  name: string;
  category: 'Character' | 'Health' | 'Exploration' | 'STEM' | 'Stewardship';
  tone: string;
  backstory: string;
  introPrompt: string;
  keywords: string[];
  mcqTags: string[];
}

export interface MemorySummary {
  highlights: string[];
}

export interface MCQChoiceMap {
  [key: string]: string;
}

export interface MCQQuestion {
  id: string;
  persona_key?: PersonaDef['key'];
  template_id?: string | null;
  org_id: string | null;
  question_text: string;
  choices: MCQChoiceMap;
  correct_key: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
}

export interface MCQAnswerRow {
  id: string;
  user_id: string;
  mcq_id: string;
  is_correct: boolean;
  created_at: string;
}

export interface VideoResource {
  id: string;
  title: string;
  persona_key?: PersonaDef['key'];
  org_id: string | null;
  source: string;
  video_url: string;
}

export interface PublicEventItem {
  title: string;
  url: string;
  source: string;
  starts_at?: string | null;
  lat?: number | null;
  lng?: number | null;
}
