import React, { useState } from 'react';

import OnboardingGate from '@/components/auth/OnboardingGate';
import GlassContainer from '@/components/GlassContainer';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useToast } from '@/components/ToastProvider';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const OrgDashboard: React.FC = () => {
  const { user } = useAuth() as any;
  const { showSuccess, showError } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coins, setCoins] = useState('100');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return showError('Missing Title', 'Please provide a title for the quest');
    setSubmitting(true);
    try {
      const { error } = await supabase.from('quests').insert([
        {
          title: title.trim(),
          description: description.trim(),
          reward_coins: Number(coins || 0),
          created_by: user?.id,
          status: 'submitted',
        },
      ]);
      if (error) throw error;
      showSuccess('Quest Submitted', 'Quest submitted for approval');
      setTitle('');
      setDescription('');
      setCoins('100');
    } catch (err: any) {
      console.error('Failed to create quest', err);
      showError('Create Failed', err?.message || 'Unable to create quest');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute requiredRole={'org_admin'}>
      <OnboardingGate>
        <div className='container mx-auto p-6 max-w-4xl'>
          <h1 className='text-2xl font-bold text-white mb-4'>Organization Dashboard</h1>
          <GlassContainer>
            <h2 className='text-lg font-semibold text-white mb-2'>Create Quest</h2>
            <div className='grid gap-3'>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='Quest title'
                className='bg-glass border-glass rounded-xl px-3 py-2 text-white'
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='Description'
                className='bg-glass border-glass rounded-xl px-3 py-2 text-white'
              />
              <input
                value={coins}
                onChange={(e) => setCoins(e.target.value)}
                placeholder='Reward coins'
                type='number'
                className='bg-glass border-glass rounded-xl px-3 py-2 text-white'
              />
              <div className='flex gap-2'>
                <button onClick={handleSubmit} disabled={submitting} className='btn-esports'>
                  {submitting ? 'Submitting...' : 'Submit Quest'}
                </button>
              </div>
            </div>
          </GlassContainer>
        </div>
      </OnboardingGate>
    </ProtectedRoute>
  );
};

export default OrgDashboard;
