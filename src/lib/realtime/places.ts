/**
 * Realtime subscriptions for map places: safe_spaces and events
 */
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import { supabase, SUPABASE_ENV_VALID } from '@/lib/supabase';

export interface SafeSpaceRow {
  id: string;
  name: string;
  description?: string | null;
  lat: number | null;
  lng: number | null;
  approved?: boolean | null;
  address?: string | null;
  logo_url?: string | null;
}

export interface EventRow {
  id: string;
  title: string;
  description?: string | null;
  lat: number | null;
  lng: number | null;
  starts_at?: string | null;
  persona_key?: string | null;
}

export interface Subscription {
  unsubscribe(): void;
}

type ChangeType = 'INSERT' | 'UPDATE' | 'DELETE';

export function subscribeToSafeSpaces(
  onChange: (type: ChangeType, row: SafeSpaceRow) => void,
): Subscription {
  const channel = supabase
    .channel('safe_spaces_realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'safe_spaces' },
      (payload: RealtimePostgresChangesPayload<SafeSpaceRow>) => {
        const row = (payload.new || payload.old) as SafeSpaceRow;
        if (!row) return;
        onChange(payload.eventType as ChangeType, row);
      },
    )
    .subscribe();

  return { unsubscribe: () => supabase.removeChannel(channel) };
}

export function subscribeToEvents(
  onChange: (type: ChangeType, row: EventRow) => void,
): Subscription {
  const channel = supabase
    .channel('events_realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'events' },
      (payload: RealtimePostgresChangesPayload<EventRow>) => {
        const row = (payload.new || payload.old) as EventRow;
        if (!row) return;
        onChange(payload.eventType as ChangeType, row);
      },
    )
    .subscribe();

  return { unsubscribe: () => supabase.removeChannel(channel) };
}

export async function fetchSafeSpaces(): Promise<SafeSpaceRow[]> {
  // Prefer view that provides derived logo_url from contact_info->>logo_url or image_url
  const { data, error } = await supabase
    .from('v_safe_spaces_public')
    .select('id,name,description,lat,lng,approved,address,logo_url');
  if (error || !SUPABASE_ENV_VALID) {
    if (error) console.warn('fetchSafeSpaces error:', error.message);
    return [];
  }
  return (data as SafeSpaceRow[]).filter((r) => r.lat != null && r.lng != null && r.approved !== false);
}

export async function fetchEvents(): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from('events')
    .select('id,title,description,lat,lng,starts_at,persona_key');
  if (error || !SUPABASE_ENV_VALID) {
    if (error) console.warn('fetchEvents error:', error.message);
    return [];
  }
  return (data as EventRow[]).filter((r) => r.lat != null && r.lng != null);
}
