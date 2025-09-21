/** @type {import('tailwindcss').Config} */
export default {
  // Content paths for Tailwind to scan for classes
  content: ['./src/**/*.{ts,tsx}', './public/index.html'],

  theme: {
    extend: {
      // Custom futuristic esports color palette
      colors: {
        // Dark background system for youth appeal
        'dark-primary': '#0A0A0F',
        'dark-secondary': '#161622',
        'dark-tertiary': '#1F1F2E',
        'dark-accent': '#2A2A3E',

        'electric-blue': {
          50: '#eff8ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#4F9BFF',
          500: '#2E7AFF',
          600: '#1E5EEB',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        'neon-purple': {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#D946EF',
          500: '#C026D3',
          600: '#A21CAF',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
        },
        'cyber-green': {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Youth-focused accent colors
        'neon-orange': {
          400: '#FF8A3D',
          500: '#FF6B1A',
          600: '#E55A11',
        },
        'bright-pink': {
          400: '#FF4B8C',
          500: '#FF1B6B',
          600: '#E01555',
        },
        'electric-yellow': {
          400: '#FFE54B',
          500: '#FFDC1B',
          600: '#E5C215',
        },
        // Enhanced glassmorphism colors
        glass: {
          light: 'rgba(255, 255, 255, 0.05)',
          medium: 'rgba(255, 255, 255, 0.08)',
          dark: 'rgba(255, 255, 255, 0.12)',
          'ultra-light': 'rgba(255, 255, 255, 0.03)',
        },
      },

      // Enhanced backdrop blur utilities
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '40px',
        '3xl': '64px',
      },

      // Custom animation keyframes for esports theme
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'bounce-gentle': {
          '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-4px)' },
          '60%': { transform: 'translateY(-2px)' },
        },
        'pulse-glow': {
          '0%, 100%': {
            boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)',
            transform: 'scale(1)',
          },
          '50%': {
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)',
            transform: 'scale(1.05)',
          },
        },
        'neon-pulse': {
          '0%, 100%': {
            textShadow: '0 0 5px currentColor',
            opacity: '1',
          },
          '50%': {
            textShadow: '0 0 20px currentColor, 0 0 30px currentColor',
            opacity: '0.8',
          },
        },
      },

      // Custom animations
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
        'bounce-gentle': 'bounce-gentle 2s infinite',
        'pulse-glow': 'pulse-glow 2s infinite',
        'neon-pulse': 'neon-pulse 2s infinite',
      },

      // Custom font families for futuristic theme
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },

      // Custom spacing for consistent layout
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
        88: '22rem',
        112: '28rem',
      },

      // Mobile-first responsive breakpoints
      screens: {
        xs: '475px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },

      // Custom minimum touch target sizes
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },

  plugins: [
    // Custom utilities for glassmorphism effects
    function ({ addUtilities, addComponents }) {
      const newUtilities = {
        // Glass background utilities
        '.bg-glass': {
          'background-color': 'rgba(255, 255, 255, 0.08)',
          'backdrop-filter': 'blur(32px) saturate(180%)',
          '-webkit-backdrop-filter': 'blur(32px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        },
        '.bg-glass-light': {
          'background-color': 'rgba(255, 255, 255, 0.05)',
          'backdrop-filter': 'blur(20px) saturate(160%)',
          '-webkit-backdrop-filter': 'blur(20px) saturate(160%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
        '.bg-glass-dark': {
          'background-color': 'rgba(255, 255, 255, 0.12)',
          'backdrop-filter': 'blur(40px) saturate(200%)',
          '-webkit-backdrop-filter': 'blur(40px) saturate(200%)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        },

        // Glass border utilities
        '.border-glass': {
          border: '1px solid rgba(255, 255, 255, 0.15)',
        },
        '.border-glass-light': {
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
        '.border-glass-dark': {
          border: '1px solid rgba(255, 255, 255, 0.2)',
        },

        // Touch optimization
        '.touch-manipulation': {
          'touch-action': 'manipulation',
        },

        // Neon text effects
        '.text-neon-blue': {
          color: '#3b82f6',
          'text-shadow': '0 0 10px rgba(59, 130, 246, 0.8)',
        },
        '.text-neon-purple': {
          color: '#a855f7',
          'text-shadow': '0 0 10px rgba(168, 85, 247, 0.8)',
        },
        '.text-neon-green': {
          color: '#22c55e',
          'text-shadow': '0 0 10px rgba(34, 197, 94, 0.8)',
        },
      };

      const newComponents = {
        // Pre-built glassmorphism card components
        '.glassmorphism-card': {
          'background-color': 'rgba(255, 255, 255, 0.08)',
          'backdrop-filter': 'blur(32px) saturate(180%)',
          '-webkit-backdrop-filter': 'blur(32px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          'border-radius': '1rem',
          'box-shadow': '0 8px 32px 0 rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        },
        '.glassmorphism-overlay': {
          background: 'rgba(255, 255, 255, 0.03)',
          'backdrop-filter': 'blur(48px) saturate(200%)',
          '-webkit-backdrop-filter': 'blur(48px) saturate(200%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          'box-shadow': 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        },

        // Youth-focused button styles
        '.btn-esports': {
          background: 'linear-gradient(135deg, rgba(79, 155, 255, 0.3), rgba(217, 70, 239, 0.3))',
          'backdrop-filter': 'blur(24px) saturate(180%)',
          '-webkit-backdrop-filter': 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          'border-radius': '0.75rem',
          padding: '0.75rem 1.5rem',
          'font-weight': '600',
          color: 'white',
          'text-shadow': '0 2px 8px rgba(0, 0, 0, 0.8)',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          'min-height': '44px',
          'min-width': '44px',
          'touch-action': 'manipulation',
          'box-shadow':
            '0 4px 20px rgba(79, 155, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          '&:hover': {
            transform: 'translateY(-2px)',
            'box-shadow':
              '0 8px 32px rgba(79, 155, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
            background: 'linear-gradient(135deg, rgba(79, 155, 255, 0.4), rgba(217, 70, 239, 0.4))',
          },
        },
      };

      addUtilities(newUtilities);
      addComponents(newComponents);
    },
  ],
};
