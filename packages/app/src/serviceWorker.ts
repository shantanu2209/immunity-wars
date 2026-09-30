/**
 * SERVICE WORKER REGISTRATION, caught where it happens (FINDINGS #69, ruled 13 September 2026).
 *
 * The worker is what makes the web build work offline: it precaches the whole game on the first
 * visit. Registering it can fail for ordinary reasons (the script does not arrive on a flaky first
 * load, a browser in private mode refuses it, site data is blocked) and none of them is a failure
 * of the APP. They are a DEGRADED state: online-capable and not offline-capable. The rules, the
 * screens and the saves all work without a worker; what is lost is that the next visit needs a
 * network.
 *
 * What was here before was `vite-plugin-pwa`'s injected script, which called `register` and
 * handled nothing. A refusal surfaced as an unhandled rejection, the error boundary took it as a
 * crash, and the crash screen's only exit reloaded into the same refusal.
 *
 * TWO THINGS THIS DOES NOT DO, and both are the ruling:
 *  - It does not let the failure reach the boundary. It is caught HERE, where it is known to be a
 *    registration failure, and nowhere else.
 *  - It does not make the boundary more forgiving. The boundary still takes every other unhandled
 *    rejection, because every action is an onClick and every save is a promise, and a listener
 *    taught to ignore rejections would stop seeing the crashes it exists for.
 *
 * The container is passed in rather than read from `navigator`, so the tests can drive a refusal.
 */

/** What became of the attempt. Only `registered` means the build will work offline. */
export type ServiceWorkerOutcome = 'registered' | 'degraded' | 'unsupported';

/** The one method this needs, so a test can hand in a container that refuses. */
export interface ServiceWorkerContainerLike {
  register(scriptUrl: string, options: { scope: string }): Promise<unknown>;
}

/**
 * Registers the worker, and never rejects. `unsupported` is a browser with no worker API at all,
 * which includes any page served over plain http from an address that is not localhost.
 */
export async function registerServiceWorker(
  container: ServiceWorkerContainerLike | undefined,
  scriptUrl = '/sw.js',
): Promise<ServiceWorkerOutcome> {
  if (container === undefined) return 'unsupported';
  try {
    await container.register(scriptUrl, { scope: '/' });
    return 'registered';
  } catch {
    return 'degraded';
  }
}

/** The browser's container, or undefined where the API is absent (an insecure context). */
export function browserContainer(): ServiceWorkerContainerLike | undefined {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator
    ? navigator.serviceWorker
    : undefined;
}

/**
 * Both shells call this. Registration waits for `load`, as the injected script did, so it never
 * competes with the first render. The dev server never registers: it serves no worker, and its
 * instruments must see the network.
 */
export function startServiceWorker(isProduction: boolean): void {
  if (!isProduction) return;
  window.addEventListener('load', () => {
    void registerServiceWorker(browserContainer()).then((outcome) => {
      if (outcome === 'degraded') {
        console.warn('The service worker did not register: the game works, but not offline.');
      }
    });
  });
}

/**
 * UPDATE NOW (FINDINGS #93, ruled by Shantanu on 28 September 2026), beside the refusal that says this
 * app and the game server are on different versions.
 *
 * WHY A RELOAD IS NOT ENOUGH, measured on 30 September 2026 in headless Chrome on two real builds: a
 * newer worker downloads by itself, then WAITS, and the old one keeps answering every reload, three in
 * a row, for as long as any copy of the app is open. The generated worker takes over only when told
 * to (`SKIP_WAITING`), and nothing told it: the plugin's injected script did, and was replaced by
 * `startServiceWorker` above for FINDINGS #69. Asked, then told, the newer build answered the next
 * reload; the switch took 11 ms.
 *
 * So: look for a newer version, let it finish downloading, tell it to take over, and reload once it
 * has. Every path ends in the reload, because a reload is still the best thing left when there is no
 * worker, nothing newer, or no answer in time.
 *
 * On the web only. The installed apps of Phase 4 update through their stores.
 */

/** What `updateNow` found. Every outcome ends in a reload; this says what that reload brings. */
export type UpdateOutcome = 'switched' | 'nothing newer' | 'timed out' | 'no worker';

/** The parts of a service worker an update needs, so a test can hand in one that waits. */
export interface WorkerLike {
  readonly state: string;
  postMessage(message: unknown): void;
  addEventListener(type: 'statechange', listener: () => void): void;
}

export interface RegistrationLike {
  readonly waiting: WorkerLike | null;
  readonly installing: WorkerLike | null;
  update(): Promise<unknown>;
}

export interface UpdateContainerLike {
  getRegistration(): Promise<RegistrationLike | undefined>;
  addEventListener(type: 'controllerchange', listener: () => void): void;
}

/** What the generated worker listens for (`vite-plugin-pwa`'s `generateSW`), held by the build test. */
export const SKIP_WAITING = { type: 'SKIP_WAITING' } as const;

export async function updateNow(
  container: UpdateContainerLike | undefined,
  reload: () => void,
  timeoutMs = 30_000,
): Promise<UpdateOutcome> {
  const outcome = await takeNewerWorker(container, timeoutMs);
  reload();
  return outcome;
}

async function takeNewerWorker(
  container: UpdateContainerLike | undefined,
  timeoutMs: number,
): Promise<UpdateOutcome> {
  if (container === undefined) return 'no worker';
  try {
    const registration = await container.getRegistration();
    if (registration === undefined) return 'no worker';
    // Offline, the check fails; a version downloaded earlier may still be waiting, so carry on.
    await registration.update().catch(() => undefined);
    const waiting = registration.waiting ?? (await installed(registration.installing, timeoutMs));
    if (waiting === null) return 'nothing newer';
    const switched = within<boolean>(timeoutMs, (done) => {
      container.addEventListener('controllerchange', () => done(true));
    });
    waiting.postMessage(SKIP_WAITING);
    return (await switched) === true ? 'switched' : 'timed out';
  } catch {
    return 'no worker';
  }
}

/** The worker once it has finished downloading, or null if it fails or takes too long. */
function installed(worker: WorkerLike | null, timeoutMs: number): Promise<WorkerLike | null> {
  if (worker === null) return Promise.resolve(null);
  return within<WorkerLike | null>(timeoutMs, (done) => {
    const look = (): void => {
      if (worker.state === 'installed') done(worker);
      else if (worker.state === 'redundant') done(null);
    };
    worker.addEventListener('statechange', look);
    look();
  }).then((w) => w ?? null);
}

/** Whatever `start` settles on, or undefined when `ms` passes first. */
function within<T>(ms: number, start: (done: (value: T) => void) => void): Promise<T | undefined> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), ms);
    start((value) => {
      clearTimeout(timer);
      resolve(value);
    });
  });
}

/** The browser's container, for an update, or undefined where there is none. */
export function browserUpdates(): UpdateContainerLike | undefined {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator
    ? navigator.serviceWorker
    : undefined;
}
