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
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  lookForNewer,
  newerIsWaiting,
  registerServiceWorker,
  takeWaitingVersion,
  updateNow,
  whenNewerWaits,
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
/**
 * A browser in miniature: one registration, with a worker waiting or still downloading. Told
 * SKIP_WAITING, a waiting worker takes over (unless `takesOver` is false), which the browser announces
 * as `controllerchange`. `deploy()` starts a newer version downloading while the page is open, and
 * `firstVisit` is a page nothing answers yet. Everything that happens goes into `log`, in order.
 */
function browser(opts: {
  waiting?: boolean;
  installing?: boolean;
  takesOver?: boolean;
  firstVisit?: boolean;
  update?: () => Promise<unknown>;
}) {
  const log: string[] = [];
  const switches: (() => void)[] = [];
  const found: (() => void)[] = [];
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
    addEventListener: (_type: 'updatefound', l: () => void) => found.push(l),
    removeEventListener: (_type: 'updatefound', l: () => void) => {
      found.splice(found.indexOf(l), 1);
    },
  };
  const downloading = worker('installing');
  if (opts.waiting) registration.waiting = worker('installed');
  if (opts.installing) registration.installing = downloading;
  const container: UpdateContainerLike = {
    controller: opts.firstVisit ? null : {},
    getRegistration: () => Promise.resolve(registration),
    addEventListener: (_type: 'controllerchange', l: () => void) =>
      switches.push(() => {
        log.push('switched');
        l();
      }),
  };
  /** A deploy: a newer version starts downloading, and the page hears `updatefound`. */
  const deploy = () => {
    const w = worker('installing');
    registration.installing = w;
    for (const l of [...found]) l();
    return w;
  };
  return { container, log, downloading, deploy, reload: () => log.push('reload') };
}

describe('updateNow', () => {
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
      controller: null,
      getRegistration: () => Promise.resolve(undefined),
      addEventListener: () => undefined,
    };
    const throws: UpdateContainerLike = {
      controller: null,
      getRegistration: () => Promise.reject(new Error('SecurityError')),
      addEventListener: () => undefined,
    };
    await expect(updateNow(undefined, () => log.push('a'))).resolves.toBe('no worker');
    await expect(updateNow(none, () => log.push('b'))).resolves.toBe('no worker');
    await expect(updateNow(throws, () => log.push('c'))).resolves.toBe('no worker');
    expect(log).toEqual(['a', 'b', 'c']);
  });
});

/**
 * THE TITLE TAKES A NEWER VERSION (FINDINGS #93, ruled 30 September 2026), BOTH WAYS.
 *
 * FIRES: a newer version waiting is told to take over, and the page reloads after it has.
 *
 * PASSES, and this half is the one that matters most: with nothing newer, or no switch in time, it
 * does NOT reload. Nobody asked for this reload, and one that brought the same version back would
 * find the same waiting worker and reload again, for ever.
 */
describe('takeWaitingVersion, on the title', () => {
  const TOLD = 'told {"type":"SKIP_WAITING"}';

  it('FIRES: a newer version waiting is told to take over, and the reload comes after it has', async () => {
    const b = browser({ waiting: true });
    await expect(takeWaitingVersion(b.container, b.reload)).resolves.toBe('switched');
    expect(b.log).toEqual([TOLD, 'switched', 'reload']);
  });

  it('PASSES: nothing newer, so nothing is told and nothing reloads', async () => {
    const b = browser({});
    await expect(takeWaitingVersion(b.container, b.reload)).resolves.toBe('nothing newer');
    expect(b.log).toEqual([]);
  });

  it('PASSES: a version still downloading is not waited for here; the watcher calls again', async () => {
    const b = browser({ installing: true });
    await expect(takeWaitingVersion(b.container, b.reload)).resolves.toBe('nothing newer');
    expect(b.log).toEqual([]);
  });

  it('PASSES: no switch in time, and it does not reload, so it cannot reload for ever', async () => {
    const b = browser({ waiting: true, takesOver: false });
    await expect(takeWaitingVersion(b.container, b.reload, 20)).resolves.toBe('timed out');
    expect(b.log).toEqual([TOLD]);
  });

  it('PASSES: no worker API, and nothing reloads', async () => {
    const log: string[] = [];
    await expect(takeWaitingVersion(undefined, () => log.push('reload'))).resolves.toBe(
      'no worker',
    );
    expect(log).toEqual([]);
  });
});

describe('whenNewerWaits', () => {
  const heard = (b: ReturnType<typeof browser>): { count: number; stop: () => void } => {
    const h = { count: 0, stop: () => undefined as void };
    h.stop = whenNewerWaits(b.container, () => {
      h.count += 1;
    });
    return h;
  };
  const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

  it('FIRES: a newer version that finishes downloading while the page is open is heard', async () => {
    const b = browser({});
    const h = heard(b);
    await tick();
    b.deploy().become('installed');
    expect(h.count).toBe(1);
  });

  it('PASSES: a first install is not a newer version, so it is not heard', async () => {
    const b = browser({ firstVisit: true });
    const h = heard(b);
    await tick();
    b.deploy().become('installed');
    expect(h.count).toBe(0);
  });

  it('PASSES: a download that fails is not heard', async () => {
    const b = browser({});
    const h = heard(b);
    await tick();
    b.deploy().become('redundant');
    expect(h.count).toBe(0);
  });

  it('PASSES: once stopped, as when the player leaves the title, nothing more is heard', async () => {
    const b = browser({});
    const h = heard(b);
    await tick();
    const w = b.deploy();
    h.stop();
    w.become('installed');
    b.deploy().become('installed');
    expect(h.count).toBe(0);
  });
});

