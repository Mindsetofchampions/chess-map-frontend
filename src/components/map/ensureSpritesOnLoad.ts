import type mapboxgl from 'mapbox-gl';
import { registerPersonaSprites } from '../../lib/sprites';

/**
 * Ensure persona sprites are loaded in Mapbox map
 * Call this after map 'load' event
 */
export async function ensurePersonaSprites(map: mapboxgl.Map): Promise<void> {
  try {
    await registerPersonaSprites(map);
    console.log('✅ Persona sprites registered successfully');
  } catch (error) {
    console.error('❌ Failed to register persona sprites:', error);
    // Don't throw - allow map to continue functioning without sprites
  }
}