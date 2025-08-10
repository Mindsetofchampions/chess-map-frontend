/**
 * Mapbox Configuration
 * 
 * Centralized configuration for Mapbox GL JS with proper error handling
 * and environment variable validation.
 */

// Import environment variables with proper error handling
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN_PK;
const MAPBOX_STYLE = import.meta.env.VITE_MAPBOX_STYLE;

/**
 * Validate required Mapbox environment variables
 */
if (!MAPBOX_TOKEN) {
  throw new Error(
    'Missing VITE_MAPBOX_TOKEN_PK environment variable. ' +
    'Please add it to your .env file and restart the development server.'
  );
}

if (!MAPBOX_STYLE) {
  throw new Error(
    'Missing VITE_MAPBOX_STYLE environment variable. ' +
    'Please add it to your .env file and restart the development server.'
  );
}

/**
 * Validate token format
 */
if (!MAPBOX_TOKEN.startsWith('pk.')) {
  throw new Error(
    'Invalid Mapbox token format. Token should start with "pk."'
  );
}

/**
 * Export validated configuration
 */
export { MAPBOX_TOKEN, MAPBOX_STYLE };

/**
 * Default map configuration
 */
export const MAP_CONFIG = {
  center: [-74.006, 40.7128] as [number, number], // NYC coordinates
  zoom: 10,
  pitch: 0,
  bearing: 0,
  attributionControl: true,
  navigationControl: true,
  fullscreenControl: true,
} as const;