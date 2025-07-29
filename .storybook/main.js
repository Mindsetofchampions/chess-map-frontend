/**
 * Storybook Main Configuration
 * 
 * This configuration file sets up Storybook for a React TypeScript project
 * with comprehensive addon support for visual testing, accessibility,
 * and documentation generation.
 */

module.exports = {
  // Stories location and file patterns
  stories: [
    '../src/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    '../src/stories/**/*.stories.@(js|jsx|ts|tsx|mdx)'
  ],
  
  // Essential addons for comprehensive testing and development
  addons: [
    // Essential Storybook addons providing core functionality
    '@storybook/addon-essentials', // Includes: controls, actions, viewport, backgrounds
    
    // Documentation and controls for component props
    '@storybook/addon-docs',
    '@storybook/addon-controls',
    
    // Accessibility testing addon
    '@storybook/addon-a11y',
    
    // Interaction testing for user flows
    '@storybook/addon-interactions',
    
    // Links between stories for navigation
    '@storybook/addon-links',
    
    // Visual regression testing integration
    'chromatic',
    
    // Additional useful addons
    '@storybook/addon-storysource', // View story source code
  ],
  
  // Framework configuration
  framework: {
    name: '@storybook/react-vite',
    options: {
      // Vite-specific configuration
      builder: {
        viteConfigPath: './vite.config.ts'
      }
    }
  },
  
  // TypeScript configuration
  typescript: {
    // Automatically detect TypeScript configuration
    check: false, // Disable type-checking during build for faster development
    reactDocgen: 'react-docgen-typescript', // Extract prop types from TypeScript
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      shouldRemoveUndefinedFromOptional: true,
      propFilter: (prop) => {
        // Filter out props from node_modules to reduce noise
        if (prop.parent) {
          return !prop.parent.fileName.includes('node_modules');
        }
        return true;
      },
    },
  },
  
  // Documentation configuration
  docs: {
    autodocs: 'tag', // Generate docs for stories tagged with 'autodocs'
    defaultName: 'Documentation',
  },
  
  // Features configuration
  features: {
    // Enable modern features
    storyStoreV7: true, // Use the new story indexer
    argTypesRegex: '^on[A-Z].*', // Auto-detect event handlers for controls
  },
  
  // Build configuration
  build: {
    test: {
      // Test-specific configuration
      disableSourcemaps: false, // Keep sourcemaps for debugging
    }
  },
  
  // Static file serving
  staticDirs: [
    '../public', // Serve public assets (sprites, icons, etc.)
    {
      from: '../src/assets', 
      to: '/assets'
    }
  ],
  
  // Core configuration
  core: {
    builder: '@storybook/builder-vite', // Use Vite as the builder
    disableTelemetry: false, // Allow telemetry for better tooling
  },
  
  // Environment variables
  env: (config) => ({
    ...config,
    // Pass through necessary environment variables
    STORYBOOK_ENV: 'development',
  }),
  
  // Async configuration function for advanced setup
  async viteFinal(config, { configType }) {
    // Customize Vite config for Storybook
    const { mergeConfig } = await import('vite');
    
    return mergeConfig(config, {
      // Additional Vite configuration for Storybook
      define: {
        global: 'globalThis', // Fix for some dependencies
      },
      resolve: {
        alias: {
          // Ensure path aliases work in Storybook
          '@': '/src',
        },
      },
      optimizeDeps: {
        // Pre-bundle dependencies for faster loading
        include: [
          'react',
          'react-dom',
          'framer-motion',
          'lucide-react'
        ],
      },
    });
  },
  
  // Prebuilt entries for faster startup
  prebuilt: {
    enable: true,
  },
};