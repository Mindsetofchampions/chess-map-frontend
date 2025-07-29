/**
 * Storybook Preview Configuration
 * 
 * This file configures the global settings for all stories,
 * including CSS imports, decorators, parameters, and global types.
 */

// Import global styles
import '../src/index.css'; // Tailwind CSS and custom styles
import '../src/styles/storybook.css'; // Storybook-specific styles (create if needed)

// Import any necessary providers or contexts
import React from 'react';
import { motion } from 'framer-motion';

// Disable animations for visual regression testing stability
const withReducedMotion = (Story, context) => {
  // Override Framer Motion animations for consistent visual testing
  const MotionConfig = motion?.MotionConfig || React.Fragment;
  
  return (
    <MotionConfig reducedMotion="always">
      <div style={{ 
        // CSS override for any CSS-based animations
        animationDuration: context.globals.animations === 'disabled' ? '0s' : undefined,
        transitionDuration: context.globals.animations === 'disabled' ? '0s' : undefined 
      }}>
        <Story />
      </div>
    </MotionConfig>
  );
};

/**
 * Global decorators that wrap all stories
 * These provide consistent theming and layout across all stories
 */
export const decorators = [
  // Dark theme wrapper for glassmorphic design consistency
  (Story) => (
    <div className="min-h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary p-8">
      <div className="max-w-7xl mx-auto">
        <Story />
      </div>
    </div>
  ),
  
  // Animation wrapper for components using Framer Motion
  (Story) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Story />
    </motion.div>
  ),
  
  // Animation control decorator for visual regression testing
  withReducedMotion,
];

/**
 * Global parameters for all stories
 */
export const parameters = {
  // Actions panel configuration
  actions: { 
    argTypesRegex: '^on[A-Z].*', // Automatically detect event handlers
    handles: ['mouseover', 'click'], // Additional events to track
  },
  
  // Controls panel configuration
  controls: {
    matchers: {
      color: /(background|color)$/i, // Auto-detect color controls
      date: /Date$/, // Auto-detect date controls
    },
    expanded: true, // Expand controls panel by default
    sort: 'requiredFirst', // Show required props first
  },
  
  // Backgrounds configuration for testing different themes
  backgrounds: {
    default: 'dark',
    values: [
      {
        name: 'dark',
        value: '#0A0A0F', // Dark primary from our theme
      },
      {
        name: 'light',
        value: '#ffffff',
      },
      {
        name: 'gradient',
        value: 'linear-gradient(135deg, #0A0A0F 0%, #161622 50%, #1F1F2E 100%)',
      },
    ],
  },
  
  // Viewport configuration for responsive testing
  viewport: {
    viewports: {
      // Mobile viewports
      mobile1: {
        name: 'Small Mobile',
        styles: {
          width: '320px',
          height: '568px',
        },
      },
      mobile2: {
        name: 'Large Mobile',
        styles: {
          width: '414px',
          height: '896px',
        },
      },
      // Tablet viewports
      tablet: {
        name: 'Tablet',
        styles: {
          width: '768px',
          height: '1024px',
        },
      },
      // Desktop viewports
      desktop: {
        name: 'Desktop',
        styles: {
          width: '1440px',
          height: '900px',
        },
      },
      // Large desktop
      largeDesktop: {
        name: 'Large Desktop',
        styles: {
          width: '1920px',
          height: '1080px',
        },
      },
    },
  },
  
  // Documentation configuration
  docs: {
    theme: {
      // Dark theme for documentation
      base: 'dark',
      brandTitle: 'CHESS Map Components',
      brandUrl: './',
      colorPrimary: '#4F9BFF', // Electric blue from our palette
      colorSecondary: '#D946EF', // Neon purple from our palette
    },
    source: {
      type: 'dynamic', // Show source code dynamically
      excludeDecorators: false, // Include decorators in source
    },
  },
  
  // Layout configuration
  layout: 'fullscreen', // Use full screen by default for our glassmorphic designs
  
  // Options configuration
  options: {
    storySort: {
      order: [
        'Introduction',
        'Design System',
        ['Colors', 'Typography', 'Layout'],
        'Components',
        ['Basic', 'Interactive', 'Layout'],
        'Pages',
        ['Landing', 'Admin'],
        'Examples',
      ],
    },
  },
  
  // Accessibility testing configuration
  a11y: {
    // Accessibility rules configuration
    config: {
      rules: [
        {
          id: 'color-contrast',
          enabled: true, // Test color contrast ratios
        },
        {
          id: 'focus-order-semantics',
          enabled: true, // Test focus order
        },
        {
          id: 'keyboard-navigation',
          enabled: true, // Test keyboard accessibility
        },
      ],
    },
    options: {
      checks: { 'color-contrast': { options: { noScroll: true } } },
      restoreScroll: true,
    },
  },
  
  // Interaction testing configuration
  interactions: {
    disable: false, // Enable interaction testing
    debugger: true, // Show interaction debugger
  },
};

/**
 * Global types for Storybook controls
 * These define the available options for global parameters
 */
export const globalTypes = {
  // Theme switcher (if needed for future enhancements)
  theme: {
    name: 'Theme',
    description: 'Global theme for components',
    defaultValue: 'dark',
    toolbar: {
      icon: 'circlehollow',
      items: [
        { value: 'light', icon: 'circlehollow', title: 'Light' },
        { value: 'dark', icon: 'circle', title: 'Dark' },
      ],
      showName: true,
    },
  },
  
  // Animation toggle
  animations: {
    name: 'Animations',
    description: 'Enable/disable animations',
    defaultValue: 'enabled',
    toolbar: {
      icon: 'play',
      items: [
        { value: 'enabled', icon: 'play', title: 'Enabled' },
        { value: 'disabled', icon: 'stop', title: 'Disabled' },
      ],
      showName: true,
    },
  },
  
  // Locale for internationalization (future-proofing)
  locale: {
    name: 'Locale',
    description: 'Internationalization locale',
    defaultValue: 'en',
    toolbar: {
      icon: 'globe',
      items: [
        { value: 'en', right: '🇺🇸', title: 'English' },
        { value: 'es', right: '🇪🇸', title: 'Español' },
        { value: 'fr', right: '🇫🇷', title: 'Français' },
      ],
      showName: true,
    },
  },
};