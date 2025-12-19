const baseConfig = require('./base.js');

module.exports = {
  ...baseConfig,
  env: {
    ...baseConfig.env,
    node: true,
  },
  rules: {
    ...baseConfig.rules,
    'no-console': 'off',
    'node/no-process-exit': 'warn',
  },
}