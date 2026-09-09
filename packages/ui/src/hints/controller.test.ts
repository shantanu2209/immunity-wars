/**
 * The hint controller, tested at the three rules it exists to keep.
 *
 * The consumption rule is the one worth the most tests, because getting it wrong is invisible:
 * a hint consumed too eagerly means a player never sees it and nobody can tell, and a hint
 * consumed too lazily means it repeats forever, which they will tell you about immediately.
 * Only one of those two failure modes reports itself, so the other gets the coverage.
 */

import { describe, expect, it } from 'vitest';

import {
  ANTIBODY_SUBJECT,
  PER_TURN_CAP,
  RESIDENT_SUBJECT,
  cellSubject,
  contact,
  dismiss,
  hintKey,
  hintPlace,
  initialHintState,
  invaderSubject,
  leave,
  type HintState,
} from './controller';

const fresh = (turn = 1): HintState => initialHintState([], turn);

describe('first contact', () => {
  it('shows a hint for an unseen subject', () => {
    const s = contact(fresh(), cellSubject('neutrophil'), 1);
    expect(s.shown).toBe('cell:neutrophil');
    expect(s.firedThisTurn).toBe(1);
  });

  it('shows nothing for a subject already seen', () => {
    const s = contact(initialHintState(['cell:neutrophil'], 1), cellSubject('neutrophil'), 1);
    expect(s.shown).toBeNull();
    expect(s.firedThisTurn).toBe(0);
  });

  it('touching the same subject again does not count twice against the cap', () => {
    let s = contact(fresh(), cellSubject('nk'), 1);
    s = contact(s, cellSubject('nk'), 1);
    expect(s.shown).toBe('cell:nk');
    expect(s.firedThisTurn).toBe(1);
  });
});

describe('the per-turn cap', () => {
  it(`shows at most ${PER_TURN_CAP} new hints in one turn`, () => {
    let s = fresh();
    s = contact(s, cellSubject('a'), 1);
    s = contact(s, cellSubject('b'), 1);
    s = contact(s, cellSubject('c'), 1);
    expect(s.firedThisTurn).toBe(PER_TURN_CAP);
    expect(s.shown).toBeNull();
  });

  it('the subject held back by the cap is NOT consumed, and fires on its next contact', () => {
    let s = fresh();
    s = contact(s, cellSubject('a'), 1);
    s = contact(s, cellSubject('b'), 1);
    s = contact(s, cellSubject('c'), 1);
    expect(s.seen).not.toContain('cell:c');
    // A later turn, and c gets its hint.
    s = contact(s, cellSubject('c'), 2);
    expect(s.shown).toBe('cell:c');
  });

  it('the count resets on a new turn', () => {
    let s = fresh();
    s = contact(s, cellSubject('a'), 1);
    s = contact(s, cellSubject('b'), 1);
    expect(s.firedThisTurn).toBe(2);
    s = contact(s, cellSubject('c'), 2);
    expect(s.firedThisTurn).toBe(1);
    expect(s.shown).toBe('cell:c');
  });

  it('a measured first turn produces exactly two, whatever the player taps', () => {
    // The measurement behind the cap: seven cells reachable on turn one.
    let s = fresh();
    const cells = ['macrophage', 'neutrophil', 'bcell', 'tcell', 'helper', 'nk', 'eosinophil'];
    for (const c of cells) s = contact(s, cellSubject(c), 1);
    expect(s.firedThisTurn).toBe(2);
    expect(s.seen.length).toBeLessThanOrEqual(2);
  });
});

describe('the consumption rule', () => {
  it('CONTROL: a DISPLACED hint is not consumed, so it can still be seen later', () => {
    let s = contact(fresh(), cellSubject('a'), 1);
    expect(s.shown).toBe('cell:a');
    s = contact(s, cellSubject('b'), 1); // b displaces a
    expect(s.shown).toBe('cell:b');
    expect(s.seen).not.toContain('cell:a');
    // Next turn, a is still owed its hint. This is the whole of "once per thing, EVER".
    s = contact(s, cellSubject('a'), 2);
    expect(s.shown).toBe('cell:a');
  });

  it('a dismissed hint IS consumed and does not come back', () => {
    let s = contact(fresh(), cellSubject('a'), 1);
    s = dismiss(s);
    expect(s.shown).toBeNull();
    expect(s.seen).toContain('cell:a');
    s = contact(s, cellSubject('a'), 2);
    expect(s.shown).toBeNull();
  });

  it('a hint left behind by moving to something with no hint IS consumed', () => {
    let s = contact(fresh(), cellSubject('a'), 1);
    s = contact(s, null, 1); // deselected
    expect(s.shown).toBeNull();
    expect(s.seen).toContain('cell:a');
  });

  it('a hint left behind by moving to an ALREADY SEEN subject is consumed', () => {
    let s = initialHintState(['cell:b'], 1);
    s = contact(s, cellSubject('a'), 1);
    s = contact(s, cellSubject('b'), 1);
    expect(s.shown).toBeNull();
    expect(s.seen).toContain('cell:a');
  });

  it('closing the surface consumes it', () => {
    let s = contact(fresh(), invaderSubject('worm'), 1);
    s = leave(s);
    expect(s.seen).toContain('invader:worm');
  });

  it('CONTROL: consumption is not unconditional — nothing is consumed when nothing is shown', () => {
    const s = dismiss(fresh());
    expect(s.seen).toEqual([]);
  });

  it('a subject is never recorded twice', () => {
    let s = contact(fresh(), cellSubject('a'), 1);
    s = dismiss(s);
    s = contact(s, cellSubject('a'), 2);
    s = dismiss(s);
    expect(s.seen.filter((x) => x === 'cell:a')).toHaveLength(1);
  });
});

describe('subjects map to their catalogue keys and their surfaces', () => {
  it('each namespace resolves to the right key', () => {
    expect(hintKey(cellSubject('neutrophil'))).toBe('help.cell.neutrophil.hint');
    expect(hintKey(invaderSubject('worm'))).toBe('help.invader.worm.hint');
    expect(hintKey(RESIDENT_SUBJECT)).toBe('help.cell.resident.text.hint');
    expect(hintKey(ANTIBODY_SUBJECT)).toBe('help.antibodyClass.hint');
  });

  it('each namespace renders on the right surface', () => {
    expect(hintPlace(cellSubject('nk'))).toBe('pieces');
    expect(hintPlace(RESIDENT_SUBJECT)).toBe('pieces');
    expect(hintPlace(invaderSubject('virus'))).toBe('inspect');
    expect(hintPlace(ANTIBODY_SUBJECT)).toBe('antibodies');
  });

  it('CONTROL: a cell and an invader of the same name do not collide', () => {
    expect(hintKey(cellSubject('x'))).not.toBe(hintKey(invaderSubject('x')));
    expect(cellSubject('x')).not.toBe(invaderSubject('x'));
  });
});
