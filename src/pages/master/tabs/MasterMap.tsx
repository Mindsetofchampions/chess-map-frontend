import { useEffect, useState } from 'react';
import { Plus, Shield, Calendar } from 'lucide-react';

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
          await createQuest({ lat, lng, reward_coins: 5, qtype: 'text', grade_bands: ['ES'] });
        } else if (placeMode === 'safe') {
          await createSafeSpace({ lat, lng });
        } else if (placeMode === 'event') {
          await createEvent({ lat, lng });
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
        p_config: payload.config || { meta: { from: 'master_map' } },
      });
      if (error) throw error;
      showSuccess('Quest created');
    } catch (e: any) {
      showError('Create quest failed', e.message || String(e));
    }
  };

  const createSafeSpace = async (payload: Partial<any>) => {
    try {
      const { error } = await supabase.from('safe_spaces').insert({
        name: payload.name || 'Safe Space',
        lat: payload.lat,
        lng: payload.lng,
        approved: true,
      });
      if (error) throw error;
      showSuccess('Safe space created');
    } catch (e: any) {
      showError('Create safe space failed', e.message || String(e));
    }
  };

  const createEvent = async (payload: Partial<any>) => {
    try {
      const { error } = await supabase.from('events').insert({
        title: payload.title || 'Event',
        description: payload.description || null,
        lat: payload.lat,
        lng: payload.lng,
        starts_at: payload.starts_at || new Date().toISOString(),
      });
      if (error) throw error;
      showSuccess('Event created');
    } catch (e: any) {
      showError('Create event failed', e.message || String(e));
    }
  };

  if (role !== 'master_admin') {
    return (
      <div className='text-white/80 text-sm'>Master admin access required to view map.</div>
    );
  }

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap gap-2 items-center'>
        <button className={`px-3 py-2 rounded flex items-center gap-2 ${placeMode==='quest'?'bg-electric-blue-600 text-white':'bg-white/10'}`} onClick={() => setPlaceMode(placeMode==='quest'?null:'quest')}>
          <Plus className='w-4 h-4' /> {placeMode==='quest'?'Click to place quest':'Place Quest'}
        </button>
        <button className={`px-3 py-2 rounded flex items-center gap-2 ${placeMode==='safe'?'bg-violet-700 text-white':'bg-white/10'}`} onClick={() => setPlaceMode(placeMode==='safe'?null:'safe')}>
          <Shield className='w-4 h-4' /> {placeMode==='safe'?'Click to place safe space':'Place Safe Space'}
        </button>
        <button className={`px-3 py-2 rounded flex items-center gap-2 ${placeMode==='event'?'bg-rose-700 text-white':'bg-white/10'}`} onClick={() => setPlaceMode(placeMode==='event'?null:'event')}>
          <Calendar className='w-4 h-4' /> {placeMode==='event'?'Click to place event':'Place Event'}
        </button>
        <button className='px-3 py-2 rounded bg-white/10' onClick={() => setPlaceMode(null)}>Cancel</button>
        {placeMode && (
          <div className='text-sm text-gray-200 ml-2'>Tip: click on the map to create a new {placeMode}. Press ESC to cancel.</div>
        )}
      </div>
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
