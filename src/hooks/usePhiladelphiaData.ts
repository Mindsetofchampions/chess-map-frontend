/**
 * Philadelphia Map Data Hook
 * 
 * Provides quest bubble data and map interaction logic for the Philadelphia
 * demo implementation of the CHESS Quest system.
 */

import { useState, useCallback } from 'react';
import { PERSONA_GIF } from '@/assets/personas';

/**
 * CHESS Quest Categories
 */
export type QuestCategory =
  | 'character'
  | 'health'
  | 'exploration'
  | 'stem'
  | 'stewardship'
  | 'safe_space'
  | 'community_hub';

/**
 * Quest bubble data interface
 */
export interface QuestBubble {
  id: string;
  category: QuestCategory;
  title: string;
  description: string;
  position: { x: number; y: number }; // % of container
  sprite: string;
  character: string;
  reward?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  organization?: string;
  participants?: number;
}

/**
 * CHESS Attribute Color System
 */
export const CHESS_COLORS = {
  character: '#8B5CF6',    // Purple - Wisdom & Character
  health: '#10B981',       // Green - Health & Wellness  
  exploration: '#F59E0B',  // Orange - Adventure & Discovery
  stem: '#3B82F6',         // Blue - Technology & Innovation
  stewardship: '#EF4444'   // Red - Leadership & Responsibility
} as const;

/**
 * Quest styling configuration
 */
export const QUEST_STYLES: Record<
  QuestCategory,
  { color: string; sprite: string; label: string; character: string; gradient: string }
> = {
  character: {
    color: CHESS_COLORS.character,
    sprite: PERSONA_GIF.hootie,
    label: 'Character Quest',
    character: 'Hootie the Owl',
    gradient: 'from-purple-400/30 to-purple-600/30',
  },
  health: {
    color: CHESS_COLORS.health,
    sprite: PERSONA_GIF.kittykat,
    label: 'Health Quest',
    character: 'Brenda the Cat',
    gradient: 'from-green-400/30 to-green-600/30',
  },
  exploration: {
    color: CHESS_COLORS.exploration,
    sprite: PERSONA_GIF.gino,
    label: 'Exploration Quest',
    character: 'Gino the Dog',
    gradient: 'from-orange-400/30 to-orange-600/30',
  },
  stem: {
    color: CHESS_COLORS.stem,
    sprite: PERSONA_GIF.hammer,
    label: 'STEM Quest',
    character: 'Hammer the Robot',
    gradient: 'from-blue-400/30 to-blue-600/30',
  },
  stewardship: {
    color: CHESS_COLORS.stewardship,
    sprite: PERSONA_GIF.badge,
    label: 'Stewardship Quest',
    character: 'MOC Badge',
    gradient: 'from-red-400/30 to-red-600/30',
  },
  safe_space: {
    color: '#06D6A0',
    sprite: PERSONA_GIF.badge,
    label: 'Safe Space',
    character: 'Protected Learning Zone',
    gradient: 'from-teal-400/30 to-teal-600/30',
  },
  community_hub: {
    color: '#A78BFA',
    sprite: PERSONA_GIF.hootie,
    label: 'Community Hub',
    character: 'Learning Hub',
    gradient: 'from-violet-400/30 to-violet-600/30',
  },
};

/**
 * Philadelphia demo quest bubbles
 */
export const PHILADELPHIA_BUBBLES: QuestBubble[] = [
  {
    id: 'character-liberty-bell',
    category: 'character',
    title: 'Liberty Bell Character Challenge',
    description: 'Learn about honesty and integrity with Hootie the Owl.',
    position: { x: 45, y: 35 },
    sprite: PERSONA_GIF.hootie,
    character: 'Hootie the Owl',
    reward: 100,
    difficulty: 'medium',
    organization: 'Independence Park',
  },
  {
    id: 'health-trail',
    category: 'health',
    title: 'Schuylkill River Fitness',
    description: 'Wellness challenges with Brenda the Cat.',
    position: { x: 25, y: 25 },
    sprite: PERSONA_GIF.kittykat,
    character: 'Brenda the Cat',
    reward: 75,
    difficulty: 'easy',
    organization: 'Parks & Recreation',
  },
  {
    id: 'exploration-old-city',
    category: 'exploration',
    title: 'Historic Discovery',
    description: 'Explore with Gino the Dog through Old City.',
    position: { x: 65, y: 30 },
    sprite: PERSONA_GIF.gino,
    character: 'Gino the Dog',
    reward: 125,
    difficulty: 'medium',
    organization: 'Visit Philadelphia',
  },
  {
    id: 'stem-franklin',
    category: 'stem',
    title: 'Innovation Lab',
    description: 'Build robots with Hammer the Robot.',
    position: { x: 35, y: 55 },
    sprite: PERSONA_GIF.hammer,
    character: 'Hammer the Robot',
    reward: 200,
    difficulty: 'hard',
    organization: 'Franklin Institute',
  },
  {
    id: 'stewardship-park',
    category: 'stewardship',
    title: 'Park Conservation',
    description: 'Environmental stewardship with MOC Badge.',
    position: { x: 70, y: 65 },
    sprite: PERSONA_GIF.badge,
    character: 'MOC Badge',
    reward: 150,
    difficulty: 'medium',
    organization: 'Fairmount Park',
  },
  {
    id: 'safe-library',
    category: 'safe_space',
    title: 'Library Study Zone',
    description: 'Quiet, safe learning environment.',
    position: { x: 55, y: 45 },
    sprite: PERSONA_GIF.badge,
    character: 'Protected Zone',
    organization: 'Free Library',
    participants: 45,
  },
  {
    id: 'event-maker',
    category: 'community_hub',
    title: 'Maker Festival',
    description: 'Hands-on STEM activities.',
    position: { x: 80, y: 20 },
    sprite: PERSONA_GIF.hootie,
    character: 'Learning Event',
    organization: 'Maker Collective',
    participants: 120,
  },
];

/**
 * Philadelphia Data Hook
 * 
 * Manages quest bubble data and provides interaction methods
 * for the Philadelphia demo map.
 */
export const usePhiladelphiaData = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Refresh map data (placeholder for future API integration)
   */
  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      // In production, this would fetch fresh data from Supabase
    } catch (err: any) {
      setError(err.message || 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Add new bubble (placeholder for future functionality)
   */
  const addNewBubble = useCallback((bubble: Omit<QuestBubble, 'id'>) => {
    console.log('Would add new bubble:', bubble);
    // In production, this would create a new quest via API
  }, []);

  return {
    bubbles: PHILADELPHIA_BUBBLES,
    loading,
    error,
    refreshData,
    addNewBubble
  };
};