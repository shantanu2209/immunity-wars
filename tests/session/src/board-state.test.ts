/**
 * THE BOARD SHOWS THE STATE THE ENGINE TRACKS — the coat and the spent cell, pinned against
 * engine-produced states (the board-state sweep, docs/for-P2.5.md, 4 September 2026).
 *
 * Two lessons shape this file. A hand-built state proves the UI agrees with OUR IDEA of the
 * engine, not with the engine — so every state here is one the engine produced: recorded bot
 * games, and the constructed states of `constructed.ts` driven through the engine. And when a
 * display collapses many things into one, an instrument reading the display measures the
 * collapse — so the invariant is checked on the MODEL against the invaders it stands for, not
 * on a count of badges: every token's ids are all coated or all uncoated, and the token says
 * which. The group key is type + coated for exactly this reason.
 *
 * The board is read through the session's view, the way the component reads it, never
 * through the raw state.
 */

import { describe, expect, it } from 'vitest';

import { NEUTROPHIL_REGEN, NEUTROPHIL_REGEN_HELPED } from '@immunity-wars/content';
import * as engine from '@immunity-wars/engine';
import { installRng, restoreRng } from '@immunity-wars/equivalence/rng';
import type { Engine, GameState } from '@immunity-wars/equivalence/types';
import { LocalSession, MemoryStorage, type SessionView } from '@immunity-wars/session';
import { buildNodeModel, type DisplayToken } from '@immunity-wars/ui';

import { SEARCH_SEEDS, clone, commandStates, findHidden, findNetStand } from './constructed.js';

const PORT = engine as unknown as Engine;
type Raw = Record<string, unknown>;

const ns = engine as unknown as Record<string, (...a: unknown[]) => unknown>;

function sessionView(state: GameState): SessionView {
  const s = LocalSession.resume(clone(state), { storage: new MemoryStorage(), now: () => 0 });
  const v = s.getView();
  s.dispose();
  return v;
}
const viewOf = (state: GameState): Raw => sessionView(state).game as Raw;

const tokens = (view: Raw): DisplayToken[] =>
  [...buildNodeModel(view).values()].flatMap((n) => n.display);

/** Tokens whose ids disagree with each other or with the token's own `coated`. */
function coatViolations(view: Raw, ts: DisplayToken[]): string[] {
  const tagged = new Map<string, boolean>();
  for (const iv of (view['invaders'] as Raw[] | undefined) ?? [])
    tagged.set(String(iv['id']), iv['tagged'] === true);
  const out: string[] = [];
  for (const t of ts) {
    if (t.kind !== 'invader' || !t.ids) continue;
    const coats = t.ids.map((id) => tagged.get(id) === true);
    const all = coats.every(Boolean);
    const none = coats.every((c) => !c);
    if (!all && !none) out.push(`${t.key}: mixed coated and uncoated ids`);
    else if ((t.coated === true) !== all)
      out.push(`${t.key}: token says ${String(t.coated)}, ids say ${String(all)}`);
  }
  return out;
}

