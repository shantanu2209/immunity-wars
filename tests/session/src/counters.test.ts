/**
 * WHAT A NEW CARD SAYS ANTIBODIES DO IS WHAT THE ENGINE LETS THEM DO (docs/FINDINGS.md #129).
 *
 * The card's back said "[class] antibodies neutralise it" for every disease with a class, which is
 * false of a bacterium, a worm, a fungus, venom and a hidden pathogen. The screens now say one thing
 * per kind (packages/ui/src/play/counters.ts), and that is a second statement of an engine rule, so
 * here every kind is put to the engine: one real card of it is placed where cells can reach it, every
 * class of antibody is held in plenty, and both a coat and a neutralise are tried. What the engine
 * accepts must be what the card says: coat, neutralise, or neither. It reads none of the engine's
 * source. Control: pnpm ci:selftest card-counters-are-the-engines.
 */
import { DECK_MASTER } from '@immunity-wars/content';
import * as engine from '@immunity-wars/engine';
import { ANTIBODIES_DO, antibodiesDo, type AntibodiesDo } from '@immunity-wars/ui';
import { describe, expect, it } from 'vitest';

type Loose = Record<string, unknown>;
type G = ReturnType<typeof engine.newGame>;
const CLASSES = ['ENV', 'NAK', 'EXB', 'ICB', 'TOX', 'EUK'];

/** A game in its command stage, with plenty of every antibody and Action Points to spend. */
function commanding(): G {
  const g = engine.newGame({ difficulty: 'training' });
  expect(engine.applyAction(g, { action: 'draw' }).ok).toBe(true);
  g.invaders.length = 0;
  (g as unknown as Loose)['phase'] = 'command';
  for (const f of CLASSES) (g.ab as Record<string, number>)[f] = 5;
  return g;
}

/** What the engine lets antibodies do to one card of this kind, placed where cells can reach it. */
function engineLets(disease: string): AntibodiesDo {
  const tried = (action: 'tag' | 'neutralise'): boolean => {
    const g = commanding();
    const iv = engine.forceInjectCard(g, disease) as unknown as Loose | null;
    if (!iv) throw new Error(`no card is named ${disease}`);
    Object.assign(iv, { zone: 'route', organ: null, step: 2 });
    return engine.applyAction(g, { action, invaderId: iv['id'] as string }).ok === true;
  };
  const coats = tried('tag');
  const neutralises = tried('neutralise');
  if (coats && neutralises) return 'coat or neutralise';
  return coats ? 'coat' : neutralises ? 'neutralise' : 'neither';
}

/** The cards of each kind the deck holds, a pathogen new to the body aside: its card says nothing. */
const DECK = DECK_MASTER as readonly {
  dz: string;
  type: string;
  novel?: boolean;
  variant?: boolean;
}[];
const byKind = new Map<string, { disease: string; variant: boolean }[]>();
for (const card of DECK) {
  if (card.novel) continue;
  byKind.set(card.type, [
    ...(byKind.get(card.type) ?? []),
    { disease: card.dz, variant: card.variant === true },
  ]);
}

describe('what a new card says antibodies do to each kind', () => {
  it('has a row for every kind in the deck, and no row for a kind the deck lacks', () => {
    // Read the coverage: an empty deck would agree with an empty table.
    expect(byKind.size).toBeGreaterThanOrEqual(9);
    expect([...byKind.keys()].sort()).toEqual(Object.keys(ANTIBODIES_DO).sort());
  });

  for (const kind of Object.keys(ANTIBODIES_DO)) {
    it(`${kind}: what each card of it says is what the engine allows`, () => {
      const cards = byKind.get(kind) ?? [];
      expect(cards.length, `the deck has a ${kind}`).toBeGreaterThan(0);
      const wrong = cards
        .map((c) => ({
          disease: c.disease,
          says: antibodiesDo(kind, c.variant),
          engine: engineLets(c.disease),
        }))
        .filter((c) => c.engine !== c.says);
      expect(wrong, 'A CARD SAYS WHAT ANTIBODIES DO AND THE ENGINE DOES NOT AGREE').toEqual([]);
    });
  }

  it('a parasite that changes its coat is told apart, and the deck has one', () => {
    const variants = DECK.filter((c) => c.variant === true).map((c) => c.dz);
    expect(variants.length).toBeGreaterThan(0);
    for (const disease of variants) expect(engineLets(disease)).toBe('coat or neutralise');
  });
});
