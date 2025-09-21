// Centralized type definitions for CHESS Map Frontend
export type PersonaKey = 'atlas' | 'kitty' | 'hootie' | 'hammer' | 'badge' | 'gino';

export interface PersonaDef {
  key: PersonaKey;
  name: string;
  category: string;
  tone: string;
  backstory: string;
  introPrompt: string;
  keywords: string[];
  mcqTags: string[];
  icon: string;
}

export interface MCQQuestion {
  id: string;
  question_text: string;
  choices: Record<string, string>; // JSONB in DB
  correct_key: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  persona_key?: PersonaKey;
  org_id?: string;
  tags: string[];
}

export interface MCQAnswer {
  id: string;
  user_id: string;
  mcq_id: string;
  is_correct: boolean;
  created_at: string;
}

export interface VideoResource {
  id: string;
  title: string;
  video_url: string;
  description?: string;
  persona_key: PersonaKey;
  org_id?: string;
  source: string;
  reflection_question?: string;
}

export interface QuestEvidence {
  id: string;
  user_id: string;
  quest_id?: string;
  url: string;
  created_at: string;
}

export interface UserProfile {
  user_id: string;
  display_name?: string;
  role: 'master_admin' | 'org_admin' | 'staff' | 'student';
  org_id?: string;
  created_at: string;
}

export interface PublicEvent {
  id: string;
  title: string;
  description?: string;
  starts_at?: string;
  location?: string;
  lat?: number;
  lng?: number;
  url?: string;
  persona_key?: PersonaKey;
  org_id?: string;
}

export interface MemorySummary {
  recentTopics: string[];
  userPreferences: string[];
  conversationContext: string;
  highlights: string[];
}

// Re-export existing types from database.ts for compatibility
export * from './database';
