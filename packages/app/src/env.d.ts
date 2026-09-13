/**
 * `import.meta.env.PROD` is the one Vite build flag the shells read: the service worker registers
 * in a build and never under the dev server (`serviceWorker.ts`). Declared here rather than by
 * adding `vite/client` to this package's `types`, which its tsconfig keeps empty on purpose. The
 * shapes match Vite's own declaration, so the two merge wherever both are visible.
 */
interface ImportMetaEnv {
  PROD: boolean;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
