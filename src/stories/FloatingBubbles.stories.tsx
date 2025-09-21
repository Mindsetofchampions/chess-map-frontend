import { action } from '@storybook/addon-actions';
import { expect } from '@storybook/jest';
import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent } from '@storybook/testing-library';
import React from 'react';

import FloatingBubbles from '../components/FloatingBubbles';

/**
 * Floating Bubbles Animation Story
 *
 * This story showcases the CHESS attribute floating bubbles animation
 * that represents the five educational pillars of the platform.
 */

// Story metadata
const meta: Meta<typeof FloatingBubbles> = {
  title: 'Components/Interactive/Floating Bubbles',
  component: FloatingBubbles,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
The Floating Bubbles component displays animated bubbles representing the five CHESS educational attributes:

## CHESS Attributes

1. **Character (Hootie the Owl)** - Purple theme representing wisdom and character development
2. **Health (Brenda the Cat)** - Green theme representing health and wellness
3. **Exploration (Gino the Dog)** - Orange theme representing adventure and discovery  
4. **STEM (Hammer the Robot)** - Blue theme representing technology and innovation
5. **Stewardship (MOC Badge)** - Red theme representing leadership and responsibility

## Animation Features

- **Infinite Y-Oscillation**: Smooth up-and-down floating motion
- **Staggered Delays**: Each bubble starts animating at different times
- **Hover Effects**: Scale animation and elevated z-index on interaction
- **Pulse Rings**: Subtle expanding ring animations around each bubble
- **Sprite Integration**: Animated GIF characters for each attribute

## Interactive Elements

- **Click to Open**: Displays detailed information about each attribute
- **Glassmorphic Tooltips**: Semi-transparent modals with backdrop blur
- **Learn More Actions**: Buttons to navigate to related quest content
- **Responsive Design**: Optimized animations for both mobile and desktop

## Accessibility

- **ARIA Labels**: Descriptive labels for screen readers
- **Keyboard Navigation**: Full keyboard accessibility support
- **Touch Optimization**: 44px minimum touch targets for mobile
- **High Contrast**: Color combinations meet WCAG AA standards
        `,
      },
    },
  },
  argTypes: {
    // No props to control since FloatingBubbles is a self-contained component
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FloatingBubbles>;

/**
 * Default floating bubbles animation
 */
export const Default: Story = {
  render: () => (
    <div className='relative h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary overflow-hidden'>
      <FloatingBubbles />

      {/* Background content to show layering */}
      <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
        <div className='text-center text-gray-400'>
          <h2 className='text-3xl font-bold mb-4'>Background Content</h2>
          <p className='text-lg'>Floating bubbles appear above this content</p>
        </div>
      </div>
    </div>
  ),
};

/**
 * Floating bubbles with interaction testing
 */
export const WithInteractions: Story = {
  render: () => (
    <div className='relative h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary overflow-hidden'>
      <FloatingBubbles />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for bubbles to render
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Test that all CHESS attribute bubbles are present
    const characterBubble = canvas.getByLabelText(/Hootie.*Character/);
    const healthBubble = canvas.getByLabelText(/Brenda.*Health/);
    const explorationBubble = canvas.getByLabelText(/Gino.*Exploration/);
    const stemBubble = canvas.getByLabelText(/Hammer.*STEM/);
    const stewardshipBubble = canvas.getByLabelText(/MOC Badge.*Stewardship/);

    await expect(characterBubble).toBeInTheDocument();
    await expect(healthBubble).toBeInTheDocument();
    await expect(explorationBubble).toBeInTheDocument();
    await expect(stemBubble).toBeInTheDocument();
    await expect(stewardshipBubble).toBeInTheDocument();

    // Test hover interaction
    await userEvent.hover(characterBubble);

    // Test click interaction to open tooltip
    await userEvent.click(characterBubble);

    // Verify tooltip appears
    await expect(canvas.getByText(/Hootie the Owl – Character/)).toBeInTheDocument();
  },
};

/**
 * Individual bubble showcase
 */
export const BubbleShowcase: Story = {
  render: () => (
    <div className='grid grid-cols-1 md:grid-cols-5 gap-8 p-8 bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary min-h-screen'>
      {[
        { name: 'Character', character: 'Hootie the Owl', color: '#8B5CF6' },
        { name: 'Health', character: 'Brenda the Cat', color: '#10B981' },
        { name: 'Exploration', character: 'Gino the Dog', color: '#F59E0B' },
        { name: 'STEM', character: 'Hammer the Robot', color: '#3B82F6' },
        { name: 'Stewardship', character: 'MOC Badge', color: '#EF4444' },
      ].map((attribute) => (
        <div key={attribute.name} className='text-center'>
          <div
            className='w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl border-2'
            style={{
              backgroundColor: `${attribute.color}20`,
              borderColor: `${attribute.color}60`,
            }}
          >
            {attribute.name === 'Character' && '🦉'}
            {attribute.name === 'Health' && '🐱'}
            {attribute.name === 'Exploration' && '🐕'}
            {attribute.name === 'STEM' && '🤖'}
            {attribute.name === 'Stewardship' && '🏛️'}
          </div>
          <h3 className='text-xl font-bold text-white mb-2'>{attribute.name}</h3>
          <p className='text-gray-300 text-sm'>{attribute.character}</p>
          <div
            className='w-4 h-4 rounded-full mx-auto mt-2'
            style={{ backgroundColor: attribute.color }}
          />
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Individual showcase of each CHESS attribute with its character and color theme.',
      },
    },
  },
};

/**
 * Mobile viewport optimization
 */
export const MobileView: Story = {
  render: () => (
    <div className='relative h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary overflow-hidden'>
      <FloatingBubbles />
    </div>
  ),
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Floating bubbles optimized for mobile devices with reduced animation intensity.',
      },
    },
  },
};

/**
 * Tablet viewport
 */
export const TabletView: Story = {
  render: () => (
    <div className='relative h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary overflow-hidden'>
      <FloatingBubbles />
    </div>
  ),
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};

/**
 * Accessibility testing story
 */
export const AccessibilityTest: Story = {
  render: () => (
    <div className='relative h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary overflow-hidden'>
      <FloatingBubbles />
    </div>
  ),
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
          {
            id: 'keyboard-navigation',
            enabled: true,
          },
        ],
      },
    },
  },
};

/**
 * Performance testing with reduced motion
 */
export const ReducedMotion: Story = {
  render: () => (
    <div className='relative h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary overflow-hidden'>
      <div className='motion-reduce:opacity-50'>
        <FloatingBubbles />
      </div>
      <div className='absolute top-4 left-4 bg-glass border-glass rounded-lg p-4 text-white'>
        <p className='text-sm'>Animations respect user's motion preferences</p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Floating bubbles with reduced motion considerations for accessibility.',
      },
    },
  },
};

/**
 * Visual regression baseline
 */
export const VisualRegression: Story = {
  render: () => (
    <div className='relative h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary overflow-hidden'>
      <FloatingBubbles />
    </div>
  ),
  parameters: {
    chromatic: {
      pauseAnimationAtEnd: true,
      delay: 2000, // Wait for initial animations to settle
    },
  },
};
