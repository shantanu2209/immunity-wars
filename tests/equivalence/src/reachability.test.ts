/**
 * REACHABILITY QUESTIONS — not equivalence checks.
 *
 * These three ask whether a specific board state can be reached, and if so whether it has a way
 * out. They exist because neither the equivalence corpus nor the Task E metric panel can answer
 * that: the corpus only says the two engines agree, and a rare binary outcome moves a mean by
 * about its own frequency, which is inside every noise band (docs/FINDINGS.md #17).
 *
 * "COULD NOT BE CONSTRUCTED" is a real and useful answer, distinct from "passed". Each test
 * below reports which it got, in its own name and in its assertions.
 *
 * All measurement runs against LEGACY, because the question is about the game, not the port.
 */

import { describe, expect, it } from 'vitest';

import { loadLegacy } from './engine.js';
import { installRng, restoreRng } from './rng.js';
import type { GameState, Invader } from './types.js';

const legacy = loadLegacy();

/* ================================================================== *
 * Q1 — two worms lodged at the Brain on Hard, with branch:3
 * ================================================================== */

describe('Q1: two worms at the Brain on Hard — is there a reachable line of play?', () => {
  it('CONSTRUCTIBLE, but only via Tapeworm twice — it is the only worm with Brain tropism', () => {
    const wormCards = legacy.DECK_MASTER.filter((c) => c.type === 'worm');
    const brainCapable = wormCards.filter((c) => {
      const t = (legacy as unknown as { TROPISM: Record<string, string[] | string> }).TROPISM[c.dz];
      return Array.isArray(t) && t.includes('brain');
    });
    expect(brainCapable.map((c) => c.dz)).toEqual(['Tapeworm']);

    // So reaching two worms at the Brain requires drawing Tapeworm TWICE (possible once the
    // deck reshuffles from the discard, or via the reinfection draw), and it consumes the
    // entire two-worms-per-game budget. It is rare, not impossible.
    expect(wormCards.length).toBe(7);
  });

  it('on HARD a worm arrives already lodged AT the organ, so the clock starts immediately', () => {
    installRng(1);
    try {
      const g = legacy.newGame({ difficulty: 'hard', science: false });
      const card = legacy.DECK_MASTER.find((c) => c.dz === 'Tapeworm');
      expect(card).toBeDefined();
      if (!card) return;
      const iv = legacy.makeInvader(g, card);
      expect(iv.zone).toBe('branch');
      expect(iv.organ).toBe('brain');
      expect(iv.step).toBe(0);
      expect(iv.lodged).toBe(true);
      expect(iv.wormClock).toBe(3);
    } finally {
      restoreRng();
    }
  });

  /**
   * ANSWER: a line of play exists, and this is a constructive proof of it.
   *
   * The key facts the AP arithmetic turns on, all measured rather than assumed:
   *   - both worms lodge at branch step 0, so they occupy the SAME space — one Eosinophil
   *     positioned there can strike both without moving again;
   *   - Eosinophil strike is 2 damage against 3 HP, so two strikes kill a worm;
   *   - travel hub -> Brain step 0 is 4 AP at branch:3, exactly one Hard turn's budget;
   *   - DEGRANULATE is unusable here: it burns 1 integrity off the organ it stands in, and the
   *     Brain only has 2. Using it to save the Brain costs half the Brain.
   */
  it('ANSWER: a line EXISTS at branch:3 — the Brain survives, with the whole board otherwise quiet', () => {
    installRng(4242);
    try {
      const g = legacy.newGame({ difficulty: 'hard', science: false }) as GameState;
      // Freeze everything else so the question is about the worms alone.
      g.flags.crisisEvents = false;
      g.flags.rareEvents = false;
      g.everInfected = true;
      const worm = (id: string): Invader =>
        ({
          id,
          type: 'worm',
          disease: 'Tapeworm',
          zone: 'branch',
          organ: 'brain',
          step: 0,
          lodged: true,
          wormClock: 3,
          tagged: false,
          hp: 3,
          maxhp: 3,
          lane: 'gut',
          stage: null,
          age: 0,
          embed: 0,
        }) as Invader;
      g.invaders = [worm('wA'), worm('wB')];

      const brain = (): number => g.organs.brain?.hp ?? 0;
      expect(brain()).toBe(2);

      const act = (a: Record<string, unknown>): boolean => {
        const r = legacy.applyAction(g, a as never) as { ok: boolean; error?: string };
        return r.ok;
      };

      // Turn 1 — spend the whole budget moving the Eosinophil hub -> Brain tissue (4 AP).
      act({ action: 'draw' });
      act({ action: 'beginCommand' });
      expect(
        act({ action: 'move', cell: 'eosinophil', zone: 'branch', organ: 'brain', step: 3 }),
      ).toBe(true);
      expect(
        act({ action: 'move', cell: 'eosinophil', zone: 'branch', organ: 'brain', step: 2 }),
      ).toBe(true);
      expect(
        act({ action: 'move', cell: 'eosinophil', zone: 'branch', organ: 'brain', step: 1 }),
      ).toBe(true);
      expect(
        act({ action: 'move', cell: 'eosinophil', zone: 'branch', organ: 'brain', step: 0 }),
      ).toBe(true);
      act({ action: 'endCommand' });

      // Turn 2 — produce EUK, coat worm A, strike it twice. 4 AP exactly.
      act({ action: 'draw' });
      act({ action: 'beginCommand' });
      expect(act({ action: 'produce', family: 'EUK' })).toBe(true);
      expect(act({ action: 'tag', invaderId: 'wA' })).toBe(true);
      expect(act({ action: 'strike', cell: 'eosinophil', invaderId: 'wA' })).toBe(true);
      expect(act({ action: 'strike', cell: 'eosinophil', invaderId: 'wA' })).toBe(true);
      expect(
        g.invaders.some((iv) => iv.id === 'wA'),
        'worm A dead by end of turn 2',
      ).toBe(false);
      act({ action: 'endCommand' });

      // Turn 3 — the same for worm B, which is standing on the very same space.
      act({ action: 'draw' });
      act({ action: 'beginCommand' });
      expect(act({ action: 'produce', family: 'EUK' })).toBe(true);
      expect(act({ action: 'tag', invaderId: 'wB' })).toBe(true);
      expect(act({ action: 'strike', cell: 'eosinophil', invaderId: 'wB' })).toBe(true);
      expect(act({ action: 'strike', cell: 'eosinophil', invaderId: 'wB' })).toBe(true);
      expect(
        g.invaders.some((iv) => iv.id === 'wB'),
        'worm B dead by end of turn 3',
      ).toBe(false);
      act({ action: 'endCommand' });

      // The Brain never lost a single point of integrity, and the body is still alive.
      expect(brain(), 'Brain integrity after both worms are cleared').toBe(2);
      expect(g.lost, 'the body did not fall').toBeFalsy();
    } finally {
      restoreRng();
    }
  });

  it('the margin is ONE turn of Eosinophil travel, which is what branch:4 consumed', () => {
    // The line above needs the Eosinophil on the Brain by end of turn 1. At branch:3 that costs
    // exactly 4 AP — one Hard turn. At branch:4 it costs 5, so it cannot be done in one turn
    // no matter what else is sacrificed, and every subsequent step slips a turn.
    //
    // This does NOT show the state was unwinnable at branch:4; it shows the slack was one turn
    // and the change restored it. See docs/FINDINGS.md #17.
    installRng(7);
    try {
      const g = legacy.newGame({ difficulty: 'hard', science: false }) as GameState;
      expect(g.ap, 'Hard turn budget').toBe(4);
      expect(
        (legacy as unknown as { ORGANS: Record<string, { branch: number; integrity: number }> })
          .ORGANS.brain.branch,
      ).toBe(3);
      expect(
        (legacy as unknown as { ORGANS: Record<string, { branch: number; integrity: number }> })
          .ORGANS.brain.integrity,
      ).toBe(2);
    } finally {
      restoreRng();
    }
  });

  it('DEGRANULATE cannot be part of any Brain line — it burns half the Brain to use', () => {
    installRng(99);
    try {
      const g = legacy.newGame({ difficulty: 'hard', science: false }) as GameState;
      g.phase = 'command';
      g.ap = 9;
      g.ab.EUK = 5;
      g.cells.eosinophil = {
        zone: 'branch',
        organ: 'brain',
        step: 0,
        lane: null,
        alive: true,
      } as never;
      g.invaders = [
        {
          id: 'wD',
          type: 'worm',
          disease: 'Tapeworm',
          zone: 'branch',
          organ: 'brain',
          step: 0,
          lodged: true,
          wormClock: 3,
          tagged: true,
          hp: 3,
          maxhp: 3,
          lane: 'gut',
          stage: null,
          age: 0,
          embed: 0,
        } as Invader,
      ];
      const before = g.organs.brain?.hp ?? 0;
      legacy.applyAction(g, { action: 'degranulate', cell: 'eosinophil', invaderId: 'wD' });
      const after = g.organs.brain?.hp ?? 0;
      expect(before, 'Brain starts at 2').toBe(2);
      expect(after, 'degranulating at the Brain costs 1 of its 2 integrity').toBe(1);
    } finally {
      restoreRng();
    }
  });
});

