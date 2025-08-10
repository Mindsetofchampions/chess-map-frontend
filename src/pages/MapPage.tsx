/**
 * Map Page Component with Supabase Integration
 * 
 * Features complete map functionality with real-time data updates,
 * persona-based organization/event display, and comprehensive error handling.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import MapboxMap, { MapPoint } from '../components/Map/MapboxMap';
import GlassContainer from '../components/GlassContainer';
import { PersonaType } from '../components/Map/sprites';
import { usePhiladelphiaData } from '../hooks/usePhiladelphiaData';
import { 
  Home, 
  ArrowLeft, 
  MapPin, 
  Building, 
  Calendar,
  RefreshCw,
  Settings,
  Users
} from 'lucide-react';

/**
 * Organization data from Supabase
 */
interface Organization {
  id: string;
  name: string;
  description?: string;
  location?: {
    lat: number;
    lng: number;
  };
  persona?: PersonaType;
}

/**
 * Event data from Supabase
 */
interface Event {
  id: string;
  title: string;
  description?: string;
  location?: {
    lat: number;
    lng: number;
  };
  attribute_id?: string;
  start_time?: string;
  end_time?: string;
}

/**
 * Map Page Component
 * 
 * Integrates Mapbox with Supabase data for organizations and events,
 * providing real-time updates and interactive map experience.
 */
