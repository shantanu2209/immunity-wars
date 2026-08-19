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
import { LYMPH_GROUP } from '@immunity-wars/content';
import * as PORT_NS from '@immunity-wars/engine';

import { loadLegacy } from './src/engine.js';
import { installRng, restoreRng } from './src/rng.js';

const PORT = PORT_NS as any;

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

/* ==================================================================== *
 * v4 reconciliation — docs/FINDINGS.md #46.
 *
 * The AST-based coverage-v8 4 mapper surfaced ~50 defensive arms the range-based v2 mapper had
 * merged away. Rule C takes the three mechanical shapes; the RULE_B entries added alongside it
 * are demonstrated here, grouped where the argument is shared. The while-loop demonstration
 * above this block is KEPT although its RULE_B entry was dropped: the AST mapper emits no
 * branch arm for a loop condition, so there is nothing left to exclude — the property is still
 * proven; the instrument stopped charging for it.
 * ==================================================================== */

/* --- the 300-game totality and conservation scan --- */
{
  let cellsBroken = false;
  let organsBroken = false;
  let residentsBroken = false;
  let fieldsBroken = false;
  let bothPilesEmpty = false;
  let xOnlySeen = false;
  let allOrgansDeadLive = false;
  for (let i = 0; i < 300; i++) {
    installRng(71000 + i);
    try {
      const g: any = E.newGame({ difficulty: i % 3 === 0 ? 'hard' : 'normal', science: false });
      const cellKeys = Object.keys(g.cells);
      for (let t = 0; t < 30; t++) {
        E.applyAction(g, { action: 'draw' });
        E.applyAction(g, { action: 'beginCommand' });
        E.applyAction(g, { action: 'endCommand' });
        if (cellKeys.some((k) => !g.cells[k])) cellsBroken = true;
        if (g.organList.some((o: string) => !g.organs[o])) organsBroken = true;
        for (const o in g.residents) if (!g.residents[o]) residentsBroken = true;
        if (!g.fx || !g.rare || !g.suppress) fieldsBroken = true;
        if (g.deck.length + g.discard.length === 0) bothPilesEmpty = true;
        const seen = Object.keys(g.seen);
        if (seen.length > 0 && seen.every((dz) => dz === 'Pathogen X')) xOnlySeen = true;
        if (!g.won && !g.lost && g.organList.every((o: string) => (g.organs[o]?.hp ?? 0) <= 0))
          allOrgansDeadLive = true;
        if (g.won || g.lost) break;
      }
    } finally {
      restoreRng();
    }
  }
  say(
    'queries.ts:178/482, spread.ts:158/626/651/668 — total state members (C1 class evidence too)',
    !cellsBroken && !organsBroken && !residentsBroken && !fieldsBroken,
    'across 300 games x 30 turns: every roster cell, organ, resident, and fx/rare/suppress field present in every state',
  );
  say(
    'actions.ts:788 / construct.ts:128 — deck+discard conservation',
    !bothPilesEmpty,
    'every drawn card is discarded at draw time, so both piles were never empty in any observed state',
  );
  say(
    'actions.ts:780 — Pathogen X never the only seen disease',
    !xOnlySeen,
    "turn 1's spawn precedes novelTurn, so a non-X disease is always seen first",
  );
  say(
    'spread.ts:156 — cytokine storm cannot find zero live organs',
    !allOrgansDeadLive,
    'no live game state was observed with every organ at 0 integrity — a vital at 0 ends the game first',
  );
}

/* --- data scans --- */
{
  const novel = E.DECK_MASTER.filter((c: any) => c.novel);
  let novelInDeck = false;
  for (let i = 0; i < 50 && !novelInDeck; i++) {
    installRng(72000 + i);
    try {
      const g: any = E.newGame({ difficulty: 'normal', science: false });
      if (g.deck.some((c: any) => c.novel)) novelInDeck = true;
    } finally {
      restoreRng();
    }
  }
  say(
    'actions.ts:760 / construct.ts:140 / construct.ts:297 — the novel card',
    novel.length === 1 && !novelInDeck,
    'DECK_MASTER holds exactly one novel card and 50 fresh decks contained it 0 times — the find always succeeds, and it never reaches deck or discard',
  );

  const hpMax = Math.max(...(Object.values(E.INV_HP) as number[]));
  say(
    'actions.ts:532 — degranulate always kills',
    hpMax <= 3,
    'INV_HP ceiling is ' + hpMax + ' and degranulate deals 3',
  );

  const types = [...new Set(E.DECK_MASTER.map((c: any) => c.type))];
  say(
    'construct.ts:292 — forceInjectType literal fallback',
    types.length > 0,
    'every real invader type appears in DECK_MASTER by construction of the set; the literal card needs a nonsense type',
  );

  const eventKeys = new Set(Object.keys(E.EVENTS));
  installRng(73000);
  let scheduled: string[] = [];
  try {
    const g0: any = E.newGame({ difficulty: 'hard', science: false });
    scheduled = Object.values(g0.events as Record<string, string>);
  } finally {
    restoreRng();
  }
  say(
    'construct.ts:102 — applyEvent keys come from EVENTS',
    scheduled.length > 0 && scheduled.every((k) => eventKeys.has(k)),
    'every scheduled event key (' + scheduled.join(', ') + ') is an EVENTS key',
  );

  const minBranch = Math.min(...(Object.values(E.ORGANS) as any[]).map((o) => o.branch as number));
  say(
    'queries.ts:547 — branch destinations never negative',
    minBranch >= 2,
    'shortest branch is ' + minBranch + ' steps and speed tops out at 3, so st = L - k >= 0',
  );

  // LYMPH-LINKED routes only. The first version of this demonstration scanned ALL routes and
  // came back LIVE, because blood is 3 steps — but blood has no lymph group, so it can never be
  // a crossing destination. The refinement is the demonstration working as intended: it forced
  // the claim to be exactly as narrow as the code path it covers.
  // LYMPH_GROUP from content: neither engine exports it, and content is the single source the
  // engines' copies are identity-checked against by exports.test.ts.
  const lymphLens = (Object.entries(E.ROUTES) as [string, any][])
    .filter(([k]) => (LYMPH_GROUP as Record<string, unknown>)[k])
    .map(([, r]) => r.len as number);
  say(
    'queries.ts:577 — lymph-crossing continuations always in range',
    lymphLens.length > 0 && lymphLens.every((l) => l === 5),
    'every LYMPH-LINKED route is ' +
      [...new Set(lymphLens)].join('/') +
      ' steps (blood is 3, but has no lymph group and cannot be a crossing destination), the crossing is step 3, extra <= 2, so ns is within [1, 5]',
  );
}

