/**
 * Interactive Glass Bubble System for Philadelphia Quest Map
 * 
 * Features color-coded bubbles with glass styling, hover interactions,
 * and popping animations for engaging user experience.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Users, Target, Shield, Sparkles, X } from 'lucide-react';

/**
 * Bubble category types with specific colors
 */
export type BubbleCategory = 'safe_space' | 'community_hub' | 'active_quest';

/**
 * Bubble data interface
 */
export interface BubbleData {
  id: string;
  category: BubbleCategory;
  title: string;
  description: string;
  coordinates: [number, number]; // [lng, lat]
  organization?: string;
  reward?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  participants?: number;
  isActive?: boolean;
}

/**
 * Bubble style configuration
 */
const BUBBLE_STYLES: Record<BubbleCategory, {
  color: string;
  opacity: number;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  gradient: string;
}> = {
  safe_space: {
    color: '#10B981', // Emerald green
    opacity: 0.7,
    icon: Shield,
    label: 'Safe Space',
    gradient: 'from-emerald-400/30 to-emerald-600/30'
  },
  community_hub: {
    color: '#3B82F6', // Blue
    opacity: 0.7,
    icon: Users,
    label: 'Community Hub',
    gradient: 'from-blue-400/30 to-blue-600/30'
  },
  active_quest: {
    color: '#F59E0B', // Amber/Orange
    opacity: 0.7,
    icon: Target,
    label: 'Active Quest',
    gradient: 'from-amber-400/30 to-amber-600/30'
  }
};

/**
 * Sample Philadelphia bubble data
 */
export const PHILADELPHIA_SAMPLE_DATA: BubbleData[] = [
  {
    id: 'liberty-bell-quest',
    category: 'active_quest',
    title: 'Liberty Bell History Challenge',
    description: 'Explore American history through interactive challenges at Independence Hall.',
    coordinates: [-75.1502, 39.9496],
    organization: 'Independence National Historical Park',
    reward: 150,
    difficulty: 'medium'
  },
  {
    id: 'art-museum-safe',
    category: 'safe_space',
    title: 'Philadelphia Museum of Art Learning Center',
    description: 'Quiet study areas and collaborative learning spaces with free WiFi.',
    coordinates: [-75.1810, 39.9656],
    organization: 'Philadelphia Museum of Art',
    participants: 25
  },
  {
    id: 'franklin-square-hub',
    category: 'community_hub',
    title: 'Franklin Square Community Center',
    description: 'Community meetup point with educational activities and peer mentoring.',
    coordinates: [-75.1503, 39.9551],
    organization: 'Philadelphia Parks & Recreation',
    participants: 45,
    isActive: true
  },
  {
    id: 'science-museum-quest',
    category: 'active_quest',
    title: 'STEM Innovation Lab',
    description: 'Hands-on science experiments and technology challenges.',
    coordinates: [-75.1738, 39.9580],
    organization: 'Franklin Institute',
    reward: 200,
    difficulty: 'hard'
  },
  {
    id: 'rittenhouse-safe',
    category: 'safe_space',
    title: 'Rittenhouse Square Study Garden',
    description: 'Peaceful outdoor study area with benches and WiFi access.',
    coordinates: [-75.1723, 39.9495],
    organization: 'Center City District',
    participants: 18
  },
  {
    id: 'penn-landing-hub',
    category: 'community_hub',
    title: 'Penn\'s Landing Event Plaza',
    description: 'Large community gathering space for educational events and festivals.',
    coordinates: [-75.1402, 39.9495],
    organization: 'Delaware River Waterfront Corp',
    participants: 120,
    isActive: true
  },
  {
    id: 'chinatown-quest',
    category: 'active_quest',
    title: 'Cultural Heritage Explorer',
    description: 'Learn about Philadelphia\'s diverse cultural communities and traditions.',
    coordinates: [-75.1541, 39.9557],
    organization: 'Philadelphia Chinatown Development Corp',
    reward: 100,
    difficulty: 'easy'
  }
];

/**
 * Bubble detail tooltip props
 */
interface BubbleTooltipProps {
  bubble: BubbleData;
  position: { x: number; y: number };
  onClose: () => void;
  onPop: (bubbleId: string) => void;
}

/**
 * Glass-style bubble tooltip component
 */
