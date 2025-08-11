import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Users, Target, MapPin, Sparkles, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { questHelpers, analyticsHelpers } from '../lib/supabase';
import { Quest } from '../types/database';
import QuestPopup from './QuestPopup';
import { CHESS_COLORS } from './FloatingBubbles';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  onQuestComplete?: (questId: string) => void;
}

/**
 * CHESS Quest Categories for bubbles
 */
type QuestCategory = 'character' | 'health' | 'exploration' | 'stem' | 'stewardship' | 'safe_space' | 'event';

/**
 * Quest bubble data interface
 */
interface QuestBubble {
  id: string;
  category: QuestCategory;
  title: string;
  description: string;
  position: { x: number; y: number }; // Screen coordinates as percentages
  coordinates: [number, number]; // Map coordinates [lng, lat]
  sprite: string;
  character: string;
  reward?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  organization?: string;
  participants?: number;
}

/**
 * CHESS Category Styling with Sprite Files
 */
const QUEST_STYLES: Record<QuestCategory, {
  color: string;
  sprite: string;
  label: string;
  character: string;
  gradient: string;
}> = {
  character: {
    color: CHESS_COLORS.character, // Purple
    sprite: '/sprites/owl.gif/HOOTIE_WINGLIFT.gif',
    label: 'Character Quest',
    character: 'Hootie the Owl',
    gradient: 'from-purple-400/30 to-purple-600/30'
  },
  health: {
    color: CHESS_COLORS.health, // Green
    sprite: '/sprites/cat.gif/KITTY_BOUNCE.gif',
    label: 'Health Quest', 
    character: 'Brenda the Cat',
    gradient: 'from-green-400/30 to-green-600/30'
  },
  exploration: {
    color: CHESS_COLORS.exploration, // Orange
    sprite: '/sprites/dog.gif/GINO_COMPASSSPIN.gif',
    label: 'Exploration Quest',
    character: 'Gino the Dog',
    gradient: 'from-orange-400/30 to-orange-600/30'
  },
  stem: {
    color: CHESS_COLORS.stem, // Blue
    sprite: '/sprites/robot.gif/HAMMER_SWING.gif', 
    label: 'STEM Quest',
    character: 'Hammer the Robot',
    gradient: 'from-blue-400/30 to-blue-600/30'
  },
  stewardship: {
    color: CHESS_COLORS.stewardship, // Red
    sprite: '/sprites/badge.gif/BADGE_SHINE.gif',
    label: 'Stewardship Quest',
    character: 'MOC Badge',
    gradient: 'from-red-400/30 to-red-600/30'
  },
  safe_space: {
    color: '#06D6A0', // Bright Teal
    sprite: '/sprites/badge.gif/BADGE_SHINE.gif',
    label: 'Safe Space',
    character: 'Protected Learning Zone',
    gradient: 'from-teal-400/30 to-teal-600/30'
  },
  event: {
    color: '#A78BFA', // Bright Violet
    sprite: '/sprites/owl.gif/HOOTIE_WINGLIFT.gif',
    label: 'Community Event',
    character: 'Learning Event',
    gradient: 'from-violet-400/30 to-violet-600/30'
  }
};

/**
 * Philadelphia CHESS quest bubbles with sprite integration
 */
