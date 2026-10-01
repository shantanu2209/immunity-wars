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
 * THE CLAY ART, AND WHAT OF IT A PLAYER'S PHONE STORES (docs/LOOK_PLAN.md §13 and §14). The
 * offline rule above stores everything the game needs at the first visit, and only that.
 *
 * FROM STAGE L4 THE PLAY SCREEN IS DRAWN IN CLAY, so its pictures are part of "everything the
 * game needs" (`CLAY_ON_THE_BOARD`): the board itself; each piece, organ and way in at the one size
 * the board and the panels draw them; and each piece as a card shows it, at every size, because a
 * card picks the size the phone's screen wants. Leaving them out would break play with no network.
 *
 * WHAT IS STILL NOT STORED: the kit page, and the smaller sizes of the board's pictures, which only
 * the kit page shows.
 *
 * `entries-build.test.ts` holds it both ways: every picture the board draws is in the worker's
 * list, and nothing else of the kit is.
 */
const CLAY_ON_THE_BOARD = ['art/clay/board/*@3x.webp', 'art/clay/table/*', 'art/clay/card/*'];
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
      // The art the screens use: the icons at the top of `art/`, the anatomy frame, and the Clay
      // pictures the board draws. The rest of `art/clay/` is kept out by CLAY_NOT_YET, above.
      includeAssets: ['art/*', 'art/frame/**/*', ...CLAY_ON_THE_BOARD, 'fonts/**/*'],
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
