import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Users, Target, MapPin, Sparkles, X, Navigation } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useQuests } from '../hooks/useQuests';
import { CHESS_COLORS } from './FloatingBubbles';
import { PersonaChipMarker, PersonaChipCluster, addPersonaChipsToMap } from './PersonaChips';
import { getAllPersonas, getPersonaByKey } from '../data/personas';
import { PersonaDef, PersonaKey } from '../types';
import QuestMapOverlay from '../pages/student/QuestMapOverlay';
import QuestPlayModal from '../modals/QuestPlayModal';

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
  position: { x: number; y: number };
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
    color: CHESS_COLORS.character,
    sprite: '/sprites/owl.gif/HOOTIE_WINGLIFT.gif',
    label: 'Character Quest',
    character: 'Hootie the Owl',
    gradient: 'from-purple-400/30 to-purple-600/30'
  },
  health: {
    color: CHESS_COLORS.health,
    sprite: '/sprites/cat.gif/KITTY_BOUNCE.gif',
    label: 'Health Quest', 
    character: 'Brenda the Cat',
    gradient: 'from-green-400/30 to-green-600/30'
  },
  exploration: {
    color: CHESS_COLORS.exploration,
    sprite: '/sprites/dog.gif/GINO_COMPASSSPIN.gif',
    label: 'Exploration Quest',
    character: 'Gino the Dog',
    gradient: 'from-orange-400/30 to-orange-600/30'
  },
  stem: {
    color: CHESS_COLORS.stem,
    sprite: '/sprites/robot.gif/HAMMER_SWING.gif', 
    label: 'STEM Quest',
    character: 'Hammer the Robot',
    gradient: 'from-blue-400/30 to-blue-600/30'
  },
  stewardship: {
    color: CHESS_COLORS.stewardship,
    sprite: '/sprites/badge.gif/BADGE_SHINE.gif',
    label: 'Stewardship Quest',
    character: 'MOC Badge',
    gradient: 'from-red-400/30 to-red-600/30'
  },
  safe_space: {
    color: '#06D6A0',
    sprite: '/sprites/badge.gif/BADGE_SHINE.gif',
    label: 'Safe Space',
    character: 'Protected Learning Zone',
    gradient: 'from-teal-400/30 to-teal-600/30'
  },
  event: {
    color: '#A78BFA',
    sprite: '/sprites/owl.gif/HOOTIE_WINGLIFT.gif',
    label: 'Community Event',
    character: 'Learning Event',
    gradient: 'from-violet-400/30 to-violet-600/30'
  }
};

/**
 * Philadelphia CHESS quest bubbles
 */
