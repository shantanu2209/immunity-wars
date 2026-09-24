/**
 * THE FEW WEB-STANDARD GLOBALS THE WIRE FRAMING USES, typed narrowly instead of pulling in DOM.
 *
 * `packages/protocol` is shared by the client and the relay and deliberately has neither DOM nor
 * Node types (`tsconfig.json`), so nothing in it can reach for `window` or `process`. The framing
 * needs text encoding and gzip, which every runtime this project targets provides as the same
 * standard globals — Node 18 and later, Android's WebView, Chrome, and Cloudflare Workers — so
 * they are read from `globalThis` here, typed with only the members `frame.ts` calls.
 *
 * A MODULE, NOT AN AMBIENT `.d.ts`, and that was measured rather than chosen: the first version
 * declared these globally in `web.d.ts`, which this package's own typecheck saw and every package
 * importing the protocol did not, because an ambient file is part of a program only when that
 * program's `tsconfig` includes it. `packages/room`'s typecheck failed on it. A module travels
 * with its imports.
 *
 * Read at CALL time, not at import time, so a runtime lacking one fails where the framing is used
 * — which the framing's own test would show — rather than breaking every import of the protocol.
 */
export interface StreamReader {
  read(): Promise<{ done: boolean; value?: Uint8Array }>;
  cancel(reason?: unknown): Promise<void>;
}
export interface StreamWriter {
  write(chunk: Uint8Array): Promise<void>;
  close(): Promise<void>;
}
export interface Transform {
  readonly writable: { getWriter(): StreamWriter };
  readonly readable: { getReader(): StreamReader };
}

interface WebGlobals {
  readonly CompressionStream: new (format: 'gzip') => Transform;
  readonly DecompressionStream: new (format: 'gzip') => Transform;
  readonly TextEncoder: new () => { encode(text: string): Uint8Array };
  readonly TextDecoder: new (
    label?: string,
    options?: { fatal?: boolean },
  ) => { decode(bytes: Uint8Array): string };
}

export const web = (): WebGlobals => globalThis as unknown as WebGlobals;
