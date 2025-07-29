/**
 * PostCSS configuration for processing CSS with Tailwind and Autoprefixer
 */
export default {
  plugins: {
    // Tailwind CSS plugin for utility-first CSS
    tailwindcss: {},
    
    // Autoprefixer for adding vendor prefixes
    autoprefixer: {},
    
    // CSS Nano for production optimization (only in production)
    ...(process.env.NODE_ENV === 'production' && {
      cssnano: {
        preset: 'default',
      },
    }),
  },
};