const PHILADELPHIA_BUBBLES: QuestBubble[] = [
  // CHESS Quest Bubbles - All 5 categories
  {
    id: 'character-liberty-bell',
    category: 'character',
    title: 'Liberty Bell Character Challenge',
    description: 'Learn about honesty and integrity through the story of the Liberty Bell with Hootie the Owl.',
    position: { x: 45, y: 35 },
    coordinates: [-75.1502, 39.9496],
    sprite: '/sprites/owl.gif/HOOTIE_WINGLIFT.gif',
    character: 'Hootie the Owl',
    reward: 100,
    difficulty: 'medium',
    organization: 'Independence National Historical Park'
  },
  {
    id: 'health-schuylkill-trail',
    category: 'health',
    title: 'Schuylkill River Fitness Trail',
    description: 'Complete wellness challenges with Brenda the Cat along Philadelphia\'s scenic river trail.',
    position: { x: 25, y: 25 },
    coordinates: [-75.1810, 39.9656],
    sprite: '/sprites/cat.gif/KITTY_BOUNCE.gif',
    character: 'Brenda the Cat',
    reward: 75,
    difficulty: 'easy',
    organization: 'Philadelphia Parks & Recreation'
  },
  {
    id: 'exploration-old-city',
    category: 'exploration',
    title: 'Historic Philadelphia Discovery',
    description: 'Explore hidden gems and historic sites with Gino the Dog through Old City Philadelphia.',
    position: { x: 65, y: 30 },
    coordinates: [-75.1503, 39.9551],
    sprite: '/sprites/dog.gif/GINO_COMPASSSPIN.gif',
    character: 'Gino the Dog',
    reward: 125,
    difficulty: 'medium',
    organization: 'Visit Philadelphia'
  },
  {
    id: 'stem-franklin-institute',
    category: 'stem',
    title: 'Franklin Institute Innovation Lab',
    description: 'Build robots and conduct experiments with Hammer the Robot at Philadelphia\'s premier science museum.',
    position: { x: 35, y: 55 },
    coordinates: [-75.1738, 39.9580],
    sprite: '/sprites/robot.gif/HAMMER_SWING.gif',
    character: 'Hammer the Robot',
    reward: 200,
    difficulty: 'hard',
    organization: 'Franklin Institute'
  },
  {
    id: 'stewardship-fairmount-park',
    category: 'stewardship',
    title: 'Fairmount Park Conservation',
    description: 'Learn environmental stewardship and community leadership with the MOC Badge in America\'s largest urban park.',
    position: { x: 20, y: 60 },
    coordinates: [-75.1723, 39.9495],
    sprite: '/sprites/badge.gif/BADGE_SHINE.gif',
    character: 'MOC Badge',
    reward: 150,
    difficulty: 'medium',
    organization: 'Fairmount Park Conservancy'
  },
  
  // Safe Space Bubbles
  {
    id: 'safe-space-library',
    category: 'safe_space',
    title: 'Free Library Study Sanctuary',
    description: 'A quiet, safe learning environment with free tutoring and study resources available to all students.',
    position: { x: 55, y: 45 },
    coordinates: [-75.1635, 39.9611],
    sprite: '/sprites/badge.gif/BADGE_SHINE.gif',
    character: 'Protected Learning Zone',
    organization: 'Free Library of Philadelphia',
    participants: 45
  },
  {
    id: 'safe-space-community-center',
    category: 'safe_space',
    title: 'Community Learning Center',
    description: 'Welcoming space for collaborative learning, homework help, and peer mentoring programs.',
    position: { x: 75, y: 70 },
    coordinates: [-75.1580, 39.9800],
    sprite: '/sprites/badge.gif/BADGE_SHINE.gif',
    character: 'Protected Learning Zone',
    organization: 'Philadelphia Community Centers',
    participants: 60
  },
  
  // Event Bubbles
  {
    id: 'event-maker-festival',
    category: 'event',
    title: 'Philadelphia Maker Festival',
    description: 'Join the community for hands-on STEM activities, 3D printing demos, and collaborative learning workshops.',
    position: { x: 30, y: 75 },
    coordinates: [-75.1437, 39.9537],
    sprite: '/sprites/owl.gif/HOOTIE_WINGLIFT.gif',
    character: 'Learning Event',
    organization: 'Philadelphia Maker Collective',
    participants: 120
  },
  {
    id: 'event-science-expo',
    category: 'event',
    title: 'Young Scientists Expo',
    description: 'Students showcase their research projects and compete in science fair competitions with community judges.',
    position: { x: 70, y: 20 },
    coordinates: [-75.1400, 39.9650],
    sprite: '/sprites/owl.gif/HOOTIE_WINGLIFT.gif',
    character: 'Learning Event',
    organization: 'Philadelphia Science Alliance',
    participants: 85
  }
];

