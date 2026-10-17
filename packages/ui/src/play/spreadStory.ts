/**
 * WHAT THE SPREAD DID, AND WHY (step 3, `docs/LOOK_PLAN.md` §28; `docs/FINDINGS.md` #130).
 *
 * The engine hands the spread over as beats, each a picture of the body with the beat's name. Some
 * beats are named whether or not anything happened: "Toxin released" is pushed every turn toxins
 * are in the game, which is every game, and "The march" every turn. The screens played every beat
 * and listed every name, so every spread said a toxin had been released when none had, and a
 * player could not tell what had happened from what might have.
 *
 * So a beat is played when it rolled dice or changed the body, and listed when it changed the body;
 * a few say something whatever the picture (a fever that held the march, the game's end). And each
 * beat listed carries the rule that made it happen, from the catalogue: `why.<the beat's key>`.
 *
 * Every why is a rule, so a second statement of the engine's; the ones a newcomer meets first are
 * held to the engine by `tests/session/src/spread-story.test.ts`. Controls: pnpm ci:selftest
 * spread-story-says-only-what-happened, spread-plays-only-what-did-something,
 * spread-story-sees-what-a-player-sees, spread-why-is-the-engines.
 */
import { ENGINE_I18N_EN } from '@immunity-wars/content';

/** A beat of the spread, as the session hands it over. */
export interface SpreadBeat {
  readonly label: string;
  readonly dice?: unknown;
  readonly view: Readonly<Record<string, unknown>>;
}

/**
 * What the body is: what a beat must change for something to have happened. Of an invader, only
 * what a player can see of it: a count it keeps for itself (the turns a toxin maker has been left
 * alone, a worm's clock) changes every turn and is not something that happened. The test found
 * exactly that: with the whole invader compared, every spread said a toxin had been released.
 */
const SEEN = ['id', 'type', 'disease', 'zone', 'lane', 'organ', 'step', 'tagged', 'hp', 'stage'];
const BODY = ['organs', 'residents', 'cells', 'lost', 'won'] as const;
const body = (v: Readonly<Record<string, unknown>>): string =>
  JSON.stringify([
    ((v['invaders'] as Record<string, unknown>[] | undefined) ?? []).map((iv) =>
      SEEN.map((k) => iv[k] ?? null),
    ),
    ...BODY.map((k) => v[k] ?? null),
  ]);

/** The engine's catalogue key for a beat's name, found by its text. */
const KEY_OF = new Map(Object.entries(ENGINE_I18N_EN).map(([k, v]) => [v, k]));
export const beatKey = (label: string): string => KEY_OF.get(label) ?? '';

/** Beats that say something whatever the picture shows. */
const ALWAYS = new Set(['spread.fever', 'spread.organFailure', 'spread.defeat', 'actions.victory']);

/** Whether a beat rolled dice that are shown. */
const rolled = (b: SpreadBeat): boolean => Array.isArray(b.dice) && b.dice.length > 0;

/**
 * The beats worth playing: each that rolled dice, changed the body, or always says something. The
 * last is always kept, since it is the new turn arriving and the board must end on it.
 */
export function beatsToPlay<T extends SpreadBeat>(
  before: Readonly<Record<string, unknown>>,
  beats: readonly T[],
): T[] {
  let was = body(before);
  return beats.filter((b, i) => {
    const now = body(b.view);
    const changed = now !== was;
    was = now;
    return i === beats.length - 1 || changed || rolled(b) || ALWAYS.has(beatKey(b.label));
  });
}

export interface StoryLine {
  /** The beat's name, as the engine wrote it. */
  readonly label: string;
  /** The catalogue key of the rule that made it happen; null for a beat with none. */
  readonly why: string | null;
}

/** The catalogue keys of the whys there are. */
const WHY = new Set([
  'spread.complement',
  'spread.bacteriaDivide',
  'spread.cellsBurst',
  'spread.virusesHide',
  'spread.toxinReleased',
  'spread.malariaBursts',
  'spread.wormsFeed',
  'spread.lymphaticSpread',
  'spread.fever',
  'spread.theMarch',
  'spread.malariaHidesInTheLiver',
  'spread.kalaAzarHidesInsideAMacrophage',
  'spread.wormsLodgeInTheTissue',
  'spread.organDamage',
  'spread.organFailure',
]);

/**
 * What the spread did, to be read at rest: each beat that changed the body, or always says
 * something, with its why. The last beat, the new turn arriving, is not something the spread did.
 */
export function spreadStory(
  before: Readonly<Record<string, unknown>>,
  beats: readonly SpreadBeat[],
): StoryLine[] {
  const out: StoryLine[] = [];
  let was = body(before);
  beats.forEach((b, i) => {
    const now = body(b.view);
    const changed = now !== was;
    was = now;
    if (i === beats.length - 1 || b.label === '') return;
    const key = beatKey(b.label);
    if (!changed && !ALWAYS.has(key)) return;
    out.push({ label: b.label, why: WHY.has(key) ? `why.${key}` : null });
  });
  return out;
}
