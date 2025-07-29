/**
 * Jest configuration for React TypeScript testing
 */
module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // File extensions to test
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  
  // Transform files
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  
  // Module name mapping for imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    // CSS module mocking for Tailwind and other stylesheets
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
    '^.+\\.(css|sass|scss)$': '<rootDir>/__mocks__/styleMock.js',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'jest-transform-stub',
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  
  // Test match patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js|jsx)',
    '<rootDir>/src/**/?(*.)(spec|test).(ts|tsx|js|jsx)',
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.(ts|tsx)',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],
  
  // Mock Framer Motion for testing
  moduleNameMapping: {
    ...module.exports.moduleNameMapping,
    'framer-motion': '<rootDir>/src/__mocks__/framer-motion.ts',
  },
};