/**
 * Interactive Glass Bubble System for Philadelphia Quest Map
 * 
 * Features color-coded bubbles with glass styling, hover interactions,
 * and popping animations for engaging user experience.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Users, Target, Shield, Sparkles, X } from 'lucide-react';
import { CHESS_COLORS } from '../FloatingBubbles';

/**
 * CHESS attribute types for quest bubbles plus safe spaces and events
 */
export type BubbleCategory = 'character' | 'health' | 'exploration' | 'stem' | 'stewardship' | 'safe_space' | 'event';

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
  sprite?: string;
  character?: string;
}

/**
 * CHESS attribute bubble style configuration plus safe spaces and events
 */
const BUBBLE_STYLES: Record<BubbleCategory, {
  color: string;
  opacity: number;
  emoji: string;
  label: string;
  gradient: string;
  character: string;
}> = {
  character: {
    color: CHESS_COLORS.character,
    opacity: 0.7,
    emoji: '🦉',
    label: 'Character Quest',
    gradient: 'from-purple-400/30 to-purple-600/30',
    character: 'Hootie the Owl'
  },
  health: {
    color: CHESS_COLORS.health,
    opacity: 0.7,
    emoji: '🐱',
    label: 'Health Quest',
    gradient: 'from-green-400/30 to-green-600/30',
    character: 'Brenda the Cat'
  },
  exploration: {
    color: CHESS_COLORS.exploration,
    opacity: 0.7,
    emoji: '🐕',
    label: 'Exploration Quest',
    gradient: 'from-orange-400/30 to-orange-600/30',
    character: 'Gino the Dog'
  },
  stem: {
    color: CHESS_COLORS.stem,
    opacity: 0.7,
    emoji: '🤖',
    label: 'STEM Quest',
    gradient: 'from-blue-400/30 to-blue-600/30',
    character: 'Hammer the Robot'
  },
  stewardship: {
    color: CHESS_COLORS.stewardship,
    opacity: 0.7,
    emoji: '🏛️',
    label: 'Stewardship Quest',
    gradient: 'from-red-400/30 to-red-600/30',
    character: 'MOC Badge'
  },
  safe_space: {
    color: '#34D399', // Emerald green for safety
    opacity: 0.7,
    emoji: '🛡️',
    label: 'Safe Space',
    gradient: 'from-emerald-400/30 to-emerald-600/30',
    character: 'Safe Learning Zone'
  },
  event: {
    color: '#A78BFA', // Light purple for events
    opacity: 0.7,
    emoji: '📅',
    label: 'Community Event',
    gradient: 'from-violet-400/30 to-violet-600/30',
    character: 'Community Gathering'
  }
};

/**
 * Sample Philadelphia CHESS quest bubbles
 */