/* ================================================================== *
 * Q2 — can a worm ever be on a route?
 * ================================================================== */

describe('Q2: a worm on a route — constructible at all?', () => {
  it('ANSWER: NOT CONSTRUCTIBLE through any legal path. Every spawn route places worms on a branch', () => {
    // Three ways a worm can enter the board, all of which funnel through makeInvader:
    //   the infection draw · the coInfection crisis event · the Force tool
    // makeInvader branches on c.type === 'worm' and always sets zone:'branch'.
    installRng(11);
    try {
      for (const difficulty of ['training', 'normal', 'hard']) {
        const g = legacy.newGame({ difficulty, science: false });
        for (const card of legacy.DECK_MASTER.filter((c) => c.type === 'worm')) {
          expect(legacy.makeInvader(g, card).zone, `${card.dz} on ${difficulty}`).toBe('branch');
        }
        // The Force tool bypasses the caps but NOT the placement.
        const forced = legacy.forceInjectType(g, 'worm');
        expect(forced.zone, `forceInjectType on ${difficulty}`).toBe('branch');
      }
    } finally {
      restoreRng();
    }
  });

  it('so hard-mode lymphatic spread can never clone one — which is the ONLY thing protecting it', () => {
    // If a worm ever did reach a route, the spread filter would clone it: it gates on
    // zone === 'route' and has no type clause at all. docs/FINDINGS.md #14.
    //
    // Demonstrated by force: put a worm on a route by direct state mutation — something no
    // legal path can do — and hard-mode spread duplicates it.
    let cloned = false;
    for (let i = 0; i < 60 && !cloned; i += 1) {
      installRng(30000 + i);
      try {
        const g = legacy.newGame({ difficulty: 'hard', science: false }) as GameState;
        g.invaders = [
          {
            id: 'wRoute',
            type: 'worm',
            disease: 'Tapeworm',
            zone: 'route',
            lane: 'gut',
            step: 3,
            organ: null,
            lodged: false,
            tagged: false,
            hp: 3,
            maxhp: 3,
            stage: null,
            age: 0,
            embed: 0,
          } as Invader,
        ];
        legacy.applyAction(g, { action: 'draw' });
        legacy.applyAction(g, { action: 'beginCommand' });
        legacy.applyAction(g, { action: 'endCommand' });
        if (g.invaders.filter((iv) => iv.type === 'worm' && iv.disease === 'Tapeworm').length > 1) {
          cloned = true;
        }
      } finally {
        restoreRng();
      }
    }
    expect(
      cloned,
      'A worm placed on a route by direct mutation IS cloned by hard-mode lymphatic spread. ' +
        'The "worms never multiply" safeguard therefore holds by PLACEMENT, not by intent.',
    ).toBe(true);
  });
});

