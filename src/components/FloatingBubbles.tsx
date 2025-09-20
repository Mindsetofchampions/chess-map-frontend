import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X } from 'lucide-react';
import { PERSONA_GIF, type PersonaKey } from '@/assets/personas';
import { CHESS_COLORS } from '@/hooks/usePhiladelphiaData';

/**
 * CHESS attribute data interface
 */
interface ChessAttribute {
  id: PersonaKey;
  name: string;
  character: string;
  sprite: string;
  description: string;
  position: { x: string; y: string };
  delay: number;
  color: string;
}

/**
 * Tooltip state interface
 */
interface TooltipState {
  isOpen: boolean;
  attribute: ChessAttribute | null;
  position: { x: number; y: number };
}

/**
 * Sprite loading state tracking
 */
interface SpriteState {
  loaded: boolean;
  failed: boolean;
  attempts: number;
}

// Constants for sprite loading
const MAX_RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 500;

/**
 * CHESS attributes configuration with character sprites and positioning
 */
const CHESS_ATTRIBUTES: ChessAttribute[] = [
  {
    id: 'hootie',
    name: 'Character',
    character: 'Hootie the Owl',
    sprite: PERSONA_GIF.hootie,
    description: 'Hootie soars through character-building challenges—follow her for wisdom quests!',
    position: { x: '15%', y: '20%' },
    delay: 0,
    color: CHESS_COLORS.character
  },
  {
    id: 'kittykat',
    name: 'Health',
    character: 'Brenda the Cat',
    sprite: PERSONA_GIF.kittykat,
    description: 'Brenda bounces into health challenges—follow her for wellness quests!',
    position: { x: '75%', y: '15%' },
    delay: 0.5,
    color: CHESS_COLORS.health
  },
  {
    id: 'gino',
    name: 'Exploration',
    character: 'Gino the Dog',
    sprite: PERSONA_GIF.gino,
    description: 'Gino navigates exciting exploration adventures—follow him for discovery quests!',
    position: { x: '20%', y: '70%' },
    delay: 1.0,
    color: CHESS_COLORS.exploration
  },
  {
    id: 'hammer',
    name: 'STEM',
    character: 'Hammer the Robot',
    sprite: PERSONA_GIF.hammer,
    description: 'Hammer builds amazing STEM projects—follow them for innovation quests!',
    position: { x: '80%', y: '65%' },
    delay: 1.5,
    color: CHESS_COLORS.stem
  },
  {
    id: 'badge',
    name: 'Stewardship',
    character: 'MOC Badge',
    sprite: PERSONA_GIF.badge,
    description: 'The MOC Badge represents environmental stewardship—follow it for conservation quests!',
    position: { x: '50%', y: '45%' },
    delay: 2.0,
    color: CHESS_COLORS.stewardship
  }
];

/**
 * FloatingBubbles component that renders animated CHESS attribute bubbles
 * 
 * Features:
 * - 5 floating bubbles representing CHESS educational attributes
 * - Animated sprites with infinite y-oscillation movement
 * - Interactive tooltips with glassmorphic styling
 * - Mobile-responsive design with touch optimization
 * - Accessibility support with proper ARIA labels
 * - Bounded retry logic for sprite loading
 * - Graceful fallback to emoji if sprites fail to load
 * 
 * @returns {JSX.Element} Floating bubbles animation layer
 */
