/**
 * Quest Map Overlay Component
 * 
 * Provides an interactive overlay for students to view and interact
 * with quest markers on the map interface.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuests } from '@/hooks/useQuests';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Quest Map Overlay Props
 */
interface QuestMapOverlayProps {
  map: any; // Mapbox map instance
}

/**
 * Quest Map Overlay Component
 * 
 * Features:
 * - Real-time quest marker updates
 * - Student-specific quest interactions
 * - Integration with Mapbox map instance
 * - Responsive overlay design
 */
const QuestMapOverlay: React.FC<QuestMapOverlayProps> = ({ map }) => {
  const { user } = useAuth();
  const { mapQuests, loading, error } = useQuests();
  const [markersAdded, setMarkersAdded] = useState(false);

  /**
   * Add quest markers to map
   */
  useEffect(() => {
    if (!map || !mapQuests.length || markersAdded) return;

    // Add quest markers to the map
    mapQuests.forEach(quest => {
      if (quest.lng && quest.lat) {
        // Create marker element
        const markerElement = document.createElement('div');
        markerElement.className = 'quest-marker';
        markerElement.style.cssText = `
          width: 32px;
          height: 32px;
          background: #4F9BFF;
          border: 2px solid white;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          color: white;
          font-weight: bold;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;
        markerElement.textContent = '?';
        markerElement.title = quest.title;

        // Add click handler
        markerElement.addEventListener('click', () => {
          console.log('Quest clicked:', quest.id);
          // In production, this would open quest details
        });

        // Create Mapbox marker
        if (window.mapboxgl) {
          new window.mapboxgl.Marker(markerElement)
            .setLngLat([quest.lng, quest.lat])
            .addTo(map);
        }
      }
    });

    setMarkersAdded(true);
  }, [map, mapQuests, markersAdded]);

  // Show loading or error states if needed
  if (loading) {
    return (
      <div className="absolute top-4 left-4 bg-glass border-glass rounded-lg px-3 py-2 z-30">
        <div className="flex items-center gap-2 text-white text-sm">
          <div className="animate-spin rounded-full h-4 w-4 border-b border-white"></div>
          <span>Loading quests...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute top-4 left-4 bg-red-500/20 border border-red-500/30 rounded-lg px-3 py-2 z-30">
        <div className="flex items-center gap-2 text-red-200 text-sm">
          <span>⚠️</span>
          <span>Quest load error</span>
        </div>
      </div>
    );
  }

  // Only show for students
  if (user?.user_metadata?.role !== 'student') {
    return null;
  }

  return (
    <motion.div
      className="absolute top-4 right-4 bg-glass border-glass rounded-lg px-3 py-2 z-30"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <div className="flex items-center gap-2 text-white text-sm">
        <div className="w-2 h-2 bg-cyber-green-400 rounded-full animate-pulse"></div>
        <span>{mapQuests.length} quests available</span>
      </div>
    </motion.div>
  );
};

export default QuestMapOverlay;