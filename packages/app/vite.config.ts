/**
 * Two build inputs, and that is the point (docs/APP_FLOW.md ruling 6): the app at
 * index.html and the INSTRUMENTED dev shell at dev.html. Building both means a build fails
 * if either entry breaks — the dev entry cannot rot quietly. entries-build.test.ts runs
 * this build and is the check's home; its control was fired manually before it was trusted.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

const HERE = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(HERE, 'index.html'),
        dev: resolve(HERE, 'dev.html'),
      },
    },
  },
});