const BubbleTooltip: React.FC<BubbleTooltipProps> = ({ bubble, position, onClose, onPop }) => {
  const style = BUBBLE_STYLES[bubble.category];

  const handlePop = () => {
    onPop(bubble.id);
    onClose();
  };

  return (
    <motion.div
      className="fixed z-50 pointer-events-auto"
      style={{
        left: `${Math.min(position.x, window.innerWidth - 300)}px`,
        top: `${Math.max(position.y - 200, 20)}px`,
      }}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <div className="bg-white/20 backdrop-blur-lg border border-white/30 rounded-2xl shadow-2xl p-4 max-w-xs">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          aria-label="Close tooltip"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div 
            className={`p-2 rounded-full bg-gradient-to-br ${style.gradient}`}
            style={{ backgroundColor: `${style.color}40` }}
          >
            <style.icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">{bubble.title}</h3>
            <p className="text-gray-200 text-xs">{style.label}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-100 text-sm mb-3 leading-relaxed">
          {bubble.description}
        </p>

        {/* Metadata */}
        <div className="space-y-2 mb-4">
          {bubble.organization && (
            <div className="flex items-center gap-2 text-xs text-gray-200">
              <MapPin className="w-3 h-3" />
              <span>{bubble.organization}</span>
            </div>
          )}
          
          {bubble.reward && (
            <div className="flex items-center gap-2 text-xs text-yellow-300">
              <Sparkles className="w-3 h-3" />
              <span>{bubble.reward} coins reward</span>
            </div>
          )}
          
          {bubble.participants && (
            <div className="flex items-center gap-2 text-xs text-blue-300">
              <Users className="w-3 h-3" />
              <span>{bubble.participants} participants</span>
            </div>
          )}

          {bubble.difficulty && (
            <div className="flex items-center gap-2 text-xs">
              <div className={`w-2 h-2 rounded-full ${
                bubble.difficulty === 'easy' ? 'bg-green-400' :
                bubble.difficulty === 'medium' ? 'bg-yellow-400' :
                'bg-red-400'
              }`} />
              <span className="text-gray-200 capitalize">{bubble.difficulty} difficulty</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={handlePop}
          className={`
            w-full py-2 px-4 rounded-xl font-medium text-white
            bg-gradient-to-r ${style.gradient}
            hover:scale-105 transition-all duration-200
            border border-white/20
            min-h-[44px] touch-manipulation
          `}
          style={{ 
            backgroundColor: `${style.color}60`,
            boxShadow: `0 4px 20px ${style.color}40`
          }}
        >
          {bubble.category === 'active_quest' ? 'Start Quest' :
           bubble.category === 'safe_space' ? 'Visit Space' :
           'Join Community'}
        </button>
      </div>
    </motion.div>
  );
};

/**
 * Glass bubble marker props
 */
interface GlassBubbleProps {
  bubble: BubbleData;
  onClick: (bubble: BubbleData, position: { x: number; y: number }) => void;
  onPop: (bubbleId: string) => void;
  isPopped?: boolean;
}

/**
 * Individual glass bubble component
 */
const GlassBubble: React.FC<GlassBubbleProps> = ({ bubble, onClick, onPop, isPopped }) => {
  const style = BUBBLE_STYLES[bubble.category];
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onClick(bubble, {
      x: rect.left + rect.width / 2,
      y: rect.top
    });
  };

  if (isPopped) return null;

  return (
    <motion.div
      className="absolute pointer-events-auto cursor-pointer"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ 
        scale: [1, 1.5, 0], 
        opacity: [1, 0.8, 0],
        rotate: [0, 180, 360]
      }}
      transition={{ 
        type: "spring", 
        stiffness: 200, 
        damping: 15,
        exit: { duration: 0.6 }
      }}
    >
      {/* Main Bubble */}
      <motion.div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        whileHover={{ scale: 1.2, zIndex: 100 }}
        whileTap={{ scale: 0.9 }}
        animate={{
          y: [0, -8, 0],
          rotate: [0, 2, -2, 0]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Glass Bubble Container */}
        <div
          className={`
            w-16 h-16 rounded-full 
            backdrop-blur-md border-2 border-white/40
            shadow-lg flex items-center justify-center
            transition-all duration-300
          `}
          style={{
            backgroundColor: `${style.color}${Math.round(style.opacity * 255).toString(16).padStart(2, '0')}`,
            boxShadow: `0 8px 32px ${style.color}40, inset 0 1px 0 rgba(255,255,255,0.2)`
          }}
        >
          <style.icon className="w-6 h-6 text-white drop-shadow-lg" />
        </div>

        {/* Pulse Ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 pointer-events-none"
          style={{ borderColor: style.color }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.8, 0, 0.8],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Hover Shimmer Effect */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: `linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)`
              }}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 90, opacity: 1 }}
              exit={{ rotate: 270, opacity: 0 }}
              transition={{ duration: 0.6 }}
            />
          )}
        </AnimatePresence>

        {/* Activity Indicator */}
        {bubble.isActive && (
          <motion.div
            className="absolute -top-1 -right-1 w-4 h-4 bg-cyber-green-400 rounded-full border-2 border-white"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}

        {/* Particle Effect on Hover */}
        <AnimatePresence>
          {isHovered && (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full"
                  style={{ backgroundColor: style.color }}
                  initial={{
                    x: 0,
                    y: 0,
                    opacity: 0
                  }}
                  animate={{
                    x: Math.cos(i * 60 * Math.PI / 180) * 30,
                    y: Math.sin(i * 60 * Math.PI / 180) * 30,
                    opacity: [0, 1, 0]
                  }}
                  transition={{
                    duration: 1,
                    ease: "easeOut"
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

/**
 * Bubble system props
 */
interface BubbleSystemProps {
  /** Map instance ref */
  mapRef: React.RefObject<mapboxgl.Map | null>;
  /** Bubble data array */
  bubbles: BubbleData[];
  /** Callback when bubble is popped */
  onBubblePop?: (bubbleId: string) => void;
  /** Callback when quest is started */
  onStartQuest?: (questId: string) => void;
}

/**
 * Main bubble system component
 */
const BubbleSystem: React.FC<BubbleSystemProps> = ({
  mapRef,
  bubbles,
  onBubblePop,
  onStartQuest
}) => {
  const [tooltip, setTooltip] = useState<{
    bubble: BubbleData;
    position: { x: number; y: number };
  } | null>(null);
  const [poppedBubbles, setPoppedBubbles] = useState<Set<string>>(new Set());

  /**
   * Convert coordinates to screen position
   */
  const getScreenPosition = useCallback((coordinates: [number, number]): { x: number; y: number } | null => {
    if (!mapRef.current) return null;
    
    try {
      const point = mapRef.current.project(coordinates);
      return { x: point.x, y: point.y };
    } catch {
      return null;
    }
  }, [mapRef]);

  /**
   * Handle bubble click
   */
  const handleBubbleClick = useCallback((bubble: BubbleData, clickPosition: { x: number; y: number }) => {
    setTooltip({ bubble, position: clickPosition });
  }, []);

  /**
   * Handle bubble pop with animation
   */
  const handleBubblePop = useCallback((bubbleId: string) => {
    setPoppedBubbles(prev => new Set([...prev, bubbleId]));
    
    // Call external callback
    if (onBubblePop) {
      onBubblePop(bubbleId);
    }

    // For quests, trigger start quest callback
    const bubble = bubbles.find(b => b.id === bubbleId);
    if (bubble?.category === 'active_quest' && onStartQuest) {
      onStartQuest(bubbleId);
    }

    // Close tooltip
    setTooltip(null);
  }, [bubbles, onBubblePop, onStartQuest]);

  /**
   * Close tooltip
   */
  const closeTooltip = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <>
      {/* Bubble Markers */}
      <div className="absolute inset-0 pointer-events-none">
        <AnimatePresence>
          {bubbles.map((bubble) => {
            const position = getScreenPosition(bubble.coordinates);
            if (!position || poppedBubbles.has(bubble.id)) return null;

            return (
              <div
                key={bubble.id}
                className="absolute"
                style={{
                  left: position.x,
                  top: position.y,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <GlassBubble
                  bubble={bubble}
                  onClick={handleBubbleClick}
                  onPop={handleBubblePop}
                  isPopped={poppedBubbles.has(bubble.id)}
                />
              </div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <BubbleTooltip
            bubble={tooltip.bubble}
            position={tooltip.position}
            onClose={closeTooltip}
            onPop={handleBubblePop}
          />
        )}
      </AnimatePresence>

      {/* Legend */}
      <motion.div
        className="absolute bottom-4 left-4 z-10 bg-white/20 backdrop-blur-lg border border-white/30 rounded-xl p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <h4 className="text-white font-bold text-sm mb-3">Philadelphia Quest Map</h4>
        <div className="space-y-2">
          {Object.entries(BUBBLE_STYLES).map(([category, style]) => (
            <div key={category} className="flex items-center gap-2 text-xs text-gray-100">
              <div
                className="w-3 h-3 rounded-full border border-white/40"
                style={{ backgroundColor: `${style.color}${Math.round(style.opacity * 255).toString(16)}` }}
              />
              <span>{style.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-gray-300">
          Click bubbles to interact • {bubbles.length - poppedBubbles.size} active
        </div>
      </motion.div>
    </>
  );
};

export default BubbleSystem;