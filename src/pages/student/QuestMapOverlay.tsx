/**
 * Quest Map Overlay Component
 *
 * Provides an interactive overlay for students to view and interact
 * with quest markers on the map interface.
 */

import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useQuests } from '@/hooks/useQuests';
import CHESS_COLORS from '@/lib/chessColors';
import { PERSONA_GIF } from '@/assets/personas';
import { supabase } from '@/lib/supabase';

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
  // determine grade from user metadata (expect 'ES'|'MS'|'HS')
  const grade = (user?.user_metadata?.grade_level || user?.user_metadata?.grade || null) as
    | 'ES'
    | 'MS'
    | 'HS'
    | null;
  const { mapQuests, loading, error } = useQuests(grade ?? undefined);
  const [markersAdded, setMarkersAdded] = useState(false);
  const [safeSpaces, setSafeSpaces] = useState<any[]>([]);

  /**
   * Add quest markers to map
   */
  useEffect(() => {
    if (!map || markersAdded) return;

    // fetch approved safe spaces for this grade
    (async () => {
      try {
        const q = supabase.from('safe_spaces').select('*').eq('approved', true);
        if (grade) q.or(`grade_level.eq.${grade}`);
        const { data: ssData } = await q;
        setSafeSpaces(ssData || []);
      } catch (e) {
        console.warn('Failed to load safe spaces', e);
      }
    })();

    // Add quest markers to the map
    mapQuests.forEach((quest) => {
      if (quest.lng && quest.lat) {
        // Create marker element
        const markerElement = document.createElement('div');
        markerElement.className = 'quest-marker';
        const attr = String(quest.attribute_id || 'character').toLowerCase();
        const colorKey = attr in CHESS_COLORS ? (attr as keyof typeof CHESS_COLORS) : 'character';
        const colorClass = CHESS_COLORS[colorKey];
        // Very small inline color variant fallback (tailwind class not available in DOM style)
        const color = colorClass.includes('emerald')
          ? '#34D399'
          : colorClass.includes('pink')
            ? '#FB7185'
            : colorClass.includes('indigo')
              ? '#6366F1'
              : colorClass.includes('yellow')
                ? '#FBBF24'
                : colorClass.includes('cyan')
                  ? '#06B6D4'
                  : '#8B5CF6';

        markerElement.style.cssText = `
          width: 40px;
          height: 40px;
          background: ${color}33;
          border: 2px solid white;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          overflow: hidden;
        `;
        const img = document.createElement('img');
        const attrKey = attr as keyof typeof PERSONA_GIF;
        img.src = PERSONA_GIF[attrKey] || PERSONA_GIF.hootie;
        img.alt = attr;
        img.style.cssText = 'width: 100%; height: 100%; object-fit: contain;';
        markerElement.appendChild(img);
        markerElement.title = quest.title;

        // Add click handler
        markerElement.addEventListener('click', () => {
          console.log('Quest clicked:', quest.id);
          // In production, this would open quest details
        });

        // Create Mapbox marker
        if (window.mapboxgl) {
          new window.mapboxgl.Marker(markerElement).setLngLat([quest.lng, quest.lat]).addTo(map);
        }
      }
    });

    // add safe space markers
    safeSpaces.forEach((space) => {
      if (space.lng && space.lat) {
        const el = document.createElement('div');
        el.className = 'safe-space-marker';
        const color = '#8B5CF6'; // violet fallback from CHESS_COLORS.safe_space
        el.style.cssText = `width:34px;height:34px;background:${color}66;border:2px solid white;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.2);`;
        el.title = space.name || 'Safe Space';
        el.addEventListener('click', () => console.log('Safe Space clicked', space.id));
        if (window.mapboxgl) {
          new window.mapboxgl.Marker(el).setLngLat([space.lng, space.lat]).addTo(map);
        }
      }
    });

    setMarkersAdded(true);
  }, [map, mapQuests, markersAdded]);

  // Show loading or error states if needed
  if (loading) {
    return (
      <div className='absolute top-4 left-4 bg-glass border-glass rounded-lg px-3 py-2 z-30'>
        <div className='flex items-center gap-2 text-white text-sm'>
          <div className='animate-spin rounded-full h-4 w-4 border-b border-white'></div>
          <span>Loading quests...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='absolute top-4 left-4 bg-red-500/20 border border-red-500/30 rounded-lg px-3 py-2 z-30'>
        <div className='flex items-center gap-2 text-red-200 text-sm'>
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
      className='absolute top-4 right-4 bg-glass border-glass rounded-lg px-3 py-2 z-30'
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <div className='flex items-center gap-2 text-white text-sm'>
        <div className='w-2 h-2 bg-cyber-green-400 rounded-full animate-pulse'></div>
        <span>{mapQuests.length} quests available</span>
      </div>
    </motion.div>
  );
};

export default QuestMapOverlay;
