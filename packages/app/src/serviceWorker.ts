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
