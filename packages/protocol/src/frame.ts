/**
 * THE WIRE FRAMING: every message, both ways, is one binary WebSocket frame holding the gzipped
 * UTF-8 of what `encode` wrote (P3.4, from P3.3's verdict, docs/for-P3.md §3).
 *
 * P3.3 found that no candidate passes uncompressed — frames whole reach 593 KiB in one burst — and
 * that whether Cloudflare's relay negotiates `permessage-deflate` is unknown. So the application
 * compresses, and nothing waits on the platform. (The relay moved to our own server on 24 September
 * 2026, where that question does not arise; the reason that stands is the second one, that nothing
 * waits on whichever platform it is.)
 *
 * **One definition, in the package both sides share.** P3.3's record said compression would be
 * "the adapter's and the session's job, not the protocol's", meaning `encode` keeps returning text.
 * It does. But two implementations of one wire format — one on the relay, one in `RelaySession` —
 * is two copies that agree only by test, so the framing is written once, here, and both call it.
 */
import { web, type Transform } from './web.js';

/**
 * THE MOST A FRAME MAY UNPACK TO, each way (P3.4). A gzip frame can inflate about a thousandfold,
 * so a limit on the bytes RECEIVED is no limit on the bytes decoded: sixty-four kilobytes on the
 * wire can be sixty-four megabytes in memory. The relay listens on the open internet, where anyone
 * can open a socket without knowing a code, so it stops reading the moment a frame passes its
 * limit rather than after.
 *
 * - **A client's message** is a join or one action, a few hundred bytes. 64 KiB is two hundred
 *   times the largest.
 * - **The relay's message** peaked at 593 KiB in P3.3, a whole burst uncompressed (docs/for-P3.md
 *   §3). 8 MiB is over ten times that, and those figures are floors measured under a bot that dies
 *   at turn 8.6, so the headroom is deliberate.
 */
export const CLIENT_FRAME_LIMIT = 64 * 1024;
export const SERVER_FRAME_LIMIT = 8 * 1024 * 1024;

async function pump(transform: Transform, input: Uint8Array, limit: number): Promise<Uint8Array> {
  const writer = transform.writable.getWriter();
  // Written and read concurrently: a stream with backpressure stalls if the input is written in
  // full before anything is read.
  //
  // BOTH SIDES ARE OBSERVED, WHATEVER HAPPENS. A frame that is not gzip fails on the read side AND
  // the write side; the first version awaited the writer only after a clean read, so a bad frame
  // left the writer's rejection unhandled. The framing's own refusal tests caught it as two
  // unhandled errors. On a Node relay an unhandled rejection ends the process by default, so one
  // malformed frame from one client would have closed every room on the server.
  const written = (async (): Promise<void> => {
    await writer.write(input);
    await writer.close();
  })().then(
    () => null,
    (e: unknown) => ({ error: e }),
  );
  const reader = transform.readable.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        length += value.length;
        if (length > limit) {
          await reader.cancel();
          throw new Error(`frame exceeds ${String(limit)} bytes`);
        }
      }
    }
  } catch (e) {
    await written;
    throw e;
  }
  const failed = await written;
  if (failed !== null) throw failed.error;
  const out = new Uint8Array(length);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/** What goes on the wire: `encode`'s text, as UTF-8, gzipped. */
export async function pack(text: string): Promise<Uint8Array> {
  const { CompressionStream, TextEncoder } = web();
  return pump(
    new CompressionStream('gzip'),
    new TextEncoder().encode(text),
    Number.POSITIVE_INFINITY,
  );
}

/**
 * What came off the wire, back to text for `decodeClient` or `decodeServer`. Anything that is not
 * a gzip of valid UTF-8 REJECTS rather than yielding garbage, so the caller treats it as
 * malformed — the same answer the decoders give to text that is not a message. So does a frame
 * that would unpack to more than `limit` bytes, which is REQUIRED so that every caller decides it:
 * `CLIENT_FRAME_LIMIT` on the relay, `SERVER_FRAME_LIMIT` on a client.
 */
export async function unpack(bytes: Uint8Array, limit: number): Promise<string> {
  const { DecompressionStream, TextDecoder } = web();
  const raw = await pump(new DecompressionStream('gzip'), bytes, limit);
  return new TextDecoder('utf-8', { fatal: true }).decode(raw);
}
