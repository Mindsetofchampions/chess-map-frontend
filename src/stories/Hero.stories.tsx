import { action } from '@storybook/addon-actions';
import { expect } from '@storybook/jest';
import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent } from '@storybook/testing-library';
import { Compass, Zap, Users, Shield } from 'lucide-react';
import React from 'react';

import GlassContainer from '../components/GlassContainer';

/**
 * Hero Section Component for Storybook
 *
 * This story represents the main hero section of the CHESS Quest landing page,
 * showcasing the glassmorphic design, typography, and call-to-action buttons.
 */

// Mock component for the hero section
const HeroSection: React.FC<{
  onStudentSignUp?: () => void;
  onAdminLogin?: () => void;
  showIcons?: boolean;
  title?: string;
  subtitle?: string;
}> = ({
  onStudentSignUp = action('student-signup-clicked'),
  onAdminLogin = action('admin-login-clicked'),
  showIcons = true,
  title = 'Welcome to CHESS Quest',
  subtitle = 'Find safe spaces, complete quests, earn coins, redeem for rewards. Join the ultimate gamified learning experience designed for the digital generation.',
}) => {
  return (
    <GlassContainer variant='page'>
      <div className='container mx-auto max-w-7xl'>
        <section className='text-center lg:text-left py-12 lg:py-20 px-6'>
          <div className='flex flex-col lg:flex-row items-center justify-between gap-12'>
            {/* Hero Content */}
            <div className='flex-1 space-y-6'>
              {showIcons && (
                <div className='flex items-center justify-center lg:justify-start mb-6'>
                  <Compass className='w-12 h-12 text-electric-blue-400 mr-4 drop-shadow-lg' />
                  <div className='h-12 w-px bg-gradient-to-b from-transparent via-electric-blue-400 to-transparent drop-shadow-sm'></div>
                  <Zap className='w-8 h-8 text-neon-purple-400 ml-4 drop-shadow-lg' />
                </div>
              )}

              <h1 className='text-4xl md:text-6xl font-extrabold text-neon-purple leading-tight'>
                {title.split('CHESS Quest')[0]}
                <span className='bg-gradient-to-r from-electric-blue-400 via-neon-purple-400 to-cyber-green-400 bg-clip-text text-transparent drop-shadow-lg'>
                  CHESS Quest
                </span>
              </h1>

              <p className='text-lg text-gray-100 max-w-2xl leading-relaxed drop-shadow-sm font-medium'>
                {subtitle}
              </p>

              {/* CTA Buttons */}
              <div className='flex flex-col sm:flex-row gap-4 pt-6'>
                <button
                  onClick={onStudentSignUp}
                  className='btn-esports flex items-center justify-center gap-2 hover:scale-105 hover:-translate-y-1 transition-all duration-300'
                  aria-label='Student sign up or sign in'
                >
                  <Users className='w-5 h-5' />
                  Student Sign Up/Sign In
                </button>

                <button
                  onClick={onAdminLogin}
                  className='bg-gradient-to-r from-cyber-green-500 to-cyber-green-600 hover:from-cyber-green-400 hover:to-cyber-green-500 text-white rounded-full px-8 py-4 shadow-2xl transition-all duration-300 font-semibold text-center min-h-[44px] touch-manipulation hover:shadow-cyber-green-500/50 hover:scale-105 hover:-translate-y-1 flex items-center justify-center gap-2 border border-cyber-green-400/30'
                  aria-label='Admin login'
                >
                  <Shield className='w-5 h-5' />
                  Admin Login
                </button>
              </div>
            </div>

            {/* Hero Visual */}
            <div className='flex-1 lg:max-w-md'>
              <GlassContainer variant='card' className='text-center shadow-2xl'>
                <div className='grid grid-cols-2 gap-4 mb-6'>
                  <div className='bg-glass-light border-glass-light rounded-xl p-4 hover:bg-glass-dark transition-all duration-300 hover:scale-105'>
                    <div className='w-8 h-8 text-yellow-400 mx-auto mb-2'>🏆</div>
                    <p className='text-sm text-gray-100 font-semibold drop-shadow-sm'>
                      Earn Rewards
                    </p>
                  </div>
                  <div className='bg-glass-light border-glass-light rounded-xl p-4 hover:bg-glass-dark transition-all duration-300 hover:scale-105'>
                    <div className='w-8 h-8 text-electric-blue-400 mx-auto mb-2'>🗺️</div>
                    <p className='text-sm text-gray-100 font-semibold drop-shadow-sm'>
                      Explore Quests
                    </p>
                  </div>
                </div>
                <div className='text-center'>
                  <div className='inline-flex items-center gap-2 bg-glass-light border-glass-light rounded-full px-4 py-2'>
                    <div className='w-3 h-3 bg-cyber-green-400 rounded-full animate-pulse'></div>
                    <span className='text-sm text-gray-100 font-semibold drop-shadow-sm'>
                      Live System
                    </span>
                  </div>
                </div>
              </GlassContainer>
            </div>
          </div>
        </section>
      </div>
    </GlassContainer>
  );
};

