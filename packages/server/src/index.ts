/**
 * @immunity-wars/server — the relay (Phase 3).
 *
 * `hub.ts` is the relay without a platform: rooms, connections, framing, routing. `node.ts` puts it
 * on a WebSocket server. P3.5's Cloudflare adapter is a second `node.ts`, not a second hub.
 */

export const PACKAGE_NAME = '@immunity-wars/server';

export {
  CLOSE,
  CODE_ALPHABET,
  Hub,
  mintCode,
  normalise,
  type Codec,
  type HubOptions,
  type Link,
} from './hub.js';
export { listen, type Relay, type RelayOptions } from './node.js';
