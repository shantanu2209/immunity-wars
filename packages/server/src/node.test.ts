/**
 * THE NODE ADAPTER'S OWN TWO JOBS (P3.5): which address a connection is counted by, and noticing
 * a phone that has gone silent. Each is held both ways: what must be refused or ended, and what
 * must not be.
 */
import { encode, pack } from '@immunity-wars/protocol';
import { RelayRoom } from '@immunity-wars/session';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
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

/**
 * THE TEST BEATS THE RELAY'S HEART ITSELF, AND WAITS FOR EACH ANSWER (2 October 2026, FINDINGS #120).
 *
 * It ran the relay on a real heartbeat of 50 ms and waited on the clock. Measured: a process held
 * up for longer than one heartbeat, just after a ping has gone out, makes the relay end a phone
 * that DID answer, because the next heartbeat comes round before the answer waiting on the
 * connection has been read: 20 phones of 20, with the close code a failed CI run reported (1006);
 * none of 20 with no stall. The test and the relay share one process, so any machine busy enough
 * failed it, three times in two days with three different messages. It was a test of how busy the
 * machine was.
 *
 * So the relay's interval is on a clock this test moves, and each beat is given only once the
 * relay has READ the answer to the one before, which is seen as the relay's own socket reports it.
 * No stall can come between them. The sockets, and everything else on a timer, are real.
 *
 * A 20-second heartbeat, the relay's own, is out of any real stall's reach; the same thing on a
 * real relay would need the process stopped for 20 seconds, and would end every connection it has.
 */
describe('a phone that goes silent', () => {
  let relay: Relay;
  let url: string;
  const HEARTBEAT = 20_000;

  beforeAll(async () => {
    // Before `listen`, so that the relay's own intervals are the ones on the moved clock.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    relay = await listen({ port: 0, heartbeatMs: HEARTBEAT });
    url = `ws://127.0.0.1:${String(relay.port)}`;
  });

  afterAll(async () => {
    await relay.close();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('is marked away within a few heartbeats, while a phone that answers stays present', async () => {
    // Every pong the relay reads. The host's is the only one there can be: the host answers
    // through the platform's own WebSocket, which reports no pong, and the silent client never
    // sends one. So each is the relay's socket reading the host's answer.
    const emitted = vi.spyOn(WsClient.prototype, 'emit');
    const answers = (): number => emitted.mock.calls.filter((call) => call[0] === 'pong').length;
    const beat = (): void => {
      vi.advanceTimersByTime(HEARTBEAT);
    };

    const host = await RelayRoom.create({ url, name: 'Host' });
    let hostEnded: number | null = null;
    host.subscribe((e) => {
      if (e.kind === 'closed') hostEnded = e.code;
    });
    // A client that never answers a ping: what a phone that has lost its signal looks like.
    const silent = new WsClient(url, { autoPong: false });
    await new Promise((r) => silent.once('open', r));
    silent.send(await pack(encode({ kind: 'join', code: host.code, ref: 'p_silent', name: 'S' })));
    await until('the silent member is in', () => host.room?.members[1]?.connected === true);

    // The first beat pings both. The host answers; the silent one does not.
    beat();
    await until('the relay has read the host’s first answer', () => answers() >= 1);
    // The second beat ends whoever did not answer the first.
    beat();
    await until(
      'the silent member is shown away',
      () => hostEnded !== null || host.room?.members[1]?.connected === false,
    );
    expect(hostEnded, 'THE RELAY ENDED A PHONE THAT ANSWERS').toBeNull();

    // Three more heartbeats, each answered: the host is still there.
    for (let n = 2; n <= 4; n += 1) {
      await until(`the relay has read the host’s answer ${String(n)}`, () => answers() >= n);
      beat();
    }
    // Seen from the relay's side, by asking it for something: the host's own picture of the room
    // would go on saying "present" after the host had been ended, having stopped hearing.
    host.claimSeat('bcell');
    await until(
      'the host, still connected, is given the seat it asks for',
      () => hostEnded !== null || host.room?.members[0]?.seats.includes('bcell') === true,
    );
    expect(hostEnded, 'THE RELAY ENDED A PHONE THAT ANSWERS').toBeNull();
    expect(host.room?.members[0]?.connected).toBe(true);
    host.close();
  });
});
