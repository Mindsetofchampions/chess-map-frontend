import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { motion } from 'framer-motion';
import { Shield, Users, Target, MapPin } from 'lucide-react';
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
  position: { x: number; y: number }; // Screen coordinates
  coordinates: [number, number]; // Map coordinates [lng, lat]
  sprite: string;
  character: string;
  reward?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  organization?: string;
}

/**
 * CHESS Category Styling
 */
const QUEST_STYLES: Record<QuestCategory, {
  color: string;
  emoji: string;
  label: string;
  character: string;
}> = {
  character: {
    color: CHESS_COLORS.character, // Purple
    emoji: '🦉',
    label: 'Character Quest',
    character: 'Hootie the Owl'
  },
  health: {
    color: CHESS_COLORS.health, // Green
    emoji: '🐱',
    label: 'Health Quest', 
    character: 'Brenda the Cat'
  },
  exploration: {
    color: CHESS_COLORS.exploration, // Orange
    emoji: '🐕',
    label: 'Exploration Quest',
    character: 'Gino the Dog'
  },
  stem: {
    color: CHESS_COLORS.stem, // Blue
    emoji: '🤖', 
    label: 'STEM Quest',
    character: 'Hammer the Robot'
  },
  stewardship: {
    color: CHESS_COLORS.stewardship, // Red
    emoji: '🏛️',
    label: 'Stewardship Quest',
    character: 'MOC Badge'
  },
  safe_space: {
    color: '#06D6A0', // Bright Teal
    emoji: '🛡️',
    label: 'Safe Space',
    character: 'Protected Learning Zone'
  },
  event: {
    color: '#FF6B9D', // Bright Pink
    emoji: '📅',
    label: 'Community Event',
    character: 'Learning Event'
  }
};

/**
 * Philadelphia sample quest bubbles
 */
const PHILADELPHIA_BUBBLES: QuestBubble[] = [
  // CHESS Quest Bubbles
  {
    id: 'character-liberty-bell',
    category: 'character',
    title: 'Liberty Bell Character Challenge',
    description: 'Learn about honesty and integrity through the story of the Liberty Bell with Hootie the Owl.',
    position: { x: 400, y: 300 },
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
    position: { x: 200, y: 150 },
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
    position: { x: 500, y: 200 },
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
    position: { x: 300, y: 400 },
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
    position: { x: 150, y: 350 },
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
    position: { x: 350, y: 250 },
    coordinates: [-75.1635, 39.9611],
    sprite: '/icons/safe-space-icon.png',
    character: 'Protected Learning Zone',
    organization: 'Free Library of Philadelphia'
  },
  {
    id: 'safe-space-community-center',
    category: 'safe_space',
    title: 'Community Learning Center',
    description: 'Welcoming space for collaborative learning, homework help, and peer mentoring programs.',
    position: { x: 450, y: 350 },
    coordinates: [-75.1580, 39.9800],
    sprite: '/icons/safe-space-icon.png',
    character: 'Protected Learning Zone',
    organization: 'Philadelphia Community Centers'
  },
  
  // Event Bubbles
  {
    id: 'event-maker-festival',
    category: 'event',
    title: 'Philadelphia Maker Festival',
    description: 'Join the community for hands-on STEM activities, 3D printing demos, and collaborative learning workshops.',
    position: { x: 250, y: 450 },
    coordinates: [-75.1437, 39.9537],
    sprite: '/icons/event-icon.png',
    character: 'Learning Event',
    organization: 'Philadelphia Maker Collective'
  },
  {
    id: 'event-science-expo',
    category: 'event',
    title: 'Young Scientists Expo',
    description: 'Students showcase their research projects and compete in science fair competitions with community judges.',
    position: { x: 550, y: 180 },
    coordinates: [-75.1400, 39.9650],
    sprite: '/icons/event-icon.png',
    character: 'Learning Event',
    organization: 'Philadelphia Science Alliance'
  }
];

/**
 * Individual Quest Bubble Component
 */
interface QuestBubbleProps {
  bubble: QuestBubble;
  mousePosition: { x: number; y: number };
  onClick: (bubble: QuestBubble) => void;
  isVisible: boolean;
}

