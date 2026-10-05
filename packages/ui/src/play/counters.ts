/**
 * WHAT ANTIBODIES DO TO EACH KIND OF INVADER, as a new card says it (docs/FINDINGS.md #129).
 *
 * The card's back said "[class] antibodies neutralise it" for every disease that has a class. The
 * engine lets antibodies neutralise only a virus, a toxin, malaria in the blood and a parasite that
 * changes its coat; they COAT a bacterium, a worm or a parasite so that cells can attack it; and a
 * hidden pathogen, venom and a fungus are beyond them. So for most of the deck the card said
 * something the game does not allow, and the biology does not say.
 *
 * This is a second statement of a rule the engine holds, and a second copy drifts, so it is held to
 * the engine: tests/session/src/counters.test.ts puts one invader of each kind in a game, gives it
 * matching antibodies, and tries both. Control: pnpm ci:selftest card-counters-are-the-engines.
 */

/** What matching antibodies can do to a kind of invader, by the engine's own rules. */
export type AntibodiesDo = 'coat' | 'neutralise' | 'neither' | 'coat or neutralise';

/** Every kind the content pack has (InvaderType), and what antibodies do to it. */
export const ANTIBODIES_DO: Readonly<Record<string, AntibodiesDo>> = {
  bacteria: 'coat',
  worm: 'coat',
  parasite: 'coat',
  virus: 'neutralise',
  toxin: 'neutralise',
  malaria: 'neutralise',
  hidden: 'neither',
  venom: 'neither',
  fungus: 'neither',
};

/**
 * A PARASITE THAT CHANGES ITS COAT (the content pack's `variant`, Sleeping sickness) may be
 * coated, and antibodies may also try to neutralise it; on each try, on a roll of 1 to 3, it changes
 * its coat and the antibody is lost (queue Q1). Found by the engine's test on its first run: "coat it" was true of it
 * and not the whole truth.
 */
export function antibodiesDo(type: string, variant: boolean): AntibodiesDo | null {
  if (type === 'parasite' && variant) return 'coat or neutralise';
  return ANTIBODIES_DO[type] ?? null;
}

/** The sentence each kind's card says, named in full so the catalogue's check can see each. */
const SENTENCE: Readonly<Record<string, string>> = {
  bacteria: 'arrivals.counter.bacteria',
  worm: 'arrivals.counter.worm',
  parasite: 'arrivals.counter.parasite',
  virus: 'arrivals.counter.virus',
  toxin: 'arrivals.counter.toxin',
  malaria: 'arrivals.counter.malaria',
  hidden: 'arrivals.counter.hidden',
  venom: 'arrivals.counter.venom',
  fungus: 'arrivals.counter.fungus',
};

/** The catalogue key a card of this kind says about antibodies, or null for a kind not known. */
export function counterSentence(type: string, variant: boolean): string | null {
  if (type === 'parasite' && variant) return 'arrivals.counter.parasiteVariant';
  return SENTENCE[type] ?? null;
}
