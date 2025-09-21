// filepath: src/components/MapView.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { Target, MapPin, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';

import { type PersonaKey } from '@/assets/personas';
import { useAuth } from '@/contexts/AuthContext';
import { PHILADELPHIA_BUBBLES, QUEST_STYLES, type QuestBubble } from '@/hooks/usePhiladelphiaData';
import {
  addPersonaChipsToMap,
  type PersonaChipMarker,
  type OrganizationWithPersonas,
} from '@/lib/sprites';
import QuestMapOverlay from '@/pages/student/QuestMapOverlay';
import type { PersonaDef } from '@/types';

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  onQuestComplete?: (questId: string) => void;
}

interface BubbleTooltipProps {
  bubble: QuestBubble;
  position: { x: number; y: number };
  onClose: () => void;
  onStartQuest: (bubble: QuestBubble) => void;
}

const BubbleTooltip: React.FC<BubbleTooltipProps> = ({
  bubble,
  position,
  onClose,
  onStartQuest,
}) => {
  const style = QUEST_STYLES[bubble.category];
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const getActionLabel = (cat: string) => {
    switch (cat) {
      case 'safe_space':
        return 'Enter Safe Space';
      case 'event':
        return 'Join Event';
      default:
        return 'Start Quest';
    }
  };

  const handleStart = () => {
    console.log('Starting quest from bubble:', bubble.id);
    onStartQuest(bubble);
    onClose();
  };

  const tooltipStyle = isMobile
    ? {
        position: 'fixed' as const,
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 50,
      }
    : {
        position: 'fixed' as const,
        left: `${Math.min(position.x, window.innerWidth - 320)}px`,
        top: `${Math.max(position.y - 200, 20)}px`,
        zIndex: 50,
      };

  return (
    <motion.div
      className='pointer-events-auto'
      style={tooltipStyle}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className='bg-white/30 backdrop-blur-2xl border border-white/40 rounded-2xl shadow-2xl p-4 relative max-w-sm'>
        <button
          onClick={onClose}
          className='absolute top-2 right-2 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors min-w-touch min-h-touch touch-manipulation'
          aria-label='Close tooltip'
        >
          <X className='w-4 h-4 text-white' />
        </button>

        <div className='flex items-center gap-3 mb-3 pr-8'>
          <div
            className='w-12 h-12 rounded-full flex items-center justify-center border-2 border-white/40'
            style={{ backgroundColor: `${style.color}40` }}
          >
            <img
              src={style.sprite}
              alt={style.character}
              className='w-8 h-8 object-contain'
              draggable={false}
            />
          </div>
          <div>
            <h3 className='text-white font-bold text-lg'>{bubble.title}</h3>
            <p className='text-gray-200 text-sm'>{style.character}</p>
          </div>
        </div>

        <p className='text-gray-100 text-sm mb-3 leading-relaxed'>{bubble.description}</p>

        <div className='space-y-1 mb-4'>
          {bubble.organization && (
            <div className='flex items-center gap-2 text-xs text-gray-200'>
              <MapPin className='w-3 h-3' />
              <span>{bubble.organization}</span>
            </div>
          )}

          {bubble.reward && (
            <div className='flex items-center gap-2 text-xs text-yellow-300'>
              <Sparkles className='w-3 h-3' />
              <span>{bubble.reward} coins</span>
            </div>
          )}
        </div>

        <button
          onClick={handleStart}
          className='w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 min-h-[44px] touch-manipulation hover:scale-105'
          style={{
            backgroundColor: `${style.color}80`,
            boxShadow: `0 4px 20px ${style.color}40`,
            border: `1px solid ${style.color}60`,
          }}
        >
          {getActionLabel(bubble.category)}
        </button>
      </div>
    </motion.div>
  );
};

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
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [followPosition, setFollowPosition] = useState({ x: 0, y: 0 });
  const style = QUEST_STYLES[bubble.category];
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const absolutePosition = containerRect
    ? {
        x: (bubble.position.x / 100) * containerRect.width,
        y: (bubble.position.y / 100) * containerRect.height,
      }
    : { x: 0, y: 0 };

  useEffect(() => {
    if (isHovered && containerRect) {
      const deltaX = mousePosition.x - absolutePosition.x;
      const deltaY = mousePosition.y - absolutePosition.y;
      setFollowPosition({
        x: deltaX * (isMobile ? 0.05 : 0.1),
        y: deltaY * (isMobile ? 0.05 : 0.1),
      });
    } else {
      setFollowPosition({ x: 0, y: 0 });
    }
  }, [isHovered, mousePosition, absolutePosition, containerRect, isMobile]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    onClick(bubble, { x: rect.left + rect.width / 2, y: rect.top });
  };

  const bubbleSize = isMobile ? 'w-12 h-12' : 'w-16 h-16';
  const spriteSize = isMobile ? 'w-7 h-7' : 'w-10 h-10';

  return (
    <motion.div
      className='absolute pointer-events-auto cursor-pointer'
      style={{
        left: `${bubble.position.x}%`,
        top: `${bubble.position.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 20,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: isHovered ? (isMobile ? 1.1 : 1.2) : 1,
        opacity: 1,
        x: followPosition.x,
        y: followPosition.y,
      }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 15,
        delay: PHILADELPHIA_BUBBLES.indexOf(bubble) * (isMobile ? 0.1 : 0.2),
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
          boxShadow: `0 8px 32px ${style.color}40, inset 0 1px 0 rgba(255,255,255,0.3)`,
        }}
      >
        <img
          src={style.sprite}
          alt={style.character}
          className={`${spriteSize} object-contain drop-shadow-lg select-none`}
          draggable={false}
          onError={(e) => {
            // WHY: hide broken image but keep bubble interactive
            const img = e.currentTarget as HTMLImageElement;
            img.style.display = 'none';
            const parent = img.parentElement;
            if (parent && !parent.querySelector('.fallback-emoji')) {
              const fallback = document.createElement('div');
              fallback.className = 'fallback-emoji text-xl';
              fallback.textContent =
                bubble.category === 'character'
                  ? '🦉'
                  : bubble.category === 'health'
                    ? '🐱'
                    : bubble.category === 'exploration'
                      ? '🐕'
                      : bubble.category === 'stem'
                        ? '🤖'
                        : bubble.category === 'stewardship'
                          ? '🏛️'
                          : bubble.category === 'safe_space'
                            ? '🛡️'
                            : '📅';
              parent.appendChild(fallback);
            }
          }}
        />
      </div>

      <motion.div
        className='absolute inset-0 rounded-full border-2 pointer-events-none'
        style={{ borderColor: style.color }}
        animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: PHILADELPHIA_BUBBLES.indexOf(bubble) * 0.3,
        }}
      />
    </motion.div>
  );
};

const MapView: React.FC<MapViewProps> = ({
  center = [-75.1652, 39.9526],
  zoom = 12,
  onQuestComplete,
}) => {
  const { user } = useAuth() as { user?: { role?: string } };
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapContainerId = useRef(`map-${Math.random().toString(36).slice(2)}`);
  const mapInstance = useRef<any>(null);
  const personaMarkersRef = useRef<PersonaChipMarker[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState<boolean>(false);
  const [tooltip, setTooltip] = useState<{
    bubble: QuestBubble;
    position: { x: number; y: number };
  } | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

  const handleBubbleClick = useCallback(
    (bubble: QuestBubble, clickPosition: { x: number; y: number }) => {
      setTooltip({ bubble, position: clickPosition });
    },
    [],
  );

  const handleStartQuest = useCallback(
    (bubble: QuestBubble) => {
      console.log('handleStartQuest called with bubble:', bubble.id);
      if (onQuestComplete) {
        onQuestComplete(bubble.id);
      } else {
        console.warn('onQuestComplete not provided to MapView');
      }
    },
    [onQuestComplete],
  );

  const closeTooltip = useCallback(() => setTooltip(null), []);

  /** WHY: keep mouse & rect in sync for bubble follow */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!mapContainer.current) return;
      const rect = mapContainer.current.getBoundingClientRect();
      setContainerRect(rect);
      setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    const handleResize = () => {
      if (!mapContainer.current) return;
      setContainerRect(mapContainer.current.getBoundingClientRect());
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

  /** WHY: initialize Mapbox if token present; otherwise show bubbles on gradient */
  useEffect(() => {
    if (!mapContainer.current) return;

    const initializeMap = async () => {
      const loadingTimeout = setTimeout(() => {
        setIsLoading(false);
        setError('Map timed out — showing bubbles only');
      }, 2500);

      try {
        const mapboxToken =
          import.meta.env.VITE_MAPBOX_TOKEN ||
          import.meta.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
          import.meta.env.VITE_MAPBOX_TOKEN_PK;

        if (!mapboxToken || /YOUR_|example_/i.test(mapboxToken)) {
          clearTimeout(loadingTimeout);
          setIsLoading(false);
          setError('No Mapbox token — showing bubbles only');
          return;
        }

        const mapboxgl = await import('mapbox-gl');
        mapboxgl.default.accessToken = mapboxToken;

        if (mapInstance.current) {
          mapInstance.current.remove();
          mapInstance.current = null;
        }

        if (!mapContainer.current) {
          clearTimeout(loadingTimeout);
          setIsLoading(false);
          return;
        }

        mapInstance.current = new mapboxgl.default.Map({
          container: mapContainer.current,
          style: import.meta.env.VITE_MAP_STYLE_URL || 'mapbox://styles/mapbox/dark-v11',
          center,
          zoom,
          attributionControl: false,
        });

        mapInstance.current.on('load', () => {
          clearTimeout(loadingTimeout);
          setIsLoading(false);
          setError(null);
        });

        mapInstance.current.on('error', () => {
          clearTimeout(loadingTimeout);
          setIsLoading(false);
          setError('Map error — bubbles only');
        });
      } catch {
        clearTimeout(loadingTimeout);
        setIsLoading(false);
        setError('Map init error — bubbles only');
      }
    };

    initializeMap();

    return () => {
      personaMarkersRef.current.forEach((m) => m.remove());
      personaMarkersRef.current = [];
      if (mapInstance.current) {
        try {
          mapInstance.current.remove();
        } catch {}
        mapInstance.current = null;
      }
    };
  }, [center, zoom]);

  /** WHY: add persona chips after map is ready */
  useEffect(() => {
    if (!mapInstance.current || isLoading || error) return;

    personaMarkersRef.current.forEach((m) => m.remove());
    personaMarkersRef.current = [];

    const organizationsWithPersonas: OrganizationWithPersonas[] = [
      {
        id: 'org-1',
        lat: 39.9526,
        lng: -75.1652,
        activePersonas: ['hootie', 'hammer'] as PersonaKey[],
      },
      {
        id: 'org-2',
        lat: 39.9496,
        lng: -75.1502,
        activePersonas: ['kittykat', 'gino'] as PersonaKey[],
      },
      {
        id: 'org-3',
        lat: 39.9656,
        lng: -75.181,
        activePersonas: ['badge'] as PersonaKey[],
      },
    ];

    const markers = addPersonaChipsToMap(
      mapInstance.current,
      organizationsWithPersonas,
      (persona: PersonaDef) => {
        // WHY: hook for persona interactions
        console.log('Persona clicked:', persona.name);
      },
    );
    personaMarkersRef.current = markers;
  }, [isLoading, error]);

  return (
    <div className='w-full h-full relative'>
      {/* Map area */}
      <div
        ref={mapContainer}
        id={mapContainerId.current}
        className='w-full h-full bg-gradient-to-br from-dark-secondary to-dark-tertiary rounded-xl overflow-hidden'
        style={{ height: '100%', minHeight: '400px' }}
      />

      {/* Quest Bubbles Overlay */}
      <div className='absolute inset-0 pointer-events-none overflow-hidden z-20'>
        {PHILADELPHIA_BUBBLES.map((bubble) => (
          <QuestBubbleComponent
            key={bubble.id}
            bubble={bubble}
            mousePosition={mousePosition}
            containerRect={containerRect}
            onClick={handleBubbleClick}
          />
        ))}

        {/* Student-only dynamic overlay */}
        {user?.role === 'student' && mapInstance.current && (
          <QuestMapOverlay map={mapInstance.current} />
        )}
      </div>

      {/* Mobile Legend Toggle */}
      {isMobile && (
        <motion.button
          className='absolute top-4 right-4 z-30 bg-glass-dark border-glass-dark rounded-full p-3 text-white min-w-touch min-h-touch touch-manipulation'
          onClick={() => setShowLegend((s) => !s)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label='Toggle legend'
        >
          <Target className='w-5 h-5' />
        </motion.button>
      )}

      {/* Desktop Legend */}
      {!isMobile && (
        <motion.div
          className='absolute bottom-4 left-4 z-30 bg-glass-dark border-glass-dark rounded-xl p-4 max-w-xs backdrop-blur-lg'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <h4 className='text-white font-bold text-sm mb-3'>CHESS Quest Map</h4>
          <div className='space-y-2'>
            {Object.entries(QUEST_STYLES)
              .slice(0, 5)
              .map(([category, style]) => (
                <div key={category} className='flex items-center gap-2 text-xs'>
                  <img
                    src={style.sprite}
                    alt={style.character}
                    className='w-4 h-4 object-contain'
                    draggable={false}
                  />
                  <div
                    className='w-3 h-3 rounded-full border border-white/40'
                    style={{ backgroundColor: style.color }}
                  />
                  <span className='text-gray-100'>{style.character}</span>
                </div>
              ))}
          </div>
          <div className='mt-3 text-xs text-gray-300'>
            {PHILADELPHIA_BUBBLES.length} interactive locations
          </div>
        </motion.div>
      )}

      {/* Mobile Legend Modal */}
      <AnimatePresence>
        {isMobile && showLegend && (
          <motion.div
            className='fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLegend(false)}
          >
            <motion.div
              className='bg-glass-dark border-glass-dark rounded-xl p-6 max-w-sm w-full'
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className='flex items-center justify-between mb-4'>
                <h4 className='text-white font-bold text-lg'>CHESS Quest Map</h4>
                <button
                  onClick={() => setShowLegend(false)}
                  className='p-2 rounded-full bg-glass hover:bg-glass-light transition-colors min-w-touch min-h-touch'
                >
                  <X className='w-4 h-4 text-gray-300' />
                </button>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                {Object.entries(QUEST_STYLES).map(([category, style]) => (
                  <div
                    key={category}
                    className='flex items-center gap-2 text-xs bg-glass-light rounded-lg p-2'
                  >
                    <img
                      src={style.sprite}
                      alt={style.character}
                      className='w-5 h-5 object-contain'
                      draggable={false}
                    />
                    <div>
                      <div
                        className='w-3 h-3 rounded-full border border-white/40 mb-1'
                        style={{ backgroundColor: style.color }}
                      />
                      <span className='text-gray-100 text-xs'>{style.character}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <>
            {isMobile && (
              <div
                className='fixed inset-0 z-40 bg-black/30 backdrop-blur-sm'
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
            className='absolute inset-0 flex items-center justify-center bg-dark-secondary/95 backdrop-blur-md rounded-xl z-40'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className='text-center text-white'>
              <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-electric-blue-400 mx-auto mb-4'></div>
              <h3 className='text-lg font-semibold mb-2'>Loading Philadelphia Map</h3>
              <p className='text-sm text-gray-300'>Connecting to Mapbox…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Indicator */}
      {!isLoading && !error && (
        <motion.div
          className={`absolute top-4 left-4 z-30 bg-cyber-green-500/20 border border-cyber-green-500/40 rounded-full ${
            isMobile ? 'px-2 py-1' : 'px-3 py-1'
          } text-xs text-cyber-green-300 flex items-center gap-2`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className='w-2 h-2 bg-cyber-green-400 rounded-full animate-pulse'></div>
          <span>
            {isMobile
              ? PHILADELPHIA_BUBBLES.length.toString()
              : `${PHILADELPHIA_BUBBLES.length} locations`}
          </span>
        </motion.div>
      )}
    </div>
  );
};

export default MapView;
