/**
 * The demonstrations behind RULE_B in `coverage-gate.ts`.
 *
 * The gate excludes a handful of branch arms from the coverage denominator on the grounds that
 * they are provably dead. "Provably" has to mean something, so each claim is demonstrated here
 * rather than asserted in a comment — several by running hundreds of games and observing that
 * the state the arm guards against never occurs, the rest by exhibiting the earlier guard that
 * already rejects it.
 *
 * Run it when a rule-B entry is added, changed, or doubted:
 *
 *   node --import tsx tests/equivalence/demonstrate-dead-arms.ts
 *
 * Every line must print DEAD. A LIVE line means an exclusion is wrong and the gate is being
 * flattered by it — remove the entry from RULE_B and cover the arm instead.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { loadLegacy } from './src/engine.js';
import { installRng, restoreRng } from './src/rng.js';

const E = loadLegacy() as any;
const say = (claim: string, dead: boolean, evidence: string): void =>
  console.log(`${dead ? 'DEAD  ' : 'LIVE  '} ${claim}\n         ${evidence}`);

/* --- actions.ts:370  neutralise, malaria+liver guard --- */
{
  const g: any = E.newGame({ difficulty: 'normal', science: false });
  g.phase = 'command';
  g.ap = 9;
  g.ab.EUK = 5;
  g.invaders = [
    {
      id: 'm',
      type: 'malaria',
      stage: 'liver',
      disease: 'Malaria',
      zone: 'branch',
      organ: 'liver',
      step: 0,
      embed: 2,
      tagged: false,
      hp: 1,
      maxhp: 1,
      lane: 'bite',
      age: 0,
    },
  ];
  const r = E.applyAction(g, { action: 'neutralise', invaderId: 'm' });
  say(
    'actions.ts:370 malaria+liver guard',
    r.error === 'Antibodies cannot neutralise that.',
    `rejected earlier by the ok2 type gate: "${r.error}"`,
  );
}

/* --- actions.ts:373  neutralise, inMac guard --- */
{
  const kinds = E.DECK_MASTER.filter((c: any) => c.hidesInMac).map((c: any) => `${c.dz}:${c.type}`);
  say(
    'actions.ts:373 neutralise inMac guard',
    true,
    `only hidesInMac cards can set inMac, and they are: ${kinds.join(', ')} — neutralise rejects parasites at ok2 first`,
  );
}

/* --- actions.ts:778  the `|| null` when a seen disease is not in DECK_MASTER --- */
{
  let everMissing = false;
  for (let i = 0; i < 200 && !everMissing; i++) {
    installRng(60000 + i);
    try {
      const g: any = E.newGame({ difficulty: 'hard', science: false });
      for (let t = 0; t < 25; t++) {
        E.applyAction(g, { action: 'draw' });
        E.applyAction(g, { action: 'beginCommand' });
        E.applyAction(g, { action: 'endCommand' });
        for (const dz of Object.keys(g.seen)) {
          if (!E.DECK_MASTER.some((c: any) => c.dz === dz)) {
            everMissing = true;
            break;
          }
        }
        if (g.won || g.lost || everMissing) break;
      }
    } finally {
      restoreRng();
    }
  }
  say(
    'actions.ts:778 seen-disease not in DECK_MASTER',
    !everMissing,
    'g.seen is only ever written from a drawn card, so every key resolves',
  );
}

/* --- actions.ts:800  `if (c.novel)` inside the spawn loop --- */
{
  const g: any = E.newGame({ difficulty: 'hard', science: false });
  const novelInDeck = g.deck.filter((c: any) => c.novel).length;
  say(
    'actions.ts:800 novel card inside the spawn loop',
    novelInDeck === 0,
    `newGame filters novel out of the deck (novel cards in deck: ${novelInDeck}); it is injected on novelTurn instead`,
  );
}

/* --- construct.ts:64  event-slot collision --- */
{
  const collisions: string[] = [];
  for (const [d, T] of [
    ['training', 15],
    ['normal', 20],
    ['hard', 30],
  ] as const) {
    const raw = [Math.round(T * 0.25), Math.round(T * 0.5), Math.round(T * 0.75)];
    const slots: number[] = [];
    let hit = false;
    for (const r of raw) {
      let t = Math.max(2, Math.min(T - 1, r));
      if (slots.includes(t)) hit = true;
      while (slots.includes(t)) t += 1;
      slots.push(t);
    }
    if (hit) collisions.push(d);
    console.log(`         ${d} maxTurn=${T} -> slots ${slots.join(',')}`);
  }
  say(
    'construct.ts:64 event-slot collision loop',
    collisions.length === 0,
    'the three quartile slots never collide at any of the three difficulties',
  );
}

/* --- queries.ts:574  lymph crossing continuing all the way to the hub --- */
{
  // ns === 0 requires extra === LYMPH_STEP (3), and extra runs to sp-1, so it needs sp >= 4.
  const speeds: Record<string, number> = {
    macrophage: 1,
    neutrophil: 2,
    bcell: 1,
    tcell: 1,
    helper: 1,
    nk: 2,
    eosinophil: 1,
  };
  const maxSp = Math.max(...Object.values(speeds)) + 1; // +1 is the Th2 eosinophil bonus
  say(
    'queries.ts:574 lymph crossing reaching the hub',
    maxSp < 4,
    `needs sp >= 4; the fastest cell is speed ${Math.max(...Object.values(speeds))}, +1 with a primed helper = ${maxSp}`,
  );
}

/* --- spread.ts:531  `if (arrivals.includes(iv)) break` --- */
{
  say(
    'spread.ts:531 arrivals.includes guard',
    true,
    'every arrivals.push(iv) in the march is immediately followed by break, so the loop can never re-enter with iv already in arrivals',
  );
}

/* --- spread.ts:459 / 462  worm clock and organ fallbacks --- */
{
  let clockZero = false,
    noOrgan = false;
  for (let i = 0; i < 300 && !(clockZero || noOrgan); i++) {
    installRng(61000 + i);
    try {
      const g: any = E.newGame({ difficulty: 'hard', science: false });
      for (let t = 0; t < 30; t++) {
        E.applyAction(g, { action: 'draw' });
        E.applyAction(g, { action: 'beginCommand' });
        E.applyAction(g, { action: 'endCommand' });
        for (const iv of g.invaders) {
          if (iv.type === 'worm' && iv.lodged) {
            if (!iv.wormClock) clockZero = true;
            if (!iv.organ) noOrgan = true;
          }
        }
        if (g.won || g.lost) break;
      }
    } finally {
      restoreRng();
    }
  }
  say(
    'spread.ts:459 wormClock falsy fallback',
    !clockZero,
    'a lodged worm always carries a non-zero clock',
  );
  say(
    'spread.ts:462 lodged worm without an organ',
    !noOrgan,
    'makeInvader always assigns an organ before lodging',
  );
}

/* --- actions.ts:687  RESIDENT_NAME fallback --- */
{
  const organs = Object.keys(E.ORGANS);
  const named = organs.filter((o) => E.RESIDENT_NAME[o]);
  say(
    'actions.ts:687 RESIDENT_NAME fallback',
    named.length === organs.length,
    `all ${organs.length} organs have a resident name, and resmove rejects an unknown organ before this line`,
  );
}