describe('the coat: one token per (type, coated), and the token says which', () => {
  it('holds on every recorded state, and the split was exercised', () => {
    let statesWithCoat = 0;
    let coatedTokens = 0;
    let splitNodes = 0;
    const violations: string[] = [];
    for (const seed of SEARCH_SEEDS.slice(0, 4)) {
      for (const difficulty of ['training', 'normal', 'hard']) {
        for (const st of commandStates(seed, difficulty, 100)) {
          const view = viewOf(st);
          const ts = tokens(view);
          violations.push(...coatViolations(view, ts));
          const coated = ts.filter((t) => t.coated === true);
          if (coated.length > 0) statesWithCoat += 1;
          coatedTokens += coated.length;
          // A node holding BOTH a coated and an uncoated token of one type: the split at work.
          for (const node of buildNodeModel(view).values()) {
            const types = node.display
              .filter((t) => t.kind === 'invader')
              .map((t) => `${t.art ?? ''}|${String(t.coated === true)}`);
            const byArt = new Map<string, Set<string>>();
            for (const k of types) {
              const [art, c] = k.split('|');
              byArt.set(art ?? '', (byArt.get(art ?? '') ?? new Set()).add(c ?? ''));
            }
            if ([...byArt.values()].some((s) => s.size === 2)) splitNodes += 1;
          }
        }
      }
    }
    expect(
      statesWithCoat,
      'no recorded state had a coated invader — nothing was checked',
    ).toBeGreaterThan(0);
    expect(coatedTokens).toBeGreaterThan(0);
    expect(
      splitNodes,
      'no node ever held a coated AND an uncoated token of one type — the split was never exercised',
    ).toBeGreaterThan(0);
    expect(violations, violations.slice(0, 8).join('\n')).toEqual([]);
  });

  it('CONTROL: a token standing for a coated and an uncoated invader is a violation', () => {
    const st = commandStates(SEARCH_SEEDS[0] ?? 0, 'normal', 60).find((s) =>
      ((s as unknown as Raw)['invaders'] as Raw[]).some((iv) => iv['tagged'] === true),
    );
    expect(st, 'no tagged invader in the first recorded game').toBeDefined();
    if (!st) return;
    const view = viewOf(st);
    const ts = tokens(view);
    const coatedTok = ts.find((t) => t.coated === true && t.ids);
    const plainTok = ts.find((t) => t.kind === 'invader' && t.coated !== true && t.ids);
    expect(coatedTok).toBeDefined();
    expect(plainTok).toBeDefined();
    if (!coatedTok || !plainTok) return;
    // Re-collapse the two by hand — the pre-split display — and the checker must fire.
    const merged: DisplayToken = {
      ...plainTok,
      ids: [...(plainTok.ids ?? []), ...(coatedTok.ids ?? [])],
    };
    expect(coatViolations(view, [merged]).length).toBeGreaterThan(0);
  });

  it('a fresh game has no coat anywhere', () => {
    installRng(0x51de);
    try {
      const g = PORT.newGame({ difficulty: 'training', science: false }) as GameState;
      PORT.applyAction(g, { action: 'draw' } as never);
      expect(tokens(viewOf(g)).some((t) => t.coated === true)).toBe(false);
    } finally {
      restoreRng();
    }
  });
});