const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State management
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  
  // Philadelphia bubble data hook
  const { 
    bubbles, 
    loading, 
    error, 
    refreshData,
    addNewBubble 
  } = usePhiladelphiaData();

  // Legacy state for compatibility
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);

  /**
   * Persona mapping for different attributes
   */
  const getPersonaForAttribute = (attributeId?: string): PersonaType => {
    // This would map to your actual attribute IDs in the database
    const attributePersonaMap: Record<string, PersonaType> = {
      'character': 'hootie',
      'health': 'kittykat', 
      'exploration': 'gino',
      'stem': 'hammer',
      'stewardship': 'badge'
    };
    
    return attributePersonaMap[attributeId || ''] || 'hootie'; // Default to hootie
  };

  /**
   * Fetch organizations from Supabase
   */
  const fetchOrganizations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('safe_spaces') // Using safe_spaces as organizations
        .select('*');

      if (error) {
        console.error('Failed to fetch organizations:', error);
        return [];
      }

      return data || [];
    } catch (err: any) {
      console.error('Organization fetch error:', err);
      return [];
    }
  }, []);

  /**
   * Fetch events from Supabase
   */
  const fetchEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*');

      if (error) {
        console.error('Failed to fetch events:', error);
        return [];
      }

      return data || [];
    } catch (err: any) {
      console.error('Event fetch error:', err);
      return [];
    }
  }, []);

  /**
   * Transform Supabase data to MapPoint format
   */
  const transformToMapPoints = useCallback((orgs: Organization[], evts: Event[]): MapPoint[] => {
    const points: MapPoint[] = [];

    // Transform organizations (safe_spaces)
    orgs.forEach(org => {
      if (org.location) {
        points.push({
          id: `org-${org.id}`,
          name: org.name,
          description: org.description,
          coordinates: [org.location.lng, org.location.lat],
          persona: org.persona || 'badge', // Default to badge for organizations
          type: 'organization',
          metadata: { originalData: org }
        });
      }
    });

    // Transform events
    evts.forEach(event => {
      if (event.location) {
        points.push({
          id: `event-${event.id}`,
          name: event.title,
          description: event.description,
          coordinates: [event.location.lng, event.location.lat],
          persona: getPersonaForAttribute(event.attribute_id),
          type: 'event',
          metadata: { 
            originalData: event,
            startTime: event.start_time,
            endTime: event.end_time
          }
        });
      }
    });

    return points;
  }, []);

  /**
   * Handle marker click
   */
  const handleMarkerClick = useCallback((point: MapPoint) => {
    setSelectedPoint(point);
    console.log('Marker clicked:', point);
  }, []);

  /**
   * Handle bubble pop
   */
  const handleBubblePop = useCallback((bubbleId: string) => {
    console.log('Bubble popped:', bubbleId);
  }, []);

  /**
   * Handle quest start from bubble
   */
  const handleStartQuest = useCallback((questId: string) => {
    console.log('Quest started from bubble:', questId);
  }, []);

  /**
   * Handle refresh map data
   */
  const handleRefreshMapData = useCallback(() => {
    refreshData();
  }, [refreshData]);

  /**
   * Navigation handlers
   */
  const handleGoHome = () => {
    navigate('/', { replace: true });
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleSettings = () => {
    console.log('Navigate to settings');
  };

  return (
    <GlassContainer variant="page">
      <div className="container mx-auto max-w-7xl">
        
        {/* Navigation Header */}
        <motion.div 
          className="flex items-center justify-between p-4 mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Left Navigation */}
          <div className="flex items-center gap-3">
            <motion.button
              onClick={handleGoHome}
              className="flex items-center gap-2 bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-xl px-4 py-2 transition-all duration-200 text-sm font-medium min-h-touch touch-manipulation"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-label="Return to home page"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </motion.button>

            <motion.button
              onClick={handleGoBack}
              className="flex items-center gap-2 bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-xl px-4 py-2 transition-all duration-200 text-sm font-medium min-h-touch touch-manipulation"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </motion.button>
          </div>

          {/* Center Title */}
          <div className="flex-1 text-center">
            <h1 className="text-2xl font-bold text-white">CHESS Interactive Map</h1>
            <p className="text-gray-300 text-sm">Explore organizations and events</p>
          </div>

          {/* Right Navigation */}
          <div className="flex items-center gap-3">
            <motion.button
              onClick={handleRefreshMapData}
              className="flex items-center gap-2 bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-xl px-4 py-2 transition-all duration-200 text-sm font-medium min-h-touch touch-manipulation"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-label="Refresh map data"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </motion.button>

            <motion.button
              onClick={handleSettings}
              className="flex items-center gap-2 bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-xl px-4 py-2 transition-all duration-200 text-sm font-medium min-h-touch touch-manipulation"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-label="Open settings"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Map Statistics */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <GlassContainer variant="card" className="text-center p-4">
            <Building className="w-8 h-8 text-cyber-green-400 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-white">{bubbles.filter(b => b.category === 'safe_space').length}</h3>
            <p className="text-gray-300 text-xs">Safe Spaces</p>
          </GlassContainer>

          <GlassContainer variant="card" className="text-center p-4">
            <Calendar className="w-8 h-8 text-electric-blue-400 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-white">{bubbles.filter(b => b.category === 'active_quest').length}</h3>
            <p className="text-gray-300 text-xs">Active Quests</p>
          </GlassContainer>

          <GlassContainer variant="card" className="text-center p-4">
            <MapPin className="w-8 h-8 text-neon-purple-400 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-white">{bubbles.filter(b => b.category === 'community_hub').length}</h3>
            <p className="text-gray-300 text-xs">Community Hubs</p>
          </GlassContainer>

          <GlassContainer variant="card" className="text-center p-4">
            <Users className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-white">
              {user?.role || 'Guest'}
            </h3>
            <p className="text-gray-300 text-xs">Access Level</p>
          </GlassContainer>
        </motion.div>

        {/* Error Display */}
        {error && (
          <motion.div 
            className="mx-4 mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-red-300 flex-shrink-0" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Main Map */}
        <motion.div 
          className="px-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <GlassContainer variant="card" className="p-0 overflow-hidden">
            <div className="relative h-[600px] w-full">
              <MapboxMap
                center={[-75.1652, 39.9526]} // Philadelphia coordinates
                zoom={12}
                points={[]} // Using bubble system instead
                onMarkerClick={handleMarkerClick}
                className="w-full h-full"
                showBubbles={true}
                bubbleData={bubbles}
                onBubblePop={handleBubblePop}
                onStartQuest={handleStartQuest}
              />
            </div>
          </GlassContainer>
        </motion.div>

        {/* Selected Point Details */}
        {selectedPoint && (
          <motion.div 
            className="px-4 mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <GlassContainer variant="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-2">{selectedPoint.name}</h3>
                  <p className="text-gray-200 mb-4">{selectedPoint.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-gray-300">
                      <MapPin className="w-4 h-4" />
                      {selectedPoint.coordinates[1].toFixed(4)}, {selectedPoint.coordinates[0].toFixed(4)}
                    </span>
                    <span className="px-2 py-1 bg-glass-dark rounded-full text-gray-300 text-xs">
                      {selectedPoint.type}
                    </span>
                    <span className="px-2 py-1 bg-glass-dark rounded-full text-gray-300 text-xs">
                      {selectedPoint.persona}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedPoint(null)}
                  className="p-2 rounded-lg bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white transition-all duration-200 min-w-touch min-h-touch touch-manipulation"
                  aria-label="Close details"
                >
                  ✕
                </button>
              </div>
            </GlassContainer>
          </motion.div>
        )}
      </div>
    </GlassContainer>
  );
};

export default MapPage;