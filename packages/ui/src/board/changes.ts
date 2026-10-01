/**
 * WHAT CHANGED ON THE BOARD between one picture of the game and the next — stage L4 of
 * docs/LOOK_PLAN.md (§14), the third pull request: motion and sound.
 *
 * The board is given a view and draws it. To MOVE a piece it has to know that the piece now on
 * this step is the one that was on that step a moment ago, and to play a sound it has to know what
 * kind of thing just happened. Nothing tells it: the engine hands over states, not events. So the
 * two pictures are compared here, and what they differ by is named.
 *
 * THIS IS NOT A RULE OF THE GAME, and decides nothing. It reads what was drawn before and what is
 * drawn now. If it is wrong, a piece arrives where it should have walked, or a sound is the wrong
 * one; the game is the same either way.
 *
 * WHO IS WHO. One of your cells keeps its key from picture to picture. What invades does not: a
 * piece on the board stands for every invader of one kind and class on one step, and its key has
 * the step in it, so a group that walks a step has a new key. The invaders' own ids are what carry
 * across, and a piece is followed by the ids it stands for.
 *
 * Pure, so it is tested as a model (`changes.test.ts`) before the board plays anything from it.
 */
import type { KitSound } from '../kit/sound';
import type { Pt } from './geometry';

/** One piece as it is drawn: enough to say where it was and what it stood for. */
export interface Drawn {
  key: string;
  kind: 'invader' | 'cell';
  /** Where it is drawn, in board units. */
  at: Pt;
  scale: number;
  /** The step it stands on: several pieces share one, each drawn a little apart. */
  step: Pt;
  /** The invaders it stands for. Empty for a cell. */
  ids: readonly string[];
  coated: boolean;
}

export interface Picture {
  pieces: readonly Drawn[];
  /** Each organ's health. */
  organs: Readonly<Record<string, number>>;
}

export type Change =
  /** It is drawn somewhere else. `stepped`: it went to another step, and was not only nudged aside. */
  | { kind: 'move'; key: string; from: Pt; stepped: boolean }
  /** It was not on the board before. */
  | { kind: 'arrive'; key: string }
  /** It was on the board and is not now. `eater`: the cell on its step that it went into. */
  | { kind: 'leave'; piece: Drawn; eater: Drawn | null }
  /** The same invaders, now coated in antibody. */
  | { kind: 'coat'; key: string }
  /** The piece is still there and stands for fewer than it did. */
  | { kind: 'thin'; key: string }
  /** The piece is still there and stands for more than it did: what it stands for has multiplied. */
  | { kind: 'grow'; key: string }
  /** An organ lost health. */
  | { kind: 'hurt'; organ: string };

/** Nearer than this, in board units, a piece has not moved: it is where it was. */
const STILL = 0.5;
const same = (a: Pt, b: Pt): boolean => Math.abs(a.x - b.x) < STILL && Math.abs(a.y - b.y) < STILL;

export function boardChanges(before: Picture, now: Picture): Change[] {
  const changes: Change[] = [];
  const was = new Map(before.pieces.map((p) => [p.key, p]));
  const is = new Map(now.pieces.map((p) => [p.key, p]));
  /** Which piece each invader was part of, before. */
  const wasIn = new Map<string, Drawn>();
  for (const p of before.pieces) for (const id of p.ids) wasIn.set(id, p);
  const stillHere = new Set(now.pieces.flatMap((p) => p.ids));

  for (const p of now.pieces) {
    if (p.kind === 'cell') {
      const old = was.get(p.key);
      if (!old) changes.push({ kind: 'arrive', key: p.key });
      else if (!same(old.at, p.at))
        changes.push({ kind: 'move', key: p.key, from: old.at, stepped: !same(old.step, p.step) });
      continue;
    }
    // An invader's piece: followed by the invaders it stands for.
    const from = p.ids.map((id) => wasIn.get(id)).find((old) => old !== undefined);
    if (!from) {
      changes.push({ kind: 'arrive', key: p.key });
      continue;
    }
    if (p.coated && !from.coated && same(from.step, p.step)) {
      changes.push({ kind: 'coat', key: p.key });
      continue;
    }
    if (!same(from.at, p.at))
      changes.push({
        kind: 'move',
        key: p.key,
        from: from.at,
        stepped: !same(from.step, p.step),
      });
    else {
      const old = was.get(p.key);
      if (old !== undefined && p.ids.length < old.ids.length)
        changes.push({ kind: 'thin', key: p.key });
      else if (old !== undefined && p.ids.length > old.ids.length)
        changes.push({ kind: 'grow', key: p.key });
    }
  }

  for (const p of before.pieces) {
    if (p.kind === 'cell') {
      if (!is.has(p.key)) changes.push({ kind: 'leave', piece: p, eater: null });
      continue;
    }
    // Gone only when none of the invaders it stood for is anywhere on the board now.
    if (p.ids.length === 0 || p.ids.some((id) => stillHere.has(id))) continue;
    // What it went into: one of your cells standing on its step, if there is one.
    const eater = now.pieces.find((c) => c.kind === 'cell' && same(c.step, p.step)) ?? null;
    changes.push({ kind: 'leave', piece: p, eater });
  }

  for (const [organ, hp] of Object.entries(now.organs)) {
    const old = before.organs[organ];
    if (old !== undefined && hp < old) changes.push({ kind: 'hurt', organ });
  }
  return changes;
}

/**
 * THE ONE SOUND FOR WHAT JUST HAPPENED. A turn's spread can change a dozen things in one picture;
 * a dozen sounds at once is a noise. So the picture gets one, and it is the one for the thing that
 * matters most: an organ hurt, then a pathogen swallowed, then a coat, then an arrival, then a step
 * taken. A piece only nudged aside to make room is not a step, and is silent. Null: nothing to say.
 */
export function soundFor(changes: readonly Change[]): KitSound | null {
  if (changes.some((c) => c.kind === 'hurt')) return 'hurt';
  if (changes.some((c) => c.kind === 'leave' && c.eater !== null)) return 'engulf';
  if (changes.some((c) => c.kind === 'coat')) return 'coat';
  if (changes.some((c) => c.kind === 'arrive' || c.kind === 'grow')) return 'arrive';
  if (changes.some((c) => c.kind === 'move' && c.stepped)) return 'move';
  // Something left with nothing to swallow it (a strike from a distance), or a group grew thinner.
  if (changes.some((c) => c.kind === 'leave' || c.kind === 'thin')) return 'tap';
  return null;
}
