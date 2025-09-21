/**
 * Storybook Main Configuration
 * 
 * This configuration file sets up Storybook for a React TypeScript project
 * with comprehensive addon support for visual testing, accessibility,
 * and documentation generation.
 */

export default {
  // Stories location and file patterns
  stories: [
    '../src/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    '../src/stories/**/*.stories.@(js|jsx|ts|tsx|mdx)'
  ],
  
  // Essential addons for comprehensive testing and development
  addons: [
    // Essential Storybook addons providing core functionality
    '@storybook/addon-essentials', // Includes: docs, controls, actions, backgrounds, viewport
    // Accessibility testing addon
    '@storybook/addon-a11y',
    // Interaction testing for user flows
    '@storybook/addon-interactions',
    // Links between stories for navigation
    '@storybook/addon-links',
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
  
  // Features configuration (removed deprecated flags for SB9)
  
  // Static file serving
  staticDirs: [
    '../public', // Serve public assets (sprites, icons, etc.)
    {
      from: '../src/assets', 
      to: '/assets'
    }
  ],
  
  // Core builder is implied by framework in SB9
  
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
      server: {
        strictPort: true,
        hmr: true,
      },
      logLevel: 'info',
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
  
  // Prebuilt entries not used in SB9
};