import supabase from './supabaseClient';
import { PublicEvent, PersonaKey } from '../types';

/**
 * Parameters for searching public events
 */
interface SearchEventsParams {
  q?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  personaKey?: PersonaKey;
  limit?: number;
}

/**
 * Search public events using edge function with fallback
 */
export async function searchPublicEvents(params: SearchEventsParams): Promise<PublicEvent[]> {
  try {
    // Try edge function first
    const { data, error } = await supabase.functions.invoke('search_public_events', {
      body: {
        q: params.q || '',
        lat: params.lat,
        lng: params.lng,
        radius: params.radius || 10,
        personaKey: params.personaKey,
        limit: params.limit || 20
      }
    });

    if (error) {
      console.warn('Edge function not available, falling back to database:', error);
      return await getLocalEvents(params.lat || 39.9526, params.lng || -75.1652, params.radius || 25);
    }

    return data?.events || [];
  } catch (error) {
    console.warn('Event search failed, returning local events:', error);
    return await getLocalEvents(params.lat || 39.9526, params.lng || -75.1652, params.radius || 25);
  }
}

/**
 * Get local events from database with basic distance filtering
 */
export async function getLocalEvents(
  lat: number,
  lng: number,
  radius: number = 25
): Promise<PublicEvent[]> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .order('starts_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('Error fetching local events:', error);
      return [];
    }

    if (!data) return [];

    // Simple distance filtering (rough calculation for demo)
    const filteredEvents = data.filter(event => {
      if (!event.lat || !event.lng) return false;
      
      // Rough distance calculation in degrees (not precise, but good for demo)
      const distance = Math.sqrt(
        Math.pow(event.lat - lat, 2) + Math.pow(event.lng - lng, 2)
      );
      
      // Convert radius from miles to rough degrees (1 degree ≈ 69 miles)
      const radiusInDegrees = radius / 69;
      
      return distance <= radiusInDegrees;
    });

    return filteredEvents.map(normalizeEventData);
  } catch (error) {
    console.error('Error in getLocalEvents:', error);
    return [];
  }
}

/**
 * Normalize event data from various sources
 */
export function normalizeEventData(rawEvent: any): PublicEvent {
  return {
    id: rawEvent.id || `event_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    title: rawEvent.title || rawEvent.name || 'Untitled Event',
    description: rawEvent.description || rawEvent.summary,
    starts_at: rawEvent.starts_at || rawEvent.start_time || rawEvent.date,
    location: rawEvent.location || rawEvent.venue || 'Location TBD',
    lat: rawEvent.lat || rawEvent.latitude,
    lng: rawEvent.lng || rawEvent.longitude,
    url: rawEvent.url || rawEvent.source_url,
    persona_key: rawEvent.persona_key,
    org_id: rawEvent.org_id
  };
}

/**
 * Get events by persona with organization filtering
 */
export async function getEventsByPersona(
  personaKey: PersonaKey,
  orgId?: string
): Promise<PublicEvent[]> {
  try {
    let query = supabase
      .from('events')
      .select('*')
      .eq('persona_key', personaKey);

    if (orgId) {
      query = query.or(`org_id.eq.${orgId},org_id.is.null`);
    } else {
      query = query.is('org_id', null);
    }

    const { data, error } = await query
      .order('starts_at', { ascending: true })
      .limit(20);

    if (error) {
      console.error('Error fetching events by persona:', error);
      return [];
    }

    return (data || []).map(normalizeEventData);
  } catch (error) {
    console.error('Error in getEventsByPersona:', error);
    return [];
  }
}

/**
 * Get upcoming events
 */
export async function getUpcomingEvents(limit: number = 10): Promise<PublicEvent[]> {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('starts_at', now)
      .order('starts_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching upcoming events:', error);
      return [];
    }

    return (data || []).map(normalizeEventData);
  } catch (error) {
    console.error('Error in getUpcomingEvents:', error);
    return [];
  }
}