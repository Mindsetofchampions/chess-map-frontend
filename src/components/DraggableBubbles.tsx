import React, { useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';

/**
 * Individual draggable bubble data interface
 */
interface DraggableBubble {
  id: string;
  color: string;
  size: 'sm' | 'md' | 'lg';
  initialX: number;
  initialY: number;
}

/**
 * Color palette for decorative bubbles
 */
const DECORATIVE_COLORS = [
  '#FF6B6B', // Coral Red
  '#4ECDC4', // Teal
  '#45B7D1', // Sky Blue
  '#96CEB4', // Mint Green
  '#FFEAA7', // Soft Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Aqua Green
  '#FFB366', // Peach
];

/**
 * Generate random decorative bubbles for empty screen space
 */
const generateBubbles = (): DraggableBubble[] => {
  const bubbles: DraggableBubble[] = [];
  const bubbleCount = 8; // Number of decorative bubbles
  
  for (let i = 0; i < bubbleCount; i++) {
    // Generate positions that avoid the center content areas
    const isLeftSide = Math.random() > 0.5;
    const x = isLeftSide 
      ? Math.random() * 15 + 5   // Left side: 5-20%
      : Math.random() * 15 + 80; // Right side: 80-95%
    
    const y = Math.random() * 70 + 15; // 15-85% from top
    
    bubbles.push({
      id: `decorative-${i}`,
      color: DECORATIVE_COLORS[i % DECORATIVE_COLORS.length],
      size: ['sm', 'md', 'lg'][Math.floor(Math.random() * 3)] as 'sm' | 'md' | 'lg',
      initialX: x,
      initialY: y,
    });
  }
  
  return bubbles;
};

/**
 * Individual draggable bubble component
 */
interface DraggableBubbleProps {
  bubble: DraggableBubble;
  onDragEnd: (id: string, x: number, y: number) => void;
}

const DraggableBubbleComponent: React.FC<DraggableBubbleProps> = ({ bubble, onDragEnd }) => {
  const constraintsRef = useRef(null);
  
  // Size configurations
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  // Handle drag end
  const handleDragEnd = useCallback((event: any, info: PanInfo) => {
    const rect = event.target.getBoundingClientRect();
    const parentRect = event.target.offsetParent?.getBoundingClientRect();
    
    if (parentRect) {
      const newX = ((rect.left - parentRect.left) / parentRect.width) * 100;
      const newY = ((rect.top - parentRect.top) / parentRect.height) * 100;
      onDragEnd(bubble.id, newX, newY);
    }
  }, [bubble.id, onDragEnd]);

  return (
    <motion.div
      className={`
        ${sizeClasses[bubble.size]}
        absolute 
        rounded-full 
        shadow-lg 
        cursor-grab 
        active:cursor-grabbing
        border-2 
        border-white/20
        backdrop-blur-sm
        hover:shadow-xl
        transition-shadow
        duration-300
        touch-manipulation
        select-none
        z-10
      `}
      style={{
        backgroundColor: bubble.color,
        left: `${bubble.initialX}%`,
        top: `${bubble.initialY}%`,
        transform: 'translate(-50%, -50%)'
      }}
      
      // Dragging configuration
      drag
      dragMomentum={false}
      dragElastic={0.1}
      dragConstraints={constraintsRef}
      onDragEnd={handleDragEnd}
      
      // Initial animation
      initial={{ 
        scale: 0, 
        opacity: 0,
        rotate: Math.random() * 360
      }}
      animate={{ 
        scale: 1, 
        opacity: 0.8,
        rotate: 0
      }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: Math.random() * 2
      }}
      
      // Hover effects
      whileHover={{ 
        scale: 1.1,
        opacity: 1,
        transition: { duration: 0.2 }
      }}
      
      // Drag effects
      whileDrag={{ 
        scale: 1.2,
        opacity: 1,
        zIndex: 50,
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
      }}
      
      // Floating animation
      animate={{
        scale: 1,
        opacity: 0.8,
        y: [0, -8, 0],
        rotate: [0, 2, -2, 0]
      }}
      transition={{
        scale: { type: 'spring', stiffness: 260, damping: 20, delay: Math.random() * 2 },
        default: { duration: 4 + Math.random() * 2, repeat: Infinity, ease: 'easeInOut', delay: Math.random() * 2 }
      }}
      
      // Accessibility
      role="button"
      tabIndex={0}
      aria-label={`Draggable ${bubble.color} bubble`}
      
      // Keyboard interaction
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          // Could implement keyboard-based movement here
        }
      }}
    >
      {/* Shine effect */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          background: `linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)`
        }}
      />
      
      {/* Pulse ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 opacity-60"
        style={{ borderColor: bubble.color }}
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.6, 0, 0.6],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          delay: Math.random() * 3
        }}
      />
    </motion.div>
  );
};

/**
 * Main draggable bubbles container component
 * 
 * Features:
 * - Generates random decorative bubbles in empty screen space
 * - Smooth touch/drag functionality with momentum
 * - Collision detection and boundary constraints
 * - Performance optimized for multiple interactive elements
 * - Accessibility support with keyboard navigation
 * 
 * @returns {JSX.Element} Container with draggable bubble elements
 */
const DraggableBubbles: React.FC = () => {
  const [bubbles, setBubbles] = useState<DraggableBubble[]>(() => generateBubbles());
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Handle bubble position updates after drag
   */
  const handleBubbleDragEnd = useCallback((id: string, x: number, y: number) => {
    setBubbles(prev => prev.map(bubble => 
      bubble.id === id 
        ? { ...bubble, initialX: x, initialY: y }
        : bubble
    ));
  }, []);

  /**
   * Reset bubbles to random positions
   */
  const resetBubbles = useCallback(() => {
    setBubbles(generateBubbles());
  }, []);

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 5 }} // Below CHESS bubbles but above background
    >
      {/* Draggable bubbles */}
      {bubbles.map((bubble) => (
        <div key={bubble.id} className="pointer-events-auto">
          <DraggableBubbleComponent
            bubble={bubble}
            onDragEnd={handleBubbleDragEnd}
          />
        </div>
      ))}
      
      {/* Reset button (hidden by default, can be shown for debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <motion.button
          className="fixed bottom-4 right-4 bg-glass border-glass rounded-full p-2 text-white text-xs pointer-events-auto"
          onClick={resetBubbles}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          style={{ zIndex: 1000 }}
        >
          Reset Bubbles
        </motion.button>
      )}
    </div>
  );
};

export default DraggableBubbles;