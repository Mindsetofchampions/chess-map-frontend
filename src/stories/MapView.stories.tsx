import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import GlassContainer from '../components/GlassContainer';

/**
 * MapView Placeholder Component for Storybook
 * 
 * Since the actual MapView component requires Mapbox tokens and external dependencies,
 * this story provides a placeholder that demonstrates the layout and styling
 * expectations for the map integration section.
 */

const MapViewPlaceholder: React.FC<{
  showOverlay?: boolean;
  mapHeight?: string;
  showLegend?: boolean;
  errorState?: boolean;
  loadingState?: boolean;
}> = ({
  showOverlay = true,
  mapHeight = '600px',
  showLegend = true,
  errorState = false,
  loadingState = false
}) => {
  return (
    <section className="py-16 px-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Explore the CHESS Universe
        </h2>
        <p className="text-gray-100 text-lg max-w-2xl mx-auto font-medium drop-shadow-sm">
          Dive into an interactive world where learning meets adventure. Discover quests, locate safe spaces, and connect with your community.
        </p>
      </div>
      
      <GlassContainer variant="card" className="mt-8 p-0 overflow-hidden">
        <div className="relative w-full" style={{ height: mapHeight }}>
          
          {/* Map Placeholder */}
          <div className="w-full h-full bg-gradient-to-br from-dark-secondary to-dark-tertiary rounded-xl flex items-center justify-center">
            {loadingState ? (
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-blue-400 mx-auto mb-4"></div>
                <p className="text-lg font-medium">Loading Interactive Map...</p>
                <p className="text-sm text-gray-300 mt-2">Connecting to Mapbox services</p>
              </div>
            ) : errorState ? (
              <div className="text-center text-white max-w-md">
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚠️</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Map Unavailable</h3>
                <p className="text-gray-300 mb-4">Unable to load map content. Please check your connection.</p>
                <button className="btn-esports">
                  Retry Loading
                </button>
              </div>
            ) : (
              <div className="text-center text-white">
                <div className="w-20 h-20 bg-gradient-to-br from-electric-blue-400 to-neon-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🗺️</span>
                </div>
                <h3 className="text-2xl font-bold mb-2">Interactive Map</h3>
                <p className="text-gray-300 max-w-md">
                  This placeholder represents the Mapbox GL integration that would display
                  CHESS quest locations, safe spaces, and interactive navigation features.
                </p>
              </div>
            )}
          </div>
          
          {/* Map Overlay Info */}
          {showOverlay && !errorState && (
            <div className="absolute top-4 left-4 right-4 z-10">
              <div className="flex flex-wrap gap-2 justify-center">
                <div className="bg-glass-dark border-glass-dark rounded-full px-3 py-1 text-xs text-gray-100 backdrop-blur-xl font-medium">
                  <span className="w-2 h-2 bg-electric-blue-400 rounded-full inline-block mr-2"></span>
                  Active Quests
                </div>
                <div className="bg-glass-dark border-glass-dark rounded-full px-3 py-1 text-xs text-gray-100 backdrop-blur-xl font-medium">
                  <span className="w-2 h-2 bg-cyber-green-400 rounded-full inline-block mr-2"></span>
                  Safe Spaces
                </div>
                <div className="bg-glass-dark border-glass-dark rounded-full px-3 py-1 text-xs text-gray-100 backdrop-blur-xl font-medium">
                  <span className="w-2 h-2 bg-neon-purple-400 rounded-full inline-block mr-2"></span>
                  Community Hubs
                </div>
              </div>
            </div>
          )}
          
          {/* Legend */}
          {showLegend && !errorState && !loadingState && (
            <div className="absolute bottom-4 left-4 z-10">
              <GlassContainer variant="overlay" className="p-3">
                <h4 className="text-white font-semibold text-sm mb-2">Map Legend</h4>
                <div className="space-y-1 text-xs text-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-electric-blue-400 rounded-full"></div>
                    <span>Quest Locations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-cyber-green-400 rounded-full"></div>
                    <span>Safe Spaces</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-neon-purple-400 rounded-full"></div>
                    <span>Community Areas</span>
                  </div>
                </div>
              </GlassContainer>
            </div>
          )}
          
          {/* Mock Navigation Controls */}
          {!errorState && !loadingState && (
            <div className="absolute top-4 right-4 z-10">
              <div className="bg-glass border-glass rounded-lg shadow-lg">
                <button className="block p-2 text-white hover:bg-glass-dark transition-colors border-b border-glass-light">
                  <span className="text-lg">+</span>
                </button>
                <button className="block p-2 text-white hover:bg-glass-dark transition-colors">
                  <span className="text-lg">−</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </GlassContainer>
    </section>
  );
};

// Story metadata
const meta: Meta<typeof MapViewPlaceholder> = {
  title: 'Pages/Landing/Map View',
  component: MapViewPlaceholder,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
The Map View section is the interactive centerpiece of the CHESS Quest experience. This placeholder demonstrates:

## Map Features

- **Interactive Navigation**: Zoom controls and pan functionality
- **Quest Markers**: Location-based educational challenges  
- **Safe Spaces**: Secure areas for collaboration and learning
- **Community Hubs**: Social gathering points for users

## Visual Elements

- **Glassmorphic Container**: Semi-transparent overlay with backdrop blur
- **Color-Coded Legend**: Visual guide for different map elements
- **Responsive Design**: Adapts height and controls for different screen sizes
- **Loading States**: Smooth transitions during map initialization

## Integration Notes

The actual implementation integrates with:
- **Mapbox GL JS**: For interactive mapping functionality
- **Supabase**: For real-time quest and location data
- **CHESS Attributes**: Location-based educational content

## Accessibility

- **High Contrast**: Map overlays meet WCAG AA standards
- **Keyboard Navigation**: Full keyboard control of map functions
- **Screen Reader**: Descriptive labels for all interactive elements
        `,
      },
    },
  },
  argTypes: {
    showOverlay: {
      control: 'boolean',
      description: 'Display map overlay with legend indicators',
      defaultValue: true,
    },
    mapHeight: {
      control: 'text',
      description: 'CSS height value for the map container',
      defaultValue: '600px',
    },
    showLegend: {
      control: 'boolean',
      description: 'Display the map legend in bottom-left corner',
      defaultValue: true,
    },
    errorState: {
      control: 'boolean',
      description: 'Simulate map loading error state',
      defaultValue: false,
    },
    loadingState: {
      control: 'boolean',
      description: 'Simulate map loading state',
      defaultValue: false,
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof MapViewPlaceholder>;

/**
 * Default map view with all elements visible
 */
export const Default: Story = {
  args: {},
};

/**
 * Compact map view for smaller spaces
 */
export const Compact: Story = {
  args: {
    mapHeight: '400px',
    showLegend: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact version of the map view suitable for smaller screen spaces or embedded contexts.',
      },
    },
  },
};

/**
 * Map loading state
 */
export const Loading: Story = {
  args: {
    loadingState: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state displayed while connecting to Mapbox services and initializing the interactive map.',
      },
    },
  },
};

/**
 * Map error state
 */
export const Error: Story = {
  args: {
    errorState: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state displayed when map services are unavailable or connection fails.',
      },
    },
  },
};

/**
 * Minimal map without overlays
 */
export const Minimal: Story = {
  args: {
    showOverlay: false,
    showLegend: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Minimal map view without overlay elements, suitable for focused map interaction.',
      },
    },
  },
};

/**
 * Mobile optimized map view
 */
export const MobileView: Story = {
  args: {
    mapHeight: '300px',
    showLegend: false,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Mobile-optimized map view with reduced height and simplified interface.',
      },
    },
  },
};

/**
 * Tablet optimized map view
 */
export const TabletView: Story = {
  args: {
    mapHeight: '500px',
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};

/**
 * Large screen map view
 */
export const LargeScreen: Story = {
  args: {
    mapHeight: '800px',
  },
  parameters: {
    viewport: {
      defaultViewport: 'largeDesktop',
    },
    docs: {
      description: {
        story: 'Large screen map view with increased height for immersive experience.',
      },
    },
  },
};

/**
 * Visual regression testing (no animations)
 */
export const VisualRegression: Story = {
  args: {
    showOverlay: true,
    showLegend: true,
  },
  parameters: {
    chromatic: {
      pauseAnimationAtEnd: true,
    },
  },
};