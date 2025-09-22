import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  // Use a cache directory outside node_modules to avoid EPERM on Windows/OneDrive
  cacheDir: path.resolve(__dirname, '.vite-cache'),

  // Path resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Development server configuration
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 3000,
    open: true, // Automatically open browser
    cors: true,
    hmr: true, // Simplified HMR configuration
  },

  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Optimize chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mapbox: ['mapbox-gl'],
          supabase: ['@supabase/supabase-js'],
          ui: ['lucide-react'],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },

  // Environment variables configuration
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],

  // Dependency optimization
  optimizeDeps: {
    include: ['react', 'react-dom', 'mapbox-gl', '@supabase/supabase-js', 'lucide-react'],
    exclude: ['@bolt/cli'],
  },

  // CSS configuration
  css: {
    postcss: './postcss.config.js',
    devSourcemap: true,
  },

  // Define global constants
  define: {
    global: 'globalThis',
  },
});
