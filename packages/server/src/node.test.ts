/**
 * THE NODE ADAPTER'S OWN TWO JOBS (P3.5): which address a connection is counted by, and noticing
 * a phone that has gone silent. Each is held both ways: what must be refused or ended, and what
 * must not be.
 */
import { encode, pack } from '@immunity-wars/protocol';
import { RelayRoom } from '@immunity-wars/session';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocket as WsClient } from 'ws';

import { addressOf, listen, type Relay } from './node.js';

const req = (remoteAddress: string, forwarded?: string): Parameters<typeof addressOf>[0] => ({
  socket: { remoteAddress },
  headers: forwarded === undefined ? {} : { 'x-forwarded-for': forwarded },
});

describe('the address a connection is counted by', () => {
  it('is the peer, whatever the header says, unless the relay was told to trust its front', () => {
    expect(addressOf(req('127.0.0.1', '203.0.113.9'), false)).toBe('127.0.0.1');
  });

  it("is the front's last entry when the connection comes from the front on this machine", () => {
    // A client may write its own entries first; only the last one is the front's.
    expect(addressOf(req('127.0.0.1', '198.51.100.1, 203.0.113.9'), true)).toBe('203.0.113.9');
    expect(addressOf(req('::1', '203.0.113.9'), true)).toBe('203.0.113.9');
  });

  it('ignores the header from anyone who is not this machine, even when trusting the front', () => {
    expect(addressOf(req('203.0.113.50', '198.51.100.1'), true)).toBe('203.0.113.50');
  });

  it('falls back to the peer when the front sent no header', () => {
    expect(addressOf(req('127.0.0.1'), true)).toBe('127.0.0.1');
  });
});

async function until(what: string, ok: () => boolean, ms = 3000): Promise<void> {
  const end = Date.now() + ms;
  while (!ok()) {
    if (Date.now() > end) throw new Error(`timed out waiting for: ${what}`);
    await new Promise((r) => setTimeout(r, 5));
  }
}

describe('a phone that goes silent', () => {
  let relay: Relay;
  let url: string;
  const HEARTBEAT = 50;

  beforeAll(async () => {
    relay = await listen({ port: 0, heartbeatMs: HEARTBEAT });
    url = `ws://127.0.0.1:${String(relay.port)}`;
  });

  afterAll(async () => {
    await relay.close();
  });

  it('is marked away within a few heartbeats, while a phone that answers stays present', async () => {
    const host = await RelayRoom.create({ url, name: 'Host' });
    // A client that never answers a ping: what a phone that has lost its signal looks like.
    const silent = new WsClient(url, { autoPong: false });
    await new Promise((r) => silent.once('open', r));
    silent.send(await pack(encode({ kind: 'join', code: host.code, ref: 'p_silent', name: 'S' })));
    await until('the silent member is in', () => host.room?.members[1]?.connected === true);

    await until(
      'the silent member is shown away',
      () => host.room?.members[1]?.connected === false,
      HEARTBEAT * 20,
    );
    // Ten heartbeats later, the host, who answers, is still present.
    await new Promise((r) => setTimeout(r, HEARTBEAT * 10));
    expect(host.room?.members[0]?.connected).toBe(true);
    host.close();
  });
});
