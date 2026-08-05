/**
 * B3 — building and mutating game state.
 *
 * The hard requirement here is not just "the same values" but **the same property insertion
 * order and the same Math.random draw order**. Level 1 of the equivalence contract hashes the
 * whole state including key order, and level 2 compares draw counts action by action.
 *
 * newGame is where that bites hardest. Its state object literal evaluates
 *
 *     rare: { armed: Math.random() < 0.5, ... }     <- draws FIRST
 *     ...
 *     deck: shuffle(DECK_MASTER.filter(...))        <- draws SECOND
 *
 * so simply declaring `deck` before `rare` — which reads more naturally — would shift every
 * subsequent die roll in the game. The field order below is legacy's, deliberately, and it is
 * not to be tidied.
 */

import { LYMPH_STEP, ORGANS, RESIDENT_NAME, ROUTES } from './data/board.js';
import { DECK_MASTER } from './data/deck.js';
import { BAD_POOL, EVENTS, GOOD_POOL } from './data/events.js';
import { FAM_KEYS } from './data/families.js';
import { INV_HP } from './data/invaders.js';
import { TROPISM } from './data/tropism.js';
import { DIFF, FLAGS, GRACE_CLEAR, MALARIA_LIVER_TURNS, WORM_DAMAGE_EVERY } from './data/tuning.js';
import { knobs } from './knobs.js';
import { branchLen, organsFor, resetUid, shuffle, uid } from './primitives.js';
import { capFam, wormAllowed } from './queries.js';
import type { Fx, GameState, Invader, LogEntry, RareState, Stats, Suppress } from './state.js';
import type { Card, Difficulty, InvaderType, OrganKey, RouteKey } from './types.js';

export interface NewGameConfig {
  difficulty?: string;
  flags?: Partial<GameState['flags']>;
  science?: boolean;
  multiplayer?: boolean;
  players?: string[];
  captain?: string | null;
  owner?: Record<string, string>;
}

/** Most recent first, capped at 60. */
export function pushLog(g: GameState, msg: string, kind?: string): void {
  g.log.unshift({ t: g.turn, msg, kind: kind || '' } as LogEntry);
  if (g.log.length > 60) g.log.pop();
}

/* ------------------------------------------------------------------ *
 * crisis events
 * ------------------------------------------------------------------ */

/**
 * Place three crisis events at roughly the quarter, half and three-quarter marks.
 *
 * Draw order matters: BAD_POOL is shuffled first (5 draws), then GOOD_POOL (2), then the
 * combined three-element pick (2). That is the order the array literal evaluates in.
 */
export function scheduleEvents(g: GameState): void {
  const T = g.maxTurn;
  const raw = [Math.round(T * 0.25), Math.round(T * 0.5), Math.round(T * 0.75)];
  const slots: number[] = [];
  raw.forEach((r) => {
    let t = Math.max(2, Math.min(T - 1, r));
    while (slots.includes(t)) t += 1;
    slots.push(t);
  });
  const picks = shuffle([
    ...shuffle(BAD_POOL.slice()).slice(0, 2),
    ...shuffle(GOOD_POOL.slice()).slice(0, 1),
  ]);
  slots.forEach((t, i) => {
    const pick = picks[i];
    if (pick !== undefined) g.events[t] = pick;
  });
}

/** Fire this turn's event, and warn about next turn's if it is a bad one. */
export function fireTurnStart(g: GameState): void {
  g.banner = null;
  g.warning = null;
  if (!g.flags.crisisEvents) return;
  const here = g.events[g.turn];
  if (here) applyEvent(g, here);
  const nx = g.events[g.turn + 1];
  const def = nx ? EVENTS[nx] : undefined;
  if (nx && def && def.bad) g.warning = { key: nx, name: def.name, text: def.tell };
}

