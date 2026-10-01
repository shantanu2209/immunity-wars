/**
 * Two build inputs, and that is the point (docs/APP_FLOW.md ruling 6): the app at
 * index.html and the INSTRUMENTED dev shell at dev.html. Building both means a build fails
 * if either entry breaks — the dev entry cannot rot quietly. entries-build.test.ts runs
 * this build and is the check's home; its control was fired manually before it was trusted.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * OFFLINE (Gate 1, ruled 6 September 2026 — FINDINGS #59): the web build is what a school opens
 * without installing anything, so it must load and play with no network at all. A service
 * worker precaches EVERYTHING the game needs at the first visit — the app, the art, the fonts —
 * and serves it from the cache afterwards; a new build replaces the worker on the next visit
 * (`autoUpdate`). The dev server does not register it (the dev shell's instruments and HMR
 * must see the network); `vite preview` of a build does, and `pnpm gate1:audit` against the
 * preview is the check: a reload with the network cut must render and play.
 */
/**
 * THE CLAY ART IS NOT A PLAYER'S DOWNLOAD YET (stage L3, docs/LOOK_PLAN.md §13). The offline
 * rule above stores everything the game needs on the phone at the first visit. The Clay pieces
 * (147 pictures, 1.35 MB) and the kit page that shows them are needed by no screen a player has:
 * the screens are replaced at L4 and L5. Until then they are served, so the kit page works, and
 * kept out of the worker's list, so no player pays for art no screen shows.
 *
 * REMOVE THIS WHEN THE PLAY SCREEN USES THE CLAY PIECES (L4): from that day they are part of
 * "everything the game needs", and leaving them out would break play with no network.
 * `entries-build.test.ts` holds it both ways meanwhile: the kit page builds, and the worker's list
 * names nothing of the kit.
 */
const CLAY_NOT_YET = ['**/art/clay/**', 'kit.html', 'assets/kit-*'];

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      // NOT injected (FINDINGS #69). The plugin's injected script called `register` and handled
      // nothing, so a refused registration became an unhandled rejection and the error boundary
      // showed a crash screen whose only exit reloaded into the same refusal. Both shells now
      // register through `src/serviceWorker.ts`, which catches the refusal where it happens.
      injectRegister: false,
      // The art the screens use: the icons at the top of `art/` and the anatomy frame. NOT
      // `art/clay/`, see CLAY_NOT_YET below.
      includeAssets: ['art/*', 'art/frame/**/*', 'fonts/**/*'],
      manifest: {
        name: 'The Immunity Wars',
        short_name: 'Immunity Wars',
        description: 'A cooperative immunology game, designed by Kartik Chaudhary',
        display: 'standalone',
        background_color: '#FFFDF9',
        theme_color: '#B03A2E',
        icons: [],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,webp,woff2,json,txt}'],
        globIgnores: CLAY_NOT_YET,
        // The art at 1×/2×/3× plus the anatomy frame is a few MB; precache it all, on purpose.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(HERE, 'index.html'),
        dev: resolve(HERE, 'dev.html'),
        // The Clay kit page (stage L3). Built with the other two so it cannot rot quietly.
        kit: resolve(HERE, 'kit.html'),
      },
    },
  },
});
