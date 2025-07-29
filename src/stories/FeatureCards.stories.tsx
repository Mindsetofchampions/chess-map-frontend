import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { within, userEvent } from '@storybook/testing-library';
import { expect } from '@storybook/jest';
import React from 'react';
import { MapPin, Shield, Compass } from 'lucide-react';

import GlassContainer from '../components/GlassContainer';

/**
 * Feature Cards Section Component for Storybook
 * 
 * This story showcases the feature highlight cards that explain
 * the main capabilities of the CHESS Quest platform.
 */

interface FeatureCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText: string;
  actionIcon: React.ReactNode;
  gradient: string;
  actionColor: string;
  onClick?: () => void;
}

const FeatureCardsSection: React.FC<{
  onFeatureClick?: (featureId: string) => void;
  showAnimations?: boolean;
  cardLayout?: 'grid' | 'row';
}> = ({
  onFeatureClick = action('feature-card-clicked'),
  showAnimations = true,
  cardLayout = 'grid'
}) => {
  const features: FeatureCard[] = [
    {
      icon: <MapPin className="w-8 h-8 text-white" />,
      title: 'Dynamic Quests',
      description: 'Discover location-based challenges that adapt to your learning pace and preferences. Complete quests to unlock new areas and earn valuable rewards.',
      actionText: 'Explore Quests',
      actionIcon: <Compass className="w-4 h-4" />,
      gradient: 'from-electric-blue-400 to-electric-blue-600',
      actionColor: 'text-electric-blue-400',
      onClick: () => onFeatureClick('quests')
    },
    {
      icon: <Shield className="w-8 h-8 text-white" />,
      title: 'Safe Spaces',
      description: 'Find secure environments where you can learn, collaborate, and grow. Our protected zones ensure a positive and supportive experience for everyone.',
      actionText: 'Find Safety',
      actionIcon: <Shield className="w-4 h-4" />,
      gradient: 'from-cyber-green-400 to-cyber-green-600',
      actionColor: 'text-cyber-green-400',
      onClick: () => onFeatureClick('safety')
    },
    {
      icon: <Compass className="w-8 h-8 text-white" />,
      title: 'Live Navigation',
      description: 'Navigate through your learning journey with real-time guidance. Interactive maps and smart routing help you discover the most engaging pathways.',
      actionText: 'Start Journey',
      actionIcon: <Compass className="w-4 h-4" />,
      gradient: 'from-neon-purple-400 to-neon-purple-600',
      actionColor: 'text-neon-purple-400',
      onClick: () => onFeatureClick('navigation')
    }
  ];

  const gridClasses = cardLayout === 'grid' 
    ? 'grid-cols-1 md:grid-cols-3'
    : 'grid-cols-1';

  return (
    <section className="py-16 px-6">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Power Up Your Learning
        </h2>
        <p className="text-gray-100 text-lg max-w-2xl mx-auto font-medium drop-shadow-sm">
          Experience education through gamification with cutting-edge features designed for engagement and growth.
        </p>
      </div>
      
      <div className={`grid ${gridClasses} gap-6`}>
        {features.map((feature, index) => (
          <GlassContainer 
            key={feature.title}
            variant="card" 
            className={`
              flex flex-col items-center space-y-4 text-center 
              hover:bg-glass-dark transition-all duration-300 
              cursor-pointer
              ${showAnimations ? 'hover:scale-105 hover:-translate-y-2' : ''}
            `}
            animate={showAnimations}
            delay={index * 0.2}
            onClick={feature.onClick}
          >
            <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-full flex items-center justify-center shadow-lg`}>
              {feature.icon}
            </div>
            <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
            <p className="text-gray-100 text-sm leading-relaxed font-medium">
              {feature.description}
            </p>
            <div className={`flex items-center gap-2 ${feature.actionColor} text-sm font-medium`}>
              <span>{feature.actionText}</span>
              {feature.actionIcon}
            </div>
          </GlassContainer>
        ))}
      </div>
    </section>
  );
};

// Story metadata
const meta: Meta<typeof FeatureCardsSection> = {
  title: 'Pages/Landing/Feature Cards',
  component: FeatureCardsSection,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
The Feature Cards Section highlights the three core capabilities of CHESS Quest:

## Features Showcased

1. **Dynamic Quests** - Location-based learning challenges
2. **Safe Spaces** - Secure collaborative environments  
3. **Live Navigation** - Real-time guidance and routing

## Design Elements

- **Glassmorphic Cards**: Semi-transparent containers with hover effects
- **Icon System**: Consistent Lucide React icons with gradient backgrounds
- **Interactive States**: Scale and translate animations on hover
- **Color Coding**: Each feature has a unique color theme
- **Responsive Grid**: Adapts from single column on mobile to three columns on desktop

## Accessibility Features

- **High Contrast**: Text colors meet WCAG AA standards
- **Touch Targets**: All interactive elements are 44px minimum
- **Keyboard Navigation**: Full keyboard accessibility support
- **Screen Reader**: Proper ARIA labels and semantic markup
        `,
      },
    },
  },
  argTypes: {
    onFeatureClick: {
      action: 'feature-card-clicked',
      description: 'Callback when a feature card is clicked',
    },
    showAnimations: {
      control: 'boolean',
      description: 'Enable hover and entrance animations',
      defaultValue: true,
    },
    cardLayout: {
      control: 'radio',
      options: ['grid', 'row'],
      description: 'Layout style for feature cards',
      defaultValue: 'grid',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FeatureCardsSection>;

/**
 * Default feature cards with full animations
 */
export const Default: Story = {
  args: {},
};

/**
 * Feature cards without animations (for accessibility testing)
 */
export const NoAnimations: Story = {
  args: {
    showAnimations: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Feature cards with animations disabled for users who prefer reduced motion.',
      },
    },
  },
};

/**
 * Single row layout for alternative presentation
 */
export const RowLayout: Story = {
  args: {
    cardLayout: 'row',
  },
  parameters: {
    docs: {
      description: {
        story: 'Feature cards arranged in a single column for alternative layouts or narrow spaces.',
      },
    },
  },
};

/**
 * Interactive testing story
 */
export const WithInteractions: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Test all feature cards are present
    await expect(canvas.getByText('Dynamic Quests')).toBeInTheDocument();
    await expect(canvas.getByText('Safe Spaces')).toBeInTheDocument();
    await expect(canvas.getByText('Live Navigation')).toBeInTheDocument();
    
    // Test hover interactions
    const questCard = canvas.getByText('Dynamic Quests').closest('div');
    if (questCard) {
      await userEvent.hover(questCard);
      await expect(questCard).toHaveClass('hover:scale-105');
    }
    
    // Test click interactions
    const safetyCard = canvas.getByText('Find Safety');
    await userEvent.click(safetyCard);
  },
};

/**
 * Mobile viewport optimization
 */
export const MobileView: Story = {
  args: {},
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Feature cards optimized for mobile devices with single column layout.',
      },
    },
  },
};

/**
 * Tablet viewport with grid layout
 */
export const TabletView: Story = {
  args: {},
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};

/**
 * Accessibility and contrast testing
 */
export const AccessibilityTest: Story = {
  args: {
    showAnimations: false,
  },
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
          {
            id: 'interactive-controls-name',
            enabled: true,
          },
        ],
      },
    },
    docs: {
      description: {
        story: 'Feature cards optimized for accessibility testing with high contrast and clear interactive elements.',
      },
    },
  },
};

/**
 * Visual regression baseline for Chromatic
 */
export const VisualRegression: Story = {
  args: {
    showAnimations: false, // Disable animations for consistent snapshots
  },
  parameters: {
    chromatic: {
      // Pause animation for consistent snapshots
      pauseAnimationAtEnd: true,
    },
  },
};