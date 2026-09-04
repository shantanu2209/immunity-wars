/**
 * CP2 — `ProductionSummary.blocked`, the one session field the standing rule needed
 * (COMMAND_SURFACE_PLAN §3.1): immunosuppression lives in `fx`, which the view drops.
 *
 * mustPass: a fresh game is not blocked. mustFail-shaped: a state with `fx.noProduce` set
 * reports blocked for every family and a net rate of zero — the state is built by hand
 * because the crisis event that sets it is not reachable on demand.
 */
import { describe, expect, it } from 'vitest';

import * as engine from '@immunity-wars/engine';
import { installRng, restoreRng } from '@immunity-wars/equivalence/rng';
import { LocalSession, MemoryStorage } from '@immunity-wars/session';

const ns = engine as unknown as Record<string, (...a: unknown[]) => unknown>;

describe('CP2: production.blocked mirrors the engine’s immunosuppression', () => {
  it('a fresh game is not blocked, for any family', () => {
    installRng(0x51de);
    try {
      const s = LocalSession.createGame({ difficulty: 'normal' }, { storage: new MemoryStorage() });
      const production = s.getView().queries.production;
      expect(Object.keys(production).length).toBeGreaterThan(0);
      for (const [f, p] of Object.entries(production)) {
        expect(p.blocked, `${f} blocked on a fresh game`).toBe(false);
      }
      s.dispose();
    } finally {
      restoreRng();
    }
  });

  it('fx.noProduce set → every family blocked, net 0 — the panel must withhold Produce', () => {
    installRng(0x51de);
    try {
      const newGame = ns['newGame'];
      if (typeof newGame !== 'function') throw new Error('the engine does not export newGame');
      const g = newGame({ difficulty: 'normal', science: false }) as Record<string, unknown>;
      (g['fx'] as Record<string, unknown>)['noProduce'] = true;
      const s = LocalSession.resume(g, { storage: new MemoryStorage() });
      const production = s.getView().queries.production;
      for (const [f, p] of Object.entries(production)) {
        expect(p.blocked, `${f} not reported blocked`).toBe(true);
        expect(p.net, `${f} net should be 0 while blocked`).toBe(0);
      }
      s.dispose();
    } finally {
      restoreRng();
    }
  });
});
