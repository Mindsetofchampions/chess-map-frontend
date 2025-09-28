// filepath: src/components/MapView.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { Target, MapPin, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

import { type PersonaKey } from '@/assets/personas';
import { useAuth } from '@/contexts/AuthContext';
import {
  PHILADELPHIA_BUBBLES,
  QUEST_STYLES,
  CHESS_COLORS,
  type QuestBubble,
  type QuestCategory,
} from '@/hooks/usePhiladelphiaData';
import {
  addPersonaChipsToMap,
  type PersonaChipMarker,
  type OrganizationWithPersonas,
} from '@/lib/sprites';
import PublicMapOverlay from '@/pages/common/PublicMapOverlay';
import QuestMapOverlay from '@/pages/student/QuestMapOverlay';
import type { PersonaDef } from '@/types';

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  onQuestComplete?: (questId: string) => void;
  // Optional render prop to inject overlays with access to the map instance
  renderOverlay?: (map: any, gl?: any) => React.ReactNode;
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
  onHoverChange?: (hovered: boolean) => void;
}

const QuestBubbleComponent: React.FC<QuestBubbleProps> = ({
  bubble,
  mousePosition,
  containerRect,
  onClick,
  onHoverChange,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [followPosition, setFollowPosition] = useState({ x: 0, y: 0 });
  const style = QUEST_STYLES[bubble.category];
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const absolutePosition = useMemo(() => {
    if (!containerRect) return { x: 0, y: 0 };
    return {
      x: (bubble.position.x / 100) * containerRect.width,
      y: (bubble.position.y / 100) * containerRect.height,
    };
    // Memoize by dimensions and bubble position only
  }, [containerRect?.width, containerRect?.height, bubble.position.x, bubble.position.y]);

  useEffect(() => {
    if (isHovered && containerRect) {
      const deltaX = mousePosition.x - absolutePosition.x;
      const deltaY = mousePosition.y - absolutePosition.y;
      const next = {
        x: deltaX * (isMobile ? 0.05 : 0.1),
        y: deltaY * (isMobile ? 0.05 : 0.1),
      };
      setFollowPosition((prev) => (prev.x !== next.x || prev.y !== next.y ? next : prev));
    } else {
      setFollowPosition((prev) => (prev.x !== 0 || prev.y !== 0 ? { x: 0, y: 0 } : prev));
    }
    // Depend on primitives to avoid effect churn, exclude followPosition to prevent self-loops
  }, [
    isHovered,
    mousePosition.x,
    mousePosition.y,
    absolutePosition.x,
    absolutePosition.y,
    containerRect?.width,
    containerRect?.height,
    isMobile,
  ]);

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
      onMouseEnter={() => {
        setIsHovered(true);
        onHoverChange?.(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        onHoverChange?.(false);
      }}
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
  renderOverlay,
}) => {
  const { user } = useAuth() as { user?: { role?: string } };
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapContainerId = useRef(`map-${Math.random().toString(36).slice(2)}`);
  const mapInstance = useRef<any>(null);
  const glNSRef = useRef<any>(null); // Map GL namespace (Mapbox or MapLibre)
  const engineRef = useRef<'none' | 'mapbox' | 'maplibre' | 'osm-raster'>('none');
  // Prevent repeated fallbacks/re-inits that cause flicker
  const didFallbackToMapLibreRef = useRef(false);
  const didFallbackToOsmRef = useRef(false);
  const [engine, setEngine] = useState<'none' | 'mapbox' | 'maplibre' | 'osm-raster'>('none');
  const personaMarkersRef = useRef<PersonaChipMarker[]>([]);
  const clusterSourceId = useRef(`org-personas-${Math.random().toString(36).slice(2)}`);
  const phillySourceId = useRef(`philly-bubbles-${Math.random().toString(36).slice(2)}`);
  const phillyLayerSymbolId = useRef(
    `philly-bubbles-symbol-${Math.random().toString(36).slice(2)}`,
  );
  const phillyLayerHaloId = useRef(`philly-bubbles-halo-${Math.random().toString(36).slice(2)}`);
  const [isClusteredView, setIsClusteredView] = useState(false);
  const safeSpacesSourceId = useRef(`safe-spaces-${Math.random().toString(36).slice(2)}`);
  const eventsSourceId = useRef(`events-${Math.random().toString(36).slice(2)}`);
  const organizationsRef = useRef<OrganizationWithPersonas[]>([]);

  // Category filters (all on by default)
  const allCategories: QuestCategory[] = [
    'character',
    'health',
    'exploration',
    'stem',
    'stewardship',
    'safe_space',
    'community_hub',
  ];
  const [enabledCategories, setEnabledCategories] = useState<Record<QuestCategory, boolean>>(
    () => Object.fromEntries(allCategories.map((c) => [c, true])) as Record<QuestCategory, boolean>,
  );

  const toggleCategory = useCallback((cat: QuestCategory) => {
    setEnabledCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  // Map categories to persona keys for org persona filtering
  const CATEGORY_TO_PERSONA: Partial<Record<QuestCategory, PersonaKey>> = {
    character: 'hootie',
    health: 'kittykat',
    exploration: 'gino',
    stem: 'hammer',
    stewardship: 'badge',
  };

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState<boolean>(false);
  const [tooltip, setTooltip] = useState<{
    bubble: QuestBubble;
    position: { x: number; y: number };
  } | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);
  const containerRectRef = useRef<DOMRect | null>(null);
  const [hoveredCount, setHoveredCount] = useState(0);
  const anyBubbleHovered = hoveredCount > 0;
  const [useLayerBubbles] = useState(true); // feature flag: render quest bubbles as Mapbox layers
  const phillyHoverFeatureRef = useRef<string | null>(null);
  // Defer cleanup to avoid React 18 StrictMode effect double-invocation flicker
  const cleanupTimerRef = useRef<number | null>(null);
  // Bump when base style reloads so overlays/sprites are re-added
  const [styleEpoch, setStyleEpoch] = useState(0);
  // Track when the map has fully loaded to avoid mid-session fallbacks due to ad-blocked telemetry
  const mapLoadedRef = useRef(false);

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

  /** WHY: measure container rect with ResizeObserver (independent of mouse tracking) */
  useEffect(() => {
    if (!mapContainer.current) return;
    const measureRect = () => {
      try {
        const rect = mapContainer.current!.getBoundingClientRect();
        containerRectRef.current = rect;
        setContainerRect(rect);
      } catch {}
    };
    // initial measure
    measureRect();
    // observe size changes
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => measureRect());
      ro.observe(mapContainer.current);
    } catch {}
    const onWinResize = () => measureRect();
    window.addEventListener('resize', onWinResize);
    return () => {
      window.removeEventListener('resize', onWinResize);
      if (ro) ro.disconnect();
    };
  }, []);

  /** WHY: track mouse only when any bubble is hovered, and throttle updates to reduce re-renders */
  useEffect(() => {
    const el = mapContainer.current;
    if (!el || !anyBubbleHovered) return;

    let rafId: number | null = null;
    let lastX = 0;
    let lastY = 0;
    let ticking = false;
    let lastEmit = 0;
    const minIntervalMs = 60; // ~16 fps; adjust if needed

    const updateMouse = () => {
      const now = performance.now();
      if (now - lastEmit >= minIntervalMs) {
        const rect = containerRectRef.current;
        if (rect) setMousePosition({ x: lastX - rect.left, y: lastY - rect.top });
        lastEmit = now;
      }
      ticking = false;
      rafId = null;
    };

    const onPointerMove = (e: PointerEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (!ticking) {
        ticking = true;
        rafId = requestAnimationFrame(updateMouse);
      }
    };

    el.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      el.removeEventListener('pointermove', onPointerMove as any);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [anyBubbleHovered]);

  /** WHY: initialize map with robust engine fallback to prevent white basemap */
  useEffect(() => {
    if (!mapContainer.current) return;

    // If a cleanup was scheduled (StrictMode probe), cancel it and keep the existing instance
    if (cleanupTimerRef.current != null) {
      try {
        clearTimeout(cleanupTimerRef.current as any);
      } catch {}
      cleanupTimerRef.current = null;
    }

    // In dev StrictMode, effects run twice; if an instance already exists, skip re-init
    if (mapInstance.current) {
      return () => {
        // Schedule actual disposal; if effect re-runs immediately, this will be cancelled above
        const t = window.setTimeout(() => {
          try {
            personaMarkersRef.current.forEach((m) => m.remove());
            personaMarkersRef.current = [];
          } catch {}
          try {
            mapInstance.current?.remove();
          } catch {}
          mapInstance.current = null;
          cleanupTimerRef.current = null;
        }, 120);
        cleanupTimerRef.current = t;
      };
    }

    const initializeMap = async () => {
      // Helper functions accessible across branches
      const resetMapInstance = () => {
        if (mapInstance.current) {
          try {
            mapInstance.current.remove();
          } catch {}
          mapInstance.current = null;
        }
      };

      const attachCommonHandlers = (timeoutId: any) => {
        // Add navigation controls for better UX (zoom/rotate)
        try {
          const nav = new glNSRef.current.NavigationControl({ visualizePitch: true });
          mapInstance.current.addControl(nav, 'top-right');
        } catch {}

        mapInstance.current.on('load', () => {
          clearTimeout(timeoutId);
          setIsLoading(false);
          setError(null);
          mapLoadedRef.current = true;
          try {
            mapInstance.current.resize();
          } catch {}
        });

        mapInstance.current.on('error', (_e: any) => {
          // Let specific init attach fallbacks; for generic errors just note
          setIsLoading(false);
        });
      };

      // Safer engine state setter to avoid redundant setState loops
      const setEngineOnce = (next: 'mapbox' | 'maplibre' | 'osm-raster') => {
        if (engineRef.current !== next) {
          engineRef.current = next;
          setEngine(next);
        }
      };

      const tryFallbackToMapLibre = async () => {
        if (engineRef.current !== 'mapbox') return;
        if (didFallbackToMapLibreRef.current) return;
        didFallbackToMapLibreRef.current = true;
        clearTimeout(loadingTimeout);
        await initMapLibre();
      };

      const tryFallbackToOsmRaster = async () => {
        if (engineRef.current !== 'maplibre') return;
        if (didFallbackToOsmRef.current) return;
        didFallbackToOsmRef.current = true;
        clearTimeout(loadingTimeout);
        await initOsmRaster();
      };

      // Define in outer scope; bodies assigned later after imports
      let initMapbox = async () => {};
      let initMapLibre = async () => {};
      let initOsmRaster = async () => {};

      const handleInitTimeout = () => {
        // If map hasn't loaded by now, try fallback
        if (engineRef.current === 'mapbox') {
          tryFallbackToMapLibre();
        } else if (engineRef.current === 'maplibre') {
          tryFallbackToOsmRaster();
        } else {
          setIsLoading(false);
          setError('Map timed out — showing bubbles only');
        }
      };
      const ms = Number(import.meta.env.VITE_MAP_INIT_TIMEOUT_MS || 8000);
      const loadingTimeout = window.setTimeout(handleInitTimeout, ms);

      try {
        const mapboxToken = [
          import.meta.env.VITE_MAPBOX_TOKEN,
          import.meta.env.NEXT_PUBLIC_MAPBOX_TOKEN,
          import.meta.env.VITE_MAPBOX_TOKEN_PK,
        ].find((t): t is string => Boolean(t));

        // Allow forcing engine via env for local dev or restricted domains
        const forcedEngine = (import.meta.env.VITE_MAP_ENGINE || '').toLowerCase();
        const forceMapLibre =
          forcedEngine === 'maplibre' ||
          String(import.meta.env.VITE_FORCE_MAPLIBRE).toLowerCase() === 'true';

        initMapbox = async () => {
          setIsLoading(true);
          const mapboxgl = await import('mapbox-gl');
          // Disable telemetry/events to avoid ad-blocker noise and potential flicker from retries
          try {
            // mapbox-gl v3 exposes a config object
            // @ts-ignore - config may be missing in some builds
            if (mapboxgl.default?.config) {
              // @ts-ignore
              mapboxgl.default.config.EVENTS_URL = '';
            }
            // Also explicitly disable telemetry so SDK doesn't enqueue events
            // @ts-ignore - method exists on mapbox-gl but TS types may vary
            if (typeof mapboxgl.default.setTelemetryEnabled === 'function') {
              // @ts-ignore
              mapboxgl.default.setTelemetryEnabled(false);
            }
          } catch {}
          mapboxgl.default.accessToken = mapboxToken!;
          glNSRef.current = mapboxgl.default;
          setEngineOnce('mapbox');
          resetMapInstance();
          mapInstance.current = new mapboxgl.default.Map({
            container: mapContainer.current!,
            style: import.meta.env.VITE_MAP_STYLE_URL || 'mapbox://styles/mapbox/dark-v11',
            center,
            zoom,
            attributionControl: true,
          });
          attachCommonHandlers(loadingTimeout);
          // On style load errors, fallback
          mapInstance.current.on('error', (_e: any) => {
            const status = _e?.error?.status || _e?.statusCode;
            const resource = _e?.error?.resourceType || _e?.resourceType;
            const url = _e?.error?.url || _e?.url || '';
            const isTelemetry = typeof url === 'string' && /events\.mapbox\.com/.test(url);
            if (isTelemetry) return; // ignore ad-blocked telemetry errors

            // Fallback only for auth errors affecting core style assets
            const coreResource =
              resource === 'style' ||
              resource === 'sprite' ||
              resource === 'glyphs' ||
              resource === 'source' ||
              resource === 'tile';
            const isAuth = status === 401 || status === 403;
            if (coreResource && isAuth) {
              tryFallbackToMapLibre();
            }
          });
        };

        initMapLibre = async () => {
          setIsLoading(true);
          const maplibregl = (await import('maplibre-gl')).default;
          glNSRef.current = maplibregl;
          setEngineOnce('maplibre');
          resetMapInstance();
          mapInstance.current = new maplibregl.Map({
            container: mapContainer.current!,
            style:
              import.meta.env.VITE_MAPLIBRE_STYLE_URL ||
              'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
            center,
            zoom,
            attributionControl: { compact: true },
          });
          attachCommonHandlers(loadingTimeout);
          mapInstance.current.on('error', (_e: any) => {
            // Fallback to OSM raster if style fails
            tryFallbackToOsmRaster();
          });
        };

        initOsmRaster = async () => {
          setIsLoading(true);
          const maplibregl = (await import('maplibre-gl')).default;
          glNSRef.current = maplibregl;
          setEngineOnce('osm-raster');
          resetMapInstance();
          const rasterStyle: any = {
            version: 8,
            sources: {
              osm: {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '© OpenStreetMap contributors',
              },
            },
            layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
          };
          mapInstance.current = new maplibregl.Map({
            container: mapContainer.current!,
            style: rasterStyle,
            center,
            zoom,
            attributionControl: { compact: true },
          });
          attachCommonHandlers(loadingTimeout);
        };

        // Prefer Mapbox when token looks valid and not forced otherwise
        if (!forceMapLibre && mapboxToken && !/YOUR_|example_/i.test(mapboxToken)) {
          await initMapbox();
        } else {
          await initMapLibre();
        }
      } catch {
        clearTimeout(loadingTimeout);
        // Last-resort raster fallback
        try {
          const maplibregl = (await import('maplibre-gl')).default;
          glNSRef.current = maplibregl;
          setEngineOnce('osm-raster');
          const rasterStyle: any = {
            version: 8,
            sources: {
              osm: {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '© OpenStreetMap contributors',
              },
            },
            layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
          };
          resetMapInstance();
          mapInstance.current = new maplibregl.Map({
            container: mapContainer.current!,
            style: rasterStyle,
            center,
            zoom,
            attributionControl: { compact: true },
          });
          mapInstance.current.on('load', () => setIsLoading(false));
        } catch {
          setIsLoading(false);
          setError('Map init error — bubbles only');
        }
      }
    };

    initializeMap();

    return () => {
      // Defer teardown slightly so StrictMode's immediate re-run cancels it
      const t = window.setTimeout(() => {
        try {
          personaMarkersRef.current.forEach((m) => m.remove());
          personaMarkersRef.current = [];
        } catch {}
        if (mapInstance.current) {
          try {
            mapInstance.current.remove();
          } catch {}
          mapInstance.current = null;
        }
        cleanupTimerRef.current = null;
      }, 120);
      cleanupTimerRef.current = t;
    };
  }, []);

  // Sync center/zoom to the existing map instance without re-initializing
  useEffect(() => {
    if (!mapInstance.current) return;
    try {
      if (Array.isArray(center) && center.length === 2) {
        const [lng, lat] = center;
        const current = mapInstance.current.getCenter?.();
        if (!current || current.lng !== lng || current.lat !== lat) {
          mapInstance.current.setCenter(center as [number, number]);
        }
      }
    } catch {}
    try {
      if (typeof zoom === 'number') {
        const currentZoom = mapInstance.current.getZoom?.();
        if (currentZoom !== zoom) mapInstance.current.setZoom(zoom);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(center), zoom]);

  // Ensure map resizes with window to avoid white canvas issues
  useEffect(() => {
    const onWinResize = () => {
      try {
        mapInstance.current?.resize();
      } catch {}
    };
    window.addEventListener('resize', onWinResize);
    return () => window.removeEventListener('resize', onWinResize);
  }, []);

  /** WHY: add persona chips after map is ready */
  useEffect(() => {
    if (!mapInstance.current || isLoading || error) return;

    const map = mapInstance.current;
    // Wait until style is fully loaded before adding sources/layers
    if (!(map.isStyleLoaded?.() ?? true)) {
      const rerun = () => setStyleEpoch((v) => v + 1);
      try {
        if (map.once) map.once('load', rerun);
        else map.on('load', rerun);
      } catch {}
      return () => {
        try {
          map.off?.('load', rerun);
        } catch {}
      };
    }

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

    organizationsRef.current = organizationsWithPersonas;
    // Build a flat GeoJSON of org points for clustering (use the org location once)
    const buildFeatures = (orgs: OrganizationWithPersonas[]) =>
      orgs.map((o) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [o.lng, o.lat] },
        properties: { id: o.id, personas: o.activePersonas },
      }));

    const sourceData = {
      type: 'FeatureCollection',
      features: buildFeatures(organizationsWithPersonas),
    } as any;

    // Remove existing source/layers if they exist
    try {
      if (mapInstance.current.getLayer(`${clusterSourceId.current}-clusters`)) {
        mapInstance.current.removeLayer(`${clusterSourceId.current}-clusters`);
      }
      if (mapInstance.current.getLayer(`${clusterSourceId.current}-cluster-count`)) {
        mapInstance.current.removeLayer(`${clusterSourceId.current}-cluster-count`);
      }
      if (mapInstance.current.getLayer(`${clusterSourceId.current}-unclustered`)) {
        mapInstance.current.removeLayer(`${clusterSourceId.current}-unclustered`);
      }
      if (mapInstance.current.getSource(clusterSourceId.current)) {
        mapInstance.current.removeSource(clusterSourceId.current);
      }
    } catch {}

    // Add clustered source and layers
    mapInstance.current.addSource(clusterSourceId.current, {
      type: 'geojson',
      data: sourceData,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    mapInstance.current.addLayer({
      id: `${clusterSourceId.current}-clusters`,
      type: 'circle',
      source: clusterSourceId.current,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': ['step', ['get', 'point_count'], '#4ade80', 10, '#22d3ee', 25, '#a78bfa'],
        'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 25, 26],
        'circle-opacity': 0.85,
      },
    });

    mapInstance.current.addLayer({
      id: `${clusterSourceId.current}-cluster-count`,
      type: 'symbol',
      source: clusterSourceId.current,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 12,
      },
      paint: {
        'text-color': '#ffffff',
      },
    });

    mapInstance.current.addLayer({
      id: `${clusterSourceId.current}-unclustered`,
      type: 'circle',
      source: clusterSourceId.current,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#60a5fa',
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.9,
      },
    });

    // Click to zoom into clusters
    mapInstance.current.on('click', `${clusterSourceId.current}-clusters`, (_e: any) => {
      const features = mapInstance.current.queryRenderedFeatures(_e.point, {
        layers: [`${clusterSourceId.current}-clusters`],
      });
      const clusterId = features[0].properties.cluster_id;
      (mapInstance.current.getSource(clusterSourceId.current) as any).getClusterExpansionZoom(
        clusterId,
        (err: any, zoom: number) => {
          if (err) return;
          mapInstance.current.easeTo({ center: features[0].geometry.coordinates, zoom });
        },
      );
    });

    // Manage decluttering: show DOM persona markers at high zoom only
    const updateDeclutter = () => {
      const currentZoom = mapInstance.current.getZoom();
      const shouldUseDom = currentZoom >= 14; // threshold
      setIsClusteredView(!shouldUseDom);

      // Remove any existing DOM markers
      personaMarkersRef.current.forEach((m) => m.remove());
      personaMarkersRef.current = [];

      if (shouldUseDom) {
        // Filter organizations by enabled persona categories
        const allowedPersonaKeys = Object.entries(CATEGORY_TO_PERSONA)
          .filter(([cat, key]) => key && enabledCategories[cat as QuestCategory])
          .map(([, key]) => key!) as PersonaKey[];
        const filteredOrgs = organizationsRef.current
          .map((o) => ({
            ...o,
            activePersonas: o.activePersonas.filter((k) => allowedPersonaKeys.includes(k)),
          }))
          .filter((o) => o.activePersonas.length > 0);

        const markers = addPersonaChipsToMap(
          glNSRef.current,
          mapInstance.current,
          filteredOrgs,
          (persona: PersonaDef) => {
            console.log('Persona clicked:', persona.name);
          },
        );
        personaMarkersRef.current = markers;
      }

      // Toggle visibility of unclustered layer when DOM markers active
      try {
        mapInstance.current.setLayoutProperty(
          `${clusterSourceId.current}-unclustered`,
          'visibility',
          shouldUseDom ? 'none' : 'visible',
        );
      } catch {}
    };

    updateDeclutter();
    mapInstance.current.on('zoomend', updateDeclutter);

    return () => {
      try {
        mapInstance.current.off('zoomend', updateDeclutter);
      } catch {}
    };
  }, [isLoading, error, enabledCategories, styleEpoch]);

  /** Render Philadelphia demo bubbles via Mapbox layers (symbol + optional halo) */
  useEffect(() => {
    if (!mapInstance.current || isLoading || error || !useLayerBubbles) return;

    const map = mapInstance.current;

    // Ensure style is ready before adding persona sprites and layers
    if (!(map.isStyleLoaded?.() ?? true)) {
      const rerun = () => setStyleEpoch((v) => v + 1);
      try {
        if (map.once) map.once('load', rerun);
        else map.on('load', rerun);
      } catch {}
      return () => {
        try {
          map.off?.('load', rerun);
        } catch {}
      };
    }

    // Register persona sprites if not already
    (async () => {
      try {
        const { registerPersonaSprites } = await import('@/lib/sprites');
        await registerPersonaSprites(map);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('registerPersonaSprites failed (non-fatal):', e);
      }
    })();

    // Helper to convert percent-based positions to lng/lat in current viewport
    const computeFeatures = () => {
      const rect = containerRectRef.current;
      if (!rect) return { type: 'FeatureCollection', features: [] } as any;
      const toLngLat = (xPct: number, yPct: number) => {
        const px = (xPct / 100) * rect.width;
        const py = (yPct / 100) * rect.height;
        const lngLat = map.unproject([px, py]);
        return [lngLat.lng, lngLat.lat] as [number, number];
      };

      const features = PHILADELPHIA_BUBBLES.filter((b) => enabledCategories[b.category]).map(
        (b) => {
          // Map category -> persona icon base key
          const iconBase = (CATEGORY_TO_PERSONA[b.category] as string | undefined) || 'hootie';
          return {
            type: 'Feature',
            id: b.id,
            geometry: { type: 'Point', coordinates: toLngLat(b.position.x, b.position.y) },
            properties: {
              id: b.id,
              title: b.title,
              description: b.description,
              category: b.category,
              iconBase, // e.g., 'hootie'
              reward: b.reward ?? null,
              organization: b.organization ?? null,
            },
          };
        },
      );
      return { type: 'FeatureCollection', features } as any;
    };

    const ensureSourceAndLayers = () => {
      // Remove pre-existing layers if any
      try {
        if (map.getLayer(phillyLayerHaloId.current)) map.removeLayer(phillyLayerHaloId.current);
        if (map.getLayer(phillyLayerSymbolId.current)) map.removeLayer(phillyLayerSymbolId.current);
        if (map.getSource(phillySourceId.current)) map.removeSource(phillySourceId.current);
      } catch {}

      // Add source
      map.addSource(phillySourceId.current, {
        type: 'geojson',
        data: computeFeatures(),
      });

      // Optional halo layer for subtle presence
      try {
        map.addLayer({
          id: phillyLayerHaloId.current,
          type: 'circle',
          source: phillySourceId.current,
          paint: {
            'circle-color': [
              'match',
              ['get', 'category'],
              'character',
              CHESS_COLORS.character,
              'health',
              CHESS_COLORS.health,
              'exploration',
              CHESS_COLORS.exploration,
              'stem',
              CHESS_COLORS.stem,
              'stewardship',
              CHESS_COLORS.stewardship,
              /* other */ '#60a5fa',
            ],
            'circle-radius': 12,
            'circle-opacity': 0.2,
          },
        });
      } catch {}

      // Symbol layer with hoverable sprites
      map.addLayer({
        id: phillyLayerSymbolId.current,
        type: 'symbol',
        source: phillySourceId.current,
        layout: {
          'icon-image': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            ['concat', ['get', 'iconBase'], '-hover'],
            ['concat', ['get', 'iconBase'], '-normal'],
          ],
          'icon-allow-overlap': true,
          'icon-size': 1,
        },
      });

      // Hover interaction
      const onMove = (e: any) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: [phillyLayerSymbolId.current],
        });
        const feature = features[0];
        const prevId = phillyHoverFeatureRef.current;
        const nextId = feature?.id as string | undefined;
        if (prevId && prevId !== nextId) {
          try {
            map.setFeatureState({ source: phillySourceId.current, id: prevId }, { hover: false });
          } catch {}
        }
        if (nextId && prevId !== nextId) {
          try {
            map.setFeatureState({ source: phillySourceId.current, id: nextId }, { hover: true });
          } catch {}
          phillyHoverFeatureRef.current = nextId;
          map.getCanvas().style.cursor = 'pointer';
        }
        if (!feature) {
          if (prevId) {
            try {
              map.setFeatureState({ source: phillySourceId.current, id: prevId }, { hover: false });
            } catch {}
            phillyHoverFeatureRef.current = null;
          }
          map.getCanvas().style.cursor = '';
        }
      };
      const onLeave = () => {
        const prevId = phillyHoverFeatureRef.current;
        if (prevId) {
          try {
            map.setFeatureState({ source: phillySourceId.current, id: prevId }, { hover: false });
          } catch {}
          phillyHoverFeatureRef.current = null;
        }
        map.getCanvas().style.cursor = '';
      };
      const onClick = (e: any) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: [phillyLayerSymbolId.current],
        });
        const f = features[0];
        if (!f) return;
        const id = (f.properties?.id as string) || (f.id as string);
        const bubble = PHILADELPHIA_BUBBLES.find((b) => b.id === id);
        if (!bubble) return;
        // Use the same tooltip flow as before, anchored to click point
        setTooltip({ bubble, position: { x: e.point.x, y: e.point.y } });
      };

      map.on('mousemove', phillyLayerSymbolId.current, onMove);
      map.on('mouseleave', phillyLayerSymbolId.current, onLeave);
      map.on('click', phillyLayerSymbolId.current, onClick);

      // Recompute positions on move/resize to keep percent-based placement
      const refreshPositions = () => {
        try {
          const src: any = map.getSource(phillySourceId.current);
          if (src?.setData) src.setData(computeFeatures());
        } catch {}
      };
      map.on('move', refreshPositions);
      map.on('resize', refreshPositions);

      return () => {
        try {
          map.off('mousemove', phillyLayerSymbolId.current, onMove);
          map.off('mouseleave', phillyLayerSymbolId.current, onLeave);
          map.off('click', phillyLayerSymbolId.current, onClick);
          map.off('move', refreshPositions);
          map.off('resize', refreshPositions);
        } catch {}
      };
    };

    const cleanup = ensureSourceAndLayers();
    return () => {
      try {
        cleanup?.();
      } catch {}
      try {
        if (map.getLayer(phillyLayerSymbolId.current)) map.removeLayer(phillyLayerSymbolId.current);
        if (map.getLayer(phillyLayerHaloId.current)) map.removeLayer(phillyLayerHaloId.current);
        if (map.getSource(phillySourceId.current)) map.removeSource(phillySourceId.current);
      } catch {}
    };
  }, [isLoading, error, enabledCategories, useLayerBubbles, styleEpoch]);

  // Apply filters to sources/layers and DOM markers when selection changes
  useEffect(() => {
    if (!mapInstance.current || isLoading || error) return;

    const map = mapInstance.current;
    if (!(map.isStyleLoaded?.() ?? true)) {
      const rerun = () => setStyleEpoch((v) => v + 1);
      try {
        if (map.once) map.once('load', rerun);
        else map.on('load', rerun);
      } catch {}
      return () => {
        try {
          map.off?.('load', rerun);
        } catch {}
      };
    }

    // Toggle visibility for safe spaces and events
    try {
      if (map.getLayer(`${safeSpacesSourceId.current}-circles`)) {
        map.setLayoutProperty(
          `${safeSpacesSourceId.current}-circles`,
          'visibility',
          enabledCategories.safe_space ? 'visible' : 'none',
        );
      }
      if (map.getLayer(`${eventsSourceId.current}-circles`)) {
        map.setLayoutProperty(
          `${eventsSourceId.current}-circles`,
          'visibility',
          enabledCategories.community_hub ? 'visible' : 'none',
        );
      }
    } catch {}

    // Update persona cluster source data to reflect filters
    try {
      const allowedPersonaKeys = Object.entries(CATEGORY_TO_PERSONA)
        .filter(([cat, key]) => key && enabledCategories[cat as QuestCategory])
        .map(([, key]) => key!) as PersonaKey[];

      const filtered = organizationsRef.current
        .filter((o) => o.activePersonas.some((k) => allowedPersonaKeys.includes(k)))
        .map((o) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [o.lng, o.lat] },
          properties: { id: o.id, personas: o.activePersonas },
        }));

      const fc = { type: 'FeatureCollection', features: filtered } as any;
      const src: any = map.getSource(clusterSourceId.current);
      if (src?.setData) src.setData(fc);
    } catch {}

    // Rebuild DOM markers if in detailed view
    try {
      const currentZoom = map.getZoom();
      const shouldUseDom = currentZoom >= 14;
      // Clear current DOM markers
      personaMarkersRef.current.forEach((m) => m.remove());
      personaMarkersRef.current = [];
      if (shouldUseDom) {
        const allowedPersonaKeys = Object.entries(CATEGORY_TO_PERSONA)
          .filter(([cat, key]) => key && enabledCategories[cat as QuestCategory])
          .map(([, key]) => key!) as PersonaKey[];
        const filteredOrgs = organizationsRef.current
          .map((o) => ({
            ...o,
            activePersonas: o.activePersonas.filter((k) => allowedPersonaKeys.includes(k)),
          }))
          .filter((o) => o.activePersonas.length > 0);
        const markers = addPersonaChipsToMap(glNSRef.current, map, filteredOrgs, (persona) => {
          console.log('Persona clicked:', persona.name);
        });
        personaMarkersRef.current = markers;
      }
      // Unclustered layer visibility (mirror previous logic)
      try {
        map.setLayoutProperty(
          `${clusterSourceId.current}-unclustered`,
          'visibility',
          currentZoom >= 14 ? 'none' : 'visible',
        );
      } catch {}
    } catch {}

    return () => {};
  }, [enabledCategories, isLoading, error]);

  /** Realtime: safe_spaces and events live updates */
  useEffect(() => {
    if (!mapInstance.current || isLoading || error) return;

    const map = mapInstance.current;
    const ensureSources = () => {
      try {
        if (!map.getSource(safeSpacesSourceId.current)) {
          map.addSource(safeSpacesSourceId.current, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          });
          map.addLayer({
            id: `${safeSpacesSourceId.current}-circles`,
            type: 'circle',
            source: safeSpacesSourceId.current,
            paint: {
              'circle-color': '#06D6A0',
              'circle-radius': 7,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
              'circle-opacity': 0.9,
            },
          });
        }
        if (!map.getSource(eventsSourceId.current)) {
          map.addSource(eventsSourceId.current, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          });
          map.addLayer({
            id: `${eventsSourceId.current}-circles`,
            type: 'circle',
            source: eventsSourceId.current,
            paint: {
              'circle-color': '#A78BFA',
              'circle-radius': 7,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
              'circle-opacity': 0.9,
            },
          });
        }
      } catch (e) {
        // ignore if style not ready yet
      }
    };

    const toFC = (rows: { id: string; lat: number | null; lng: number | null }[]) => ({
      type: 'FeatureCollection',
      features: rows
        .filter((r) => r.lat != null && r.lng != null)
        .map((r) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [Number(r.lng), Number(r.lat)] },
          properties: { id: r.id },
        })),
    });

    let unsubSafe: null | (() => void) = null;
    let unsubEvents: null | (() => void) = null;

    import('@/lib/realtime/places')
      .then(async ({ fetchSafeSpaces, fetchEvents, subscribeToSafeSpaces, subscribeToEvents }) => {
        ensureSources();

        // initial loads
        try {
          const [srows, erows] = await Promise.all([fetchSafeSpaces(), fetchEvents()]);
          const ssrc: any = map.getSource(safeSpacesSourceId.current);
          if (ssrc?.setData) ssrc.setData(toFC(srows));
          const esrc: any = map.getSource(eventsSourceId.current);
          if (esrc?.setData) esrc.setData(toFC(erows));
        } catch {}

        // debounced updater
        let t: any;
        const debounced = (fn: () => void) => {
          clearTimeout(t);
          t = setTimeout(fn, 400);
        };

        const refreshSafe = async () => {
          try {
            const srows = await fetchSafeSpaces();
            const ssrc: any = map.getSource(safeSpacesSourceId.current);
            if (ssrc?.setData) ssrc.setData(toFC(srows));
          } catch {}
        };
        const refreshEvents = async () => {
          try {
            const erows = await fetchEvents();
            const esrc: any = map.getSource(eventsSourceId.current);
            if (esrc?.setData) esrc.setData(toFC(erows));
          } catch {}
        };

        const sSub = subscribeToSafeSpaces(() => debounced(refreshSafe));
        const eSub = subscribeToEvents(() => debounced(refreshEvents));
        unsubSafe = () => sSub.unsubscribe();
        unsubEvents = () => eSub.unsubscribe();
      })
      .catch(() => {});

    return () => {
      try {
        unsubSafe?.();
      } catch {}
      try {
        unsubEvents?.();
      } catch {}
      try {
        if (map.getLayer(`${safeSpacesSourceId.current}-circles`))
          map.removeLayer(`${safeSpacesSourceId.current}-circles`);
        if (map.getLayer(`${eventsSourceId.current}-circles`))
          map.removeLayer(`${eventsSourceId.current}-circles`);
        if (map.getSource(safeSpacesSourceId.current)) map.removeSource(safeSpacesSourceId.current);
        if (map.getSource(eventsSourceId.current)) map.removeSource(eventsSourceId.current);
      } catch {}
    };
  }, [isLoading, error, styleEpoch]);

  // Re-add overlays/sprites after base style is replaced/reloaded (Mapbox clears images/layers)
  useEffect(() => {
    if (!mapInstance.current || isLoading || error) return;
    const map = mapInstance.current;
    const onStyleLoad = () => setStyleEpoch((v) => v + 1);
    try {
      map.on('style.load', onStyleLoad);
    } catch {}
    return () => {
      try {
        map.off('style.load', onStyleLoad);
      } catch {}
    };
  }, [isLoading, error]);

  return (
    <div className='w-full h-full relative'>
      {import.meta.env.DEV && (
        <div className='absolute top-2 left-2 z-30 px-2 py-1 text-xs rounded bg-black/50 border border-white/20 text-white'>
          Engine: {engine}
        </div>
      )}
      {/* Map area */}
      <div
        ref={mapContainer}
        id={mapContainerId.current}
        className='w-full h-full bg-gradient-to-br from-dark-secondary to-dark-tertiary rounded-xl overflow-hidden'
        style={{ height: '100%', minHeight: isMobile ? '70dvh' : '500px' }}
      />

      {/* Map-driven layers replace only the old DOM quest bubbles overlay */}
      {!useLayerBubbles && (
        <div className='absolute inset-0 pointer-events-none overflow-hidden z-[55]'>
          {PHILADELPHIA_BUBBLES.filter((b) => enabledCategories[b.category]).map((bubble) => (
            <QuestBubbleComponent
              key={bubble.id}
              bubble={bubble}
              mousePosition={mousePosition}
              containerRect={containerRect}
              onClick={handleBubbleClick}
              onHoverChange={(hovered) =>
                setHoveredCount((c) => Math.max(0, c + (hovered ? 1 : -1)))
              }
            />
          ))}
        </div>
      )}

      {/* Student-only dynamic overlay */}
      {user?.role === 'student' && mapInstance.current && (
        <QuestMapOverlay map={mapInstance.current} />
      )}

      {/* Public overlay for safe spaces and events (all roles) */}
      {mapInstance.current ? <PublicMapOverlay map={mapInstance.current} /> : null}

      {/* Custom overlay from parent (e.g., master admin map tools) */}
      {(() => {
        if (!renderOverlay || !mapInstance.current) return null;
        try {
          return renderOverlay(mapInstance.current, glNSRef.current);
        } catch (e) {
          // Avoid crashing the whole page if an overlay throws
          // eslint-disable-next-line no-console
          console.error('renderOverlay failed:', e);
          return null;
        }
      })()}

      {/* Mobile Legend Toggle */}
      {isMobile && (
        <>
          <motion.button
            className='absolute top-4 right-4 z-30 bg-glass-dark border-glass-dark rounded-full p-3 text-white min-w-touch min-h-touch touch-manipulation'
            onClick={() => setShowLegend((s) => !s)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label='Toggle legend'
          >
            <Target className='w-5 h-5' />
          </motion.button>
        </>
      )}

      {/* Desktop Legend */}
      {!isMobile && (
        <motion.div
          className='absolute bottom-4 left-4 z-30 bg-glass-dark border-glass-dark rounded-xl p-4 max-w-xs backdrop-blur-lg'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <h4 className='text-white font-bold text-sm mb-3'>CHESS Map Filters</h4>
          <div className='space-y-2'>
            {allCategories.map((category) => {
              const style = QUEST_STYLES[category];
              const enabled = enabledCategories[category];
              return (
                <button
                  key={category}
                  className={`w-full flex items-center gap-2 text-xs px-2 py-1 rounded-md transition-colors ${
                    enabled ? 'bg-white/10' : 'bg-white/5 opacity-70'
                  }`}
                  onClick={() => toggleCategory(category)}
                >
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
                  <span className='text-gray-100'>{style.label}</span>
                  <span
                    className={`ml-auto text-[10px] ${enabled ? 'text-green-300' : 'text-gray-300'}`}
                  >
                    {enabled ? 'ON' : 'OFF'}
                  </span>
                </button>
              );
            })}
          </div>
          <div className='mt-3 text-xs text-gray-300'>Tap to toggle categories</div>
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
                {allCategories.map((category) => {
                  const style = QUEST_STYLES[category];
                  const enabled = enabledCategories[category];
                  return (
                    <button
                      key={category}
                      className={`flex items-center gap-2 text-xs rounded-lg p-2 transition-colors ${
                        enabled ? 'bg-glass-light' : 'bg-glass'
                      }`}
                      onClick={() => toggleCategory(category)}
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
                        <span className='text-gray-100 text-xs'>{style.label}</span>
                      </div>
                      <span
                        className={`ml-auto text-[10px] ${enabled ? 'text-green-300' : 'text-gray-300'}`}
                      >
                        {enabled ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  );
                })}
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
          <span>{isClusteredView ? 'Cluster view' : 'Detailed view'}</span>
        </motion.div>
      )}
    </div>
  );
};

export default MapView;
