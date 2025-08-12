// src/services/mcqService.ts
import supabase from './supabaseClient';
import type { MCQQuestion } from '../types';

export async function getRandomMCQ(params: {
  personaKey: string;
  orgId: string | null;
  studentId: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}): Promise<MCQQuestion | null> {
  const diff = params.difficulty ?? 'easy';

  const { data, error } = await supabase
    .from('mc_questions')
    .select('*')
    .eq('persona_key', params.personaKey)
    .eq('difficulty', diff)
    .limit(20);

  if (error) throw error;
  if (!data?.length) return null;

  const orgPreferred = data.filter((q: any) => q.org_id && q.org_id === params.orgId);
  const pool = orgPreferred.length ? orgPreferred : data;

  return pool[Math.floor(Math.random() * pool.length)] as MCQQuestion;
}

export async function recordMCQAnswer(params: {
  mcqId: string;
  studentId: string;
  isCorrect: boolean;
}) {
  const { error } = await supabase.from('mcq_answers').insert({
    mcq_id: params.mcqId,
    user_id: params.studentId, // RLS requires this to equal auth.uid()
    is_correct: params.isCorrect,
  });
  if (error) throw error;
}
