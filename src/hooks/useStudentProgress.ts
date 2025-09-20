import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Quest } from '@/types/backend';

type CategoryKey = 'character' | 'health' | 'exploration' | 'stem' | 'stewardship';

const CATEGORY_MAP: Record<string, CategoryKey> = {
  character: 'character',
  health: 'health',
  exploration: 'exploration',
  stem: 'stem',
  stewardship: 'stewardship'
};

type ProgressEntry = { total: number; completed: number; percent: number };
type ProgressMap = Record<CategoryKey, ProgressEntry>;

const makeEmptyProgress = (): ProgressMap => ({
  character: { total: 0, completed: 0, percent: 0 },
  health: { total: 0, completed: 0, percent: 0 },
  exploration: { total: 0, completed: 0, percent: 0 },
  stem: { total: 0, completed: 0, percent: 0 },
  stewardship: { total: 0, completed: 0, percent: 0 },
});

export const useStudentProgress = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [progress, setProgress] = useState<ProgressMap>(makeEmptyProgress());

  const fetchProgress = useCallback(async () => {
    if (!user) {
      setProgress(makeEmptyProgress());
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Prefer server-side RPC aggregation for efficiency
      const { data: rpcData, error: rpcErr } = await supabase.rpc('rpc_get_student_progress');
      if (!rpcErr && rpcData) {
        // rpcData may be an array of rows { category, total, completed }
        const rows = rpcData as Array<{ category: string; total: number; completed: number }>;
        const totals = makeEmptyProgress();
        rows.forEach((r) => {
          const key = (String(r.category || '').toLowerCase() || 'character') as CategoryKey;
          if (!totals[key]) return;
          const total = Number(r.total || 0);
          const completed = Number(r.completed || 0);
          totals[key] = { total, completed, percent: total ? Math.round((completed / total) * 100) : 0 };
        });
        setProgress(totals);
        return;
      }

      // Fallback to client-side aggregation if RPC is missing/failed
      console.warn('rpc_get_student_progress failed, falling back to client aggregation', rpcErr);
      // previous client-side approach
      const { data: questsData, error: questsErr } = await supabase
        .from('quests')
        .select('id, attribute_id')
        .eq('active', true)
        .eq('status', 'approved');

      if (questsErr) throw questsErr;

      const quests = (questsData || []) as Quest[];
      const questCategory: Record<string, CategoryKey> = {};
      quests.forEach((q) => {
        const key = String(q.attribute_id || '').toLowerCase();
        const cat = (q.attribute_id && (CATEGORY_MAP[q.attribute_id] || CATEGORY_MAP[key])) || 'character';
        questCategory[q.id] = cat;
      });

      const totalsCount: Record<CategoryKey, number> = { character: 0, health: 0, exploration: 0, stem: 0, stewardship: 0 };
      quests.forEach((q) => {
        const c = questCategory[q.id] || 'character';
        totalsCount[c] = (totalsCount[c] || 0) + 1;
      });

      const { data: subsData, error: subsErr } = await supabase
        .from('quest_submissions')
        .select('quest_id, status')
        .in('status', ['accepted', 'autograded']);

      if (subsErr) throw subsErr;

      const submissions = (subsData || []) as Array<{ quest_id: string; status: string }>;
      const completedByCategory: Record<CategoryKey, number> = { character: 0, health: 0, exploration: 0, stem: 0, stewardship: 0 };
      submissions.forEach((s) => {
        const qid = s.quest_id;
        const cat = questCategory[qid];
        if (cat) {
          completedByCategory[cat] = (completedByCategory[cat] || 0) + 1;
        }
      });

      const result: ProgressMap = {
        character: { total: totalsCount.character, completed: completedByCategory.character, percent: totalsCount.character ? Math.round((completedByCategory.character / totalsCount.character) * 100) : 0 },
        health: { total: totalsCount.health, completed: completedByCategory.health, percent: totalsCount.health ? Math.round((completedByCategory.health / totalsCount.health) * 100) : 0 },
        exploration: { total: totalsCount.exploration, completed: completedByCategory.exploration, percent: totalsCount.exploration ? Math.round((completedByCategory.exploration / totalsCount.exploration) * 100) : 0 },
        stem: { total: totalsCount.stem, completed: completedByCategory.stem, percent: totalsCount.stem ? Math.round((completedByCategory.stem / totalsCount.stem) * 100) : 0 },
        stewardship: { total: totalsCount.stewardship, completed: completedByCategory.stewardship, percent: totalsCount.stewardship ? Math.round((completedByCategory.stewardship / totalsCount.stewardship) * 100) : 0 },
      };
      setProgress(result);
    } catch (err: any) {
      console.error('Failed to compute student progress:', err);
      setError(err?.message || 'Failed to compute progress');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return { progress, loading, error, refresh: fetchProgress };
};

export default useStudentProgress;
