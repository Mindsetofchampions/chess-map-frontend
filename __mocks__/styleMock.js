/**
 * CSS Mock for Jest Testing
 * 
 * This mock prevents Jest from choking on CSS imports (including Tailwind)
 * by providing an empty object for all CSS file imports during testing.
 * 
 * Used in jest.config.js moduleNameMapper for non-module CSS files.
 */
module.exports = {};