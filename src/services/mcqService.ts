import supabase from './supabaseClient';
import { MCQQuestion, PersonaKey, MCQAnswer } from '../types';

/**
 * Parameters for fetching random MCQ
 */
interface GetRandomMCQParams {
  personaKey?: PersonaKey;
  orgId?: string;
  studentId: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  excludeAnswered?: boolean;
}

/**
 * Parameters for recording MCQ answer
 */
interface RecordMCQAnswerParams {
  mcqId: string;
  studentId: string;
  isCorrect: boolean;
}

/**
 * Get random MCQ question with organization and persona filtering
 */
export async function getRandomMCQ(params: GetRandomMCQParams): Promise<MCQQuestion | null> {
  try {
    const diff = params.difficulty ?? 'easy';

    let query = supabase
      .from('mc_questions')
      .select('*')
      .eq('difficulty', diff);

    // Filter by persona if provided
    if (params.personaKey) {
      query = query.eq('persona_key', params.personaKey);
    }

    // Prefer org questions, fallback to global
    if (params.orgId) {
      query = query.or(`org_id.eq.${params.orgId},org_id.is.null`);
    } else {
      query = query.is('org_id', null);
    }

    // Exclude already answered questions if requested
    if (params.excludeAnswered) {
      const { data: answeredIds } = await supabase
        .from('mcq_answers')
        .select('mcq_id')
        .eq('user_id', params.studentId);
      
      if (answeredIds && answeredIds.length > 0) {
        const answeredMcqIds = answeredIds.map(a => a.mcq_id);
        query = query.not('id', 'in', `(${answeredMcqIds.join(',')})`);
      }
    }

    const { data, error } = await query.limit(20);

    if (error) {
      console.error('Error fetching MCQ:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // Return random question from results
    const randomIndex = Math.floor(Math.random() * data.length);
    return data[randomIndex] as MCQQuestion;
  } catch (error) {
    console.error('Error in getRandomMCQ:', error);
    return null;
  }
}

/**
 * Record MCQ answer and return success status
 */
export async function recordMCQAnswer(params: RecordMCQAnswerParams): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('mcq_answers')
      .insert({
        mcq_id: params.mcqId,
        user_id: params.studentId,
        is_correct: params.isCorrect,
      });

    if (error) {
      console.error('Error recording MCQ answer:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in recordMCQAnswer:', error);
    return false;
  }
}

/**
 * Get MCQ statistics for a student
 */
export async function getMCQStats(studentId: string): Promise<{
  correct: number;
  total: number;
  accuracy: number;
}> {
  try {
    const { data, error } = await supabase
      .from('mcq_answers')
      .select('is_correct')
      .eq('user_id', studentId);

    if (error) {
      console.error('Error fetching MCQ stats:', error);
      return { correct: 0, total: 0, accuracy: 0 };
    }

    const total = data?.length || 0;
    const correct = data?.filter(answer => answer.is_correct).length || 0;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    return { correct, total, accuracy };
  } catch (error) {
    console.error('Error in getMCQStats:', error);
    return { correct: 0, total: 0, accuracy: 0 };
  }
}

/**
 * Get MCQ questions by persona for admin management
 */
export async function getMCQsByPersona(personaKey: PersonaKey, orgId?: string): Promise<MCQQuestion[]> {
  try {
    let query = supabase
      .from('mc_questions')
      .select('*')
      .eq('persona_key', personaKey);

    if (orgId) {
      query = query.eq('org_id', orgId);
    } else {
      query = query.is('org_id', null);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching MCQs by persona:', error);
      return [];
    }

    return data as MCQQuestion[];
  } catch (error) {
    console.error('Error in getMCQsByPersona:', error);
    return [];
  }
}