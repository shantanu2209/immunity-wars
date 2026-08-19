/**
 * THE CONTROLS FOR SEAM 1. Every check in `session.test.ts` made to fail on purpose.
 *
 * The standing rule: a check that has never failed is not known to work, and this project has
 * pointed a control at ~a dozen checks and found the check fine zero times. Its other half was
 * added at P2.1 and applies here too — a rule that only ever forbids is half-specified — so the
 * permitted directions are asserted as well.
 */

import { describe, expect, it } from 'vitest';

import * as engine from '@immunity-wars/engine';
import { canonical } from '@immunity-wars/equivalence/hash';
import { installRng, restoreRng } from '@immunity-wars/equivalence/rng';
import { UI_QUERIES } from '@immunity-wars/equivalence/query-shapes';
import {
  ALL_UI_QUERIES,
  LocalSession,
  MemoryStorage,
  asPlayerRef,
  newPlayerRef,
  type PlayerRef,
} from '@immunity-wars/session';

const ns = engine as unknown as Record<string, (...a: unknown[]) => unknown>;

/**
 * Resolve an engine function by name, or fail loudly.
 *
 * `noUncheckedIndexedAccess` types a namespace lookup as possibly-undefined, and `!` is not the
 * answer — if a lookup can miss, handle the miss. A missing name here would mean the engine's
 * surface changed under this suite, which is a thing to be told about rather than to crash on
 * three frames later.
 */
function fn(name: string): (...a: unknown[]) => unknown {
  const f = ns[name];
  if (typeof f !== 'function') throw new Error(`the engine does not export ${name}`);
  return f;
}

/* ================================================================== *
 * C1 — the step 6 comparison must detect a Session that forks
 * ================================================================== */

/**
 * A DELIBERATELY FORKED SESSION — the "convenience layer" bug, written out.
 *
 * It applies every action correctly, so the GAME is right. What it gets wrong is the thing seam 1
 * exists to prevent: it rebuilds the projection only every other action, which is exactly the
 * shape of a plausible optimisation ("nothing visible changed, skip the rebuild"). A UI written
 * against it would render a stale board roughly half the time and nothing would throw.
 *
 * This is a wrong SESSION rather than a wrong engine, on purpose. The property under test is
 * about the layer, so corrupting the engine would prove the comparison notices engines.
 */
class ForkedSession {
  private readonly g: Record<string, unknown>;
  private cached: unknown;
  private n = 0;

  constructor(difficulty: string) {
    this.g = fn('newGame')({ difficulty, science: false }) as Record<string, unknown>;
    this.cached = fn('viewState')(this.g);
  }

  send(a: Record<string, unknown>): boolean {
    const r = fn('applyAction')(this.g, { ...a, pid: 'p_0000000000000000' }) as { ok: boolean };
    if (!r.ok) return false;
    this.n += 1;
    if (this.n % 2 === 0) this.cached = fn('viewState')(this.g);
    return true;
  }

  view(): unknown {
    return this.cached;
  }
}

describe('C1: the step 6 comparison detects a Session that does not hand out the current view', () => {
  it('a session that rebuilds every other action diverges from the direct engine', () => {
    installRng(0x51de);
    let direct: string[] = [];
    try {
      const g = fn('newGame')({ difficulty: 'normal', science: false }) as Record<string, unknown>;
      const actions: Record<string, unknown>[] = [];
      for (let t = 0; t < 8; t += 1) {
        actions.push({ action: 'draw' }, { action: 'beginCommand' }, { action: 'endCommand' });
      }
      direct = [];
      for (const a of actions) {
        const r = fn('applyAction')(g, { ...a, pid: 'p_0000000000000000' }) as { ok: boolean };
        if (r.ok) direct.push(canonical(fn('viewState')(g)));
      }
      expect(
        direct.length,
        'the direct run accepted nothing; this control is inert',
      ).toBeGreaterThan(6);

      installRng(0x51de);
      const forked = new ForkedSession('normal');
      const viaFork: string[] = [];
      for (const a of actions) {
        if (forked.send(a)) viaFork.push(canonical(forked.view()));
      }

      const diverged = viaFork.some((v, i) => v !== direct[i]);
      expect(
        diverged,
        'a Session that rebuilt its view only every other action went UNDETECTED. The step 6 ' +
          'comparison is not comparing what it claims to.',
      ).toBe(true);
    } finally {
      restoreRng();
    }
  });
});

/* ================================================================== *
 * C2 — Storage. The bug the design exists to prevent, demonstrated.
 * ================================================================== */

