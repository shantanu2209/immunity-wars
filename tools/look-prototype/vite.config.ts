/**
 * The prototype is one page. `base: './'` so the build works from any address the preview
 * server is reached at, which on the phone is the PC's address on the home network.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

const HERE = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: HERE,
  base: './',
  // The board's positions are read from packages/content's geometry.json, the one source, and
  // the typeface from the app's own copy; both live outside this folder.
  server: { fs: { allow: [resolve(HERE, '..', '..')] } },
  build: {
    outDir: 'dist',
    // weigh.ts follows this to find what each way pulls in.
    manifest: true,
    // One chunk per way of drawing, so the weight of each can be read off the build.
    chunkSizeWarningLimit: 2000,
  },
});
