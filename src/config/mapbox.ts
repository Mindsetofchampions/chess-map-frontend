/**
 * Mapbox Configuration
 * 
 * Centralized configuration for Mapbox GL JS with proper error handling
 * and environment variable validation.
 */

// Import environment variables with fallbacks
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ||
                    import.meta.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
                    import.meta.env.VITE_MAPBOX_TOKEN_PK;

const MAPBOX_STYLE = import.meta.env.VITE_MAP_STYLE_URL ||
                    import.meta.env.VITE_MAPBOX_STYLE ||
                    'mapbox://styles/mapbox/dark-v11'; // Default fallback

/**
 * Validate token format (only if token is provided)
 */
const isValidMapboxToken = (token?: string): boolean => {
  if (!token) return false;
  if (token.includes('YOUR_') || token.includes('example_')) return false;
  return token.startsWith('pk.');
};

/**
 * Check if we have a valid Mapbox configuration
 */
const hasValidMapboxConfig = (): boolean => {
  return isValidMapboxToken(MAPBOX_TOKEN);
};

/**
 * Get map configuration with fallbacks
 */
const getMapConfig = () => {
  return {
    token: MAPBOX_TOKEN,
    style: MAPBOX_STYLE,
    hasValidToken: hasValidMapboxConfig(),
    ...MAP_CONFIG
  };
}

/**
 * Export validated configuration
 */
export { MAPBOX_TOKEN, MAPBOX_STYLE };

/**
 * Default map configuration
 */
export const MAP_CONFIG = {
  center: [-75.1652, 39.9526] as [number, number], // Philadelphia coordinates
  zoom: 12,
  pitch: 0,
  bearing: 0,
  attributionControl: false,
  navigationControl: true,
  fullscreenControl: true,
  maxZoom: 18,
  minZoom: 8,
} as const;