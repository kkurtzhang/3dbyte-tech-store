const baseConfig = require('./base.js');

module.exports = {
  ...baseConfig,
  extends: [
    'next/core-web-vitals',
    '@typescript-eslint/recommended',
    'prettier',
  ],
  rules: {
    ...baseConfig.rules,
    '@next/next/no-img-element': 'warn',
    '@next/next/no-html-link-for-pages': 'off',
  },
}