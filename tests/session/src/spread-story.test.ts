/**
 * WHAT THE SPREAD DID, AND WHY, HELD TO THE ENGINE (step 3, `docs/LOOK_PLAN.md` §28; FINDINGS #130).
 *
 * `packages/ui/src/play/spreadStory.ts` lists the beats of a spread that changed the body, each with
 * the rule that made it happen. Two things are held here, against spreads the real engine runs:
 *
 *  1. It says only what happened. The engine names a "Toxin released" beat every turn toxins are in
 *     the game, which is every game; the screens said it every turn. A spread with no toxin maker in
 *     the body must not say it, and one in which a bacterium divided must.
 *  2. The whys a newcomer meets first say what the engine does: a coated bacterium never divides; a
 *     free virus that hides cannot be neutralised; an invader that reaches an organ takes 1 of its
 *     integrity; a toxin maker releases its toxin after 3 turns uncoated; an invader advances.
 *
 * Controls: pnpm ci:selftest spread-story-says-only-what-happened, spread-plays-only-what-did-something,
 * spread-story-sees-what-a-player-sees, spread-why-is-the-engines.
 */
import { UI_I18N_EN } from '@immunity-wars/content';
import * as engine from '@immunity-wars/engine';
import { beatsToPlay, spreadStory, type SpreadBeat } from '@immunity-wars/ui';
import { describe, expect, it } from 'vitest';

type Loose = Record<string, unknown>;
type G = ReturnType<typeof engine.newGame>;
type Inv = { id: string; disease: string; type: string; tagged?: boolean; emitted?: boolean };

/** An Easy game with its body empty, ready for a spread. */
function empty(): G {
  const g = engine.newGame({ difficulty: 'training' });
  g.invaders.length = 0;
  return g;
}
/** Put a card's invader on a step of a route. */
function placed(g: G, disease: string, lane: string, step: number): Loose {
  const iv = engine.forceInjectCard(g, disease) as unknown as Loose | null;
  if (!iv) throw new Error(`no card is named ${disease}`);
  Object.assign(iv, { zone: 'route', lane, organ: null, step });
  return iv;
}
/** With every die showing one face: the engine's die is 1 + floor(random x 6). */
function withFace<T>(face: number, run: () => T): T {
  const real = Math.random;
  Math.random = (): number => (face - 0.5) / 6;
  try {
    return run();
  } finally {
    Math.random = real;
  }
}
/** A spread run, and what the screens say of it. */
function spread(
  g: G,
  face: number,
): { before: Loose; beats: SpreadBeat[]; story: string[]; whys: string[] } {
  const before = engine.viewState(g);
  const beats = withFace(face, () => engine.resolveSpread(g)) as unknown as SpreadBeat[];
  const story = spreadStory(before, beats);
  return {
    before,
    beats,
    story: story.map((l) => l.label),
    whys: story.map((l) => l.why ?? ''),
  };
}
const say = UI_I18N_EN as Record<string, string>;
const invaders = (g: G): Inv[] => g.invaders as unknown as Inv[];

