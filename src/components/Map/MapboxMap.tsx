/**
 * Enhanced Mapbox Map Component with Persona Sprites
 * 
 * Features comprehensive map functionality including persona sprites,
 * hover effects, popups, loading states, and Supabase data integration.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { motion, AnimatePresence } from 'framer-motion';
import { MAPBOX_TOKEN, MAPBOX_STYLE, MAP_CONFIG } from '../../config/mapbox';
import { loadPersonaSprites, getSpriteId, PersonaType } from './sprites';
import { MapPin, Maximize, Navigation } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

/**
 * Map point data interface
 */
export interface MapPoint {
  id: string;
  name: string;
  description?: string;
  coordinates: [number, number]; // [lng, lat]
  persona: PersonaType;
  type: 'organization' | 'event';
  metadata?: Record<string, any>;
}

/**
 * MapboxMap component props
 */
interface MapboxMapProps {
  /** Center coordinates [lng, lat] */
  center?: [number, number];
  /** Initial zoom level */
  zoom?: number;
  /** Array of points to display on map */
  points?: MapPoint[];
  /** Callback when marker is clicked */
  onMarkerClick?: (point: MapPoint) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Enhanced Mapbox Map Component
 * 
 * Features:
 * - Loading overlay until map is fully ready
 * - Persona-specific sprites with hover effects
 * - Click popups with organization/event information
 * - Real-time updates when points data changes
 * - Navigation and fullscreen controls
 * - Error handling with user-friendly messages
 */
const MapboxMap: React.FC<MapboxMapProps> = ({
  center = MAP_CONFIG.center,
  zoom = MAP_CONFIG.zoom,
  points = [],
  onMarkerClick,
  className = ''
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

  /**
   * Initialize Mapbox map
   */
  const initializeMap = useCallback(async () => {
    if (!mapContainer.current || map.current) return;

    try {
      setIsLoading(true);
      setError(null);

      // Set Mapbox access token
      mapboxgl.accessToken = MAPBOX_TOKEN;

      // Create map instance
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: MAPBOX_STYLE,
        center,
        zoom,
        pitch: MAP_CONFIG.pitch,
        bearing: MAP_CONFIG.bearing,
        attributionControl: MAP_CONFIG.attributionControl,
      });

      // Add navigation controls
      if (MAP_CONFIG.navigationControl) {
        const nav = new mapboxgl.NavigationControl();
        map.current.addControl(nav, 'top-right');
      }

      // Add fullscreen control
      if (MAP_CONFIG.fullscreenControl) {
        const fullscreen = new mapboxgl.FullscreenControl();
        map.current.addControl(fullscreen, 'top-right');
      }

      // Wait for map to load
      map.current.on('load', async () => {
        try {
          if (!map.current) return;

          // Load persona sprites
          await loadPersonaSprites(map.current);

          // Add data source
          map.current.addSource('points', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: []
            }
          });

          // Add symbol layer
          map.current.addLayer({
            id: 'points-layer',
            type: 'symbol',
            source: 'points',
            layout: {
              'icon-image': ['get', 'sprite'],
              'icon-size': 1,
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
            }
          });

          // Set up mouse events
          setupMapInteractions();

          setIsLoading(false);
        } catch (err: any) {
          console.error('Failed to setup map:', err);
          setError(`Failed to setup map: ${err.message}`);
          setIsLoading(false);
        }
      });

      // Handle map errors
      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setError(`Map error: ${e.error?.message || 'Unknown error'}`);
        setIsLoading(false);
      });

    } catch (err: any) {
      console.error('Map initialization error:', err);
      setError(`Failed to initialize map: ${err.message}`);
      setIsLoading(false);
    }
  }, [center, zoom]);

  /**
   * Setup map mouse interactions
   */
  const setupMapInteractions = useCallback(() => {
    if (!map.current) return;

    // Change cursor on hover
    map.current.on('mouseenter', 'points-layer', (e) => {
      if (map.current) {
        map.current.getCanvas().style.cursor = 'pointer';
        
        const feature = e.features?.[0];
        if (feature?.properties?.id) {
          setHoveredFeature(feature.properties.id);
          
          // Update sprite to hover version
          const persona = feature.properties.persona;
          if (persona) {
            map.current.setLayoutProperty('points-layer', 'icon-image', [
              'case',
              ['==', ['get', 'id'], feature.properties.id],
              getSpriteId(persona, true),
              ['get', 'sprite']
            ]);
          }
        }
      }
    });

    map.current.on('mouseleave', 'points-layer', () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = '';
        setHoveredFeature(null);
        
        // Reset all sprites to normal
        map.current.setLayoutProperty('points-layer', 'icon-image', ['get', 'sprite']);
      }
    });

    // Handle clicks
    map.current.on('click', 'points-layer', (e) => {
      const feature = e.features?.[0];
      if (!feature || !map.current) return;

      const properties = feature.properties;
      const coordinates = (feature.geometry as any).coordinates.slice();

      // Create popup content
      const popupContent = `
        <div class="bg-glass backdrop-blur-lg border-glass rounded-lg p-4 min-w-[200px]">
          <h3 class="text-white font-bold text-lg mb-2">${properties?.name || 'Unknown'}</h3>
          <p class="text-gray-200 text-sm mb-3">${properties?.description || 'No description available'}</p>
          <div class="flex items-center gap-2 text-xs text-gray-300">
            <span class="px-2 py-1 bg-glass-dark rounded-full">${properties?.type || 'Unknown'}</span>
            <span class="px-2 py-1 bg-glass-dark rounded-full">${properties?.persona || 'Unknown'}</span>
          </div>
        </div>
      `;

      // Close existing popup
      if (popup.current) {
        popup.current.remove();
      }

      // Create new popup
      popup.current = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: false,
        className: 'mapbox-popup-glass'
      })
        .setLngLat(coordinates)
        .setHTML(popupContent)
        .addTo(map.current);

      // Trigger callback
      if (onMarkerClick && properties) {
        const point: MapPoint = {
          id: properties.id,
          name: properties.name,
          description: properties.description,
          coordinates,
          persona: properties.persona,
          type: properties.type,
          metadata: properties.metadata ? JSON.parse(properties.metadata) : undefined
        };
        onMarkerClick(point);
      }
    });
  }, [onMarkerClick]);

  /**
   * Update map data when points change
   */
  const updateMapData = useCallback(() => {
    if (!map.current || !map.current.getSource('points')) return;

    const geojsonData = {
      type: 'FeatureCollection' as const,
      features: points.map(point => ({
        type: 'Feature' as const,
        properties: {
          id: point.id,
          name: point.name,
          description: point.description,
          persona: point.persona,
          type: point.type,
          sprite: getSpriteId(point.persona, false),
          metadata: point.metadata ? JSON.stringify(point.metadata) : null
        },
        geometry: {
          type: 'Point' as const,
          coordinates: point.coordinates
        }
      }))
    };

    const source = map.current.getSource('points') as mapboxgl.GeoJSONSource;
    source.setData(geojsonData);
  }, [points]);

  /**
   * Initialize map on mount
   */
  useEffect(() => {
    initializeMap();

    return () => {
      // Cleanup popup
      if (popup.current) {
        popup.current.remove();
        popup.current = null;
      }
      
      // Cleanup map
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [initializeMap]);

  /**
   * Update data when points change
   */
  useEffect(() => {
    if (!isLoading && !error) {
      updateMapData();
    }
  }, [points, isLoading, error, updateMapData]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Map Container */}
      <div
        ref={mapContainer}
        className="w-full h-full rounded-xl overflow-hidden"
        style={{ minHeight: '400px' }}
      />

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-dark-secondary/90 backdrop-blur-sm rounded-xl z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-blue-400 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold mb-2">Loading CHESS Map</h3>
              <p className="text-sm text-gray-300">Initializing personas and locations...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Overlay */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-red-900/90 backdrop-blur-sm rounded-xl z-10 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center text-white max-w-md">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Map Loading Error</h3>
              <p className="text-sm mb-4 text-gray-200">{error}</p>
              
              {error.includes('token') && (
                <div className="text-xs text-gray-300 mb-4 space-y-1">
                  <p>Please check your Mapbox configuration:</p>
                  <p>1. Verify VITE_MAPBOX_TOKEN_PK in environment</p>
                  <p>2. Ensure token starts with 'pk.'</p>
                  <p>3. Restart development server</p>
                </div>
              )}
              
              <button
                onClick={() => window.location.reload()}
                className="btn-esports flex items-center gap-2 mx-auto"
              >
                <Navigation className="w-4 h-4" />
                Retry Map Load
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Status Indicator */}
      {!isLoading && !error && (
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-glass-dark border-glass-dark rounded-full px-3 py-1 text-xs text-cyber-green-300 flex items-center gap-2">
            <div className="w-2 h-2 bg-cyber-green-400 rounded-full animate-pulse"></div>
            <span>Map Ready ({points.length} locations)</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapboxMap;