/**
 * THE FRAMING, held to what P3.3's verdict needs of it: a message survives the round trip byte for
 * byte, a real-sized message actually gets smaller, and anything that is not a frame is refused
 * rather than decoded into garbage.
 */
import { describe, expect, it } from 'vitest';

import { CLIENT_FRAME_LIMIT, SERVER_FRAME_LIMIT, pack, unpack } from './frame.js';
import { encode } from './messages.js';
import { web } from './web.js';

describe('the wire framing', () => {
  it('round-trips a message byte for byte, including text beyond ASCII', async () => {
    const text = encode({ kind: 'error', code: 'engine', detail: 'Antibody मिलान — ✓ café' });
    expect(await unpack(await pack(text), CLIENT_FRAME_LIMIT)).toBe(text);
  });

  it('makes a real-sized, repetitive message much smaller, which is the reason it exists', async () => {
    // A burst is ten near-identical projections; this is the same shape, at P3.3's p50 view size.
    const view = Object.fromEntries(
      Array.from({ length: 200 }, (_, i) => [`k${String(i)}`, { hp: 3, max: 3, lane: 'nose' }]),
    );
    const frames = Array.from({ length: 10 }, (_, i) => ({
      label: `frame ${String(i)}`,
      dice: null,
      view,
    }));
    const text = encode({ kind: 'burst', frames });
    const packed = await pack(text);
    expect(packed.length).toBeLessThan(text.length / 10);
    expect(await unpack(packed, SERVER_FRAME_LIMIT)).toBe(text);
  });

  it('refuses bytes that are not a gzip frame, rather than returning something', async () => {
    const notGzip = new (web().TextEncoder)().encode('{"v":2,"kind":"leave"}');
    await expect(unpack(notGzip, CLIENT_FRAME_LIMIT)).rejects.toThrow();
  });

  it('refuses a truncated frame', async () => {
    const whole = await pack(encode({ kind: 'leave' }));
    await expect(
      unpack(whole.slice(0, Math.floor(whole.length / 2)), CLIENT_FRAME_LIMIT),
    ).rejects.toThrow();
  });

  // A FRAME THAT INFLATES PAST ITS LIMIT IS REFUSED, and a frame AT the limit is not: a limit that
  // refused everything would pass the first test alone.
  it('refuses a frame that would unpack past its limit, however small it is on the wire', async () => {
    const bomb = await pack('0'.repeat(4 * 1024 * 1024));
    expect(bomb.length).toBeLessThan(CLIENT_FRAME_LIMIT / 4);
    await expect(unpack(bomb, CLIENT_FRAME_LIMIT)).rejects.toThrow(/exceeds/);
  });

  it('accepts a frame that unpacks to exactly its limit', async () => {
    const text = 'x'.repeat(CLIENT_FRAME_LIMIT);
    expect(await unpack(await pack(text), CLIENT_FRAME_LIMIT)).toBe(text);
  });
});
