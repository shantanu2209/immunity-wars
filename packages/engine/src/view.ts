/**
 * B3 — the view projection and the undo stack.
 *
 * viewState is what every UI and the server actually consume, and its serialised size is one of
 * the two numbers Task E has to report (docs/PHASE1_BRIEF.md §5). So its field order is not
 * cosmetic: it determines the byte length being measured, and a differently-ordered projection
 * would make that measurement an artefact of this port rather than a fact about the game.
 */

import { clone } from './primitives.js';
import { apFor, capFor, rateFor } from './queries.js';
import type { GameState, UndoSnapshot } from './state.js';

const err = (m: string): { ok: false; error: string } => ({ ok: false, error: m });
const ok = (): { ok: true } => ({ ok: true });

/**
 * Snapshot the undoable slice of state.
 *
 * Note what is NOT captured: turn, phase, deck, discard, stats, seen, events. Undo rewinds a
 * player's actions within a turn, not the turn itself — which is why `beginCommand` clears the
 * stack outright rather than relying on it.
 */
export function pushUndo(g: GameState): void {
  const snap: UndoSnapshot = {
    inv: clone(g.invaders),
    cells: clone(g.cells),
    residents: clone(g.residents),
    ap: g.ap,
    antibodies: g.antibodies,
    ab: clone(g.ab),
    made: clone(g.made),
    memory: clone(g.memory),
    vaccine: clone(g.vaccine),
    clone: g.clone,
    cloneFound: g.cloneFound,
    presentations: g.presentations,
    free: clone(g.free || {}),
    organs: clone(g.organs),
    log: clone(g.log),
  };
  g.undo = g.undo || [];
  g.undo.push(snap);
  if (g.undo.length > 60) g.undo.shift();
}

export function undo(g: GameState): { ok: boolean; error?: string } {
  if (!g.undo || !g.undo.length) return err('Nothing to undo.');
  const u = g.undo.pop();
  if (!u) return err('Nothing to undo.');
  g.invaders = u.inv;
  g.cells = u.cells;
  g.residents = u.residents;
  g.ap = u.ap;
  g.antibodies = u.antibodies;
  g.ab = u.ab;
  g.made = u.made;
  g.memory = u.memory;
  g.vaccine = u.vaccine;
  g.clone = u.clone;
  g.cloneFound = u.cloneFound;
  g.presentations = u.presentations;
  g.free = u.free;
  g.organs = u.organs;
  g.log = u.log;
  return ok();
}

/**
 * The player-visible projection.
 *
 * FIELD ORDER IS LEGACY'S and must stay that way — see the file header. Note it deliberately
 * does NOT expose `stats`, which is why the NaN counters in docs/FINDINGS.md #3 are invisible
 * in play despite being real.
 */
export function viewState(g: GameState): Record<string, unknown> {
  return {
    phase: g.phase,
    turn: g.turn,
    maxTurn: g.maxTurn,
    ap: g.ap,
    apMax: apFor(g),
    antibodies: g.antibodies,
    antibodyCap: capFor(g),
    cells: clone(g.cells),
    invaders: clone(g.invaders),
    organs: clone(g.organs),
    organList: g.organList.slice(),
    drawn: g.drawn ? clone(g.drawn) : null,
    deckCount: g.deck.length,
    residents: clone(g.residents),
    presentations: g.presentations,
    antibodyRate: rateFor(g),
    free: clone(g.free || {}),
    flags: clone(g.flags),
    multiplayer: g.multiplayer,
    players: (g.players || []).slice(),
    captain: g.captain,
    owner: clone(g.owner || {}),
    apBudget: clone(g.apBudget || {}),
    apPool: g.apPool || 0,
    banner: g.banner || null,
    warning: g.warning || null,
    suppress: clone(g.suppress || {}),
    rareBanner: g.rareBanner || null,
    antivenom: g.antivenom,
    rare: clone(g.rare || {}),
    avOrder: g.avOrder || 0,
    ab: clone(g.ab || {}),
    made: clone(g.made || {}),
    memory: clone(g.memory || {}),
    vaccine: clone(g.vaccine || {}),
    seen: clone(g.seen || {}),
    clone: g.clone,
    cloneFound: g.cloneFound,
    novelSeen: g.novelSeen,
    undoDepth: (g.undo || []).length,
    log: g.log.slice(0, 40),
    difficulty: g.difficulty,
    won: g.won,
    lost: g.lost,
    science: g.science,
  };
}