describe('the spent cell: dimmed, with its return in the badge slot', () => {
  it('the Neutrophil after a NET is unavailable with turns-until-back, on the token and in the sheet', () => {
    const stand = findNetStand();
    expect(stand, 'no NET stand reachable — nothing to spend').not.toBeNull();
    if (!stand) return;
    const before = tokens(viewOf(stand)).find((t) => t.cell === 'neutrophil');
    expect(
      before?.unavailable,
      'standing on the swarm, the Neutrophil is available',
    ).toBeUndefined();

    const g = clone(stand);
    const pid = ((g as unknown as Raw)['players'] as string[])[0] ?? '';
    installRng(1);
    try {
      const r = PORT.applyAction(g, { action: 'net', cell: 'neutrophil', pid } as never) as {
        ok: boolean;
        error?: string;
      };
      expect(r.ok, `NET rejected: ${r.error ?? ''}`).toBe(true);
    } finally {
      restoreRng();
    }
    const sv = sessionView(g);
    const view = sv.game as Raw;
    const cell = (view['cells'] as Record<string, Raw>)['neutrophil'];
    expect(cell?.['alive']).toBe(false);
    // THE ORACLE IS THE ENGINE'S OWN neutrophilReadyTurn, not regenAt: the first headless run
    // of the badge showed "4" from regenAt and the cell came back in 2 — a primed Helper T in
    // the blood halves the wait (Th17 help), which regenAt never knew. The marrow on the NET
    // stand may or may not be damaged; the session withholds the number when it is.
    const ready = ns['neutrophilReadyTurn']?.(g) as number | null;
    const marrow = (view['organs'] as Record<string, Raw>)['marrow'];
    const marrowDamaged = marrow !== undefined && Number(marrow['hp']) < Number(marrow['max']);
    const expectBack =
      marrowDamaged || ready === null ? null : Math.max(0, ready - Number(view['turn']));
    expect(sv.queries.readyTurn['neutrophil']).toBe(marrowDamaged ? null : ready);
    const model = buildNodeModel(view, sv.queries.readyTurn);
    const tok = [...model.values()].flatMap((n) => n.display).find((t) => t.cell === 'neutrophil');
    expect(tok?.unavailable).toEqual({ kind: 'spent', backIn: expectBack });
    if (expectBack !== null) expect(expectBack).toBeGreaterThan(0);
    const node = [...model.values()].find((n) => n.inspect.cells.includes('neutrophil'));
    expect(node?.inspect.unavailable['neutrophil']).toEqual({ kind: 'spent', backIn: expectBack });
    // Without the session's answer the badge has no number: regenAt is never read.
    const bare = [...buildNodeModel(view).values()]
      .flatMap((n) => n.display)
      .find((t) => t.cell === 'neutrophil');
    expect(bare?.unavailable).toEqual({ kind: 'spent', backIn: null });
  });

  it('the helped case: a primed Helper T in the blood halves the wait, and the badge says so', () => {
    // Search recorded states for a NET stand where the helper is in the blood and licensed,
    // then NET through the engine: the session must report NEUTROPHIL_REGEN_HELPED, not
    // NEUTROPHIL_REGEN. Found and driven, never hand-built.
    let helped: GameState | null = null;
    let plain: GameState | null = null;
    for (const seed of SEARCH_SEEDS) {
      for (const difficulty of ['training', 'normal', 'hard']) {
        for (const st of commandStates(seed, difficulty, 120)) {
          const s = st as unknown as Raw;
          const n = (s['cells'] as Record<string, Raw>)['neutrophil'];
          if (!n || n['alive'] !== true || Number(s['ap'] ?? 0) < 1) continue;
          const marrow = (s['organs'] as Record<string, Raw>)['marrow'];
          if (marrow && Number(marrow['hp']) < Number(marrow['max'])) continue;
          if (helped && plain) break;
          // The bot never moves the Helper T, so every corpus NET is helped once the NET has
          // presented antigen (found by this test's first run). The unhelped case is DRIVEN:
          // walk the helper off the hub first, then NET — two engine actions, no hand-set field.
          for (const helperAway of [false, true]) {
            if (helperAway && plain) continue;
            if (!helperAway && helped) continue;
            if (helperAway && Number(s['ap'] ?? 0) < 2) continue;
            let base: GameState = st;
            if (helperAway) {
              const away = (PORT.moveDestinations(st, 'helper') as unknown as Raw[]).find(
                (d) => d['zone'] !== 'hub',
              );
              if (!away) continue;
              const g0 = clone(st);
              const pid0 = ((g0 as unknown as Raw)['players'] as string[])[0] ?? '';
              installRng(1);
              try {
                const m0 = PORT.applyAction(g0, {
                  action: 'move',
                  cell: 'helper',
                  pid: pid0,
                  ...away,
                } as never) as { ok: boolean };
                if (!m0.ok) continue;
              } finally {
                restoreRng();
              }
              base = g0;
            }
            for (const d of PORT.moveDestinations(base, 'neutrophil') as unknown as Raw[]) {
              if (d['zone'] === 'hub') continue;
              const g = clone(base);
              const pid = ((g as unknown as Raw)['players'] as string[])[0] ?? '';
              installRng(1);
              try {
                const m = PORT.applyAction(g, {
                  action: 'move',
                  cell: 'neutrophil',
                  pid,
                  ...d,
                } as never) as { ok: boolean };
                if (!m.ok || (PORT.netTargets(g) as unknown[]).length === 0) continue;
                const r = PORT.applyAction(g, {
                  action: 'net',
                  cell: 'neutrophil',
                  pid,
                } as never) as { ok: boolean };
                if (!r.ok) continue;
              } finally {
                restoreRng();
              }
              // Classified AFTER the NET, as the session reads it: the NET presents antigen,
              // which licenses a Helper T already standing in the blood — a Neutrophil can halve
              // its own wait by the act of NETting. Found by this test's first run.
              const inBlood = ns['helperInBlood']?.(g) === true;
              if (inBlood && !helped) helped = g;
              else if (!inBlood && !plain) plain = g;
              break;
            }
          }
          if (helped && plain) break;
        }
        if (helped && plain) break;
      }
      if (helped && plain) break;
    }
    expect(plain, 'no unhelped NET in the recorded games').not.toBeNull();
    expect(
      helped,
      'no helped NET in the recorded games — the Th17 case is unchecked',
    ).not.toBeNull();
    if (!plain || !helped) return;
    const back = (g: GameState): number | null => {
      const sv = sessionView(g);
      const tok = [...buildNodeModel(sv.game, sv.queries.readyTurn).values()]
        .flatMap((n) => n.display)
        .find((t) => t.cell === 'neutrophil');
      return tok?.unavailable?.backIn ?? null;
    };
    const plainBack = back(plain);
    const helpedBack = back(helped);
    expect(plainBack).toBe(NEUTROPHIL_REGEN);
    expect(helpedBack).toBe(NEUTROPHIL_REGEN_HELPED);
  });

  it('a suppressed cell is offline for the suppression count (a recorded crisis)', () => {
    let found: { state: GameState; cell: string; n: number } | null = null;
    for (const seed of SEARCH_SEEDS) {
      for (const difficulty of ['hard', 'normal', 'training']) {
        for (const st of commandStates(seed, difficulty, 120)) {
          const sup = (st as unknown as Raw)['suppress'] as Raw | undefined;
          for (const cell of ['neutrophil', 'tcell']) {
            const n = Number(sup?.[cell] ?? 0);
            const alive = ((st as unknown as Raw)['cells'] as Record<string, Raw>)[cell]?.['alive'];
            if (n > 0 && alive !== false) found = { state: st, cell, n };
          }
          if (found) break;
        }
        if (found) break;
      }
      if (found) break;
    }
    expect(
      found,
      'no recorded game suppressed a cell — the offline treatment is unchecked',
    ).not.toBeNull();
    if (!found) return;
    const tok = tokens(viewOf(found.state)).find((t) => t.cell === found?.cell);
    expect(tok?.unavailable).toEqual({ kind: 'offline', backIn: found.n });
  });
});

