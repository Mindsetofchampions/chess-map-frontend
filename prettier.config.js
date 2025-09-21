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

// ESM wrapper for Prettier config to avoid CommonJS `module` usage in ESM projects
export default {
  singleQuote: true,
  semi: true,
  tabWidth: 2,
  useTabs: false,
  printWidth: 100,
  proseWrap: 'preserve',
  trailingComma: 'all',
  bracketSpacing: true,
  bracketSameLine: false,
  jsxSingleQuote: true,
  arrowParens: 'always',
  endOfLine: 'lf',
  embeddedLanguageFormatting: 'auto',
  htmlWhitespaceSensitivity: 'css',
  overrides: [
    { files: '*.md', options: { proseWrap: 'preserve', printWidth: 80, tabWidth: 2 } },
    { files: '*.json', options: { printWidth: 120, tabWidth: 2, trailingComma: 'none' } },
    { files: 'package.json', options: { printWidth: 120, tabWidth: 2 } },
    { files: ['*.yml', '*.yaml'], options: { tabWidth: 2, singleQuote: false } },
    { files: ['*.css', '*.scss', '*.less'], options: { singleQuote: false, printWidth: 120 } },
    { files: '*.d.ts', options: { printWidth: 120, semi: true } },
  ],
  plugins: [],
};
