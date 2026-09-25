/**
 * THE RELAY AS ONE FILE (P3.5, ruled 24 September 2026): what the production server runs.
 *
 * `pnpm --filter @immunity-wars/server bundle` writes `dist/relay.mjs`: the relay, the room, the
 * engine, the protocol, `zod` and `ws`, in one file that needs nothing but Node. Nothing is built or
 * installed on the server, and the smallest set of code sits on the machine the internet reaches.
 *
 * THE ONE REAL RISK is that the bundle is not the code the tests ran. So `bundle.test.ts` builds
 * with this very function, starts the file it wrote in a separate Node process, and plays against
 * it over real sockets; `tools/ci/selftest.ts` breaks the recipe and requires that test to go red.
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const HERE = fileURLToPath(new URL('.', import.meta.url));

export async function bundle(outfile: string): Promise<void> {
  await build({
    entryPoints: [resolve(HERE, 'main.ts')],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    // `ws` tries two optional native speed-ups and falls back to plain JavaScript when they are
    // absent. They are left out on purpose: nothing native, nothing to compile on the server.
    external: ['bufferutil', 'utf-8-validate'],
    // `ws` is CommonJS and asks for Node's own modules with `require`, which an ES module does not
    // have until it is given one.
    banner: {
      js: "import { createRequire as __relayRequire } from 'node:module'; const require = __relayRequire(import.meta.url);",
    },
    legalComments: 'none',
    sourcemap: true,
    logLevel: 'warning',
  });
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = resolve(HERE, '..', 'dist', 'relay.mjs');
  await bundle(out);
  console.log(`bundled ${out}`);
}
