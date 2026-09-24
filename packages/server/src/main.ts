/**
 * The relay's entry point: `pnpm --filter @immunity-wars/server relay` on the development machine,
 * and the bundled `relay.mjs` in production (`src/bundle.ts`).
 *
 * `PORT` (default 8787) and `HOST` (default 127.0.0.1, this machine only). To let a phone on the
 * same Wi-Fi reach a development relay, set `HOST=0.0.0.0` deliberately; a development relay should
 * not be reachable from a network by accident. `TRUST_PROXY=1` only in production, behind the TLS
 * front on the same machine (`RelayOptions.trustProxy` says why).
 */
import { listen } from './node.js';

const port = Number(process.env['PORT'] ?? 8787);
const host = process.env['HOST'] ?? '127.0.0.1';
const trustProxy = process.env['TRUST_PROXY'] === '1';
const relay = await listen({ port, host, trustProxy });
console.log(`relay listening on ws://${host}:${String(relay.port)}`);

// A service manager stops the relay with SIGTERM. Rooms live in memory, so stopping is the end of
// every game in progress: the deploy script does it only when no one is connected.
process.on('SIGTERM', () => {
  void relay.close().then(() => process.exit(0));
});
