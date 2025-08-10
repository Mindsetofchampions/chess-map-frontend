import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { questHelpers, analyticsHelpers } from '../lib/supabase';
import { Quest } from '../types/database';
import { usePhiladelphiaData } from '../hooks/usePhiladelphiaData';
import QuestPopup from './QuestPopup';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapViewProps {
  center?: [number, number]; // Default to Philadelphia
  zoom?: number; // Default zoom for Philadelphia
  onQuestComplete?: (questId: string) => void;
}

/**
 * Enhanced MapView component with Supabase integration
 * Features real-time quest data, user interactions, and analytics logging
 */
const MapView: React.FC<MapViewProps> = ({
  center = [-75.1652, 39.9526], // Default to Philadelphia
  zoom = 12,
  onQuestComplete,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  
  // Component state
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | undefined>();
  
  // Authentication context
  const { user, isAuthenticated } = useAuth();

  // Philadelphia bubble data
  const { bubbles, loading: bubbleLoading } = usePhiladelphiaData();

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
   * Handle bubble interactions
   */
  const handleBubblePop = useCallback((bubbleId: string) => {
    console.log('Bubble popped:', bubbleId);
    
    // If it's a quest bubble, trigger quest completion
    const bubble = bubbles.find(b => b.id === bubbleId);
    if (bubble?.category === 'active_quest' && onQuestComplete) {
      onQuestComplete(bubbleId);
    }
  }, [bubbles, onQuestComplete]);

  const handleStartQuest = useCallback((questId: string) => {
    console.log('Quest started from bubble:', questId);
    if (onQuestComplete) {
      onQuestComplete(questId);
    }
  }, [onQuestComplete]);

  /**
   * Handle quest marker click (legacy support)
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
   * Handle quest start from popup (legacy support)
   */
  const handleStartQuestFromPopup = async (questId: string) => {
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
      
      console.log('Starting quest:', questId);
      
    } catch (error: any) {
      console.error('Failed to start quest:', error);
      setError('Failed to start quest. Please try again.');
    }
  };

  /**
   * Legacy quest marker click handler
   */
  const handleLegacyQuestMarkerClick = async (quest: Quest, event: Event) => {
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

  return (
    <>
      <div className="w-full h-full relative">
        {/* Map Container with Bubble System */}
        <div
          ref={mapContainer}
          className="w-full h-full min-h-[400px] bg-gray-900 rounded-xl relative"
          style={{ height: '100%', minHeight: '400px' }}
        />
        
        {/* Philadelphia Bubble System Overlay */}
        {!isLoading && !error && map.current && (
          <div className="absolute inset-0 pointer-events-none">
            {bubbles.map((bubble) => {
              if (!map.current) return null;
              
              try {
                const point = map.current.project(bubble.coordinates);
                return (
                  <div
                    key={bubble.id}
                    className="absolute pointer-events-auto"
                    style={{
                      left: point.x,
                      top: point.y,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <motion.div
                      className="w-12 h-12 rounded-full backdrop-blur-md border-2 border-white/40 shadow-lg cursor-pointer flex items-center justify-center"
                      style={{
                        backgroundColor: bubble.category === 'safe_space' ? '#10B981B3' :
                                        bubble.category === 'community_hub' ? '#3B82F6B3' :
                                        '#F59E0BB3'
                      }}
                      whileHover={{ scale: 1.3, zIndex: 100 }}
                      whileTap={{ scale: 0.8 }}
                      animate={{
                        y: [0, -6, 0],
                        rotate: [0, 2, -2, 0]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      onClick={() => handleBubblePop(bubble.id)}
                      title={bubble.title}
                    >
                      {bubble.category === 'safe_space' && <Shield className="w-5 h-5 text-white" />}
                      {bubble.category === 'community_hub' && <Users className="w-5 h-5 text-white" />}
                      {bubble.category === 'active_quest' && <Target className="w-5 h-5 text-white" />}
                    </motion.div>
                  </div>
                );
              } catch {
                return null;
              }
            })}
          </div>
        )}
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
          onStartQuest={handleStartQuestFromPopup}
          position={popupPosition}
        />
      )}
      {/* Loading Overlay */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-xl z-10">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-blue-400 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Loading Philadelphia Quest Map</h3>
            <p className="text-sm text-gray-300">Initializing bubbles and locations...</p>
          </div>
        </div>
      )}
      
      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/80 rounded-xl z-10 p-4">
          <div className="text-center text-white max-w-md">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Philadelphia Map Error</h3>
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
              className="mt-4 btn-esports"
            >
              Retry Map Load
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default MapView;