/**
 * THE APP LOOKS FOR A NEWER VERSION ITSELF (FINDINGS #126). Nothing in the app asked, and a page
 * brought back to the screen, rather than opened fresh, is never looked at by the browser: an old
 * version was played on an iPhone days after the look went up. Control:
 * pnpm ci:selftest app-looks-when-it-comes-back.
 */
describe('lookForNewer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });
  const page = (state = 'visible') => {
    const listeners: (() => void)[] = [];
    return {
      visibilityState: state,
      addEventListener: (_t: 'visibilitychange', l: () => void) => listeners.push(l),
      removeEventListener: (_t: 'visibilitychange', l: () => void) => {
        listeners.splice(listeners.indexOf(l), 1);
      },
      /** The phone brings the app back to the front, or sends it away. */
      turn(to: string) {
        this.visibilityState = to;
        for (const l of [...listeners]) l();
      },
      listeners,
    };
  };
  const counting = () => {
    const asked = { count: 0 };
    const b = browser({
      update: () => {
        asked.count += 1;
        return Promise.resolve();
      },
    });
    return { b, asked };
  };
  const settle = async (): Promise<void> => {
    for (let i = 0; i < 5; i += 1) await Promise.resolve();
  };

  it('FIRES: it asks once when it starts', async () => {
    const { b, asked } = counting();
    lookForNewer(b.container, page());
    await settle();
    expect(asked.count).toBe(1);
  });

  it('FIRES: it asks again when the app is brought back to the screen', async () => {
    const { b, asked } = counting();
    const p = page();
    lookForNewer(b.container, p);
    await settle();
    p.turn('hidden');
    p.turn('visible');
    await settle();
    expect(asked.count, 'THE APP DOES NOT LOOK FOR A NEWER VERSION WHEN IT COMES BACK').toBe(2);
  });

  it('FIRES: it asks every half hour while it is on the screen', async () => {
    vi.useFakeTimers();
    const { b, asked } = counting();
    lookForNewer(b.container, page());
    await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
    await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
    expect(asked.count).toBe(3);
  });

  it('PASSES: it does not ask while the app is off the screen', async () => {
    vi.useFakeTimers();
    const { b, asked } = counting();
    const p = page('hidden');
    lookForNewer(b.container, p);
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(asked.count).toBe(0);
  });

  it('PASSES: one question at a time, however often the app comes back while it is out', async () => {
    let answer: () => void = () => undefined;
    const asked = { count: 0 };
    const b = browser({
      update: () => {
        asked.count += 1;
        return new Promise<void>((r) => {
          answer = r;
        });
      },
    });
    const p = page();
    lookForNewer(b.container, p);
    await settle();
    p.turn('visible');
    p.turn('visible');
    expect(asked.count).toBe(1);
    answer();
    await settle();
    p.turn('visible');
    await settle();
    expect(asked.count).toBe(2);
  });

  it('PASSES: offline, the question fails and is let go, and the next one is still asked', async () => {
    const asked = { count: 0 };
    const b = browser({
      update: () => {
        asked.count += 1;
        return Promise.reject(new TypeError('Failed to update a ServiceWorker'));
      },
    });
    const p = page();
    lookForNewer(b.container, p);
    await settle();
    p.turn('visible');
    await settle();
    expect(asked.count).toBe(2);
  });

  it('PASSES: once stopped, it asks nothing more; and with no worker API it does nothing', async () => {
    vi.useFakeTimers();
    const { b, asked } = counting();
    const p = page();
    const stop = lookForNewer(b.container, p);
    await vi.advanceTimersByTimeAsync(0);
    stop();
    p.turn('visible');
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(asked.count).toBe(1);
    expect(p.listeners.length).toBe(0);
    expect(() => lookForNewer(undefined, page())()).not.toThrow();
  });
});

/**
 * WHETHER A NEWER VERSION IS WAITING (ruled 3 October 2026): what the game's menu and About ask before
 * they say a new version is ready. Only a newer version counts: a first visit has nothing older.
 * Control: pnpm ci:selftest update-waiting-needs-an-older-one.
 */
describe('newerIsWaiting', () => {
  it('a version that has downloaded and waits, on a page an older one answers, is waiting', async () => {
    await expect(newerIsWaiting(browser({ waiting: true }).container)).resolves.toBe(true);
  });

  it('nothing waiting is nothing to offer, and one still downloading is not ready yet', async () => {
    await expect(newerIsWaiting(browser({}).container)).resolves.toBe(false);
    await expect(newerIsWaiting(browser({ installing: true }).container)).resolves.toBe(false);
  });

  it('a first visit is not a newer version, waiting or not', async () => {
    await expect(
      newerIsWaiting(browser({ waiting: true, firstVisit: true }).container),
      'A FIRST VISIT WAS CALLED A NEWER VERSION',
    ).resolves.toBe(false);
  });

  it('no worker, or a phone that cannot say, has nothing to offer, and never throws', async () => {
    await expect(newerIsWaiting(undefined)).resolves.toBe(false);
    const fails: UpdateContainerLike = {
      controller: {},
      getRegistration: () => Promise.reject(new Error('InvalidStateError')),
      addEventListener: () => undefined,
    };
    await expect(newerIsWaiting(fails)).resolves.toBe(false);
  });
});
