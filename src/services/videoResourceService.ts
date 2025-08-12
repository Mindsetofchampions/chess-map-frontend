import supabase from './supabaseClient';
import { VideoResource, PersonaKey } from '../types';

/**
 * Allowed video hosting platforms for safety
 */
const ALLOWED_VIDEO_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'vimeo.com',
  'player.vimeo.com',
  'ted.com',
  'embed.ted.com',
  'khanacademy.org',
  'www.khanacademy.org'
];

/**
 * Check if video URL is from an allowed host
 */
export function isVideoUrlSafe(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ALLOWED_VIDEO_HOSTS.some(host => 
      urlObj.hostname === host || urlObj.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}

/**
 * Convert YouTube URL to embed format
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // Handle youtu.be short links
    if (urlObj.hostname === 'youtu.be') {
      const videoId = urlObj.pathname.slice(1);
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    
    // Handle standard YouTube URLs
    if (urlObj.hostname === 'youtube.com' || urlObj.hostname === 'www.youtube.com') {
      const videoId = urlObj.searchParams.get('v');
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Get Vimeo embed URL
 */
export function getVimeoEmbedUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    if (urlObj.hostname === 'vimeo.com') {
      const videoId = urlObj.pathname.split('/')[1];
      if (videoId) {
        return `https://player.vimeo.com/video/${videoId}`;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Get appropriate embed URL for any supported video platform
 */
export function getVideoEmbedUrl(url: string): string | null {
  if (!isVideoUrlSafe(url)) {
    return null;
  }

  // Try YouTube first
  const youtubeEmbed = getYouTubeEmbedUrl(url);
  if (youtubeEmbed) {
    return youtubeEmbed;
  }

  // Try Vimeo
  const vimeoEmbed = getVimeoEmbedUrl(url);
  if (vimeoEmbed) {
    return vimeoEmbed;
  }

  // For other platforms, return the original URL if it's safe
  return url;
}

/**
 * Fetch video resources by persona with organization filtering
 */
export async function getVideoResourcesByPersona(
  personaKey: PersonaKey,
  orgId?: string
): Promise<VideoResource[]> {
  try {
    let query = supabase
      .from('video_resources')
      .select('*')
      .eq('persona_key', personaKey);

    // Prefer org videos, include global ones
    if (orgId) {
      query = query.or(`org_id.eq.${orgId},org_id.is.null`);
    } else {
      query = query.is('org_id', null);
    }

    const { data, error } = await query.order('fetched_at', { ascending: false });

    if (error) {
      console.error('Error fetching video resources:', error);
      return [];
    }

    // Filter out unsafe URLs on the client side
    return (data || []).filter(video => isVideoUrlSafe(video.video_url)) as VideoResource[];
  } catch (error) {
    console.error('Error in getVideoResourcesByPersona:', error);
    return [];
  }
}

/**
 * Get random video resource for a persona
 */
export async function getRandomVideoResource(
  personaKey: PersonaKey,
  orgId?: string
): Promise<VideoResource | null> {
  const videos = await getVideoResourcesByPersona(personaKey, orgId);
  
  if (videos.length === 0) {
    return null;
  }
  
  const randomIndex = Math.floor(Math.random() * videos.length);
  return videos[randomIndex];
}

/**
 * Get all video resources with pagination
 */
export async function getAllVideoResources(options: {
  page?: number;
  pageSize?: number;
  orgId?: string;
} = {}): Promise<{
  videos: VideoResource[];
  total: number;
  hasMore: boolean;
}> {
  const { page = 1, pageSize = 20, orgId } = options;
  const offset = (page - 1) * pageSize;

  try {
    let query = supabase
      .from('video_resources')
      .select('*', { count: 'exact' });

    if (orgId) {
      query = query.or(`org_id.eq.${orgId},org_id.is.null`);
    }

    const { data, error, count } = await query
      .order('fetched_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Error fetching all video resources:', error);
      return { videos: [], total: 0, hasMore: false };
    }

    const total = count || 0;
    const hasMore = offset + pageSize < total;
    const safeVideos = (data || []).filter(video => isVideoUrlSafe(video.video_url));

    return {
      videos: safeVideos as VideoResource[],
      total,
      hasMore
    };
  } catch (error) {
    console.error('Error in getAllVideoResources:', error);
    return { videos: [], total: 0, hasMore: false };
  }
}