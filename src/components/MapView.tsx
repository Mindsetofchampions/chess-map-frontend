import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { questHelpers, analyticsHelpers } from '../lib/supabase';
import { Quest, MapMarker } from '../types/database';
import QuestPopup from './QuestPopup';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  onQuestComplete?: (questId: string) => void;
}

/**
 * Enhanced MapView component with Supabase integration
 * Features real-time quest data, user interactions, and analytics logging
 */
const MapView: React.FC<MapViewProps> = ({
  center = [-74.006, 40.7128], // Default to NYC
  zoom = 10,
  onQuestComplete,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  
  // Component state
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | undefined>();
  
  // Authentication context
  const { user, isAuthenticated } = useAuth();

  // Get token from environment using correct variable name
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN_PK || import.meta.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  /**
   * Fetch quests from Supabase
   */
  const fetchQuests = async () => {
    try {
      const { data, error } = await questHelpers.getActiveQuests();
      
      if (error) {
        console.error('Failed to fetch quests:', error);
        setError(`Failed to load quests: ${error}`);
        return;
      }
      
      if (data) {
        setQuests(data);
        
        // Log map view analytics
        if (user) {
          await analyticsHelpers.logMapInteraction(user.id, 'map_loaded', { quest_count: data.length });
        }
      }
    } catch (err: any) {
      console.error('Quest fetch error:', err);
      setError(`Failed to load quest data: ${err.message}`);
    }
  };

  /**
   * Create map markers for quests
   */
  const createQuestMarkers = () => {
    if (!map.current || !quests.length) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    quests.forEach((quest) => {
      // Skip quests without location data
      if (!quest.location) return;

      // Create marker element
      const markerElement = document.createElement('div');
      markerElement.className = 'quest-marker';
      markerElement.innerHTML = `
        <div class="w-10 h-10 bg-electric-blue-500 border-2 border-electric-blue-300 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform duration-200">
          <span class="text-white font-bold text-sm">Q</span>
        </div>
      `;

      // Add click handler
      markerElement.addEventListener('click', (e) => {
        e.stopPropagation();
        handleQuestMarkerClick(quest, e);
      });

      // Create and add marker to map
      const marker = new mapboxgl.Marker({
        element: markerElement,
        anchor: 'center'
      })
        .setLngLat([quest.location.lng, quest.location.lat])
        .addTo(map.current!);

      markers.current.push(marker);
    });
  };

  /**
   * Handle quest marker click
   */
  const handleQuestMarkerClick = async (quest: Quest, event: Event) => {
    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    setPopupPosition({
      x: rect.left + rect.width / 2,
      y: rect.top
    });
    setSelectedQuest(quest);

    // Log quest interaction
    if (user) {
      await analyticsHelpers.logQuestInteraction(user.id, quest.id, 'viewed');
    }
  };

  /**
   * Handle quest start from popup
   */
  const handleStartQuest = async (questId: string) => {
    if (!user) return;

    try {
      // Log quest start
      await analyticsHelpers.logQuestInteraction(user.id, questId, 'started');
      
      // Trigger completion callback if provided
      if (onQuestComplete) {
        onQuestComplete(questId);
      }
      
      // Close popup
      setSelectedQuest(null);
      setPopupPosition(undefined);
      
      // Optionally redirect to quest details or start quest flow
      console.log('Starting quest:', questId);
      
    } catch (error: any) {
      console.error('Failed to start quest:', error);
      setError('Failed to start quest. Please try again.');
    }
  };

  /**
   * Close quest popup
   */
  const closeQuestPopup = () => {
    setSelectedQuest(null);
    setPopupPosition(undefined);
  };

  useEffect(() => {
    // Skip initialization if map already exists or container is not ready
    if (map.current || !mapContainer.current) return;
    
    let mounted = true;

    // Validate token
    if (!mapboxToken || mapboxToken.trim() === '' || mapboxToken === 'pk.YOUR_MAPBOX_TOKEN_HERE') {
      setError('Mapbox token is required. Please add VITE_MAPBOX_TOKEN to your .env file.');
      setIsLoading(false);
      return;
    }

    try {
      // Set token
      mapboxgl.accessToken = mapboxToken;

      // Initialize map with minimal configuration
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11', // Use basic dark style
        center,
        zoom,
        attributionControl: true,
      });

      // Add navigation controls
      const nav = new mapboxgl.NavigationControl();
      map.current.addControl(nav, 'top-right');

      // Handle successful load
      map.current.on('load', () => {
        console.log('Map loaded successfully');
        if (map.current && mounted) {
          setIsLoading(false);
          setError(null);
        }
      });

      // Handle map click for analytics
      map.current.on('click', async (e) => {
        if (user) {
          await analyticsHelpers.logMapInteraction(user.id, 'map_clicked', {
            lat: e.lngLat.lat,
            lng: e.lngLat.lng
          });
        }
      });

      // Handle errors
      map.current.on('error', (e) => {
        console.error('Map error:', e);
        if (mounted) {
          setError(`Map failed to load: ${e.error?.message || 'Unknown error'}`);
          setIsLoading(false);
        }
      });

    } catch (err: any) {
      console.error('Map initialization error:', err);
      if (mounted) {
        setError(`Failed to initialize map: ${err.message}`);
        setIsLoading(false);
      }
    }

    // Cleanup function - this will now be reached properly
    return () => {
      mounted = false;
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      // Clear any existing markers
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
    };
  }, []);

  // Separate effect for fetching quests
  useEffect(() => {
    // Only fetch quests after map is loaded and there's no error
    if (!isLoading && !error && map.current) {
      fetchQuests();
    }
  }, [isLoading, error, user]);

  // Update markers when quests change
  useEffect(() => {
    if (!isLoading && !error && map.current) {
      createQuestMarkers();
    }
  }, [quests, isLoading, error]);

  // Cleanup markers on unmount
  useEffect(() => {
    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
    };
  }, []);

  return (
    <>
      <div className="w-full h-full relative">
      {/* Map Container */}
      <div
        ref={mapContainer}
        className="w-full h-full min-h-[400px] bg-gray-900 rounded-xl"
        style={{ height: '100%', minHeight: '400px' }}
      />
      </div>

      {/* Quest Popup */}
      {selectedQuest && (
        <QuestPopup
          quest={{
            id: selectedQuest.id,
            title: selectedQuest.title,
            description: selectedQuest.description,
            coins: selectedQuest.coin_reward,
            difficulty: selectedQuest.difficulty_level,
            estimatedTime: selectedQuest.estimated_duration ? `${selectedQuest.estimated_duration} min` : undefined,
          }}
          isOpen={!!selectedQuest}
          onClose={closeQuestPopup}
          onStartQuest={handleStartQuest}
          position={popupPosition}
        />
      )}
      {/* Loading Overlay */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-xl z-10">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading map...</p>
          </div>
        </div>
      )}
      
      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/80 rounded-xl z-10 p-4">
          <div className="text-center text-white max-w-md">
            <h3 className="text-lg font-semibold mb-2">Map Loading Error</h3>
            <p className="text-sm mb-4">{error}</p>
            {error.includes('token') && (
              <div className="text-xs text-gray-300">
                <p>1. Get a token from https://studio.mapbox.com/</p>
                <p>2. Add VITE_MAPBOX_TOKEN=your_token to .env</p>
                <p>3. Restart the development server</p>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default MapView;