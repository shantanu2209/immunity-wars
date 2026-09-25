/**
 * `import.meta.env.PROD` is the one Vite build flag the shells read: the service worker registers
 * in a build and never under the dev server (`serviceWorker.ts`). Declared here rather than by
 * adding `vite/client` to this package's `types`, which its tsconfig keeps empty on purpose. The
 * shapes match Vite's own declaration, so the two merge wherever both are visible.
 *
 * `VITE_RELAY_URL` names a relay other than the deployed one, for a development relay (P3.7). Vite
 * puts a `VITE_` variable into the build only when it is set, so it is optional here.
 */
interface ImportMetaEnv {
  PROD: boolean;
  readonly VITE_RELAY_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