describe('the spread says only what happened', () => {
  it('a spread with no toxin maker does not say a toxin was released, though the engine names it', () => {
    const g = empty();
    placed(g, 'Influenza', 'nose', 3);
    const { before, beats, story } = spread(g, 6);
    // The engine's own beat is there: this is what the screens used to list.
    expect(beats.map((b) => b.label)).toContain('Toxin released');
    expect(story, 'THE SPREAD SAYS SOMETHING HAPPENED THAT DID NOT').not.toContain(
      'Toxin released',
    );
    // Nor is it played as a beat of its own: the board would show its name over nothing.
    expect(
      beatsToPlay(before, beats).map((b) => b.label),
      'A BEAT THAT DID NOTHING IS PLAYED',
    ).not.toContain('Toxin released');
    // What did happen is said: the virus advanced.
    expect(story).toContain('The march');
  });

  it('a bacterium that divided is said, with why', () => {
    const g = empty();
    placed(g, 'Whooping cough', 'nose', 3);
    const { story, whys } = spread(g, 1);
    expect(story).toContain('Bacteria divide');
    expect(whys).toContain('why.spread.bacteriaDivide');
  });

  it('a bacterium that rolled and did not divide is played, for its dice, and not said', () => {
    const g = empty();
    placed(g, 'Whooping cough', 'nose', 3);
    const before = engine.viewState(g);
    const { beats, story } = spread(g, 6);
    expect(beatsToPlay(before, beats).map((b) => b.label)).toContain('Bacteria divide');
    expect(story).not.toContain('Bacteria divide');
  });

  it('every why it gives has its sentence', () => {
    const g = empty();
    placed(g, 'Whooping cough', 'nose', 1);
    placed(g, 'Influenza', 'gut', 1);
    const { whys } = spread(g, 1);
    expect(whys.length).toBeGreaterThan(0);
    for (const w of whys.filter((x) => x !== '')) expect(say[w], w).toBeTruthy();
  });
});

describe('each why says what the engine does', () => {
  it('a coated bacterium never divides, on any face of the die', () => {
    expect(say['why.spread.bacteriaDivide']).toMatch(/coated one never does/);
    for (let face = 1; face <= 6; face += 1) {
      const g = empty();
      const iv = placed(g, 'Whooping cough', 'nose', 3);
      iv['tagged'] = true;
      spread(g, face);
      const n = invaders(g).filter((x) => x.disease === 'Whooping cough').length;
      expect(n, `A COATED BACTERIUM DIVIDED on a ${String(face)}`).toBe(1);
    }
  });

  it('a free virus that hides can no longer be neutralised', () => {
    expect(say['why.spread.virusesHide']).toMatch(/antibodies cannot reach it/);
    const g = empty();
    const iv = placed(g, 'Influenza', 'nose', 4);
    spread(g, 1);
    const now = invaders(g).find((x) => x.id === iv['id']);
    expect(now?.type, 'the virus hid').toBe('hidden');
    g.phase = 'command';
    (g.ab as Record<string, number>)['ENV'] = 5;
    expect(engine.applyAction(g, { action: 'neutralise', invaderId: now?.id }).ok).toBe(false);
  });

  it('an invader that reaches an organ takes 1 of its integrity', () => {
    expect(say['why.spread.organDamage'], 'THE WHY IS NOT WHAT THE ENGINE DOES').toMatch(
      /takes 1 of its integrity/,
    );
    const g = empty();
    const iv = placed(g, 'Whooping cough', 'nose', 1);
    Object.assign(iv, { zone: 'branch', lane: null, organ: 'lungs', step: 1, tagged: true });
    const hp = (g.organs['lungs'] as { hp: number }).hp;
    const { story } = spread(g, 6);
    expect(story).toContain('Organ damage');
    expect((g.organs['lungs'] as { hp: number }).hp).toBe(hp - 1);
  });

  it('a toxin maker releases its toxin after 3 turns uncoated, and not before', () => {
    expect(say['why.spread.toxinReleased']).toMatch(/3 turns/);
    const g = empty();
    // Far out on a long route, so that it is still on the board after three spreads.
    const iv = placed(g, 'Tetanus', 'nose', 5);
    const said: boolean[] = [];
    for (let turn = 1; turn <= 3; turn += 1) {
      iv['step'] = 5;
      said.push(spread(g, 6).story.includes('Toxin released'));
    }
    expect(said, 'A TOXIN WAS RELEASED ON THE WRONG TURN').toEqual([false, false, true]);
  });

  it('an invader advances toward the organs', () => {
    expect(say['why.spread.theMarch']).toMatch(/move toward the organs/);
    const g = empty();
    const iv = placed(g, 'Whooping cough', 'nose', 3);
    iv['tagged'] = true;
    spread(g, 6);
    expect(invaders(g).find((x) => x.id === iv['id']) as unknown as Loose).toMatchObject({
      step: 2,
    });
  });
});