export const PHILADELPHIA_SAMPLE_DATA: BubbleData[] = [
  {
    id: 'quest-character-liberty-bell',
    category: 'character',
    title: 'Liberty Bell Character Challenge',
    description: 'Learn about honesty and integrity through the story of the Liberty Bell with Hootie the Owl.',
    coordinates: [-75.1502, 39.9496],
    organization: 'Independence National Historical Park',
    reward: 100,
    difficulty: 'medium',
    sprite: '/sprites/owl.gif/HOOTIE_WINGLIFT.gif',
    character: 'Hootie the Owl'
  },
  {
    id: 'quest-health-fitness-trail',
    category: 'health',
    title: 'Schuylkill River Fitness Trail',
    description: 'Complete wellness challenges with Brenda the Cat along Philadelphia\'s scenic river trail.',
    coordinates: [-75.1810, 39.9656],
    organization: 'Philadelphia Parks & Recreation',
    reward: 75,
    difficulty: 'easy',
    sprite: '/sprites/cat.gif/KITTY_BOUNCE.gif',
    character: 'Brenda the Cat'
  },
  {
    id: 'quest-exploration-historic-philly',
    category: 'exploration',
    title: 'Historic Philadelphia Discovery',
    description: 'Explore hidden gems and historic sites with Gino the Dog through Old City Philadelphia.',
    coordinates: [-75.1503, 39.9551],
    organization: 'Visit Philadelphia',
    reward: 125,
    difficulty: 'medium',
    sprite: '/sprites/dog.gif/GINO_COMPASSSPIN.gif',
    character: 'Gino the Dog'
  },
  {
    id: 'quest-stem-franklin-institute',
    category: 'stem',
    title: 'STEM Innovation Lab',
    description: 'Build robots and conduct experiments with Hammer the Robot at Philadelphia\'s premier science museum.',
    coordinates: [-75.1738, 39.9580],
    organization: 'Franklin Institute',
    reward: 200,
    difficulty: 'hard',
    sprite: '/sprites/robot.gif/HAMMER_SWING.gif',
    character: 'Hammer the Robot'
  },
  {
    id: 'quest-stewardship-fairmount-park',
    category: 'stewardship',
    title: 'Fairmount Park Conservation',
    description: 'Learn environmental stewardship and community leadership with the MOC Badge in America\'s largest urban park.',
    coordinates: [-75.1723, 39.9495],
    organization: 'Fairmount Park Conservancy',
    reward: 150,
    difficulty: 'medium',
    sprite: '/sprites/badge.gif/BADGE_SHINE.gif',
    character: 'MOC Badge'
  },
  {
    id: 'safe-space-free-library',
    category: 'safe_space',
    title: 'Free Library Study Sanctuary',
    description: 'A quiet, safe learning environment with free tutoring and study resources available to all students.',
    coordinates: [-75.1635, 39.9611],
    organization: 'Free Library of Philadelphia',
    participants: 45,
    isActive: true,
    character: 'Safe Learning Zone'
  },
  {
    id: 'event-maker-festival',
    category: 'event',
    title: 'Philadelphia Maker Festival',
    description: 'Join the community for hands-on STEM activities, 3D printing demos, and collaborative learning workshops.',
    coordinates: [-75.1437, 39.9537],
    organization: 'Philadelphia Maker Collective',
    participants: 120,
    isActive: true,
    character: 'Community Gathering'
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
            <span className="text-lg">{style.emoji}</span>
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">{bubble.title}</h3>
            <p className="text-gray-200 text-xs">{style.character}</p>
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
          Start {style.label}
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
  mousePosition: { x: number; y: number };
}

/**
 * Individual glass bubble component
 */
const GlassBubble: React.FC<GlassBubbleProps> = ({ bubble, onClick, onPop, isPopped, mousePosition }) => {
  const style = BUBBLE_STYLES[bubble.category];
  const [isHovered, setIsHovered] = useState(false);
  const [bubblePosition, setBubblePosition] = useState({ x: 0, y: 0 });

  // Update bubble position to follow mouse when hovered
  useEffect(() => {
    if (isHovered) {
      setBubblePosition({
        x: mousePosition.x * 0.1, // Subtle following movement
        y: mousePosition.y * 0.1
      });
    } else {
      setBubblePosition({ x: 0, y: 0 });
    }
  }, [isHovered, mousePosition]);

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
        exit: { type: "tween", duration: 0.6 }
      }}
      animate={{
        x: bubblePosition.x,
        y: bubblePosition.y,
        scale: isHovered ? 1.2 : 1
      }}
      transition={{
        type: "spring",
        stiffness: 150,
        damping: 20
      }}
    >
      {/* Main Bubble */}
      <motion.div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        whileTap={{ scale: 0.9 }}
      >
        {/* Glass Bubble Container */}
        <div
          className={`
            w-20 h-20 rounded-full 
            backdrop-blur-md border-2 border-white/40
            shadow-lg flex items-center justify-center
            transition-all duration-300
          `}
          style={{
            backgroundColor: `${style.color}${Math.round(style.opacity * 255).toString(16).padStart(2, '0')}`,
            boxShadow: `0 8px 32px ${style.color}40, inset 0 1px 0 rgba(255,255,255,0.2)`
          }}
        >
          <span className="text-2xl drop-shadow-lg">{style.emoji}</span>
        </div>

        {/* Pulse Ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 pointer-events-none"
          style={{ borderColor: style.color }}
          animate={{
            scale: [1, 1.3],
            opacity: [0.8, 0],
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
              initial={{ rotate: 0, opacity: 0 }}
              animate={{ rotate: 360, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            />
          )}
        </AnimatePresence>

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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

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

  /**
   * Track mouse position for bubble following effect
   */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
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
                  mousePosition={mousePosition}
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
        <h4 className="text-white font-bold text-sm mb-3">CHESS Quest Bubbles</h4>
        <div className="space-y-2">
          {Object.entries(BUBBLE_STYLES).map(([category, style]) => (
            <div key={category} className="flex items-center gap-2 text-xs text-gray-100">
              <span className="text-sm">{style.emoji}</span>
              <div
                className="w-3 h-3 rounded-full border border-white/40"
                style={{ backgroundColor: `${style.color}${Math.round(style.opacity * 255).toString(16)}` }}
              />
              <span>{style.character}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-gray-300">
          Hover to follow mouse • Click to start quest • {bubbles.length - poppedBubbles.size} active
        </div>
      </motion.div>
    </>
  );
};

export default BubbleSystem;