// Prettier is the single source of truth for formatting. ESLint formatting rules should defer to these.
module.exports = {
  singleQuote: true,
  semi: true,
  tabWidth: 2,
  useTabs: false,
  printWidth: 100,
  proseWrap: 'preserve',
  // Align with ESLint comma-dangle configuration and existing code style
  trailingComma: 'all',
  bracketSpacing: true,
  bracketSameLine: false,
  jsxSingleQuote: true,
  arrowParens: 'always',
  endOfLine: 'auto',
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