describe('C2: Storage serialises GameState, and a view cannot stand in for one', () => {
  it('save then resume reproduces the game exactly', async () => {
    installRng(0x51de);
    try {
      const storage = new MemoryStorage();
      const s = LocalSession.createGame({ difficulty: 'normal' }, { storage, now: () => 1234 });
      for (const a of [{ action: 'draw' }, { action: 'beginCommand' }]) await s.sendAction(a);
      const before = canonical(s.getView().game);
      await s.save();
      s.dispose();

      const saved = await storage.get('current');
      expect(saved, 'nothing was saved').not.toBeNull();
      expect(saved?.savedAt, 'the injected clock was not used').toBe(1234);

      const resumed = LocalSession.resume(saved?.state);
      expect(canonical(resumed.getView().game), 'the resumed game is not the saved one').toBe(
        before,
      );
      resumed.dispose();
    } finally {
      restoreRng();
    }
  });

  it('THE BUG: a save built from getView() succeeds, and the game is unresumable', async () => {
    /**
     * RULING B, MADE MECHANICAL — AND ITS WORDING REFINED BY WHAT THIS CONTROL ACTUALLY DID.
     *
     * The brief says wiring a save button to `getView()` is "exactly the bug someone would ship,
     * and it only appears on reload". Both halves are confirmed: the save succeeds, the payload
     * looks entirely plausible, and nothing is wrong until someone tries to come back.
     *
     * What this control found, on its first run, is that the reload failure is LOUD rather than
     * silent: `viewState` has no `deck`, so `viewState(state)` throws on `g.deck.length` the
     * moment a session is built from it. The saved game is still lost — that is the harm, and it
     * is unrecoverable — but the player gets a crash rather than a subtly wrong board.
     *
     * That is the smaller true claim and it is the one worth keeping. "Silently wrong" would have
     * been a scarier sentence and a false one.
     */
    installRng(0x51de);
    try {
      const storage = new MemoryStorage();
      const s = LocalSession.createGame({ difficulty: 'normal' }, { storage });
      await s.sendAction({ action: 'draw' });

      // What someone ships when they wire a save button to the view. It SUCCEEDS.
      await storage.put({ id: 'wrong', state: s.getView().game, savedAt: 0 });
      const wrong = await storage.get('wrong');
      expect(wrong, 'the bad save did not even store; the demonstration is inert').not.toBeNull();

      const state = wrong?.state as Record<string, unknown>;
      expect(state['deckCount'], 'the plausible-looking payload').toBeTypeOf('number');
      expect(
        state['deck'],
        'a ViewState carries no deck — this is the whole finding',
      ).toBeUndefined();

      // And it is unresumable. Loudly.
      expect(
        () => LocalSession.resume(state),
        'a game resumed from a ViewState did NOT fail. If this ever passes, either viewState has ' +
          'grown a deck or resume() has learned to tolerate a missing one — and Storage`s ' +
          'GameState requirement needs re-measuring before it is trusted.',
      ).toThrow();

      s.dispose();
    } finally {
      restoreRng();
    }
  });

  it('MemoryStorage shares the real implementation`s failure modes rather than being an easier fake', async () => {
    const storage = new MemoryStorage();
    // A value JSON destroys. A store that handed back the same object reference would keep it,
    // tests would pass, and only a browser would disagree.
    await storage.put({ id: 'x', state: { a: undefined, b: NaN, c: 1 }, savedAt: 0 });
    const back = (await storage.get('x'))?.state as Record<string, unknown>;
    expect(
      Object.keys(back),
      'undefined survived, so this fake is easier than the real thing',
    ).not.toContain('a');
    expect(back['b'], 'NaN survived, so this fake is easier than the real thing').toBeNull();
  });
});

/* ================================================================== *
 * C3 — PlayerRef is a type, not a convention
 * ================================================================== */

describe('C3: PlayerRef cannot be substituted by a plain string', () => {
  it('does not accept a bare string where a PlayerRef is required', () => {
    const takesRef = (r: PlayerRef): string => r;

    // @ts-expect-error a plain string is not a PlayerRef. If this stops erroring the brand is
    // gone, and "no PII in a player reference" is back to being a rule someone has to remember.
    takesRef('shantanu@example.com');

    // And the sanctioned constructor validates rather than merely casting.
    expect(() => asPlayerRef('shantanu@example.com')).toThrow(/not a PlayerRef/);
    expect(() => asPlayerRef(newPlayerRef())).not.toThrow();
  });

  it('mints references that are device-local and shaped, not sequential', () => {
    const refs = new Set(Array.from({ length: 200 }, () => String(newPlayerRef())));
    expect(refs.size, 'newPlayerRef collided; it is not usable as an identifier').toBe(200);
    for (const r of refs) expect(r).toMatch(/^p_[0-9a-f]{16}$/);
  });
});

/* ================================================================== *
 * C4 — the query list this package answers is the measured one
 * ================================================================== */

describe('C4: the session answers exactly the 22 queries the UI demands', () => {
  it('agrees with the set derived from the board script', () => {
    expect([...ALL_UI_QUERIES].sort()).toEqual([...UI_QUERIES].sort());
  });

  it('a session view answers every one of them, in one group or the other', async () => {
    installRng(0x51de);
    try {
      const s = LocalSession.createGame({ difficulty: 'normal' });
      await s.sendAction({ action: 'draw' });
      s.setSelection({ cell: 'macrophage', family: 'ENV' });
      const v = s.getView();

      const answered = new Set<string>([
        ...Object.keys(v.queries.state),
        ...Object.keys(v.queries.perInvader),
        ...Object.keys(v.queries.perCell),
        ...Object.keys(v.queries.perOrgan),
        ...Object.keys(v.queries.perFamily),
        'productionBreakdown',
        'moveDestinations',
      ]);

      const missing = UI_QUERIES.filter((n) => !answered.has(n));
      expect(
        missing,
        'the UI would have to reach past Session for these, which the boundary rule forbids',
      ).toEqual([]);

      expect(v.scoped.moveDestinations, 'the selected cell got no destinations').not.toBeNull();
      expect(v.scoped.productionDetail, 'the selected family got no breakdown').not.toBeNull();
      expect(
        Object.keys(v.queries.production).length,
        'the always-on production summary is missing',
      ).toBe(7);
      s.dispose();
    } finally {
      restoreRng();
    }
  });
});
