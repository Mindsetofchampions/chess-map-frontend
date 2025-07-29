import React from 'react';
import { motion } from 'framer-motion';

/**
 * Props interface for the BubbleMarker component
 */
interface BubbleMarkerProps {
  /** Unique identifier for the attribute to determine sprite icon */
  attributeId: string;
  /** Optional position coordinates for absolute positioning */
  position?: { x: number; y: number };
  /** Callback function triggered when marker is clicked */
  onClick?: (attributeId: string) => void;
  /** Optional additional CSS classes */
  className?: string;
  /** Optional size variant for the marker */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Animated bubble marker component for CHESS attributes on the map
 * 
 * Features:
 * - Glassmorphic circular design with dynamic sprite icons
 * - Continuous bounce animation with hover scale effects
 * - Mobile-optimized touch targets (minimum 44x44px)
 * - Dynamic icon loading based on attribute ID
 * - Smooth entrance/exit animations
 * 
 * @param {BubbleMarkerProps} props - Component props
 * @returns {JSX.Element} Animated bubble marker with sprite icon
 */
const BubbleMarker: React.FC<BubbleMarkerProps> = ({
  attributeId,
  position,
  onClick,
  className = '',
  size = 'md'
}) => {
  // Size variants for responsive design
  const sizeClasses = {
    sm: 'w-10 h-10 p-1.5',
    md: 'w-12 h-12 p-2',
    lg: 'w-16 h-16 p-3'
  };

  // Icon size variants
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  // Handle marker click
  const handleClick = () => {
    if (onClick) {
      onClick(attributeId);
    }
  };

  // Generate sprite icon path based on attribute ID
  const spriteIconPath = `/icons/${attributeId}-attribute.png`;

  // Combine base classes with size variant and custom classes
  const markerClasses = `
    ${sizeClasses[size]}
    rounded-full 
    bg-glass 
    border-glass 
    shadow-lg 
    cursor-pointer 
    flex 
    items-center 
    justify-center
    min-w-touch 
    min-h-touch 
    touch-manipulation
    transition-all 
    duration-300 
    hover:shadow-xl 
    hover:border-glass-dark
    ${position ? 'absolute' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  // Position styles if coordinates provided
  const positionStyles = position ? {
    left: `${position.x}px`,
    top: `${position.y}px`,
    transform: 'translate(-50%, -50%)'
  } : {};

  return (
    <motion.div
      className={markerClasses}
      style={positionStyles}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`${attributeId} attribute marker`}
      
      // Entrance animation
      initial={{ 
        opacity: 0, 
        scale: 0,
        y: 20
      }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        y: 0
      }}
      exit={{ 
        opacity: 0, 
        scale: 0,
        y: -20
      }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20
      }}
      
      // Continuous bounce animation
      animate={{
        y: [0, -4, 0],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      
      // Hover scale effect
      whileHover={{ 
        scale: 1.1,
        y: -6,
        transition: { duration: 0.2 }
      }}
      
      // Tap effect for mobile
      whileTap={{ 
        scale: 0.95,
        transition: { duration: 0.1 }
      }}
      
      // Keyboard accessibility
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Sprite Icon */}
      <motion.img
        src={spriteIconPath}
        alt={`${attributeId} attribute icon`}
        className={`${iconSizes[size]} object-contain select-none`}
        draggable={false}
        
        // Icon hover animation
        whileHover={{
          rotate: [0, -5, 5, 0],
          transition: { duration: 0.3 }
        }}
        
        // Fallback for missing images
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          
          // Create fallback icon using CSS
          const fallback = document.createElement('div');
          fallback.className = `${iconSizes[size]} bg-gradient-to-br from-electric-blue-400 to-neon-purple-400 rounded-full flex items-center justify-center text-white font-bold text-xs`;
          fallback.textContent = attributeId.charAt(0).toUpperCase();
          
          if (target.parentNode) {
            target.parentNode.appendChild(fallback);
          }
        }}
      />
      
      {/* Pulse ring effect */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-electric-blue-400 opacity-75"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.75, 0, 0.75],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </motion.div>
  );
};

export default BubbleMarker;