/**
 * Bubble tooltip component
 */
interface BubbleTooltipProps {
  bubble: QuestBubble;
  position: { x: number; y: number };
  onClose: () => void;
  onStartQuest: (bubble: QuestBubble) => void;
}

const BubbleTooltip: React.FC<BubbleTooltipProps> = ({ bubble, position, onClose, onStartQuest }) => {
  const style = QUEST_STYLES[bubble.category];

  const handleStart = () => {
    onStartQuest(bubble);
    onClose();
  };

  return (
    <motion.div
      className="fixed z-50 pointer-events-auto"
      style={{
        left: `${Math.min(position.x, window.innerWidth - 320)}px`,
        top: `${Math.max(position.y - 200, 20)}px`,
      }}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <div className="bg-white/30 backdrop-blur-2xl border border-white/40 rounded-2xl shadow-2xl p-6 max-w-sm">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors min-w-touch min-h-touch touch-manipulation"
          aria-label="Close tooltip"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Header with Sprite */}
        <div className="flex items-center gap-4 mb-4 pr-8">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-white/40"
            style={{ backgroundColor: `${style.color}40` }}
          >
            <img 
              src={style.sprite} 
              alt={style.character}
              className="w-8 h-8 object-contain"
              draggable={false}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `<div class="text-2xl">${
                    bubble.category === 'character' ? '🦉' :
                    bubble.category === 'health' ? '🐱' :
                    bubble.category === 'exploration' ? '🐕' :
                    bubble.category === 'stem' ? '🤖' :
                    bubble.category === 'stewardship' ? '🏛️' :
                    bubble.category === 'safe_space' ? '🛡️' : '📅'
                  }</div>`;
                }
              }}
            />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">{bubble.title}</h3>
            <p className="text-gray-200 text-sm">{style.character}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-100 text-sm mb-4 leading-relaxed">
          {bubble.description}
        </p>

        {/* Metadata */}
        <div className="space-y-2 mb-6">
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

          {bubble.participants && (
            <div className="flex items-center gap-2 text-xs text-blue-300">
              <Users className="w-3 h-3" />
              <span>{bubble.participants} participants</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={handleStart}
          className="w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 min-h-[44px] touch-manipulation hover:scale-105"
          style={{ 
            backgroundColor: `${style.color}80`,
            boxShadow: `0 4px 20px ${style.color}40`,
            border: `1px solid ${style.color}60`
          }}
        >
          {bubble.category === 'safe_space' ? 'Enter Safe Space' :
           bubble.category === 'event' ? 'Join Event' :
           'Start Quest'}
        </button>
      </div>
    </motion.div>
  );
};

/**
 * Individual Quest Bubble Component with Sprite
 */
interface QuestBubbleProps {
  bubble: QuestBubble;
  mousePosition: { x: number; y: number };
  containerRect: DOMRect | null;
  onClick: (bubble: QuestBubble, position: { x: number; y: number }) => void;
}