export function applyEvent(g: GameState, key: string): void {
  const e = EVENTS[key];
  if (!e) return;
  g.banner = { key, name: e.name, bad: e.bad, why: e.why };
  switch (key) {
    case 'immunosuppression':
      g.fx.noProduce = true;
      break;
    case 'neutropenia':
      g.suppress.neutrophil = 2;
      Object.assign(g.cells.neutrophil ?? {}, { zone: 'hub', lane: null, organ: null, step: 0 });
      break;
    case 'lymphopenia':
      g.suppress.tcell = 2;
      Object.assign(g.cells.tcell ?? {}, { zone: 'hub', lane: null, organ: null, step: 0 });
      break;
    case 'antibodyShortage':
      g.fx.capTurns = 3;
      [...FAM_KEYS, 'X'].forEach((f) => {
        if ((g.ab[f] ?? 0) > 2) g.ab[f] = 2;
      });
      break;
    case 'fatigue':
      g.fx.apMod = (g.fx.apMod || 0) - 1;
      break;
    case 'coInfection': {
      if (!g.deck.length) g.deck = shuffle(g.discard.splice(0));
      let c = g.deck.pop();
      if (c) g.discard.push(c);
      // The co-infection cannot smuggle in an extra worm.
      c = respectWormCap(g, c) as typeof c;
      if (!c) {
        pushLog(g, 'A co-infection threatened, but nothing new took hold.', '');
        break;
      }
      const iv = makeInvader(g, c as unknown as Card);
      g.invaders.push(iv);
      g.everInfected = true;
      g.seen[c.dz] = true;
      if (iv.type === 'worm') noteWorm(g);
      if ((c as unknown as Card).novel) {
        g.novelSeen = true;
        iv.novel = true;
      }
      pushLog(
        g,
        `Co-infection: an extra <b>${c.dz}</b> broke in${iv.zone === 'branch' && iv.organ ? ` and is burrowing into the ${ORGANS[iv.organ].name}` : ''}.`,
        'bad',
      );
      break;
    }
    case 'surge':
      g.fx.apMod = (g.fx.apMod || 0) + 2;
      break;
    case 'passiveAntibodies':
      // A booster tops up every class.
      FAM_KEYS.forEach((f) => {
        g.ab[f] = capFam(g, f);
      });
      break;
    case 'fever':
      g.fx.skipMarch = true;
      g.fx.apMod = (g.fx.apMod || 0) - 1;
      break;
    default:
      break;
  }
  pushLog(g, `<b>${e.bad ? '⚠ ' : '✚ '}${e.name}</b> — ${e.why}`, e.bad ? 'bad' : 'good');
}

/* ------------------------------------------------------------------ *
 * invaders
 * ------------------------------------------------------------------ */

/** Pick an organ at the hub, honouring tropism and which organs are in play. */
export function rollOrgan(g: GameState, iv: Invader): OrganKey {
  if (iv.forced && g.organs[iv.forced]) return iv.forced;
  const declared = TROPISM[iv.disease];
  let list: OrganKey[];
  if (declared === 'any' || !declared) {
    // Pathogen X reaches this branch by having no TROPISM entry at all — docs/FINDINGS.md #13.
    list = g.organList.slice();
  } else {
    list = declared.filter((o) => g.organList.includes(o));
  }
  if (!list.length) list = g.organList.slice(); // its true target is not in play at this difficulty
  // Hepatic portal vein: anything from the gut drains through the liver first.
  if (iv.lane === 'gut' && list.includes('liver')) return 'liver';
  return list[Math.floor(Math.random() * list.length)] as OrganKey;
}

export function noteWorm(g: GameState): void {
  g.wormsSpawned = (g.wormsSpawned || 0) + 1;
  g.wormsThisTurn = (g.wormsThisTurn || 0) + 1;
}

/**
 * If this card is a worm we are not allowed to spawn, swap it for the next non-worm card.
 *
 * Returns the card actually used, or null when no non-worm card exists anywhere — in which case
 * NOTHING spawns. The cap is never broken, and infection pressure is preserved by substitution
 * rather than by dropping the slot.
 */
export function respectWormCap(g: GameState, c: Card | undefined): Card | null {
  if (!c || c.type !== 'worm' || wormAllowed(g)) return c ?? null;
  let i = g.deck.findIndex((x) => x.type !== 'worm');
  if (i >= 0) {
    const alt = g.deck.splice(i, 1)[0];
    if (alt) g.discard.push(alt);
    return (alt ?? null) as Card | null;
  }
  // Deck exhausted of non-worms: reshuffle the discard and look once more.
  if (g.discard.length) {
    g.deck = shuffle(g.discard.splice(0));
    i = g.deck.findIndex((x) => x.type !== 'worm');
    if (i >= 0) {
      const alt = g.deck.splice(i, 1)[0];
      if (alt) g.discard.push(alt);
      return (alt ?? null) as Card | null;
    }
  }
  return null;
}