const QuestBubbleComponent: React.FC<QuestBubbleProps> = ({ 
  bubble, 
  mousePosition, 
  onClick,
  isVisible 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [followPosition, setFollowPosition] = useState({ x: 0, y: 0 });
  const style = QUEST_STYLES[bubble.category];

  // Update position to follow mouse when hovered
  useEffect(() => {
    if (isHovered) {
      setFollowPosition({
        x: (mousePosition.x - bubble.position.x) * 0.1,
        y: (mousePosition.y - bubble.position.y) * 0.1
      });
    } else {
      setFollowPosition({ x: 0, y: 0 });
    }
  }, [isHovered, mousePosition, bubble.position]);

  const handleClick = () => {
    onClick(bubble);
  };

  if (!isVisible) return null;

  return (
    <motion.div
      className="absolute pointer-events-auto cursor-pointer"
      style={{
        left: bubble.position.x,
        top: bubble.position.y,
        transform: 'translate(-50%, -50%)',
        zIndex: 20
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
        x: followPosition.x,
        y: followPosition.y
      }}
      transition={{ 
        type: "spring", 
        stiffness: 200, 
        damping: 15,
        delay: PHILADELPHIA_BUBBLES.indexOf(bubble) * 0.3
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      whileHover={{ scale: 1.2 }}
      whileTap={{ scale: 0.9 }}
    >
      {/* Glass Bubble */}
      <div
        className="relative w-16 h-16 rounded-full backdrop-blur-md border-2 border-white/40 shadow-xl flex items-center justify-center transition-all duration-300"
        style={{
          backgroundColor: `${style.color}60`,
          boxShadow: `0 8px 32px ${style.color}40, inset 0 1px 0 rgba(255,255,255,0.3)`
        }}
      >
        <span className="text-2xl drop-shadow-lg select-none">{style.emoji}</span>
        
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
          delay: PHILADELPHIA_BUBBLES.indexOf(bubble) * 0.5
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
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showBubbles, setShowBubbles] = useState(false);
  
  // Authentication context
  const { user } = useAuth();

  // Get token from environment
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN_PK || import.meta.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  /**
   * Handle bubble click
   */
  const handleBubbleClick = useCallback((bubble: QuestBubble) => {
    console.log('Bubble clicked:', bubble);
    
    if (bubble.category === 'safe_space') {
      console.log('Accessing safe space:', bubble.title);
    } else if (bubble.category === 'event') {
      console.log('Joining event:', bubble.title);
    } else {
      // It's a CHESS quest
      if (onQuestComplete) {
        onQuestComplete(bubble.id);
      }
      console.log('Starting quest:', bubble.title);
    }
  }, [onQuestComplete]);

  /**
   * Track mouse position for bubble following
   */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (mapContainer.current) {
        const rect = mapContainer.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    };

    if (mapContainer.current) {
      mapContainer.current.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      if (mapContainer.current) {
        mapContainer.current.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [mapLoaded]);

  /**
   * Initialize map
   */
  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    
    let mounted = true;

    // Validate token
    if (!mapboxToken || mapboxToken.trim() === '' || mapboxToken === 'pk.YOUR_MAPBOX_TOKEN_HERE') {
      setError('Mapbox token is required. Please add VITE_MAPBOX_TOKEN_PK to your .env file.');
      setIsLoading(false);
      return;
    }

    try {
      // Set token
      mapboxgl.accessToken = mapboxToken;

      // Initialize map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
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
          setMapLoaded(true);
          setIsLoading(false);
          setError(null);
          
          // Show bubbles after a short delay
          setTimeout(() => {
            setShowBubbles(true);
          }, 1000);
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

    return () => {
      mounted = false;
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-full relative">
      {/* Map Container */}
      <div
        ref={mapContainer}
        className="w-full h-full min-h-[400px] bg-gray-900 rounded-xl relative"
        style={{ height: '100%', minHeight: '400px' }}
      />
      
      {/* Quest Bubbles Overlay */}
      {showBubbles && mapLoaded && !error && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 10 }}>
          {PHILADELPHIA_BUBBLES.map((bubble) => (
            <QuestBubbleComponent
              key={bubble.id}
              bubble={bubble}
              mousePosition={mousePosition}
              onClick={handleBubbleClick}
              isVisible={showBubbles}
            />
          ))}
        </div>
      )}

      {/* Quest Legend */}
      {showBubbles && mapLoaded && !error && (
        <motion.div
          className="absolute bottom-4 left-4 z-20 bg-white/20 backdrop-blur-lg border border-white/30 rounded-xl p-4 max-w-xs"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 }}
        >
          <h4 className="text-white font-bold text-sm mb-3">Philadelphia CHESS Quests</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(QUEST_STYLES).map(([category, style]) => (
              <div key={category} className="flex items-center gap-2 text-gray-100">
                <span className="text-sm">{style.emoji}</span>
                <div
                  className="w-3 h-3 rounded-full border border-white/40"
                  style={{ backgroundColor: style.color }}
                />
                <span className="truncate">{style.character}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-gray-300">
            🖱️ Hover to follow • 👆 Click to start
          </div>
        </motion.div>
      )}

      {/* Loading Overlay */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-xl z-10">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-blue-400 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Loading Philadelphia Quest Map</h3>
            <p className="text-sm text-gray-300">Initializing CHESS bubbles...</p>
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
            <h3 className="text-xl font-semibold mb-2">Map Error</h3>
            <p className="text-sm mb-4">{error}</p>
            {error.includes('token') && (
              <div className="text-xs text-gray-300">
                <p>1. Get a token from https://studio.mapbox.com/</p>
                <p>2. Add VITE_MAPBOX_TOKEN_PK=your_token to .env</p>
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

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 right-4 bg-black/70 text-white p-2 rounded text-xs z-30">
          <div>Map Loaded: {mapLoaded ? 'Yes' : 'No'}</div>
          <div>Bubbles Visible: {showBubbles ? 'Yes' : 'No'}</div>
          <div>Bubble Count: {PHILADELPHIA_BUBBLES.length}</div>
          <div>Mouse: {mousePosition.x}, {mousePosition.y}</div>
        </div>
      )}
    </div>
  );
};

export default MapView;