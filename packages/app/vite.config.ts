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
export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['art/**/*', 'fonts/**/*'],
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
      },
    },
  },
});
