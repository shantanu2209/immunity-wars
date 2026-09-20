/**
 * The coach, held to the three things it must not do and to each rule it does.
 *
 * The suite that matters is "never asks for something the engine would refuse": the coach is given
 * the offer COUNT and must not invent an instruction when it is zero. A coach that tells a newcomer
 * to tap a pathogen that cannot be attacked teaches them the game is broken.
 */
import { describe, expect, it } from 'vitest';

import { COACH_TURNS, coachStep, type CoachInput } from './coach';

const at = (over: Partial<CoachInput> = {}): CoachInput => ({
  stage: 'command',
  turn: 1,
  ap: 6,
  selected: false,
  offeredCount: 0,
  canProduce: false,
  ...over,
});

describe('it stops', () => {
  it('says nothing after the opening turns', () => {
    expect(coachStep(at({ turn: COACH_TURNS + 1 }))).toBeNull();
    expect(coachStep(at({ stage: 'planning', turn: COACH_TURNS + 1 }))).toBeNull();
  });

  it('still speaks on the last turn it covers', () => {
    expect(coachStep(at({ turn: COACH_TURNS }))?.id).toBe('select');
  });
});

describe('it is silent while a spread plays', () => {
  it('says nothing, because nothing is accepted then', () => {
    expect(coachStep(at({ stage: 'spread' }))).toBeNull();
  });
});

describe('each stage', () => {
  it('names the cards on the arrivals stage', () => {
    expect(coachStep(at({ stage: 'arrivals' }))?.id).toBe('arrivals');
  });

  it('names the body in planning', () => {
    expect(coachStep(at({ stage: 'planning' }))?.id).toBe('planning');
  });

  it('asks for a selection in command when nothing is selected', () => {
    expect(coachStep(at({ selected: false }))?.id).toBe('select');
  });

  it('asks for the action when one is offered', () => {
    expect(coachStep(at({ selected: true, offeredCount: 2 }))?.id).toBe('act');
  });

  it('sends the player to the antibodies when that is what is left', () => {
    expect(coachStep(at({ selected: true, offeredCount: 0, canProduce: true }))?.id).toBe(
      'produce',
    );
  });

  it('says the turn is over when there are no points left', () => {
    expect(coachStep(at({ ap: 0, selected: true, offeredCount: 3 }))?.id).toBe('noAp');
  });
});

describe('it never asks for what the engine would refuse', () => {
  it('does not say "act" when nothing at all is offered', () => {
    const s = coachStep(at({ selected: true, offeredCount: 0, canProduce: false }));
    expect(s?.id).toBe('elsewhere');
  });

  it('prefers no points over every other command rule, since nothing can be done at all', () => {
    expect(coachStep(at({ ap: 0, selected: false, offeredCount: 0 }))?.id).toBe('noAp');
    expect(coachStep(at({ ap: 0, selected: true, canProduce: true }))?.id).toBe('noAp');
  });

  it('gives every step a stable id, so a dismissed step stays dismissed', () => {
    expect(coachStep(at())?.id).toBe(coachStep(at())?.id);
  });
});
