const uiPlugin = require('./plugins/plugin.cjs')
const uiTheme = require('./theme/theme.cjs')

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: { ...uiTheme },
  plugins: [uiPlugin],
}
