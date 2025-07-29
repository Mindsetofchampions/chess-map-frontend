import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X } from 'lucide-react';

/**
 * CHESS Attribute Color System
 * Each attribute has a unique color for visual consistency
 */
const CHESS_COLORS = {
  character: '#8B5CF6',    // Purple - Wisdom & Character
  health: '#10B981',       // Green - Health & Wellness  
  exploration: '#F59E0B',  // Orange - Adventure & Discovery
  stem: '#3B82F6',         // Blue - Technology & Innovation
  stewardship: '#EF4444'   // Red - Leadership & Responsibility
} as const;

/**
 * CHESS attribute data interface
 */
interface ChessAttribute {
  id: string;
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
 * CHESS attributes configuration with character sprites and positioning
 */
const CHESS_ATTRIBUTES: ChessAttribute[] = [
  {
    id: 'character',
    name: 'Character',
    character: 'Hootie the Owl',
    sprite: '/sprites/owl.gif/HOOTIE_WINGLIFT.gif',
    description: 'Hootie soars through character-building challenges—follow her for wisdom quests!',
    position: { x: '15%', y: '20%' },
    delay: 0,
    color: CHESS_COLORS.character
  },
  {
    id: 'health',
    name: 'Health',
    character: 'Brenda the Cat',
    sprite: '/sprites/cat.gif/KITTY_BOUNCE.gif',
    description: 'Brenda bounces into health challenges—follow her for wellness quests!',
    position: { x: '75%', y: '15%' },
    delay: 0.5,
    color: CHESS_COLORS.health
  },
  {
    id: 'exploration',
    name: 'Exploration',
    character: 'Gino the Dog',
    sprite: '/sprites/dog.gif/GINO_COMPASSSPIN.gif',
    description: 'Gino navigates exciting exploration adventures—follow him for discovery quests!',
    position: { x: '20%', y: '70%' },
    delay: 1.0,
    color: CHESS_COLORS.exploration
  },
  {
    id: 'stem',
    name: 'STEM',
    character: 'Hammer the Robot',
    sprite: '/sprites/robot.gif/HAMMER_SWING.gif',
    description: 'Hammer builds amazing STEM projects—follow them for innovation quests!',
    position: { x: '80%', y: '65%' },
    delay: 1.5,
    color: CHESS_COLORS.stem
  },
  {
    id: 'stewardship',
    name: 'Stewardship',
    character: 'MOC Badge',
    sprite: '/sprites/badge.gif/BADGE_SHINE.gif',
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
 * 
 * @returns {JSX.Element} Floating bubbles animation layer
 */
const FloatingBubbles: React.FC = () => {
  const [tooltip, setTooltip] = useState<TooltipState>({
    isOpen: false,
    attribute: null,
    position: { x: 0, y: 0 }
  });

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
  const handleLearnMore = (attributeId: string) => {
    // TODO: Implement map centering on attribute quests
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
              "
              style={{
                backgroundColor: `${attribute.color}20`, // 20% opacity background
                borderColor: `${attribute.color}60`, // 60% opacity border
              }}
              onClick={(e) => handleBubbleClick(attribute, e)}
              aria-label={`${attribute.character} - ${attribute.name} attribute bubble`}
              
              // Mobile responsive animation
              animate={{
                y: [0, -10, 0], // Mobile oscillation (smaller)
              }}
              transition={{
                duration: 3,
                delay: attribute.delay,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              
              // Override desktop animation on larger screens
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
                md:animate-none
              "
              style={{
                backgroundColor: `${attribute.color}20`, // 20% opacity background
                borderColor: `${attribute.color}60`, // 60% opacity border
              }}
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
                draggable={false}
                
                // Sprite hover animation
                whileHover={{
                  rotate: [0, -5, 5, 0],
                  transition: { duration: 0.4 }
                }}
                
                // Error handling for missing sprites
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  
                  // Create fallback icon
                  const parent = target.parentNode as HTMLElement;
                  if (parent && !parent.querySelector('.fallback-icon')) {
                    const fallback = document.createElement('div');
                    fallback.className = `
                      fallback-icon
                      w-10 h-10 
                      md:w-12 md:h-12 
                      bg-gradient-to-br 
                      from-electric-blue-400 
                      to-neon-purple-400 
                      rounded-full 
                      flex 
                      items-center 
                      justify-center 
                      text-white 
                      font-bold 
                      text-sm
                    `;
                    fallback.textContent = attribute.name.charAt(0);
                    parent.appendChild(fallback);
                  }
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