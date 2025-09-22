import { useState } from 'react';
import GlassContainer from './GlassContainer';
import { useToast } from './ToastProvider';
import SpritesOverlay from './SpritesOverlay';
import { supabase } from '@/lib/supabase';

interface Props {
  open: boolean;
  onClose: () => void;
}

const PERSONAS = [
  { key: 'hootie', label: 'Hootie (Character)' },
  { key: 'kittykat', label: 'Kitty Kat (Health)' },
  { key: 'gino', label: 'Gino (Exploration)' },
  { key: 'hammer', label: 'Hammer (STEM)' },
  { key: 'badge', label: 'MOC Badge (Stewardship)' },
];

export default function QuestBuilder({ open, onClose }: Props) {
  const { showSuccess, showError } = useToast();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [persona, setPersona] = useState(PERSONAS[0].key);
  const [reward, setReward] = useState('50');
  const [questType, setQuestType] = useState<'mcq' | 'text' | 'numeric'>('mcq');
  const [grades, setGrades] = useState<{ ES: boolean; MS: boolean; HS: boolean }>(
    () => ({ ES: true, MS: false, HS: false }),
  );
  const [seats, setSeats] = useState<string>('');
  const [lat, setLat] = useState<string>('');
  const [lng, setLng] = useState<string>('');
  const [optA, setOptA] = useState('Option A');
  const [optB, setOptB] = useState('Option B');
  const [optC, setOptC] = useState('Option C');
  const [correct, setCorrect] = useState<'A' | 'B' | 'C'>('A');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function createQuest() {
    if (!title.trim()) return showError('Title required', 'Enter a quest title');
    const rewardCoins = parseInt(reward || '0', 10) || 0;
    const personaToAttribute: Record<string, string> = {
      hootie: 'character',
      kittykat: 'health',
      gino: 'exploration',
      hammer: 'stem',
      badge: 'stewardship',
    };
    const attributeId = personaToAttribute[persona] || 'character';
    const selectedGrades = Object.entries(grades)
      .filter(([, v]) => v)
      .map(([k]) => k);
    const seatsTotal = parseInt(seats || '0', 10) || undefined;
    const latNum = lat ? parseFloat(lat) : undefined;
    const lngNum = lng ? parseFloat(lng) : undefined;

    const baseConfig: any = { meta: { grades: selectedGrades, seats_total: seatsTotal } };
    if (latNum !== undefined && lngNum !== undefined) {
      baseConfig.meta.location = { lat: latNum, lng: lngNum };
    }

    const config =
      questType === 'mcq'
        ? {
            ...baseConfig,
            options: [
              { id: 'A', text: optA },
              { id: 'B', text: optB },
              { id: 'C', text: optC },
            ],
          }
        : questType === 'numeric'
          ? {
              ...baseConfig,
              numeric: { min: 0, max: 1000000 },
            }
          : {
              ...baseConfig,
              text: { maxLength: 1000 },
            };
    setSaving(true);
    try {
      const { error } = await supabase.from('quests').insert({
        title: title.trim(),
        description: desc.trim() || null,
        status: 'submitted',
        active: true,
        reward_coins: rewardCoins,
        qtype: questType,
        config,
        attribute_id: attributeId,
        // If lng/lat exist on table, include; safe to send nulls
        lng: lngNum ?? null,
        lat: latNum ?? null,
        seats_total: seatsTotal ?? null,
      } as any);
      if (error) throw error;
      showSuccess('Quest submitted', 'Your quest is now in the approval queue');
      onClose();
    } catch (e: any) {
      showError('Create failed', e?.message || 'Unable to create quest');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'>
      <GlassContainer className='w-full max-w-lg p-6'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-semibold text-white'>Create Quick Quest (MCQ)</h3>
          <button className='btn-secondary' onClick={onClose} disabled={saving}>
            Close
          </button>
        </div>
        <div className='grid gap-3'>
          <label className='text-sm text-gray-300'>Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className='bg-glass border-glass rounded-xl px-3 py-2 text-white'
            placeholder='Quest title'
          />
          <label className='text-sm text-gray-300'>Description</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className='bg-glass border-glass rounded-xl px-3 py-2 text-white'
            placeholder='What should students do?'
          />
          <label className='text-sm text-gray-300'>Persona</label>
          <div className='relative h-28 rounded-xl border border-white/10 overflow-hidden'>
            <SpritesOverlay showModal={false} onSpriteClick={(k) => {
              // restrict to persona keys we support in this builder
              if (PERSONAS.find((p) => p.key === k)) setPersona(k as any);
            }} />
            <div className='absolute bottom-2 left-2 text-xs text-white/80 bg-black/30 rounded px-2 py-1'>
              Selected: {PERSONAS.find((p) => p.key === persona)?.label}
            </div>
          </div>
          <label className='text-sm text-gray-300'>Reward Coins</label>
          <input
            type='number'
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            className='bg-glass border-glass rounded-xl px-3 py-2 text-white'
          />
          <label className='text-sm text-gray-300'>Quest Type</label>
          <select
            value={questType}
            onChange={(e) => setQuestType(e.target.value as any)}
            className='bg-glass border-glass rounded-xl px-3 py-2 text-white'
          >
            <option value='mcq'>Multiple Choice (MCQ)</option>
            <option value='text'>Text Response</option>
            <option value='numeric'>Numeric Input</option>
          </select>

          <div className='grid grid-cols-3 gap-3'>
            <div className='text-sm text-gray-300'>Grades</div>
            <div className='col-span-2 flex gap-4 items-center'>
              {(['ES', 'MS', 'HS'] as const).map((g) => (
                <label key={g} className='flex items-center gap-2 text-gray-200'>
                  <input
                    type='checkbox'
                    checked={grades[g]}
                    onChange={(e) => setGrades((prev) => ({ ...prev, [g]: e.target.checked }))}
                  />
                  {g}
                </label>
              ))}
            </div>
          </div>

          <div className='grid grid-cols-3 gap-3'>
            <div className='text-sm text-gray-300'>Seats (optional)</div>
            <input
              className='col-span-2 bg-glass border-glass rounded-xl px-3 py-2 text-white'
              type='number'
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              placeholder='Total seats'
              min={0}
            />
          </div>

          <div className='grid grid-cols-3 gap-3'>
            <div className='text-sm text-gray-300'>Location (optional)</div>
            <input
              className='bg-glass border-glass rounded-xl px-3 py-2 text-white'
              placeholder='Latitude'
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
            <input
              className='bg-glass border-glass rounded-xl px-3 py-2 text-white'
              placeholder='Longitude'
              value={lng}
              onChange={(e) => setLng(e.target.value)}
            />
          </div>
          {questType === 'mcq' && (
            <>
              <div className='grid grid-cols-3 gap-3'>
                <div>
                  <label className='text-xs text-gray-400'>Option A</label>
                  <input
                    value={optA}
                    onChange={(e) => setOptA(e.target.value)}
                    className='w-full bg-glass border-glass rounded-xl px-3 py-2 text-white'
                  />
                </div>
                <div>
                  <label className='text-xs text-gray-400'>Option B</label>
                  <input
                    value={optB}
                    onChange={(e) => setOptB(e.target.value)}
                    className='w-full bg-glass border-glass rounded-xl px-3 py-2 text-white'
                  />
                </div>
                <div>
                  <label className='text-xs text-gray-400'>Option C</label>
                  <input
                    value={optC}
                    onChange={(e) => setOptC(e.target.value)}
                    className='w-full bg-glass border-glass rounded-xl px-3 py-2 text-white'
                  />
                </div>
              </div>
              <label className='text-sm text-gray-300'>Correct Option (for reviewers)</label>
              <select
                value={correct}
                onChange={(e) => setCorrect(e.target.value as any)}
                className='bg-glass border-glass rounded-xl px-3 py-2 text-white'
              >
                <option value='A'>A</option>
                <option value='B'>B</option>
                <option value='C'>C</option>
              </select>
            </>
          )}
          <div className='flex justify-end gap-2 mt-2'>
            <button className='btn-secondary' onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button className='btn-esports' onClick={createQuest} disabled={saving}>
              {saving ? 'Saving…' : 'Submit for Approval'}
            </button>
          </div>
        </div>
      </GlassContainer>
    </div>
  );
}
