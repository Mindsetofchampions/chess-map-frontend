/**
 * Prettier Configuration
 * 
 * This configuration ensures consistent code formatting across the entire project.
 * All settings are chosen to complement ESLint rules without conflicts.
 * 
 * Key principles:
 * - Readability over compactness
 * - Consistency across team members
 * - Minimal diff noise in version control
 * - Modern JavaScript/TypeScript conventions
 */

module.exports = {
  // === Basic Formatting ===
  
  // Use single quotes instead of double quotes for consistency with ESLint
  singleQuote: true,
  
  // Always include semicolons to prevent ASI issues
  semi: true,
  
  // Use 2 spaces for indentation (React/JS standard)
  tabWidth: 2,
  useTabs: false,
  
  // === Line Length and Wrapping ===
  
  // Set reasonable line length limit (balances readability and screen usage)
  printWidth: 100,
  
  // How to handle prose wrapping in markdown files
  proseWrap: 'preserve',
  
  // === Object and Array Formatting ===
  
  // Always use trailing commas in multiline structures (helps with git diffs)
  trailingComma: 'es5',
  
  // Add spaces inside object braces { foo: bar } instead of {foo: bar}
  bracketSpacing: true,
  
  // Put closing bracket of multiline JSX on new line
  bracketSameLine: false,
  
  // === JSX Specific Settings ===
  
  // Use single quotes in JSX attributes (consistent with JavaScript)
  jsxSingleQuote: true,
  
  // === Arrow Function Parentheses ===
  
  // Always include parentheses around arrow function parameters
  // (x) => x instead of x => x (more consistent, especially with TypeScript)
  arrowParens: 'always',
  
  // === End of Line ===
  
  // Use Unix line endings for cross-platform compatibility
  endOfLine: 'lf',
  
  // === Embedded Language Formatting ===
  
  // Format code inside template literals (styled-components, etc.)
  embeddedLanguageFormatting: 'auto',
  
  // === HTML Formatting ===
  
  // Preserve HTML whitespace sensitivity
  htmlWhitespaceSensitivity: 'css',
  
  // === File-specific Overrides ===
  
  overrides: [
    {
      // Markdown files - preserve original formatting more strictly
      files: '*.md',
      options: {
        proseWrap: 'preserve',
        printWidth: 80, // Narrower for better readability in markdown
        tabWidth: 2,
      },
    },
    {
      // JSON files - ensure consistent formatting
      files: '*.json',
      options: {
        printWidth: 120, // JSON can be a bit wider
        tabWidth: 2,
        trailingComma: 'none', // JSON doesn't support trailing commas
      },
    },
    {
      // Package.json - special formatting for better readability
      files: 'package.json',
      options: {
        printWidth: 120,
        tabWidth: 2,
      },
    },
    {
      // YAML files - preserve structure
      files: ['*.yml', '*.yaml'],
      options: {
        tabWidth: 2,
        singleQuote: false, // YAML typically uses double quotes
      },
    },
    {
      // CSS/SCSS files
      files: ['*.css', '*.scss', '*.less'],
      options: {
        singleQuote: false, // CSS typically uses double quotes
        printWidth: 120, // CSS can be wider
      },
    },
    {
      // TypeScript declaration files - more compact formatting
      files: '*.d.ts',
      options: {
        printWidth: 120,
        semi: true,
      },
    },
  ],
  
  // === Plugin-specific Settings ===
  
  // Plugins extend Prettier functionality for specific file types
  plugins: [
    // Add any additional Prettier plugins here if needed
    // For example: 'prettier-plugin-organize-imports'
  ],
  
  // === Ignore Patterns ===
  
  // Files and directories to ignore (handled via .prettierignore file)
  // Common patterns:
  // - dist/
  // - build/
  // - node_modules/
  // - coverage/
  // - *.min.js
  // - *.min.css
};