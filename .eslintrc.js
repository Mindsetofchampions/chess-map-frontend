/**
 * ESLint Configuration for React TypeScript Project
 * 
 * This configuration provides comprehensive linting rules for:
 * - TypeScript type safety and best practices
 * - React component patterns and hooks usage
 * - Code quality and maintainability
 * - Accessibility standards
 * - Performance optimizations
 * - Import/export organization
 * - Prettier integration for consistent formatting
 */

module.exports = {
  // Specify the root of the project to prevent ESLint from looking in parent directories
  root: true,
  
  // Define the environments where the code will run
  env: {
    browser: true,     // Browser global variables
    es2022: true,      // Modern ES features
    node: true,        // Node.js global variables (for config files)
    jest: true,        // Jest testing framework globals
  },
  
  // Extend from popular rule sets and configurations
  extends: [
    'eslint:recommended',                     // ESLint's recommended rules
    '@typescript-eslint/recommended',        // TypeScript-specific linting rules
    '@typescript-eslint/recommended-requiring-type-checking', // Rules requiring type information
    'plugin:react/recommended',              // React-specific linting rules
    'plugin:react-hooks/recommended',        // React Hooks rules
    'plugin:jsx-a11y/recommended',          // Accessibility rules for JSX
    'plugin:import/recommended',             // Import/export best practices
    'plugin:import/typescript',              // TypeScript-aware import rules
    'prettier',                              // Disables ESLint rules that conflict with Prettier
  ],
  
  // Parser for TypeScript files
  parser: '@typescript-eslint/parser',
  
  // Parser options for modern TypeScript and JSX
  parserOptions: {
    ecmaVersion: 'latest',    // Use the latest ECMAScript version
    sourceType: 'module',     // Use ECMAScript modules
    ecmaFeatures: {
      jsx: true,              // Enable JSX parsing
    },
    // TypeScript project configuration for type-aware rules
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  
  // Plugins to extend ESLint functionality
  plugins: [
    '@typescript-eslint',   // TypeScript-specific rules
    'react',               // React-specific rules
    'react-hooks',         // React Hooks rules
    'jsx-a11y',           // Accessibility rules
    'import',             // Import/export rules
    'prettier',           // Prettier integration
  ],
  
  // Custom rule configurations
  rules: {
    // === TypeScript-specific rules ===
    
    // Enforce consistent type definitions
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    
    // Require explicit return types for functions (aids in documentation and type safety)
    '@typescript-eslint/explicit-function-return-type': 'off', // Too strict for React components
    '@typescript-eslint/explicit-module-boundary-types': 'off', // Too strict for React components
    
    // Disallow unused variables (prevents dead code)
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',        // Ignore args starting with underscore
        varsIgnorePattern: '^_',        // Ignore vars starting with underscore
        ignoreRestSiblings: true,       // Ignore rest properties
      },
    ],
    
    // Prevent any types (encourages proper typing)
    '@typescript-eslint/no-explicit-any': 'warn',
    
    // Require consistent naming conventions
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'interface',
        format: ['PascalCase'],
        custom: {
          regex: '^I[A-Z]',
          match: false, // Don't require I prefix for interfaces
        },
      },
      {
        selector: 'typeAlias',
        format: ['PascalCase'],
      },
      {
        selector: 'enum',
        format: ['PascalCase'],
      },
      {
        selector: 'variable',
        format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
        leadingUnderscore: 'allow',
      },
    ],
    
    // Prefer nullish coalescing over logical or
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    
    // Prefer optional chaining over manual null checks
    '@typescript-eslint/prefer-optional-chain': 'error',
    
    // === React-specific rules ===
    
    // React 17+ doesn't require React in scope for JSX
    'react/react-in-jsx-scope': 'off',
    
    // Enforce consistent prop types definition
    'react/prop-types': 'off', // Using TypeScript instead
    
    // Prevent missing displayName in React components
    'react/display-name': 'warn',
    
    // Enforce consistent JSX formatting
    'react/jsx-uses-react': 'off', // Not needed in React 17+
    'react/jsx-uses-vars': 'error',
    
    // Prevent usage of deprecated methods
    'react/no-deprecated': 'error',
    
    // Prevent direct mutation of state
    'react/no-direct-mutation-state': 'error',
    
    // Prevent usage of findDOMNode (deprecated)
    'react/no-find-dom-node': 'error',
    
    // Enforce consistent key prop usage
    'react/jsx-key': ['error', { checkFragmentShorthand: true }],
    
    // === React Hooks rules ===
    
    // Enforce rules of hooks (already included via extends)
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    
    // === Import/Export rules ===
    
    // Prevent importing non-existent exports
    'import/no-unresolved': 'error',
    
    // Prevent importing the same module multiple times
    'import/no-duplicates': 'error',
    
    // Ensure consistent import order
    'import/order': [
      'error',
      {
        groups: [
          'builtin',        // Node.js built-in modules
          'external',       // External packages
          'internal',       // Internal modules
          'parent',         // Parent directories
          'sibling',        // Same directory
          'index',          // Index files
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    
    // Prevent default export (prefer named exports for better refactoring)
    'import/prefer-default-export': 'off',
    'import/no-default-export': 'off', // Allow default exports for React components
    
    // === General JavaScript/ES6 rules ===
    
    // Enforce consistent semicolon usage
    'semi': ['error', 'always'],
    
    // Enforce consistent quote usage
    'quotes': ['error', 'single', { avoidEscape: true }],
    
    // Enforce consistent comma usage
    'comma-dangle': ['error', 'always-multiline'],
    
    // Prevent console.log statements in production
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    
    // Prevent debugger statements in production
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    
    // Enforce consistent object property spacing
    'object-curly-spacing': ['error', 'always'],
    
    // Enforce consistent array bracket spacing
    'array-bracket-spacing': ['error', 'never'],
    
    // Prevent trailing spaces
    'no-trailing-spaces': 'error',
    
    // Enforce consistent indentation (handled by Prettier)
    'indent': 'off',
    
    // === Accessibility rules ===
    
    // Ensure interactive elements have accessible labels
    'jsx-a11y/accessible-emoji': 'off', // Deprecated rule
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/anchor-has-content': 'error',
    'jsx-a11y/click-events-have-key-events': 'error',
    'jsx-a11y/no-static-element-interactions': 'warn',
    
    // === Performance rules ===
    
    // Prevent creating functions in render methods
    'react/jsx-no-bind': 'warn',
    
    // Prevent creating objects in render methods
    'react/jsx-no-constructed-context-values': 'error',
    
    // === Prettier integration ===
    
    // Let Prettier handle formatting issues
    'prettier/prettier': 'error',
  },
  
  // Settings for plugins
  settings: {
    react: {
      version: 'detect', // Automatically detect React version
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true, // Always try to resolve types
        project: './tsconfig.json',
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  
  // Override rules for specific file patterns
  overrides: [
    {
      // Configuration files
      files: ['*.config.js', '*.config.ts', 'vite.config.ts'],
      rules: {
        'import/no-default-export': 'off', // Allow default exports in config files
      },
    },
    {
      // Test files
      files: ['**/*.test.{js,jsx,ts,tsx}', '**/*.spec.{js,jsx,ts,tsx}'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off', // Allow any in tests
        'react/display-name': 'off', // Not needed in test components
      },
    },
    {
      // Story files (Storybook)
      files: ['**/*.stories.{js,jsx,ts,tsx}'],
      rules: {
        'import/no-default-export': 'off', // Stories require default exports
        'react/jsx-no-bind': 'off', // Binding is OK in stories
      },
    },
  ],
  
  // Ignore patterns
  ignorePatterns: [
    'dist/',
    'build/',
    'node_modules/',
    '*.min.js',
    'coverage/',
    '.eslintrc.js', // Don't lint this config file itself
  ],
};