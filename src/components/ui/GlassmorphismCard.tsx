import React from 'react';

/**
 * Props interface for the GlassmorphismCard component
 */
interface GlassmorphismCardProps {
  /** Child elements to be wrapped in glassmorphic styling */
  children: React.ReactNode;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * A reusable glassmorphism card component that applies modern glass-like styling
 * 
 * Features:
 * - Semi-transparent background with blur effect
 * - Subtle border and shadow
 * - Rounded corners for modern appearance
 * - Responsive padding
 * 
 * @param {GlassmorphismCardProps} props - Component props
 * @returns {JSX.Element} A styled card with glassmorphic effects
 */
const GlassmorphismCard: React.FC<GlassmorphismCardProps> = ({ 
  children, 
  className = '' 
}) => {
  // Combine base glassmorphic styles with optional additional classes
  const cardClasses = `
    bg-white/50 
    backdrop-blur-md 
    border 
    border-gray-200 
    rounded-2xl 
    shadow-lg 
    p-6
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={cardClasses}>
      {children}
    </div>
  );
};

export default GlassmorphismCard;