const PHILADELPHIA_BUBBLES: QuestBubble[] = [
  {
    id: 'character-liberty-bell',
    category: 'character',
    title: 'Liberty Bell Character Challenge',
    description: 'Learn about honesty and integrity with Hootie the Owl.',
    position: { x: 45, y: 35 },
    sprite: '/sprites/owl.gif/HOOTIE_WINGLIFT.gif',
    character: 'Hootie the Owl',
    reward: 100,
    difficulty: 'medium',
    organization: 'Independence Park'
  },
  {
    id: 'health-trail',
    category: 'health',
    title: 'Schuylkill River Fitness',
    description: 'Wellness challenges with Brenda the Cat.',
    position: { x: 25, y: 25 },
    sprite: '/sprites/cat.gif/KITTY_BOUNCE.gif',
    character: 'Brenda the Cat',
    reward: 75,
    difficulty: 'easy',
    organization: 'Parks & Recreation'
  },
  {
    id: 'exploration-old-city',
    category: 'exploration',
    title: 'Historic Discovery',
    description: 'Explore with Gino the Dog through Old City.',
    position: { x: 65, y: 30 },
    sprite: '/sprites/dog.gif/GINO_COMPASSSPIN.gif',
    character: 'Gino the Dog',
    reward: 125,
    difficulty: 'medium',
    organization: 'Visit Philadelphia'
  },
  {
    id: 'stem-franklin',
    category: 'stem',
    title: 'Innovation Lab',
    description: 'Build robots with Hammer the Robot.',
    position: { x: 35, y: 55 },
    sprite: '/sprites/robot.gif/HAMMER_SWING.gif',
    character: 'Hammer the Robot',
    reward: 200,
    difficulty: 'hard',
    organization: 'Franklin Institute'
  },
  {
    id: 'stewardship-park',
    category: 'stewardship',
    title: 'Park Conservation',
    description: 'Environmental stewardship with MOC Badge.',
    position: { x: 70, y: 65 },
    sprite: '/sprites/badge.gif/BADGE_SHINE.gif',
    character: 'MOC Badge',
    reward: 150,
    difficulty: 'medium',
    organization: 'Fairmount Park'
  },
  {
    id: 'safe-library',
    category: 'safe_space',
    title: 'Library Study Zone',
    description: 'Quiet, safe learning environment.',
    position: { x: 55, y: 45 },
    sprite: '/sprites/badge.gif/BADGE_SHINE.gif',
    character: 'Protected Zone',
    organization: 'Free Library',
    participants: 45
  },
  {
    id: 'event-maker',
    category: 'event',
    title: 'Maker Festival',
    description: 'Hands-on STEM activities.',
    position: { x: 80, y: 20 },
    sprite: '/sprites/owl.gif/HOOTIE_WINGLIFT.gif',
    character: 'Learning Event',
    organization: 'Maker Collective',
    participants: 120
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
  const isMobile = window.innerWidth < 768;

  const handleStart = () => {
    onStartQuest(bubble);
    onClose();
  };

  // Mobile-centered positioning
  const tooltipStyle = isMobile ? {
    position: 'fixed' as const,
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 50
  } : {
    position: 'fixed' as const,
    left: `${Math.min(position.x, window.innerWidth - 320)}px`,
    top: `${Math.max(position.y - 200, 20)}px`,
    zIndex: 50
  };

  return (
    <motion.div
      className="pointer-events-auto"
      style={tooltipStyle}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <div className={`bg-white/30 backdrop-blur-2xl border border-white/40 rounded-2xl shadow-2xl p-4 ${isMobile ? 'max-w-xs mx-4' : 'max-w-sm'}`}>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors min-w-touch min-h-touch touch-manipulation"
          aria-label="Close tooltip"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        <div className={`flex items-center gap-3 mb-3 ${isMobile ? 'pr-6' : 'pr-8'}`}>
          <div 
            className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} rounded-full flex items-center justify-center border-2 border-white/40`}
            style={{ backgroundColor: `${style.color}40` }}
          >
            <img 
              src={style.sprite} 
              alt={style.character}
              className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} object-contain`}
              draggable={false}
            />
          </div>
          <div>
            <h3 className={`text-white font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>
              {isMobile && bubble.title.length > 20 ? bubble.title.slice(0, 20) + '...' : bubble.title}
            </h3>
            <p className={`text-gray-200 ${isMobile ? 'text-xs' : 'text-sm'}`}>{style.character}</p>
          </div>
        </div>

        <p className={`text-gray-100 ${isMobile ? 'text-xs' : 'text-sm'} mb-3 leading-relaxed`}>
          {isMobile && bubble.description.length > 80 ? bubble.description.slice(0, 80) + '...' : bubble.description}
        </p>

        <div className="space-y-1 mb-4">
          {bubble.organization && (
            <div className="flex items-center gap-2 text-xs text-gray-200">
              <MapPin className="w-3 h-3" />
              <span>{isMobile && bubble.organization.length > 15 ? bubble.organization.slice(0, 15) + '...' : bubble.organization}</span>
            </div>
          )}
          
          {bubble.reward && (
            <div className="flex items-center gap-2 text-xs text-yellow-300">
              <Sparkles className="w-3 h-3" />
              <span>{bubble.reward} coins</span>
            </div>
          )}
        </div>

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
 * Individual Quest Bubble Component
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
  const isMobile = window.innerWidth < 768;

  // Calculate follow effect
  const absolutePosition = containerRect ? {
    x: (bubble.position.x / 100) * containerRect.width,
    y: (bubble.position.y / 100) * containerRect.height
  } : { x: 0, y: 0 };

  useEffect(() => {
    if (isHovered && containerRect) {
      const deltaX = mousePosition.x - absolutePosition.x;
      const deltaY = mousePosition.y - absolutePosition.y;
      
      setFollowPosition({
        x: deltaX * (isMobile ? 0.05 : 0.1),
        y: deltaY * (isMobile ? 0.05 : 0.1)
      });
    } else {
      setFollowPosition({ x: 0, y: 0 });
    }
  }, [isHovered, mousePosition, absolutePosition, containerRect, isMobile]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    onClick(bubble, {
      x: rect.left + rect.width / 2,
      y: rect.top
    });
  };

  const bubbleSize = isMobile ? 'w-12 h-12' : 'w-16 h-16';
  const spriteSize = isMobile ? 'w-7 h-7' : 'w-10 h-10';

  return (
    <motion.div
      className="absolute pointer-events-auto cursor-pointer"
      style={{
        left: `${bubble.position.x}%`,
        top: `${bubble.position.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 20
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: isHovered ? (isMobile ? 1.1 : 1.2) : 1, 
        opacity: 1,
        x: followPosition.x,
        y: followPosition.y
      }}
      transition={{ 
        type: "spring", 
        stiffness: 200, 
        damping: 15,
        delay: PHILADELPHIA_BUBBLES.indexOf(bubble) * (isMobile ? 0.1 : 0.2)
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      whileTap={{ scale: 0.9 }}
    >
      <div
        className={`relative ${bubbleSize} rounded-full backdrop-blur-md border-2 border-white/40 shadow-xl flex items-center justify-center transition-all duration-300`}
        style={{
          backgroundColor: `${style.color}60`,
          boxShadow: `0 8px 32px ${style.color}40, inset 0 1px 0 rgba(255,255,255,0.3)`
        }}
      >
        <img 
          src={style.sprite}
          alt={style.character}
          className={`${spriteSize} object-contain drop-shadow-lg select-none`}
          draggable={false}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent && !parent.querySelector('.fallback-emoji')) {
              const fallback = document.createElement('div');
              fallback.className = 'fallback-emoji text-xl';
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
      </div>

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
    </motion.div>
  );
};

/**
 * Enhanced MapView component with stable map rendering
 */
const MapView: React.FC<MapViewProps> = ({
  center = [-75.1652, 39.9526],
  zoom = 12,
  onQuestComplete,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  
  const { mapQuests } = useQuests();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  /**
   * Add persona chips to map
   */
  const addPersonaChips = useCallback(() => {
    if (!mapInstance.current) return;

    // Clear existing persona markers
    personaMarkers.forEach(marker => marker.remove());
    
    // Sample organizations with persona assignments for demo
    const organizationsWithPersonas = [
      {
        id: 'org-1',
        lat: 39.9526,
        lng: -75.1652,
        activePersonas: ['hootie', 'hammer'] as PersonaKey[]
      },
      {
        id: 'org-2', 
        lat: 39.9496,
        lng: -75.1502,
        activePersonas: ['kitty', 'gino'] as PersonaKey[]
      },
      {
        id: 'org-3',
        lat: 39.9656,
        lng: -75.1810,
        activePersonas: ['badge'] as PersonaKey[]
      }
    ];

    const newMarkers = addPersonaChipsToMap(
      mapInstance.current,
      organizationsWithPersonas,
      (persona: PersonaDef) => {
        console.log('Persona clicked:', persona.name);
        // Could open persona chat, show info modal, etc.
      }
    );
    
    setPersonaMarkers(newMarkers);
  }, [personaMarkers]);

  /**
   * Initialize map with proper timeout and error handling
   */
  const initializeMap = useCallback(async () => {
    if (!mapContainer.current) return;

    // Set loading timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (process.env.NODE_ENV === 'development') {
        console.log('⏰ Map loading timeout - showing bubbles without map');
      }
      setIsLoading(false);
      setError(null);
    }, 2000); // 2 second timeout for faster fallback
    try {
      setError(null);

      // Get token with multiple fallbacks
      const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN ||
                         import.meta.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
                         import.meta.env.VITE_MAPBOX_TOKEN_PK;

      // If no valid token, just show dark background with bubbles
      if (!mapboxToken || mapboxToken.includes('YOUR_') || mapboxToken.includes('example_')) {
        if (process.env.NODE_ENV === 'development') {
          console.log('📍 No Mapbox token - showing bubbles on dark background');
        }
        clearTimeout(loadingTimeout);
        setIsLoading(false);
        setError('No Mapbox token configured - showing bubbles only');
        return;
      }

      // Dynamic import to prevent build issues
      const mapboxgl = await import('mapbox-gl');
      
      mapboxgl.default.accessToken = mapboxToken;
      
      // Clean up existing map
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }

      mapInstance.current = new mapboxgl.default.Map({
        container: mapContainer.current,
        style: import.meta.env.VITE_MAP_STYLE_URL || 'mapbox://styles/mapbox/dark-v11',
        center,
        zoom,
        attributionControl: false,
      });

      mapInstance.current.on('load', () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Map loaded successfully');
        }
        clearTimeout(loadingTimeout);
        setIsLoading(false);
        setError(null);
      });

      mapInstance.current.on('error', (e: any) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Map error:', e);
        }
        clearTimeout(loadingTimeout);
        setError(null); // Don't block bubbles with errors
        setIsLoading(false);
      });

    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Map initialization error:', err);
      }
      clearTimeout(loadingTimeout);
      setError(null);
      setIsLoading(false);
    }
  }, [center, zoom]);

  /**
   * Handle bubble interactions
   */
  const handleBubbleClick = useCallback((bubble: QuestBubble, clickPosition: { x: number; y: number }) => {
    setTooltip({ bubble, position: clickPosition });
  }, []);

  const handleStartQuest = useCallback((bubble: QuestBubble) => {
    console.log(`Starting ${bubble.category} quest:`, bubble.title);
    if (onQuestComplete) {
      onQuestComplete(bubble.id);
    }
  }, [onQuestComplete]);

  const closeTooltip = useCallback(() => {
    setTooltip(null);
  }, []);

  /**
   * Track mouse and container
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

  /**
   * Initialize map on mount
   */
  useEffect(() => {
    initializeMap();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      // Clean up persona markers
      personaMarkers.forEach(marker => marker.remove());
    };
  }, [initializeMap, personaMarkers]);

  /**
   * Add persona chips when map is ready
   */
  useEffect(() => {
    if (mapInstance.current && !isLoading && !error) {
      // Delay persona chips to ensure map is fully loaded
      setTimeout(() => {
        addPersonaChips();
      }, 1000);
    }
  }, [isLoading, error, addPersonaChips]);

  return (
    <div className="w-full h-full relative">
      {/* Map Container */}
      <div
        ref={mapContainer}
        id={mapContainerId.current}
        className="w-full h-full bg-gradient-to-br from-dark-secondary to-dark-tertiary rounded-xl overflow-hidden"
        style={{ height: '100%', minHeight: '400px' }}
      />
      
      {/* Quest Bubbles Overlay */}
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
        
        {/* Student Quest Overlay */}
        {user?.role === 'student' && mapInstance.current && (
          <QuestMapOverlay map={mapInstance.current} />
        )}
      </div>

      {/* Mobile Legend Toggle */}
      {isMobile && (
        <motion.button
          className="absolute top-4 right-4 z-30 bg-glass-dark border-glass-dark rounded-full p-3 text-white min-w-touch min-h-touch touch-manipulation"
          onClick={() => setShowLegend(!showLegend)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Toggle legend"
        >
          <Target className="w-5 h-5" />
        </motion.button>
      )}

      {/* Desktop Legend */}
      {!isMobile && (
        <motion.div
          className="absolute bottom-4 left-4 z-30 bg-glass-dark border-glass-dark rounded-xl p-4 max-w-xs backdrop-blur-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <h4 className="text-white font-bold text-sm mb-3">CHESS Quest Map</h4>
          <div className="space-y-2">
            {Object.entries(QUEST_STYLES).slice(0, 5).map(([category, style]) => (
              <div key={category} className="flex items-center gap-2 text-xs">
                <img 
                  src={style.sprite}
                  alt={style.character}
                  className="w-4 h-4 object-contain"
                  draggable={false}
                />
                <div
                  className="w-3 h-3 rounded-full border border-white/40"
                  style={{ backgroundColor: style.color }}
                />
                <span className="text-gray-100">{style.character}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-gray-300">
            {PHILADELPHIA_BUBBLES.length} interactive locations
          </div>
        </motion.div>
      )}

      {/* Mobile Legend Modal */}
      <AnimatePresence>
        {isMobile && showLegend && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLegend(false)}
          >
            <motion.div
              className="bg-glass-dark border-glass-dark rounded-xl p-6 max-w-sm w-full"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-white font-bold text-lg">CHESS Quest Map</h4>
                <button
                  onClick={() => setShowLegend(false)}
                  className="p-2 rounded-full bg-glass hover:bg-glass-light transition-colors min-w-touch min-h-touch"
                >
                  <X className="w-4 h-4 text-gray-300" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(QUEST_STYLES).map(([category, style]) => (
                  <div key={category} className="flex items-center gap-2 text-xs bg-glass-light rounded-lg p-2">
                    <img 
                      src={style.sprite}
                      alt={style.character}
                      className="w-5 h-5 object-contain"
                      draggable={false}
                    />
                    <div>
                      <div
                        className="w-3 h-3 rounded-full border border-white/40 mb-1"
                        style={{ backgroundColor: style.color }}
                      />
                      <span className="text-gray-100 text-xs">{style.character}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bubble Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <>
            {isMobile && (
              <div 
                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                onClick={closeTooltip}
              />
            )}
            <BubbleTooltip
              bubble={tooltip.bubble}
              position={tooltip.position}
              onClose={closeTooltip}
              onStartQuest={handleStartQuest}
            />
          </>
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
              <p className="text-sm text-gray-300">Connecting to Mapbox...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Indicator */}
      {!isLoading && !error && (
        <motion.div
          className={`absolute top-4 left-4 z-30 bg-cyber-green-500/20 border border-cyber-green-500/40 rounded-full ${isMobile ? 'px-2 py-1' : 'px-3 py-1'} text-xs text-cyber-green-300 flex items-center gap-2`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="w-2 h-2 bg-cyber-green-400 rounded-full animate-pulse"></div>
          <span>{isMobile ? PHILADELPHIA_BUBBLES.length.toString() : `${PHILADELPHIA_BUBBLES.length} locations`}</span>
        </motion.div>
      )}
    </div>
  );
};

export default MapView;