describe('hiding inside a cell: liver-stage malaria and kala-azar inside a resident (the card piece)', () => {
  const inMac = (g: GameState): boolean =>
    ((g as unknown as Raw)['invaders'] as Raw[]).some((iv) => iv['inMac'] === true);
  const inLiver = (g: GameState): boolean =>
    ((g as unknown as Raw)['invaders'] as Raw[]).some(
      (iv) => iv['type'] === 'malaria' && iv['stage'] === 'liver',
    );

  it('kala-azar that moved inside a resident is its own token, marked hidden-in-macrophage, and the sheet knows the organ', () => {
    const g = findHidden('Kala-azar', inMac);
    expect(g, 'kala-azar never reached a resident within the turn budget').not.toBeNull();
    if (!g) return;
    const view = viewOf(g);
    const ts = tokens(view);
    const tok = ts.find((t) => t.hiddenIn === 'macrophage');
    expect(tok, 'no token marked hidden-in-macrophage').toBeDefined();
    const iv = ((view['invaders'] as Raw[]).find((x) => x['inMac'] === true) ?? {}) as Raw;
    expect(tok?.ids).toContain(String(iv['id']));
    const node = [...buildNodeModel(view).values()].find((n) =>
      n.inspect.invaders.some((x) => x.id === String(iv['id'])),
    );
    const row = node?.inspect.invaders.find((x) => x.id === String(iv['id']));
    expect(row?.hiddenIn).toBe('macrophage');
    expect(row?.organ).toBe(String(iv['organ']));
    // The resident it lives in says so from its side too (CP3's line reads `infectedBy`).
    const residents = view['residents'] as Record<string, Raw>;
    expect(residents[String(iv['organ'])]?.['infectedBy']).toBe(String(iv['id']));
  });

  it('liver-stage malaria is marked hidden-in-liver; the stage is on its sheet row', () => {
    const g = findHidden('Malaria', inLiver);
    expect(g, 'malaria never embedded in the liver within the turn budget').not.toBeNull();
    if (!g) return;
    const view = viewOf(g);
    const tok = tokens(view).find((t) => t.hiddenIn === 'liver');
    expect(tok, 'no token marked hidden-in-liver').toBeDefined();
    const node = [...buildNodeModel(view).values()].find((n) =>
      n.display.some((t) => t.hiddenIn === 'liver'),
    );
    const row = node?.inspect.invaders.find((x) => x.hiddenIn === 'liver');
    expect(row?.stage).toBe('liver');
    expect(row?.type).toBe('malaria');
  });

  it('CONTROL: a token standing for a hidden and an exposed invader is a violation of the split', () => {
    const g = findHidden('Malaria', inLiver);
    if (!g) return; // the vacuity guard above already failed
    const view = viewOf(g);
    const ts = tokens(view);
    const hidden = ts.find((t) => t.hiddenIn === 'liver');
    const exposed = ts.find((t) => t.kind === 'invader' && t.hiddenIn === undefined && t.ids);
    if (!hidden || !exposed) return;
    const hiddenIds = new Set(hidden.ids ?? []);
    const merged = { ...exposed, ids: [...(exposed.ids ?? []), ...(hidden.ids ?? [])] };
    const mixed =
      merged.ids.some((id) => hiddenIds.has(id)) && merged.ids.some((id) => !hiddenIds.has(id));
    expect(
      mixed,
      'the re-collapsed token mixes hidden and exposed ids — the split is what prevents it',
    ).toBe(true);
  });
});
