/**
 * `pnpm --filter @immunity-wars/server relay` — a relay on this machine, for development.
 *
 * `PORT` (default 8787) and `HOST` (default 127.0.0.1, this machine only). To let a phone on the
 * same Wi-Fi reach it, set `HOST=0.0.0.0` deliberately; a development relay should not be
 * reachable from a network by accident.
 */
import { listen } from './node.js';

const port = Number(process.env['PORT'] ?? 8787);
const host = process.env['HOST'] ?? '127.0.0.1';
const relay = await listen({ port, host });
console.log(`relay listening on ws://${host}:${String(relay.port)}`);
