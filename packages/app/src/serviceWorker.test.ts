/**
 * The service worker registration, BOTH WAYS (CLAUDE.md's rule), for FINDINGS #69.
 *
 * FIRES: a refused registration comes back `degraded` and the promise RESOLVES. A rejection here is
 * exactly the defect: nothing above this function catches it, so it becomes an unhandled rejection
 * and the error boundary shows the crash screen.
 *
 * PASSES: a worker that registers comes back `registered`, with the script and scope the build
 * emits. Without this half, a function that returned `degraded` for everything would satisfy the
 * fires half perfectly and quietly switch offline off for every player.
 *
 * The browser-level half, that a refusal in a real page does not reach the crash screen, is the
 * Gate 1 audit's, which enters that state on purpose (tools/perf/gate1-audit.ts).
 */
import { describe, expect, it } from 'vitest';

import { registerServiceWorker, type ServiceWorkerContainerLike } from './serviceWorker.js';

const refuses: ServiceWorkerContainerLike = {
  register: () => Promise.reject(new TypeError('Failed to register a ServiceWorker')),
};

describe('registerServiceWorker', () => {
  it('CONTROL: the call it wraps really rejects, so the fires tests below are not vacuous', async () => {
    await expect(refuses.register('/sw.js', { scope: '/' })).rejects.toThrow(TypeError);
  });

  it('FIRES: a refused registration is degraded, and resolves rather than rejects', async () => {
    await expect(registerServiceWorker(refuses)).resolves.toBe('degraded');
  });

  it('FIRES: a container that throws synchronously is degraded too, not a thrown error', async () => {
    const throwsNow: ServiceWorkerContainerLike = {
      register: () => {
        throw new Error('SecurityError');
      },
    };
    await expect(registerServiceWorker(throwsNow)).resolves.toBe('degraded');
  });

  it('PASSES: a worker that registers is registered, with the script and scope the build emits', async () => {
    const calls: [string, { scope: string }][] = [];
    const accepts: ServiceWorkerContainerLike = {
      register: (url, options) => {
        calls.push([url, options]);
        return Promise.resolve({});
      },
    };
    await expect(registerServiceWorker(accepts)).resolves.toBe('registered');
    expect(calls).toEqual([['/sw.js', { scope: '/' }]]);
  });

  it('no worker API at all is unsupported, which is not the same as degraded', async () => {
    await expect(registerServiceWorker(undefined)).resolves.toBe('unsupported');
  });
});