// Story metadata
const meta: Meta<typeof HeroSection> = {
  title: 'Pages/Landing/Hero Section',
  component: HeroSection,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
The Hero Section is the primary landing area for the CHESS Quest application. It features:

- **Glassmorphic Design**: Semi-transparent containers with backdrop blur effects
- **Youth-Focused Typography**: Large, bold text with gradient effects
- **Interactive CTAs**: Hover animations and accessibility-compliant buttons
- **Responsive Layout**: Adapts from mobile-first to desktop layouts
- **Live System Indicator**: Shows system status with animated pulse

## Design Principles
- **Dark Theme**: Optimized for youth engagement (ages 5-17)
- **High Contrast**: Ensures text readability across all backgrounds
- **Touch-Friendly**: All interactive elements meet 44px minimum requirement
- **Performance**: GPU-accelerated animations for smooth interactions
        `,
      },
    },
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'Main hero title text',
    },
    subtitle: {
      control: 'text',
      description: 'Subtitle description text',
    },
    showIcons: {
      control: 'boolean',
      description: 'Toggle display of decorative icons',
    },
    onStudentSignUp: {
      action: 'student-signup-clicked',
      description: 'Callback for student sign up button',
    },
    onAdminLogin: {
      action: 'admin-login-clicked',
      description: 'Callback for admin login button',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof HeroSection>;

/**
 * Default hero section with all standard elements
 */
export const Default: Story = {
  args: {},
};

/**
 * Hero section with custom title and subtitle
 */
export const CustomContent: Story = {
  args: {
    title: 'Welcome to Educational Gaming',
    subtitle:
      'Experience the future of learning through interactive quests, rewards, and community engagement.',
  },
};

/**
 * Minimal hero section without decorative icons
 */
export const MinimalVersion: Story = {
  args: {
    showIcons: false,
  },
};

/**
 * Hero section with interaction testing
 */
export const WithInteractions: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Test student signup button interaction
    const studentButton = canvas.getByLabelText('Student sign up or sign in');
    await expect(studentButton).toBeInTheDocument();
    await userEvent.hover(studentButton);

    // Test admin login button interaction
    const adminButton = canvas.getByLabelText('Admin login');
    await expect(adminButton).toBeInTheDocument();
    await userEvent.hover(adminButton);

    // Test accessibility
    await expect(studentButton).toHaveClass('btn-esports');
    await expect(adminButton).toHaveAttribute('aria-label', 'Admin login');
  },
};

/**
 * Mobile viewport optimization test
 */
export const MobileView: Story = {
  args: {},
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story:
          'Hero section optimized for mobile devices with stacked layout and touch-friendly buttons.',
      },
    },
  },
};

/**
 * Tablet viewport optimization test
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
 * Desktop large screen optimization
 */
export const DesktopView: Story = {
  args: {},
  parameters: {
    viewport: {
      defaultViewport: 'largeDesktop',
    },
  },
};

/**
 * Accessibility testing story
 */
export const AccessibilityTest: Story = {
  args: {},
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
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
