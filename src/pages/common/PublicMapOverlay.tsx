import React, { useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';

interface Props {
  map: any;
}

// Public overlay to show shared layers like safe spaces and events for all roles
const PublicMapOverlay: React.FC<Props> = ({ map }) => {
  const [safeSpaces, setSafeSpaces] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const markersRef = useRef<any[]>([]);

  // Load and subscribe
  useEffect(() => {
    if (!map) return;
    const load = async () => {
      try {
        const { data: s } = await supabase.from('safe_spaces').select('*').eq('approved', true);
        setSafeSpaces(s || []);
      } catch {}
      try {
        const { data: ev } = await supabase.from('events').select('*');
        setEvents(ev || []);
      } catch {}
    };
    load();
    const ch = supabase
      .channel('public_layers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'safe_spaces' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, load)
      .subscribe();
    return () => ch.unsubscribe();
  }, [map]);

  // Render markers and clean up on change
  useEffect(() => {
    if (!map) return;
    const GL: any = (window as any).mapboxgl || (window as any).maplibregl;
    if (!GL || !GL.Marker) return;
    // clear old
    markersRef.current.forEach((m) => m?.remove?.());
    markersRef.current = [];

    // safe spaces (violet)
    safeSpaces.forEach((s) => {
      const lng = s?.lng ?? s?.longitude ?? s?.lon;
      const lat = s?.lat ?? s?.latitude;
      if (lng && lat) {
        const el = document.createElement('div');
        el.className = 'safe-space-public';
        el.style.cssText =
          'width:16px;height:16px;border-radius:6px;background:#8B5CF6;border:2px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.25);';
        el.title = s.name || 'Safe Space';
        const marker = new GL.Marker(el).setLngLat([lng, lat]).addTo(map);
        markersRef.current.push(marker);
      }
    });

    // events (rose)
    events.forEach((ev) => {
      const lng = ev?.lng ?? ev?.longitude ?? ev?.lon;
      const lat = ev?.lat ?? ev?.latitude;
      if (lng && lat) {
        const el = document.createElement('div');
        el.className = 'event-public';
        el.style.cssText =
          'width:14px;height:14px;border-radius:50%;background:#F43F5E;border:2px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.25);';
        el.title = ev.title || 'Event';
        const marker = new GL.Marker(el).setLngLat([lng, lat]).addTo(map);
        markersRef.current.push(marker);
      }
    });

    return () => {
      markersRef.current.forEach((m) => m?.remove?.());
      markersRef.current = [];
    };
  }, [map, safeSpaces, events]);

  return null;
};

export default PublicMapOverlay;
