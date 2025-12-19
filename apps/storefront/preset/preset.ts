import uiPlugin from './plugins/plugin'
import uiTheme from './theme/theme'

export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: { ...uiTheme },
  plugins: [uiPlugin],
}