const FloatingBubbles: React.FC = () => {
  const [tooltip, setTooltip] = useState<TooltipState>({
    isOpen: false,
    attribute: null,
    position: { x: 0, y: 0 }
  });

  // Track sprite loading state for each attribute
  const spriteStates = useRef<Record<PersonaKey, SpriteState>>({
    hootie: { loaded: false, failed: false, attempts: 0 },
    kittykat: { loaded: false, failed: false, attempts: 0 },
    gino: { loaded: false, failed: false, attempts: 0 },
    hammer: { loaded: false, failed: false, attempts: 0 },
    badge: { loaded: false, failed: false, attempts: 0 }
  });

  const [_spriteStatesUpdate, setSpriteStatesUpdate] = useState(0);

  /**
   * Handle sprite loading success
   */
  const handleSpriteLoad = useCallback((personaKey: PersonaKey) => {
    if (spriteStates.current[personaKey]) {
      spriteStates.current[personaKey] = { loaded: true, failed: false, attempts: 0 };
      setSpriteStatesUpdate(prev => prev + 1);
    }
  }, []);

  /**
   * Handle sprite loading error with bounded retry
   */
  const handleSpriteError = useCallback((personaKey: PersonaKey, imgElement: HTMLImageElement) => {
    const state = spriteStates.current[personaKey];
    if (!state) return;

    state.attempts += 1;

    if (state.attempts >= MAX_RETRY_ATTEMPTS) {
      // Final fallback - mark as failed and hide
      state.failed = true;
      state.loaded = false;
      imgElement.style.display = 'none';
      
      // Create emoji fallback
      const parent = imgElement.parentElement;
      if (parent && !parent.querySelector('.emoji-fallback')) {
        const emojiMap = {
          hootie: '🦉',
          kittykat: '🐱',
          gino: '🐕',
          hammer: '🤖',
          badge: '🏛️'
        };
        
        const fallback = document.createElement('div');
        fallback.className = 'emoji-fallback text-2xl select-none pointer-events-none';
        fallback.textContent = emojiMap[personaKey];
        fallback.style.display = 'flex';
        fallback.style.alignItems = 'center';
        fallback.style.justifyContent = 'center';
        fallback.style.width = '100%';
        fallback.style.height = '100%';
        parent.appendChild(fallback);
      }

      console.error(`❌ Sprite failed to load after ${state.attempts} attempts: ${personaKey}`);
      setSpriteStatesUpdate(prev => prev + 1);
      return;
    }

    // Retry with cache-busting parameter
    setTimeout(() => {
      const originalSrc = PERSONA_GIF[personaKey];
      const cacheBustSrc = `${originalSrc}?retry=${state.attempts}&t=${Date.now()}`;
      imgElement.src = cacheBustSrc;
    }, RETRY_DELAY_MS * state.attempts);
  }, []);

  /**
   * Handle bubble click to show tooltip
   */
  const handleBubbleClick = (attribute: ChessAttribute, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top;

    setTooltip({
      isOpen: true,
      attribute,
      position: { x, y }
    });
  };

  /**
   * Close tooltip
   */
  const closeTooltip = () => {
    setTooltip({
      isOpen: false,
      attribute: null,
      position: { x: 0, y: 0 }
    });
  };

  /**
   * Handle "Learn More" button click
   */
  const handleLearnMore = (attributeId: PersonaKey) => {
    console.log(`Centering map on ${attributeId} quests`);
    closeTooltip();
  };

  return (
    <>
      {/* Floating Bubbles Container */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {CHESS_ATTRIBUTES.map((attribute) => (
          <motion.div
            key={attribute.id}
            className="absolute pointer-events-auto"
            style={{
              left: attribute.position.x,
              top: attribute.position.y,
              transform: 'translate(-50%, -50%)'
            }}
            
            // Continuous floating animation
            animate={{
              y: [0, -20, 0], // Desktop oscillation
            }}
            transition={{
              duration: 3,
              delay: attribute.delay,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            
            // Hover effects
            whileHover={{
              scale: 1.1,
              zIndex: 50,
              transition: { duration: 0.2 }
            }}
            
            // Tap effects for mobile
            whileTap={{
              scale: 0.95,
              transition: { duration: 0.1 }
            }}
          >
            {/* Bubble Container */}
            <motion.button
              className="
                rounded-full 
                shadow-lg 
                p-3 
                cursor-pointer 
                transition-all 
                duration-300
                hover:shadow-xl
                min-w-[44px]
                min-h-[44px]
                touch-manipulation
                flex
                items-center
                justify-center
                border-2
                relative
              "
              style={{
                backgroundColor: `${attribute.color}20`, // 20% opacity background
                borderColor: `${attribute.color}60`, // 60% opacity border
              }}
              onClick={(e) => handleBubbleClick(attribute, e)}
              aria-label={`${attribute.character} - ${attribute.name} attribute bubble`}
            >
              {/* Character Sprite */}
              <motion.img
                src={attribute.sprite}
                alt={`${attribute.character} sprite`}
                className="
                  w-10 h-10 
                  md:w-12 md:h-12 
                  object-contain 
                  select-none 
                  pointer-events-none
                "
                style={{
                  imageRendering: 'pixelated'
                }}
                draggable={false}
                onLoad={() => handleSpriteLoad(attribute.id)}
                onError={(e) => handleSpriteError(attribute.id, e.currentTarget)}
                
                // Sprite hover animation
                whileHover={{
                  rotate: [0, -5, 5, 0],
                  transition: { duration: 0.4 }
                }}
              />
              
              {/* Pulse ring effect */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 opacity-60"
                style={{ borderColor: attribute.color }}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.6, 0, 0.6],
                }}
                transition={{
                  duration: 2,
                  delay: attribute.delay + 0.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </motion.button>
          </motion.div>
        ))}
      </div>

      {/* Interactive Tooltip */}
      <AnimatePresence>
        {tooltip.isOpen && tooltip.attribute && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeTooltip}
            />

            {/* Tooltip Modal */}
            <motion.div
              className="
                fixed z-50 
                bg-white/30 
                backdrop-blur-lg 
                border border-gray-200 
                rounded-2xl 
                shadow-2xl 
                p-4 
                max-w-xs 
                text-gray-50
              "
              style={{
                left: `${Math.min(tooltip.position.x - 150, window.innerWidth - 320)}px`,
                top: `${Math.max(tooltip.position.y - 100, 20)}px`,
              }}
              initial={{
                opacity: 0,
                scale: 0.8,
                y: 20
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0
              }}
              exit={{
                opacity: 0,
                scale: 0.8,
                y: 20
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25
              }}
            >
              {/* Close Button */}
              <button
                className="
                  absolute top-2 right-2 
                  p-1 
                  rounded-full 
                  bg-glass 
                  border-glass 
                  hover:bg-glass-dark 
                  transition-colors 
                  duration-200
                  min-w-[32px]
                  min-h-[32px]
                  touch-manipulation
                "
                onClick={closeTooltip}
                aria-label="Close tooltip"
              >
                <X className="w-4 h-4 text-gray-300" />
              </button>

              {/* Tooltip Content */}
              <div className="space-y-3 pr-6">
                {/* Heading */}
                <h3 className="text-lg font-bold text-white">
                  {tooltip.attribute.character} – {tooltip.attribute.name}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-100 leading-relaxed">
                  {tooltip.attribute.description}
                </p>

                {/* Learn More Button */}
                <button
                  className="
                    flex items-center gap-2 
                    hover:text-white 
                    border
                    rounded-xl 
                    px-4 py-2 
                    text-sm font-semibold 
                    transition-all duration-200
                    min-h-[44px]
                    touch-manipulation
                    w-full
                    justify-center
                  "
                  style={{
                    backgroundColor: `${tooltip.attribute.color}30`,
                    borderColor: `${tooltip.attribute.color}60`,
                    color: tooltip.attribute.color,
                  }}
                  onClick={() => handleLearnMore(tooltip.attribute!.id)}
                  aria-label={`Learn more about ${tooltip.attribute.name} quests`}
                >
                  <MapPin className="w-4 h-4" />
                  Learn More
                </button>
              </div>

              {/* Decorative glow effect */}
              <div 
                className="absolute -inset-1 rounded-2xl blur -z-10" 
                style={{
                  background: `linear-gradient(135deg, ${tooltip.attribute.color}20, ${tooltip.attribute.color}10)`
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

// Export the color system for use in other components
export { CHESS_COLORS };
export default FloatingBubbles;