import { useEffect, useState } from 'react';
import { Plus, Shield, Calendar, X } from 'lucide-react';

import MapView from '@/components/MapView';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ToastProvider';
import { supabase } from '@/lib/supabase';

/**
 * MasterMap Tab
 * Shows all quests, safe spaces, and events in realtime and allows creation.
 */
export default function MasterMap() {
  const { role } = useAuth();
  const { showError, showSuccess } = useToast();
  const [quests, setQuests] = useState<any[]>([]);
  const [safeSpaces, setSafeSpaces] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [placeMode, setPlaceMode] = useState<null | 'quest' | 'safe' | 'event'>(null);

  // Creation form state
  type CreateType = 'quest' | 'safe' | 'event';
  const [createType, setCreateType] = useState<CreateType | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  // Quest fields
  const [qTitle, setQTitle] = useState('');
  const [qDesc, setQDesc] = useState('');
  const [qReward, setQReward] = useState<number>(5);
  const [qType, setQType] = useState<'text' | 'photo' | 'mcq' | 'checkin'>('text');
  const [qGradeBands, setQGradeBands] = useState<string[]>(['ES']);
  const [qSeats, setQSeats] = useState<number>(1);
  const [qAttribute, setQAttribute] = useState<string | null>(null);

  // Safe space fields
  const [sName, setSName] = useState('');
  const [sDesc, setSDesc] = useState('');
  const [sGrade, setSGrade] = useState<string | null>(null);
  const [sContact, setSContact] = useState<{ phone?: string; email?: string } | null>(null);

  // Event fields
  const [eTitle, setETitle] = useState('');
  const [eDesc, setEDesc] = useState('');
  const [eStartsAt, setEStartsAt] = useState<string>('');
  const [eEndsAt, setEEndsAt] = useState<string>('');

  // Simple attributes cache for quest attribute selection
  const [attributes, setAttributes] = useState<{ id: string; name: string }[]>([]);

  // Fetch all layers
  useEffect(() => {
    const load = async () => {
      try {
        const { data: q } = await supabase.from('quests').select('*').order('created_at', { ascending: false });
        setQuests(q || []);
      } catch (e) {}
      try {
        const { data: s } = await supabase.from('safe_spaces').select('*');
        setSafeSpaces(s || []);
      } catch (e) {}
      try {
        const { data: ev } = await supabase.from('events').select('*');
        setEvents(ev || []);
      } catch (e) {}
      try {
        // Load attributes for quest attribute selection (best-effort)
        const { data: attrs } = await supabase.from('attributes').select('id,name').order('name', { ascending: true });
        setAttributes(attrs || []);
      } catch {}
    };
    load();

    const ch = supabase
      .channel('master_map_all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quests' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'safe_spaces' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => load())
      .subscribe();
    return () => ch.unsubscribe();
  }, []);

  const renderOverlay = (map: any, gl?: any) => {
    // add markers for each entity
    const markers: any[] = [];

    quests.forEach((q) => {
      const lng = q?.lng ?? q?.longitude ?? q?.lon;
      const lat = q?.lat ?? q?.latitude;
      if (lng && lat) {
        const el = document.createElement('div');
        el.className = 'quest-marker-master';
        el.style.cssText = `width: 20px;height: 20px;border-radius: 50%;background:${q.status==='approved'?'#10B981':'#F59E0B'};border:2px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.3);`;
        el.title = `${q.title} (${q.status})`;
        const GL = gl || (window as any).mapboxgl || (window as any).maplibregl;
        if (!GL?.Marker) return;
        markers.push(new GL.Marker(el).setLngLat([lng, lat]).addTo(map));
      }
    });

    safeSpaces.forEach((s) => {
      const lng = s?.lng ?? s?.longitude ?? s?.lon;
      const lat = s?.lat ?? s?.latitude;
      if (lng && lat) {
        const el = document.createElement('div');
        el.className = 'safe-marker-master';
        el.style.cssText = `width: 18px;height: 18px;border-radius: 6px;background:#8B5CF6;border:2px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.25);`;
        el.title = s.name || 'Safe Space';
        const GL = gl || (window as any).mapboxgl || (window as any).maplibregl;
        if (!GL?.Marker) return;
        markers.push(new GL.Marker(el).setLngLat([lng, lat]).addTo(map));
      }
    });

    events.forEach((ev) => {
      const lng = ev?.lng ?? ev?.longitude ?? ev?.lon;
      const lat = ev?.lat ?? ev?.latitude;
      if (lng && lat) {
        const el = document.createElement('div');
        el.className = 'event-marker-master';
        el.style.cssText = `width: 18px;height: 18px;border-radius: 50%;background:#F43F5E;border:2px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.25);`;
        el.title = ev.title || 'Event';
        const GL = gl || (window as any).mapboxgl || (window as any).maplibregl;
        if (!GL?.Marker) return;
        markers.push(new GL.Marker(el).setLngLat([lng, lat]).addTo(map));
      }
    });

    // Click-to-place handler
    if (placeMode) {
      const clickHandler = async (e: any) => {
        const { lng, lat } = e.lngLat || {};
        if (lng == null || lat == null) return;
        if (placeMode === 'quest') {
          await createQuest({
            lat,
            lng,
            title: qTitle || 'Master Quest',
            description: qDesc || 'Created by Master Map',
            reward_coins: qReward || 1,
            qtype: qType || 'text',
            grade_bands: qGradeBands?.length ? qGradeBands : ['ES'],
            seats_total: qSeats || 1,
            attribute_id: qAttribute || undefined,
            image_url: uploadedUrl || undefined,
          });
        } else if (placeMode === 'safe') {
          await createSafeSpace({
            lat,
            lng,
            name: sName || 'Safe Space',
            description: sDesc || null,
            grade_level: sGrade || null,
            contact_info: {
              ...(sContact || {}),
              logo_url: uploadedUrl || undefined,
            },
          });
        } else if (placeMode === 'event') {
          await createEvent({
            lat,
            lng,
            title: eTitle || 'Event',
            description: eDesc || null,
            starts_at: eStartsAt || new Date().toISOString(),
            ends_at: eEndsAt || null,
            image_url: uploadedUrl || undefined,
          });
        }
        setPlaceMode(null);
        try { map.off('click', clickHandler); } catch {}
      };
      try { map.on('click', clickHandler); } catch {}
    }

    // Render-only function; cleanup is handled inline after click and on next render
    return null;
  };

  // Quick create helpers
  const createQuest = async (payload: Partial<any>) => {
    try {
      // Ensure we pass a valid attribute_id by resolving one from attributes table if not provided
      let attributeId = payload.attribute_id as string | undefined;
      if (!attributeId) {
        const { data: attrs } = await supabase
          .from('attributes')
          .select('id,name')
          .order('name', { ascending: true })
          .limit(1);
        attributeId = attrs?.[0]?.id ?? null;
      }
      const { error } = await supabase.rpc('create_quest', {
        p_title: payload.title || 'Master Quest',
        p_description: payload.description || 'Created by Master Map',
        p_attribute_id: attributeId || null,
        p_reward_coins: payload.reward_coins || 1,
        p_qtype: payload.qtype || 'text',
        p_grade_bands: payload.grade_bands || ['ES'],
        p_seats_total: payload.seats_total || 1,
        p_lat: payload.lat || null,
        p_lng: payload.lng || null,
        p_config: payload.config || { meta: { from: 'master_map', image_url: payload.image_url || null } },
      });
      if (error) throw error;
      showSuccess('Quest created');
    } catch (e: any) {
      showError('Create quest failed', e.message || String(e));
    }
  };

  const createSafeSpace = async (payload: Partial<any>) => {
    try {
      // Only include known columns; stash logo URL inside contact_info if provided
      const row: any = {
        name: payload.name || 'Safe Space',
        description: payload.description || null,
        grade_level: payload.grade_level || null,
        contact_info: payload.contact_info || (uploadedUrl ? { logo_url: uploadedUrl } : null),
        lat: payload.lat,
        lng: payload.lng,
        approved: true,
      };
      const { error } = await supabase.from('safe_spaces').insert(row);
      if (error) throw error;
      showSuccess('Safe space created');
    } catch (e: any) {
      showError('Create safe space failed', e.message || String(e));
    }
  };

  const createEvent = async (payload: Partial<any>) => {
    try {
      // Insert only common fields that are known to exist
      const row: any = {
        title: payload.title || 'Event',
        description: payload.description || null,
        lat: payload.lat,
        lng: payload.lng,
        starts_at: payload.starts_at || new Date().toISOString(),
      };
      const { error } = await supabase.from('events').insert(row);
      if (error) throw error;
      showSuccess('Event created');
    } catch (e: any) {
      showError('Create event failed', e.message || String(e));
    }
  };

  // File upload helper (best-effort)
  const uploadLogo = async (file: File) => {
    try {
      setUploading(true);
      const bucket = 'map_assets';
      const ext = file.name.split('.').pop() || 'png';
      const path = `${createType || 'misc'}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, cacheControl: '3600' });
      if (upErr) {
        const msg = upErr.message?.toLowerCase?.() || '';
        if (msg.includes('bucket not found') || (upErr as any).status === 404) {
          showError(
            'Bucket missing',
            "Storage bucket 'map_assets' not found. Create a public bucket named 'map_assets' in Supabase Storage or update MasterMap to use an existing bucket.",
          );
        } else {
          showError('Upload failed', upErr.message || 'Unable to upload file');
        }
        setUploading(false);
        return;
      }
      const { data: pub } = await supabase.storage.from(bucket).getPublicUrl(path);
      const url = pub?.publicUrl || null;
      setUploadedUrl(url);
      showSuccess('Logo uploaded');
    } catch (e: any) {
      showError('Upload error', e.message || String(e));
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setUploadedUrl(null);
    setQTitle(''); setQDesc(''); setQReward(5); setQType('text'); setQGradeBands(['ES']); setQSeats(1); setQAttribute(null);
    setSName(''); setSDesc(''); setSGrade(null); setSContact(null);
    setETitle(''); setEDesc(''); setEStartsAt(''); setEEndsAt('');
  };

  if (role !== 'master_admin') {
    return (
      <div className='text-white/80 text-sm'>Master admin access required to view map.</div>
    );
  }

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap gap-2 items-center'>
        <button
          className={`px-3 py-2 rounded flex items-center gap-2 ${createType==='quest'&&showForm?'bg-electric-blue-600 text-white':'bg-white/10'}`}
          onClick={() => { setCreateType('quest'); setShowForm(true); setPlaceMode(null); }}
        >
          <Plus className='w-4 h-4' /> New Quest
        </button>
        <button
          className={`px-3 py-2 rounded flex items-center gap-2 ${createType==='safe'&&showForm?'bg-violet-700 text-white':'bg-white/10'}`}
          onClick={() => { setCreateType('safe'); setShowForm(true); setPlaceMode(null); }}
        >
          <Shield className='w-4 h-4' /> New Safe Space
        </button>
        <button
          className={`px-3 py-2 rounded flex items-center gap-2 ${createType==='event'&&showForm?'bg-rose-700 text-white':'bg-white/10'}`}
          onClick={() => { setCreateType('event'); setShowForm(true); setPlaceMode(null); }}
        >
          <Calendar className='w-4 h-4' /> New Event
        </button>
        {placeMode && (
          <div className='text-sm text-gray-200 ml-2'>Tip: click on the map to place the {placeMode}. Press ESC to cancel.</div>
        )}
      </div>
      {showForm && (
        <div className='rounded-xl bg-white/5 border border-white/10 p-4 space-y-3'>
          <div className='flex items-center justify-between'>
            <div className='text-white font-semibold'>Create {createType}</div>
            <button className='text-white/70 hover:text-white' onClick={() => { setShowForm(false); setCreateType(null); resetForm(); }}>
              <X className='w-5 h-5' />
            </button>
          </div>
          {/* Shared logo upload */}
          <div className='grid md:grid-cols-3 gap-3 items-end'>
            <div className='md:col-span-2'>
              <label className='block text-xs text-gray-300 mb-1'>Logo/Image (optional)</label>
              <div className='flex items-center gap-3'>
                <input
                  type='file'
                  accept='image/*'
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadLogo(f);
                  }}
                  className='block w-full text-sm text-gray-200 file:mr-2 file:py-2 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20'
                />
                {uploadedUrl && (
                  <img src={uploadedUrl} alt='preview' className='w-12 h-12 rounded object-cover border border-white/20' />
                )}
              </div>
              {uploading && <div className='text-xs text-gray-400 mt-1'>Uploading...</div>}
            </div>
            <div className='text-right'>
              <button
                disabled={placeMode!=null}
                className={`px-3 py-2 rounded ${placeMode? 'bg-white/10 text-white/60':'bg-white/20 text-white hover:bg-white/30'}`}
                onClick={() => {
                  // Enter place mode after basic validation
                  if (createType === 'quest') {
                    if (!qTitle.trim()) return showError('Missing title', 'Please enter a quest title.');
                  } else if (createType === 'safe') {
                    if (!sName.trim()) return showError('Missing name', 'Please enter a safe space name.');
                  } else if (createType === 'event') {
                    if (!eTitle.trim()) return showError('Missing title', 'Please enter an event title.');
                  }
                  setPlaceMode(createType);
                  showSuccess('Placement mode', 'Click on the map to place the item.');
                }}
              >
                Next: Click map to place
              </button>
            </div>
          </div>

          {/* Type-specific fields */}
          {createType === 'quest' && (
            <div className='grid md:grid-cols-3 gap-3'>
              <div>
                <label htmlFor='q-title' className='block text-xs text-gray-300 mb-1'>Title</label>
                <input id='q-title' value={qTitle} onChange={(e) => setQTitle(e.target.value)} className='w-full bg-white/10 rounded px-3 py-2 text-white' />
              </div>
              <div>
                <label className='block text-xs text-gray-300 mb-1'>Reward Coins</label>
                <input type='number' value={qReward} onChange={(e) => setQReward(parseInt(e.target.value||'0',10))} className='w-full bg-white/10 rounded px-3 py-2 text-white' />
              </div>
              <div>
                <label className='block text-xs text-gray-300 mb-1'>Type</label>
                <select value={qType} onChange={(e) => setQType(e.target.value as any)} className='w-full bg-white/10 rounded px-3 py-2 text-white'>
                  <option value='text'>Text</option>
                  <option value='photo'>Photo</option>
                  <option value='mcq'>MCQ</option>
                  <option value='checkin'>Check-in</option>
                </select>
              </div>
              <div className='md:col-span-3'>
                <label className='block text-xs text-gray-300 mb-1'>Description</label>
                <textarea value={qDesc} onChange={(e) => setQDesc(e.target.value)} rows={2} className='w-full bg-white/10 rounded px-3 py-2 text-white' />
              </div>
              <div>
                <label className='block text-xs text-gray-300 mb-1'>Grade Bands</label>
                <select multiple value={qGradeBands as any} onChange={(e) => setQGradeBands(Array.from(e.target.selectedOptions).map(o=>o.value))} className='w-full bg-white/10 rounded px-3 py-2 text-white'>
                  <option value='ES'>ES</option>
                  <option value='MS'>MS</option>
                  <option value='HS'>HS</option>
                </select>
              </div>
              <div>
                <label className='block text-xs text-gray-300 mb-1'>Seats Total</label>
                <input type='number' value={qSeats} onChange={(e) => setQSeats(parseInt(e.target.value||'1',10))} className='w-full bg-white/10 rounded px-3 py-2 text-white' />
              </div>
              <div>
                <label className='block text-xs text-gray-300 mb-1'>Attribute</label>
                <select value={qAttribute || ''} onChange={(e)=> setQAttribute(e.target.value||null)} className='w-full bg-white/10 rounded px-3 py-2 text-white'>
                  <option value=''>Auto-pick</option>
                  {attributes.map((a)=> (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {createType === 'safe' && (
            <div className='grid md:grid-cols-3 gap-3'>
              <div>
                <label className='block text-xs text-gray-300 mb-1'>Name</label>
                <input value={sName} onChange={(e) => setSName(e.target.value)} className='w-full bg-white/10 rounded px-3 py-2 text-white' />
              </div>
              <div>
                <label className='block text-xs text-gray-300 mb-1'>Grade Level</label>
                <select value={sGrade || ''} onChange={(e)=> setSGrade(e.target.value||null)} className='w-full bg-white/10 rounded px-3 py-2 text-white'>
                  <option value=''>All</option>
                  <option value='ES'>ES</option>
                  <option value='MS'>MS</option>
                  <option value='HS'>HS</option>
                </select>
              </div>
              <div className='md:col-span-3'>
                <label className='block text-xs text-gray-300 mb-1'>Description</label>
                <textarea value={sDesc} onChange={(e) => setSDesc(e.target.value)} rows={2} className='w-full bg-white/10 rounded px-3 py-2 text-white' />
              </div>
              <div className='md:col-span-3'>
                <label className='block text-xs text-gray-300 mb-1'>Contact (optional)</label>
                <div className='grid md:grid-cols-2 gap-2'>
                  <input placeholder='Phone' onChange={(e)=> setSContact({ ...(sContact||{}), phone: e.target.value })} className='w-full bg-white/10 rounded px-3 py-2 text-white' />
                  <input placeholder='Email' onChange={(e)=> setSContact({ ...(sContact||{}), email: e.target.value })} className='w-full bg-white/10 rounded px-3 py-2 text-white' />
                </div>
              </div>
            </div>
          )}
          {createType === 'event' && (
            <div className='grid md:grid-cols-3 gap-3'>
              <div>
                <label className='block text-xs text-gray-300 mb-1'>Title</label>
                <input value={eTitle} onChange={(e) => setETitle(e.target.value)} className='w-full bg-white/10 rounded px-3 py-2 text-white' />
              </div>
              <div>
                <label className='block text-xs text-gray-300 mb-1'>Starts At</label>
                <input type='datetime-local' value={eStartsAt} onChange={(e) => setEStartsAt(e.target.value)} className='w-full bg-white/10 rounded px-3 py-2 text-white' />
              </div>
              <div>
                <label className='block text-xs text-gray-300 mb-1'>Ends At (optional)</label>
                <input type='datetime-local' value={eEndsAt} onChange={(e) => setEEndsAt(e.target.value)} className='w-full bg-white/10 rounded px-3 py-2 text-white' />
              </div>
              <div className='md:col-span-3'>
                <label className='block text-xs text-gray-300 mb-1'>Description</label>
                <textarea value={eDesc} onChange={(e) => setEDesc(e.target.value)} rows={2} className='w-full bg-white/10 rounded px-3 py-2 text-white' />
              </div>
            </div>
          )}
        </div>
      )}
      {placeMode && (
        <EscCatcher onEsc={() => setPlaceMode(null)} />
      )}
      <div className='rounded-xl overflow-hidden' style={{ minHeight: 500 }}>
        <MapView renderOverlay={renderOverlay} />
      </div>
    </div>
  );
}

// Helper component to handle global ESC key cancel
function EscCatcher({ onEsc }: { onEsc: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEsc();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onEsc]);
  return null;
}
