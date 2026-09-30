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

import {
  registerServiceWorker,
  updateNow,
  type RegistrationLike,
  type ServiceWorkerContainerLike,
  type UpdateContainerLike,
  type WorkerLike,
} from './serviceWorker.js';

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

/**
 * UPDATE NOW, BOTH WAYS (FINDINGS #93). The browser-level half, that a real waiting worker takes over
 * and the reload brings the newer build, was measured in headless Chrome on two real builds
 * (30 September 2026, recorded in #93); the worker's side of the message is held by the build test.
 *
 * FIRES: a newer worker, waiting or still downloading, is told to take over, and the reload comes
 * AFTER it has, not before; a reload first would bring the old version back, which is the defect.
 *
 * PASSES: with no worker, nothing newer, the check failing offline, or no answer in time, it still
 * reloads and says why, and tells nothing to take over that is not waiting.
 */
describe('updateNow', () => {
  /**
   * A browser in miniature: one registration, with a worker waiting or still downloading. Told
   * SKIP_WAITING, a waiting worker takes over (unless `takesOver` is false), which the browser
   * announces as `controllerchange`. Everything that happens goes into `log`, in order.
   */
  function browser(opts: {
    waiting?: boolean;
    installing?: boolean;
    takesOver?: boolean;
    update?: () => Promise<unknown>;
  }) {
    const log: string[] = [];
    const switches: (() => void)[] = [];
    const worker = (initial: string) => {
      const changes: (() => void)[] = [];
      const w = {
        state: initial,
        postMessage: (m: unknown) => {
          log.push(`told ${JSON.stringify(m)}`);
          if (w.state === 'installed' && opts.takesOver !== false)
            setTimeout(() => switches.forEach((l) => l()), 0);
        },
        addEventListener: (_type: 'statechange', l: () => void) => changes.push(l),
        become: (s: string) => {
          w.state = s;
          if (s === 'installed') registration.waiting = w;
          for (const l of changes) l();
        },
      };
      return w;
    };
    const registration: {
      waiting: WorkerLike | null;
      installing: WorkerLike | null;
    } & RegistrationLike = {
      waiting: null,
      installing: null,
      update: opts.update ?? (() => Promise.resolve()),
    };
    const downloading = worker('installing');
    if (opts.waiting) registration.waiting = worker('installed');
    if (opts.installing) registration.installing = downloading;
    const container: UpdateContainerLike = {
      getRegistration: () => Promise.resolve(registration),
      addEventListener: (_type: 'controllerchange', l: () => void) =>
        switches.push(() => {
          log.push('switched');
          l();
        }),
    };
    return { container, log, downloading, reload: () => log.push('reload') };
  }

  const TOLD = 'told {"type":"SKIP_WAITING"}';

  it('FIRES: a worker already waiting is told to take over, and the reload comes after it has', async () => {
    const b = browser({ waiting: true });
    await expect(updateNow(b.container, b.reload)).resolves.toBe('switched');
    expect(b.log).toEqual([TOLD, 'switched', 'reload']);
  });

  it('FIRES: a newer worker still downloading is waited for, then told', async () => {
    const b = browser({ installing: true });
    setTimeout(() => b.downloading.become('installed'), 5);
    await expect(updateNow(b.container, b.reload)).resolves.toBe('switched');
    expect(b.log).toEqual([TOLD, 'switched', 'reload']);
  });

  it('PASSES: offline, the check fails, and a version downloaded earlier still takes over', async () => {
    const b = browser({ waiting: true, update: () => Promise.reject(new TypeError('offline')) });
    await expect(updateNow(b.container, b.reload)).resolves.toBe('switched');
    expect(b.log).toEqual([TOLD, 'switched', 'reload']);
  });

  it('PASSES: nothing newer, so nothing is told to take over, and it still reloads', async () => {
    const b = browser({});
    await expect(updateNow(b.container, b.reload)).resolves.toBe('nothing newer');
    expect(b.log).toEqual(['reload']);
  });

  it('PASSES: a download that fails is nothing newer, not a wait for ever', async () => {
    const b = browser({ installing: true });
    setTimeout(() => b.downloading.become('redundant'), 5);
    await expect(updateNow(b.container, b.reload)).resolves.toBe('nothing newer');
    expect(b.log).toEqual(['reload']);
  });

  it('PASSES: no answer in time, and it reloads anyway', async () => {
    const b = browser({ waiting: true, takesOver: false });
    await expect(updateNow(b.container, b.reload, 20)).resolves.toBe('timed out');
    expect(b.log).toEqual([TOLD, 'reload']);
  });

  it('PASSES: no worker API, no registration, or one that throws: it reloads', async () => {
    const log: string[] = [];
    const none: UpdateContainerLike = {
      getRegistration: () => Promise.resolve(undefined),
      addEventListener: () => undefined,
    };
    const throws: UpdateContainerLike = {
      getRegistration: () => Promise.reject(new Error('SecurityError')),
      addEventListener: () => undefined,
    };
    await expect(updateNow(undefined, () => log.push('a'))).resolves.toBe('no worker');
    await expect(updateNow(none, () => log.push('b'))).resolves.toBe('no worker');
    await expect(updateNow(throws, () => log.push('c'))).resolves.toBe('no worker');
    expect(log).toEqual(['a', 'b', 'c']);
  });
});