/**
 * Build an invader from a card and place it.
 *
 * Worms burrow toward their organ by difficulty — on Hard they arrive already lodged AT the
 * organ. Everything else enters at its route. Shared by the infection draw and the Force tool
 * so a forced worm behaves exactly like a real one.
 *
 * FIELD ORDER IS LEGACY'S. `zone` and `step` are assigned afterwards and so land at the end;
 * `organ` is already present from the literal and keeps its position.
 */
export function makeInvader(g: GameState, c: Card): Invader {
  const iv = {
    id: uid(),
    type: c.type,
    lane: c.lane,
    organ: null as OrganKey | null,
    tagged: false,
    disease: c.dz,
    hp: INV_HP[c.type] || 1,
    maxhp: INV_HP[c.type] || 1,
    stage: c.type === 'malaria' ? 'sporozoite' : null,
    age: 0,
    embed: 0,
    killsHelper: !!c.killsHelper,
    hidesInMac: !!c.hidesInMac,
    blocksLymph: !!c.blocksLymph,
    amnesia: !!c.amnesia,
    drain: c.drain || 0,
    variant: !!c.variant,
    forced: c.forced || null,
    novel: !!c.novel,
  } as unknown as Invader;

  if (c.type === 'worm') {
    const targ = rollOrgan(g, iv);
    const L = branchLen(targ);
    const step =
      g.difficulty === 'hard' ? 0 : g.difficulty === 'normal' ? Math.max(1, Math.floor(L / 2)) : L;
    iv.zone = 'branch';
    iv.organ = targ;
    iv.step = step;
    if (step === 0) {
      iv.lodged = true;
      iv.wormClock = WORM_DAMAGE_EVERY;
    }
  } else {
    iv.zone = 'route';
    iv.step = ROUTES[c.lane].len;
  }
  return iv;
}

/* ------------------------------------------------------------------ *
 * the Force tool (testing)
 * ------------------------------------------------------------------ */

/**
 * NOTE: neither forceInject function calls noteWorm(), so a forced worm never increments
 * wormsSpawned and stays invisible to the cap accounting for the rest of the game. That is
 * legacy behaviour, reproduced deliberately — docs/FINDINGS.md #16.
 */
export function forceInjectType(g: GameState, type: string): Invader {
  const card =
    g.deck
      .slice()
      .reverse()
      .find((c) => c.type === type) ??
    DECK_MASTER.find((c) => c.type === type) ??
    ({ dz: type, type: type as InvaderType, lane: 'bite' as RouteKey } as Card);
  const iv = makeInvader(g, card as Card);
  g.invaders.push(iv);
  g.everInfected = true;
  g.seen[(card as Card).dz] = true;
  if ((card as Card).novel) {
    g.novelSeen = true;
    iv.novel = true;
  }
  pushLog(g, `🧪 Forced <b>${(card as Card).dz}</b> into play (testing).`, 'big');
  return iv;
}

export function forceInjectCard(g: GameState, dz: string): Invader | null {
  const card = (g.deck || []).find((c) => c.dz === dz) ?? DECK_MASTER.find((c) => c.dz === dz);
  if (!card) return null;
  const iv = makeInvader(g, card as Card);
  g.invaders.push(iv);
  g.everInfected = true;
  g.seen[(card as Card).dz] = true;
  if ((card as Card).novel) {
    g.novelSeen = true;
    iv.novel = true;
  }
  pushLog(g, `🧪 Forced <b>${dz}</b> into play (testing).`, 'big');
  return iv;
}

/* ------------------------------------------------------------------ *
 * newGame
 * ------------------------------------------------------------------ */

