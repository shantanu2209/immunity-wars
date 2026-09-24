/**
 * THE NODE ADAPTER: the hub on a WebSocket server, for the development machine (P3.4) and for the
 * brief's fallback, "a small always-free VM" (§6), should Cloudflare's terms ever change.
 *
 * Deliberately a few lines. Everything that is not "bytes in, bytes out, a socket closed" is the
 * hub's or the room's, so this file is what P3.5 rewrites for a Durable Object, and nothing else.
 *
 * `ws` is the one dependency, and the first in a process that LISTENS. `docs/SECURITY_NOTES.md`
 * records it: pinned exactly, no dependencies of its own, and the listening-process property
 * restated to cover it.
 */
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';

import { CLIENT_FRAME_LIMIT } from '@immunity-wars/protocol';
import { WebSocketServer, type RawData } from 'ws';

import { CLOSE, Hub, mintCode, type Link } from './hub.js';

export interface RelayOptions {
  readonly port: number;
  /**
   * Where to listen. Defaults to this machine only: exposing a relay to a network is a choice
   * made by saying so (`HOST=0.0.0.0`), not something a development run does by accident.
   */
  readonly host?: string;
  /** How often rooms past their grace period are discarded. */
  readonly sweepEveryMs?: number;
  readonly now?: () => number;
}

export interface Relay {
  readonly port: number;
  readonly hub: Hub;
  close(): Promise<void>;
}

const bytesOf = (data: RawData): Uint8Array =>
  Array.isArray(data)
    ? new Uint8Array(Buffer.concat(data))
    : data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

/** A failure inside the hub is logged by kind and message only: never a frame, a name or a ref. */
const report = (e: unknown): void => {
  console.error('relay:', e instanceof Error ? e.message : 'unknown failure');
};

export async function listen(options: RelayOptions): Promise<Relay> {
  const hub = new Hub({
    now: options.now ?? ((): number => Date.now()),
    mintCode: () => mintCode((n) => crypto.getRandomValues(new Uint8Array(n))),
  });
  const server = new WebSocketServer({
    port: options.port,
    host: options.host ?? '127.0.0.1',
    // A client's frame is small (protocol `CLIENT_FRAME_LIMIT`), and the application compresses,
    // so the transport neither needs to accept more nor to compress again.
    maxPayload: CLIENT_FRAME_LIMIT,
    perMessageDeflate: false,
  });

  server.on('connection', (socket) => {
    const link: Link = {
      send: (bytes) => {
        socket.send(bytes);
      },
      close: (code, reason) => {
        socket.close(code, reason);
      },
    };
    hub.open(link);
    socket.on('message', (data, isBinary) => {
      // Every frame is binary (the framing is gzip); text is not a message of any version.
      if (!isBinary) {
        link.close(CLOSE.malformed, 'malformed');
        return;
      }
      hub.message(link, bytesOf(data)).catch(report);
    });
    socket.on('close', () => {
      hub.closed(link).catch(report);
    });
    // An error is always followed by a close, which is where the member is marked away.
    socket.on('error', () => undefined);
  });

  await once(server, 'listening');
  const timer = setInterval(() => {
    hub.sweep().catch(report);
  }, options.sweepEveryMs ?? 60_000);
  timer.unref();

  return {
    port: (server.address() as AddressInfo).port,
    hub,
    close: () =>
      new Promise<void>((resolve) => {
        clearInterval(timer);
        for (const socket of server.clients) socket.terminate();
        server.close(() => {
          resolve();
        });
      }),
  };
}