const QuestBubbleComponent: React.FC<QuestBubbleProps> = ({ 
  bubble, 
  mousePosition, 
  containerRect,
  onClick
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [followPosition, setFollowPosition] = useState({ x: 0, y: 0 });
  const style = QUEST_STYLES[bubble.category];

  // Calculate absolute position from percentage
  const absolutePosition = containerRect ? {
    x: (bubble.position.x / 100) * containerRect.width,
    y: (bubble.position.y / 100) * containerRect.height
  } : { x: 0, y: 0 };

  // Update position to follow mouse when hovered
  useEffect(() => {
    if (isHovered && containerRect) {
      const deltaX = mousePosition.x - absolutePosition.x;
      const deltaY = mousePosition.y - absolutePosition.y;
      
      setFollowPosition({
        x: deltaX * 0.1, // Follow 10% of mouse movement
        y: deltaY * 0.1
      });
    } else {
      setFollowPosition({ x: 0, y: 0 });
    }
  }, [isHovered, mousePosition, absolutePosition, containerRect]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    onClick(bubble, {
      x: rect.left + rect.width / 2,
      y: rect.top
    });
  };

  return (
    <motion.div
      className="absolute pointer-events-auto cursor-pointer"
      style={{
        left: `${bubble.position.x}%`,
        top: `${bubble.position.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 30
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: isHovered ? 1.2 : 1, 
        opacity: 1,
        x: followPosition.x,
        y: followPosition.y
      }}
      transition={{ 
        type: "spring", 
        stiffness: 200, 
        damping: 15,
        delay: PHILADELPHIA_BUBBLES.indexOf(bubble) * 0.2
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      whileTap={{ scale: 0.9 }}
    >
      {/* Glass Bubble with Sprite */}
      <div
        className="relative w-16 h-16 rounded-full backdrop-blur-md border-2 border-white/40 shadow-xl flex items-center justify-center transition-all duration-300"
        style={{
          backgroundColor: `${style.color}60`,
          boxShadow: `0 8px 32px ${style.color}40, inset 0 1px 0 rgba(255,255,255,0.3)`
        }}
      >
        <img 
          src={style.sprite}
          alt={style.character}
          className="w-10 h-10 object-contain drop-shadow-lg select-none"
          draggable={false}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent && !parent.querySelector('.fallback-emoji')) {
              const fallback = document.createElement('div');
              fallback.className = 'fallback-emoji text-2xl';
              fallback.textContent = 
                bubble.category === 'character' ? '🦉' :
                bubble.category === 'health' ? '🐱' :
                bubble.category === 'exploration' ? '🐕' :
                bubble.category === 'stem' ? '🤖' :
                bubble.category === 'stewardship' ? '🏛️' :
                bubble.category === 'safe_space' ? '🛡️' : '📅';
              parent.appendChild(fallback);
            }
          }}
        />
        
        {/* Shimmer effect on hover */}
        {isHovered && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)`
            }}
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </div>

      {/* Pulse Ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 pointer-events-none"
        style={{ borderColor: style.color }}
        animate={{
          scale: [1, 1.5],
          opacity: [0.8, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
          delay: PHILADELPHIA_BUBBLES.indexOf(bubble) * 0.3
        }}
      />

      {/* Hover Particles */}
      {isHovered && (
        <>
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full pointer-events-none"
              style={{ 
                backgroundColor: style.color,
                left: '50%',
                top: '50%'
              }}
              initial={{
                x: 0,
                y: 0,
                opacity: 0
              }}
              animate={{
                x: Math.cos(i * 60 * Math.PI / 180) * 25,
                y: Math.sin(i * 60 * Math.PI / 180) * 25,
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
    </motion.div>
  );
};

/**
 * Enhanced MapView component with working bubble system
 */
const MapView: React.FC<MapViewProps> = ({
  center = [-75.1652, 39.9526],
  zoom = 12,
  onQuestComplete,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  
  // Component state
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showBubbles, setShowBubbles] = useState(true); // Always show bubbles
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);
  const [tooltip, setTooltip] = useState<{
    bubble: QuestBubble;
    position: { x: number; y: number };
  } | null>(null);
  
  // Authentication context
  const { user } = useAuth();

  /**
   * Initialize Mapbox map
   */
  useEffect(() => {
    if (!mapContainer.current) return;
    
    // Clean up existing map instance
    if (map.current) {
      map.current.remove();
      map.current = null;
    }
    
    let mounted = true;
    
    // Get token from environment variables
    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN ||
                       import.meta.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
                       import.meta.env.VITE_MAPBOX_TOKEN_PK ||
                       'pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6ImNsZXhhbXBsZXRva2VuaGVyZSJ9.example_token_here';

    console.log('🗺️ Mapbox token check:', {
      hasToken: !!mapboxToken,
      tokenLength: mapboxToken?.length,
      tokenStart: mapboxToken?.substring(0, 10),
      envVars: {
        VITE_MAPBOX_TOKEN: !!import.meta.env.VITE_MAPBOX_TOKEN,
        NEXT_PUBLIC_MAPBOX_TOKEN: !!import.meta.env.NEXT_PUBLIC_MAPBOX_TOKEN,
        VITE_MAPBOX_TOKEN_PK: !!import.meta.env.VITE_MAPBOX_TOKEN_PK
      }
    });

    // More lenient token validation
    if (!mapboxToken || mapboxToken.includes('YOUR_') || mapboxToken.includes('example_')) {
      console.warn('⚠️ Mapbox token not configured, showing dark placeholder with bubbles');
      setError(null); // Don't show error, just use placeholder
      setIsLoading(false);
      return;
    }

    try {
      // Set Mapbox access token
      mapboxgl.accessToken = mapboxToken;
      
      console.log('🚀 Initializing Mapbox map...');

      // Create map instance
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: import.meta.env.VITE_MAP_STYLE_URL || 'mapbox://styles/mapbox/dark-v11',
        center,
        zoom,
        attributionControl: false,
        logoPosition: 'bottom-right',
      });

      // Add navigation controls
      const nav = new mapboxgl.NavigationControl();
      map.current.addControl(nav, 'top-right');
      
      // Add attribution control separately
      const attribution = new mapboxgl.AttributionControl({
        compact: true
      });
      map.current.addControl(attribution, 'bottom-right');

      // Handle successful load
      map.current.on('load', () => {
        console.log('✅ Mapbox map loaded successfully with controls');
        if (mounted) {
          setIsLoading(false);
          setError(null);
        }
      });
      
      // Handle style load for debugging
      map.current.on('styledata', () => {
        console.log('🎨 Map style loaded');
      });
      
      // Handle source data for debugging
      map.current.on('sourcedata', (e) => {
        if (e.isSourceLoaded) {
          console.log('📊 Map source data loaded:', e.sourceId);
        }
      });

      // Handle map click for analytics
      map.current.on('click', async (e) => {
        console.log('🖱️ Map clicked at:', e.lngLat);
        if (user) {
          await analyticsHelpers.logMapInteraction(user.id, 'map_clicked', {
            lat: e.lngLat.lat,
            lng: e.lngLat.lng
          });
        }
      });

      // Handle errors
      map.current.on('error', (e) => {
        console.error('❌ Mapbox error:', e);
        if (mounted) {
          setError(`Map loading error: ${e.error?.message || 'Unknown error'}`);
          setIsLoading(false);
        }
      });

    } catch (err: any) {
      console.error('❌ Map initialization error:', err);
      if (mounted) {
        setError(`Map initialization failed: ${err.message}`);
        setIsLoading(false);
      }
    }

    return () => {
      mounted = false;
      if (map.current) {
        console.log('🧹 Cleaning up map instance');
        map.current.remove();
        map.current = null;
      }
    };
  }, [center, zoom]);

  /**
   * Handle bubble click
   */
  const handleBubbleClick = useCallback((bubble: QuestBubble, clickPosition: { x: number; y: number }) => {
    setTooltip({ bubble, position: clickPosition });
  }, []);

  /**
   * Handle quest start from tooltip
   */
  const handleStartQuest = useCallback((bubble: QuestBubble) => {
    console.log(`Starting ${bubble.category} quest:`, bubble.title);
    
    if (bubble.category === 'safe_space') {
      console.log('Accessing safe space:', bubble.title);
    } else if (bubble.category === 'event') {
      console.log('Joining event:', bubble.title);
    } else {
      // It's a CHESS quest
      if (onQuestComplete) {
        onQuestComplete(bubble.id);
      }
    }
  }, [onQuestComplete]);

  /**
   * Close tooltip
   */
  const closeTooltip = useCallback(() => {
    setTooltip(null);
  }, []);

  /**
   * Track mouse position and container bounds
   */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (mapContainer.current) {
        const rect = mapContainer.current.getBoundingClientRect();
        setContainerRect(rect);
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    };

    const handleResize = () => {
      if (mapContainer.current) {
        setContainerRect(mapContainer.current.getBoundingClientRect());
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);
    
    if (mapContainer.current) {
      setContainerRect(mapContainer.current.getBoundingClientRect());
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="w-full h-full relative">
      {/* Map Container */}
      <div
        ref={mapContainer}
        className="w-full h-full bg-dark-secondary rounded-xl overflow-hidden"
        style={{ height: '100%', minHeight: '400px' }}
      >
        {/* Map will render here via Mapbox GL */}
      </div>
      
      {/* Quest Bubbles Overlay - Always show after loading */}
      {showBubbles && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
          {PHILADELPHIA_BUBBLES.map((bubble) => (
            <QuestBubbleComponent
              key={bubble.id}
              bubble={bubble}
              mousePosition={mousePosition}
              containerRect={containerRect}
              onClick={handleBubbleClick}
            />
          ))}
        </div>
      )}

      {/* Quest Legend with Sprites */}
      {showBubbles && (
        <motion.div
          className="absolute bottom-4 left-4 z-30 bg-glass-dark border-glass-dark rounded-xl p-4 max-w-xs backdrop-blur-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <h4 className="text-white font-bold text-sm mb-3">Philadelphia CHESS Bubbles</h4>
          <div className="space-y-2">
            {Object.entries(QUEST_STYLES).map(([category, style]) => (
              <div key={category} className="flex items-center gap-2 text-xs">
                <img 
                  src={style.sprite}
                  alt={style.character}
                  className="w-4 h-4 object-contain"
                  draggable={false}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.fallback-emoji')) {
                      const fallback = document.createElement('span');
                      fallback.className = 'fallback-emoji text-sm';
                      fallback.textContent = 
                        category === 'character' ? '🦉' :
                        category === 'health' ? '🐱' :
                        category === 'exploration' ? '🐕' :
                        category === 'stem' ? '🤖' :
                        category === 'stewardship' ? '🏛️' :
                        category === 'safe_space' ? '🛡️' : '📅';
                      parent.appendChild(fallback);
                    }
                  }}
                />
                <div
                  className="w-3 h-3 rounded-full border border-white/40"
                  style={{ backgroundColor: style.color }}
                />
                <span className="text-gray-100 truncate">{style.character}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-gray-300">
            🖱️ Hover to follow • 👆 Click to interact
          </div>
        </motion.div>
      )}

      {/* Bubble Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <BubbleTooltip
            bubble={tooltip.bubble}
            position={tooltip.position}
            onClose={closeTooltip}
            onStartQuest={handleStartQuest}
          />
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            className="absolute inset-0 flex items-center justify-center bg-dark-secondary/95 backdrop-blur-md rounded-xl z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-blue-400 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold mb-2">Loading Philadelphia Map</h3>
              <p className="text-sm text-gray-300">Connecting to Mapbox services...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Error Notice - Non-blocking */}
      <AnimatePresence>
        {error && (
          <motion.div 
            className="absolute top-4 right-4 bg-amber-500/20 border border-amber-500/30 rounded-xl p-3 z-30 max-w-sm"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: 2, duration: 0.3 }}
          >
            <div className="text-amber-200 text-sm">
              <p className="font-semibold mb-1">🗺️ Map Notice:</p>
              <p>{error.includes('token') || error.includes('initialization') ? 
                'Using offline mode - bubbles still interactive!' : 
                error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Map Status Indicator - Only show when map is actually loaded */}
      {!isLoading && !error && (
        <motion.div
          className="absolute top-4 left-4 z-30 bg-cyber-green-500/20 border border-cyber-green-500/40 rounded-full px-3 py-1 text-xs text-cyber-green-300 flex items-center gap-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="w-2 h-2 bg-cyber-green-400 rounded-full animate-pulse"></div>
          <span>Mapbox Connected • {PHILADELPHIA_BUBBLES.length} Bubbles</span>
        </motion.div>
      )}
    </div>
  );
};

export default MapView;