export function newGame(cfg: NewGameConfig): GameState {
  resetUid();
  const diff: Difficulty = (
    DIFF[cfg.difficulty as Difficulty] ? cfg.difficulty : 'normal'
  ) as Difficulty;
  const organList = organsFor(diff, knobs.organOverride);
  const organs: GameState['organs'] = {};
  organList.forEach((o) => {
    organs[o] = {
      key: o,
      hp: ORGANS[o].integrity,
      max: ORGANS[o].integrity,
      clear: 0,
      failed: false,
    };
  });

  // FIELD ORDER IS LOAD-BEARING — see the file header. Do not reorder to read better.
  const g = {
    phase: 'infection',
    turn: 1,
    difficulty: diff,
    apMax: knobs.apOverride || DIFF[diff].ap,
    ap: knobs.apOverride || DIFF[diff].ap,
    maxTurn: DIFF[diff].turns,
    flags: Object.assign({}, FLAGS, cfg.flags || {}),
    organList,
    organs,
    cells: {
      macrophage: { zone: 'hub', lane: null, organ: null, step: 0, freeEngulf: true },
      neutrophil: { zone: 'hub', lane: null, organ: null, step: 0, alive: true, regenAt: null },
      bcell: { zone: 'hub', lane: null, organ: null, step: 0 },
      tcell: { zone: 'hub', lane: null, organ: null, step: 0 },
      helper: { zone: 'hub', lane: null, organ: null, step: 0, usedThisTurn: false },
      nk: { zone: 'hub', lane: null, organ: null, step: 0 },
      // the anti-parasite specialist
      eosinophil: { zone: 'hub', lane: null, organ: null, step: 0, alive: true, regenAt: null },
    },
    events: {},
    banner: null,
    warning: null,
    fx: { capTurns: 0, noProduce: false, apMod: 0, skipMarch: false } as Fx,
    wormsSpawned: 0,
    wormsThisTurn: 0,
    suppress: { neutrophil: 0, tcell: 0 } as Suppress,
    undo: [],
    residents: {}, // one per organ: patrols ITS OWN branch, never leaves
    presentations: 0, // antigens shown to the adaptive system
    complement: 0, // blood proteins: auto-opsonise a bacterium in the bloodstream each turn
    antivenom: diff === 'training' ? 2 : diff === 'normal' ? 1 : 0,
    avOrder: 0,
    // TIER B — antibodies are SPECIFIC. One pool per antigen class.
    ab: { ENV: 0, NAK: 0, EXB: 0, ICB: 0, TOX: 0, EUK: 0, X: 0 },
    made: { ENV: 0, NAK: 0, EXB: 0, ICB: 0, TOX: 0, EUK: 0, X: 0 },
    memory: {},
    vaccine: {},
    seen: {},
    clone: 0,
    cloneFound: false,
    novelSeen: false,
    // FIRST Math.random draw of the game. Moving this field moves every later roll.
    rare: {
      armed: Math.random() < 0.5,
      fired: null,
      seen: {},
      malariaLiver: false,
      killedThisTurn: 0,
    } as RareState,
    free: {},
    antibodies: 0,
    invaders: [],
    // SECOND draw, and the next 95: the novel pathogen is injected, never drawn.
    deck: shuffle(DECK_MASTER.filter((c) => !c.novel).map((c) => ({ ...c }))),
    discard: [],
    drawn: null,
    log: [],
    won: false,
    lost: null,
    science: cfg.science !== false,
    stats: {
      killedTrunk: 0,
      killedBranch: 0,
      organHits: 0,
      failures: [],
      arrivals: { virus: 0, hidden: 0, bacteriaTagged: 0, bacteriaUntagged: 0 },
      residentAte: 0,
      gotThrough: { virus: 0, hidden: 0, bacteriaTagged: 0, bacteriaUntagged: 0 },
    } as Stats,
    // MULTIPLAYER (server) fields — inert in single-device play.
    multiplayer: !!cfg.multiplayer,
    players: cfg.players || [],
    captain: cfg.captain || null,
    owner: cfg.owner || {},
    apBudget: {},
    apPool: 0,
  } as unknown as GameState;

  organList.forEach((o) => {
    g.residents[o] = { organ: o, step: 0, ate: false }; // step 0 = at the organ itself
  });

  if (g.flags.crisisEvents) {
    scheduleEvents(g);
    fireTurnStart(g);
  }

  // THE NOVEL PATHOGEN — guaranteed on Hard, likely on Normal, uncommon in Training.
  if (g.flags.tierB) {
    const chance = diff === 'hard' ? 1.0 : diff === 'normal' ? 0.6 : 0.2;
    if (Math.random() < chance) {
      g.novelTurn = 2 + Math.floor(Math.random() * Math.max(1, Math.floor(g.maxTurn * 0.5)));
    }
  }

  pushLog(
    g,
    `Game start · ${DIFF[diff].ap} AP · ${organList.length} organs. New infections arrive until turn ${g.maxTurn}; then clear the body of every pathogen to win (by turn ${g.maxTurn + GRACE_CLEAR} or the body is lost).`,
    'big',
  );
  return g;
}

export { LYMPH_STEP, MALARIA_LIVER_TURNS, RESIDENT_NAME };