/* ================================================================== *
 * Q3 — does antigenic variation stay unreachable?
 * ================================================================== */

describe('Q3: the antigenic-variation branch — confirm it stays unreachable', () => {
  it('ANSWER: still unreachable. The only variant card is a parasite, and neutralise rejects parasites first', () => {
    const variants = legacy.DECK_MASTER.filter(
      (c) => (c as unknown as { variant?: boolean }).variant,
    );
    expect(variants.map((c) => c.dz)).toEqual(['Sleeping sickness']);
    expect(variants[0]?.type).toBe('parasite');

    installRng(5);
    try {
      const g = legacy.newGame({ difficulty: 'training', science: false }) as GameState;
      g.phase = 'command';
      g.ap = 9;
      for (const f of ['ENV', 'NAK', 'EXB', 'ICB', 'TOX', 'EUK', 'X']) g.ab[f] = 9;
      const card = variants[0];
      if (!card) return;
      const iv = legacy.makeInvader(g, card);
      iv.zone = 'hub';
      iv.step = 0;
      g.invaders = [iv];

      const r = legacy.applyAction(g, { action: 'neutralise', invaderId: iv.id }) as {
        ok: boolean;
        error?: string;
      };
      // Rejected at the type gate, two lines BEFORE the variant roll.
      expect(r.ok).toBe(false);
      expect(r.error).toBe('Antibodies cannot neutralise that.');
    } finally {
      restoreRng();
    }
  });

  it('and it stays unreachable across real play — no variant roll ever fires', () => {
    // The branch decrements an antibody and logs a coat-change message. If it ever fired, that
    // log line would appear. It never does.
    let sawCoatChange = false;
    for (let i = 0; i < 150 && !sawCoatChange; i += 1) {
      installRng(41000 + i);
      try {
        const g = legacy.newGame({ difficulty: 'training', science: false }) as GameState;
        for (let t = 0; t < 25; t += 1) {
          legacy.applyAction(g, { action: 'draw' });
          legacy.applyAction(g, { action: 'beginCommand' });
          for (const iv of [...g.invaders]) {
            legacy.applyAction(g, { action: 'neutralise', invaderId: iv.id });
            legacy.applyAction(g, { action: 'tag', invaderId: iv.id });
          }
          legacy.applyAction(g, { action: 'endCommand' });
          if (g.log.some((l) => /changed its coat/.test(l.msg))) sawCoatChange = true;
          if (g.won || g.lost) break;
        }
      } finally {
        restoreRng();
      }
    }
    expect(
      sawCoatChange,
      'the antigenic-variation branch fired — FINDINGS.md #4 is out of date',
    ).toBe(false);
  });
});
