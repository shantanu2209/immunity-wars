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
 * WHAT IS STILL NOT STORED: the kit page and the measuring page, which are a developer's, and the
 * smaller sizes of the board's pictures, which only the kit page shows.
 *
 * THE KIT PAGE'S OWN SCRIPT IS NAMED `kitPage`, NOT `kit`, AND THAT IS LOAD-BEARING. The build names
 * a page's script after its key in `input`, and names a script two pages share after what is in it.
 * Once the play screen was drawn from the kit, the kit's components became a shared script named
 * `kit-…js`, and the exclusion written at L3 for the kit page, `assets/kit-*`, matched it: the app
 * needed a script the phone did not store, and with no network it came back as a blank page. Every
 * test passed, because the build test asserted that nothing named `kit` was stored. The Gate 1
 * audit's offline pass found it, on the first run against the Clay play screen.
 *
 * `entries-build.test.ts` holds it three ways: every script the app's page needs is in the worker's
 * list; every picture the board draws is; and nothing that only the kit page uses is.
 */
const CLAY_ON_THE_BOARD = [
  'art/clay/board/*@3x.webp',
  'art/clay/table/*',
  'art/clay/card/*',
  // The title's picture (stage L5), at every size: a phone picks the one its screen wants.
  'art/clay/scene/*',
];
const CLAY_NOT_YET = [
  '**/art/clay/**',
  'kit.html',
  'assets/kitPage-*',
  'measure.html',
  'assets/measurePage-*',
];

/** The pages that are a developer's: served, never stored, and never answered by the worker. */
const DEVELOPER_PAGES = [/^\/kit\.html/, /^\/measure\.html/];

/**
 * THE BUILD FOR THE ANDROID SHELL (`vite build --mode android`, ruled 2 October 2026;
 * docs/LOOK_PLAN.md §26). The same app, with two things taken out:
 *
 *   - NO SERVICE WORKER. The worker exists so that a browser can play with no network. Inside the
 *     shell every file is in the app itself, so there is nothing for it to store, and its other
 *     job, taking a newer build from the server, is the store's there. `main.tsx` does not
 *     register one in this mode, and this build writes none.
 *   - NO DEVELOPER PAGES but the measuring page, which is how the frame rate is read inside the
 *     shell. It is taken out too when a build is made for the store.
 *
 * Everything else is the web build's. `src/shell-build.test.ts` builds it and holds it to this.
 */
const SHELL_MODE = 'android';

export default defineConfig(({ mode }) => ({
  plugins: mode === SHELL_MODE ? [] : [webWorker()],
  build: {
    rollupOptions: {
      input:
        mode === SHELL_MODE
          ? {
              main: resolve(HERE, 'index.html'),
              measurePage: resolve(HERE, 'measure.html'),
            }
          : {
              main: resolve(HERE, 'index.html'),
              dev: resolve(HERE, 'dev.html'),
              // The Clay kit page (stage L3). Built with the other two so it cannot rot quietly.
              // Its key names its script, and the worker's exclusion above depends on that name.
              kitPage: resolve(HERE, 'kit.html'),
              // The measuring page (stage L4): the play screen with a frame meter, for the S25.
              // Named as the kit page is, and for the same reason.
              measurePage: resolve(HERE, 'measure.html'),
            },
    },
  },
}));

function webWorker(): ReturnType<typeof VitePWA> {
  return VitePWA({
    registerType: 'autoUpdate',
    // NOT injected (FINDINGS #69). The plugin's injected script called `register` and handled
    // nothing, so a refused registration became an unhandled rejection and the error boundary
    // showed a crash screen whose only exit reloaded into the same refusal. Both shells now
    // register through `src/serviceWorker.ts`, which catches the refusal where it happens.
    injectRegister: false,
    // The art the screens use: the Clay
    // pictures the board draws. The rest of `art/clay/` is kept out by CLAY_NOT_YET, above.
    includeAssets: [...CLAY_ON_THE_BOARD, 'fonts/**/*', 'icons/*.png'],
    manifest: {
      name: 'The Immunity Wars',
      short_name: 'Immunity Wars',
      description: 'A cooperative immunology game, designed by Kartik Chaudhary',
      display: 'standalone',
      // The kit's table (COLOUR.table), since stage L5: an installed app opens on the ground
      // its screens stand on. src/ground.test.ts holds these to the kit's value.
      background_color: '#0e2a30',
      theme_color: '#0e2a30',
      // THE APP'S ICON (ruled 3 October 2026), written by `pnpm art:icon` from the Android app's:
      // as a phone shows it, and a maskable one cut wider for Chrome's own masks.
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,webp,woff2,json,txt}'],
      globIgnores: CLAY_NOT_YET,
      // The art at 1×/2×/3× plus the anatomy frame is a few MB; precache it all, on purpose.
      maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      navigateFallback: 'index.html',
      // THE DEVELOPER'S PAGES ARE NOT THE APP'S TO ANSWER. With the fallback alone, a phone that
      // had opened the app once got the app's title for `/kit.html` and `/measure.html` ever
      // after: its worker answers every page it does not store with `index.html`, and it stores
      // neither. Measured 1 October 2026, before the phone was sent to the measuring page. These
      // two go to the network, so they open while the PC is serving them and not otherwise.
      navigateFallbackDenylist: DEVELOPER_PAGES,
    },
    devOptions: { enabled: false },
  });
}