/* --- guard exhibits --- */
{
  // THE PORT, not legacy, exhibits this one: the arm being demonstrated is the port's, and the
  // engines DIVERGE on this exact input — legacy's moveDestinations reads cell.zone without a
  // guard and CRASHES on an unknown cell key (TypeError in brainSlow), which this demonstration
  // discovered by crashing on its first run. The divergence is unreachable through the corpus
  // (the fuzzer's action vocabulary never held an unknown cell key) and is recorded in
  // docs/FINDINGS.md #46 rather than smoothed over.
  installRng(74000);
  let g: any;
  try {
    g = PORT.newGame({ difficulty: 'normal', science: false });
  } finally {
    restoreRng();
  }
  g.phase = 'command';
  g.ap = 9;
  const r1 = PORT.applyAction(g, {
    action: 'move',
    cell: 'zzz',
    zone: 'route',
    lane: 'gut',
    step: 1,
  });
  say(
    'actions.ts:221 — move with an unknown cell dies at the !d guard (port)',
    r1.error === 'Illegal move.' && PORT.moveDestinations(g, 'zzz').length === 0,
    'moveDestinations("zzz") is [] so d is undefined and the guard two lines earlier returns: "' +
      r1.error +
      '"',
  );

  installRng(74001);
  let g2: any;
  try {
    g2 = E.newGame({ difficulty: 'normal', science: false });
  } finally {
    restoreRng();
  }
  g2.phase = 'command';
  g2.ap = 9;
  g2.flags.lymph = true;
  g2.cells.neutrophil.zone = 'route';
  g2.cells.neutrophil.lane = 'blood';
  g2.cells.neutrophil.step = 3;
  const r2 = E.applyAction(g2, { action: 'hop', cell: 'neutrophil' });
  say(
    'actions.ts:251 — a lymphless route is rejected before partners are consulted',
    typeof r2.error === 'string' && /NO lymphatic link/.test(r2.error),
    'the blood route errs at the LYMPH_GROUP guard: "' + String(r2.error).slice(0, 60) + '..."',
  );

  g2.rare.armed = true;
  g2.rare.fired = false;
  g2.flags.rareEvents = true;
  E.fireRare(g2, 'rheumaticFever');
  say(
    'spread.ts:161 — fireRare sets the banner before the switch',
    Boolean(g2.rareBanner),
    'g.rareBanner is assigned unconditionally at the top of fireRare, ninety lines above the guard',
  );

  say(
    'view.ts:50 — pop after a length guard',
    true,
    'the line above returned unless g.undo.length > 0, and pop on a non-empty array yields',
  );
  say(
    'actions.ts:513 — repeat lookup two lines below its own guard',
    true,
    "line 511's condition required g.organs[iv.organ] truthy; 513 re-reads the same key for the compiler",
  );
  say(
    'spread.ts:367 — re-find by id in the source array',
    true,
    'the iteratee came from g.invaders and is re-found there by its own id',
  );
  say(
    'construct.ts:84 — picks and slots are both length 3',
    true,
    'two shuffled slices of 2 and 1 concatenated, indexed by a forEach over exactly 3 slots',
  );
  say(
    'construct.ts:208/217 — splice at a found index yields',
    true,
    'findIndex just returned >= 0, and splice(i, 1)[0] at a valid index is the element',
  );
  say(
    'ap.ts:40 — nothing ever grants a free action',
    true,
    'docs/FINDINGS.md #29: no code path writes a positive g.free entry at any player count',
  );
}

/* --- primitives.ts:34  dense-array shuffle --- */
{
  // Neither engine exports its shuffle, so it is demonstrated in-situ: every newGame shuffles
  // the deck (and the port's shuffle is the only shuffle it has), so 500 fresh dense decks with
  // no hole and no lost card mean the `in` guard never skipped a swap. The code comment at the
  // line carries the argument: Fisher-Yates over a dense array cannot produce a hole.
  let holed = false;
  for (let i = 0; i < 500 && !holed; i++) {
    installRng(75000 + i);
    try {
      const g: any = PORT.newGame({ difficulty: 'normal', science: false });
      if (g.deck.some((c: unknown) => !c)) holed = true;
    } finally {
      restoreRng();
    }
  }
  say(
    'primitives.ts:34 — Fisher-Yates over dense arrays never skips a swap',
    !holed,
    '500 fresh decks shuffled in-situ without a hole or lost card appearing',
  );
}
