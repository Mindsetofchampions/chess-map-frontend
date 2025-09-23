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

  const renderOverlay = (map: any) => {
    // add markers for each entity
    const markers: any[] = [];

    quests.forEach((q) => {
      if (q.lng && q.lat) {
        const el = document.createElement('div');
        el.className = 'quest-marker-master';
        el.style.cssText = `width: 20px;height: 20px;border-radius: 50%;background:${q.status==='approved'?'#10B981':'#F59E0B'};border:2px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.3);`;
        el.title = `${q.title} (${q.status})`;
        markers.push(new (window as any).mapboxgl.Marker(el).setLngLat([q.lng, q.lat]).addTo(map));
      }
    });

    safeSpaces.forEach((s) => {
      if (s.lng && s.lat) {
        const el = document.createElement('div');
        el.className = 'safe-marker-master';
        el.style.cssText = `width: 18px;height: 18px;border-radius: 6px;background:#8B5CF6;border:2px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.25);`;
        el.title = s.name || 'Safe Space';
        markers.push(new (window as any).mapboxgl.Marker(el).setLngLat([s.lng, s.lat]).addTo(map));
      }
    });

    events.forEach((ev) => {
      if (ev.lng && ev.lat) {
        const el = document.createElement('div');
        el.className = 'event-marker-master';
        el.style.cssText = `width: 18px;height: 18px;border-radius: 50%;background:#F43F5E;border:2px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.25);`;
        el.title = ev.title || 'Event';
        markers.push(new (window as any).mapboxgl.Marker(el).setLngLat([ev.lng, ev.lat]).addTo(map));
      }
    });

    // return a cleanup function for MapView to call on re-render if needed
    return null;
  };

  // Quick create helpers
  const createQuest = async (payload: Partial<any>) => {
    try {
  const { error } = await supabase.rpc('create_quest', {
        p_title: payload.title || 'Master Quest',
        p_description: payload.description || 'Created by Master Map',
        p_attribute_id: payload.attribute_id || null,
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
      <div className='flex gap-2'>
        <button className='px-3 py-2 rounded bg-white/10 flex items-center gap-2' onClick={() => createQuest({})}>
          <Plus className='w-4 h-4' /> Create Quest
        </button>
        <button className='px-3 py-2 rounded bg-white/10 flex items-center gap-2' onClick={() => createSafeSpace({ lat: 39.9526, lng: -75.1652 })}>
          <Shield className='w-4 h-4' /> Add Safe Space
        </button>
        <button className='px-3 py-2 rounded bg-white/10 flex items-center gap-2' onClick={() => createEvent({ lat: 39.95, lng: -75.17 })}>
          <Calendar className='w-4 h-4' /> Add Event
        </button>
      </div>
      <div className='rounded-xl overflow-hidden' style={{ minHeight: 500 }}>
        <MapView renderOverlay={renderOverlay} />
      </div>
    </div>
  );
}
