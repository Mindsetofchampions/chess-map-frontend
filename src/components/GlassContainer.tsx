import React from 'react';
import { motion } from 'framer-motion';

/**
 * Props interface for the GlassContainer component
 */
interface GlassContainerProps {
  /** Child elements to be wrapped in glass styling */
  children: React.ReactNode;
  /** Optional additional CSS classes */
  className?: string;
  /** Container variant for different use cases */
  variant?: 'page' | 'card' | 'overlay';
  /** Whether to apply entrance animation */
  animate?: boolean;
  /** Animation delay in seconds */
  delay?: number;
  /** Optional click handler */
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

/**
 * Reusable glassmorphic container component for consistent page layouts
 * 
 * Features:
 * - Multiple variants for different use cases (page, card, overlay)
 * - Consistent glassmorphic styling across the application
 * - Optional entrance animations with configurable delay
 * - Mobile-optimized responsive design
 * - Backdrop blur effects with border styling
 * 
 * @param {GlassContainerProps} props - Component props
 * @returns {JSX.Element} Glassmorphic container with consistent styling
 */
const GlassContainer: React.FC<GlassContainerProps> = ({
  children,
  className = '',
  variant = 'card',
  animate = true,
  delay = 0,
  onClick
}) => {
  // Variant-specific styles
  const variantClasses = {
    page: `
      min-h-screen 
      bg-gradient-to-br
      from-dark-primary 
      via-dark-secondary 
      to-dark-tertiary 
      p-4 
      sm:p-6 
      lg:p-8
    `,
    card: `
      bg-glass 
      backdrop-blur-2xl 
      border-glass 
      rounded-2xl 
      shadow-2xl 
      p-6 
      sm:p-8
      relative
    `,
    overlay: `
      bg-glass-light 
      backdrop-blur-3xl 
      border-glass-light 
      rounded-xl 
      shadow-xl 
      p-4 
      sm:p-6
      relative
    `
  };

  // Combine variant classes with custom classes
  const containerClasses = `
    ${variantClasses[variant]}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  // Animation configurations
  const animationProps = animate ? {
    initial: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    animate: { 
      opacity: 1, 
      y: 0,
      scale: 1
    },
    transition: {
      duration: 0.6,
      delay,
      type: "spring",
      stiffness: 100,
      damping: 20
    }
  } : {};

  // Render with or without animation
  if (animate) {
    return (
      <motion.div
        className={containerClasses}
        onClick={onClick}
        {...animationProps}
      >
        {children}
        
        {/* Decorative gradient border for card variant */}
        {variant === 'card' && (
          <div className="absolute -inset-px bg-gradient-to-r from-electric-blue-400/30 via-neon-purple-400/30 to-cyber-green-400/30 rounded-2xl -z-10 blur-sm" />
        )}
      </motion.div>
    );
  }

  return (
    <div className={containerClasses} onClick={onClick}>
      {children}
      
      {/* Decorative gradient border for card variant */}
      {variant === 'card' && (
        <div className="absolute -inset-px bg-gradient-to-r from-electric-blue-400/30 via-neon-purple-400/30 to-cyber-green-400/30 rounded-2xl -z-10 blur-sm" />
      )}
    </div>
  );
};

export default GlassContainer;