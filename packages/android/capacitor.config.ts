/**
 * THE ANDROID SHELL (ruled 2 October 2026; docs/LOOK_PLAN.md §26). Capacitor wraps the app's own
 * web build, made for the shell (`vite build --mode android` in packages/app, into `www/` here):
 * the whole game is inside the app, so it plays with no connection.
 *
 * THE ID AND THE NAME ARE RULED. The id is permanent once the app is published: it is the name
 * the store and the phone know the app by, and it cannot be changed afterwards.
 */
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kartikchaudhary.immunitywars',
  appName: 'Immunity Wars',
  webDir: 'www',
  // The kit's table (packages/ui/src/kit/tokens.ts, COLOUR.table), as the page's own ground is:
  // what shows behind the status bar and the navigation bar, and before the first paint.
  backgroundColor: '#0e2a30',
  plugins: {
    SystemBars: {
      // Light icons and text on the bars: the ground behind them is dark.
      style: 'DARK',
    },
  },
};

export default config;
