/**
 * THE NODE ADAPTER: the hub on a WebSocket server, on the development machine (P3.4) and in
 * production on a Google Cloud server (P3.5, brief v1.4, 25 September 2026).
 *
 * Deliberately a few lines. Everything that is not "bytes in, bytes out, a socket closed" is the
 * hub's or the room's, so this file is what a move to another platform rewrites, and nothing else.
 *
 * `ws` is the one dependency, and the first in a process that LISTENS. `docs/SECURITY_NOTES.md`
 * records it: pinned exactly, no dependencies of its own, and the listening-process property
 * restated to cover it.
 */
import { once } from 'node:events';
import type { IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';

import { CLIENT_FRAME_LIMIT } from '@immunity-wars/protocol';
import { WebSocketServer, type RawData, type WebSocket } from 'ws';

import { CLOSE, Hub, mintCode, type Limits, type Link } from './hub.js';

export interface RelayOptions {
  readonly port: number;
  /**
   * Where to listen. Defaults to this machine only: exposing a relay to a network is a choice
   * made by saying so (`HOST=0.0.0.0`), not something a development run does by accident. In
   * production it stays on this machine, and the TLS front is what the internet reaches.
   */
  readonly host?: string;
  /** How often the hub sweeps: rooms past their grace period, connections that never joined. */
  readonly sweepEveryMs?: number;
  /**
   * How often every connection is pinged. One that has not answered the previous ping is ended and
   * its member marked away (P3.5). Without it, a phone that loses its signal sends nothing at all,
   * and the table would see its player present until the operating system gave up on the
   * connection, which can take hours: Gate A asks that a drop be visible to everyone.
   */
  readonly heartbeatMs?: number;
  /**
   * Whether to believe `X-Forwarded-For`, and then only on a connection from this machine itself.
   * In production the TLS front runs here and every connection arrives from it, so without the
   * header every player would share one address and the per-address limits would be one limit for
   * everybody. Off by default: a relay that believed the header from anyone would let anyone pick
   * the address they are counted by.
   */
  readonly trustProxy?: boolean;
  readonly limits?: Limits;
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

const LOOPBACK: ReadonlySet<string> = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/**
 * The address a connection is counted by (see `trustProxy`). Held in memory by the hub for as long
 * as the connection or a counting window lasts, and never logged.
 */
export function addressOf(
  req: Pick<IncomingMessage, 'headers'> & { socket: { remoteAddress?: string | undefined } },
  trustProxy: boolean,
): string {
  const peer = req.socket.remoteAddress ?? 'unknown';
  if (!trustProxy || !LOOPBACK.has(peer)) return peer;
  const header = req.headers['x-forwarded-for'];
  const value = Array.isArray(header) ? header[header.length - 1] : header;
  // The LAST entry is the one the front wrote. Anything before it came from the client, who could
  // have written anything.
  const last = value?.split(',').pop()?.trim();
  return last !== undefined && last !== '' ? last : peer;
}

export async function listen(options: RelayOptions): Promise<Relay> {
  const hub = new Hub({
    now: options.now ?? ((): number => Date.now()),
    mintCode: () => mintCode((n) => crypto.getRandomValues(new Uint8Array(n))),
    ...(options.limits ? { limits: options.limits } : {}),
  });
  const server = new WebSocketServer({
    port: options.port,
    host: options.host ?? '127.0.0.1',
    // A client's frame is small (protocol `CLIENT_FRAME_LIMIT`), and the application compresses,
    // so the transport neither needs to accept more nor to compress again.
    maxPayload: CLIENT_FRAME_LIMIT,
    perMessageDeflate: false,
  });
  const answered = new WeakMap<WebSocket, boolean>();

  server.on('connection', (socket: WebSocket, req: IncomingMessage) => {
    const link: Link = {
      send: (bytes) => {
        socket.send(bytes);
      },
      close: (code, reason) => {
        socket.close(code, reason);
      },
    };
    // Refused links are closed by the hub and never counted, so nothing below is attached to them.
    if (!hub.open(link, addressOf(req, options.trustProxy ?? false))) return;
    answered.set(socket, true);
    socket.on('pong', () => {
      answered.set(socket, true);
    });
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
  const sweeping = setInterval(() => {
    hub.sweep().catch(report);
  }, options.sweepEveryMs ?? 10_000);
  sweeping.unref();
  const heartbeat = setInterval(() => {
    for (const socket of server.clients) {
      if (answered.get(socket) === false) {
        socket.terminate();
        continue;
      }
      answered.set(socket, false);
      socket.ping();
    }
  }, options.heartbeatMs ?? 20_000);
  heartbeat.unref();

  return {
    port: (server.address() as AddressInfo).port,
    hub,
    close: () =>
      new Promise<void>((resolve) => {
        clearInterval(sweeping);
        clearInterval(heartbeat);
        for (const socket of server.clients) socket.terminate();
        server.close(() => {
          resolve();
        });
      }),
  };
}
