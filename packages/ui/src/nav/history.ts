/**
 * THE PHONE'S BACK GESTURE, kept in step with the navigation stack (docs/for-P2.7.md §10, choice
 * 1, ruled 13 September 2026: the gesture closes one level, exactly like the floating button).
 *
 * Before this the app never touched the browser's history, so the web build was one page with no
 * entries and the gesture left it from every screen, Play included, which APP_FLOW.md §2 ruling 1
 * says back must never silently do.
 *
 * THE MODEL. One history entry per level above the base, each tagged with its index, and the
 * address never changes. When the stack gets deeper, entries are pushed; when it gets shallower
 * because something closed on screen, the extra entries are trimmed with ONE `go(-n)`, and the
 * popstate that trim causes is ignored, because the stack already moved. A popstate nobody asked
 * for is the player's gesture: it reports how many levels they went back, and the host closes
 * that many.
 *
 * Two orderings the browser makes awkward, both handled here and both tested:
 *   - `go()` is asynchronous. A deeper stack arriving while a trim is still travelling is held
 *     until the trim lands; pushing mid-travel would put the new entries in the wrong place.
 *   - A forward gesture cannot reopen what was closed, so it is sent back where it came from.
 *
 * The history object is passed in, so the whole thing is tested without a browser
 * (`history.test.ts`).
 */

export interface HistoryLike {
  readonly state: unknown;
  pushState(data: unknown, unused: string): void;
  go(delta: number): void;
}

export interface HistorySync {
  /** The stack is now `target` entries deep in history terms: make the browser match. */
  sync(target: number): void;
  /** A popstate arrived with this state. Returns the levels the player went back, 0 for our own. */
  onPop(state: unknown): number;
}

const KEY = 'iwNav';

function indexOf(state: unknown): number {
  if (typeof state !== 'object' || state === null) return 0;
  const v = (state as Record<string, unknown>)[KEY];
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : 0;
}

export function createHistorySync(history: HistoryLike): HistorySync {
  // A reload keeps the entries of the page before it; start from where the browser says we are,
  // so the first sync trims them rather than stacking new ones above.
  let pushed = indexOf(history.state);
  let travelling = 0;
  let held: number | null = null;

  const sync = (target: number): void => {
    if (travelling > 0) {
      held = target;
      return;
    }
    if (target > pushed) {
      for (let i = pushed + 1; i <= target; i += 1) history.pushState({ [KEY]: i }, '');
      pushed = target;
    } else if (target < pushed) {
      travelling += 1;
      history.go(target - pushed);
      pushed = target;
    }
  };

  const onPop = (state: unknown): number => {
    const at = indexOf(state);
    if (travelling > 0) {
      travelling -= 1;
      pushed = at;
      if (travelling === 0 && held !== null) {
        const next = held;
        held = null;
        sync(next);
      }
      return 0;
    }
    if (at > pushed) {
      travelling += 1;
      history.go(pushed - at);
      return 0;
    }
    const back = pushed - at;
    pushed = at;
    return back;
  };

  return { sync, onPop };
}
