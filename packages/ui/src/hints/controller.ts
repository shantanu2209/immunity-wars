/**
 * FIRST-ENCOUNTER HINTS — the decision logic, with no React and no storage in it.
 *
 * Built to `docs/for-P2.6-onboarding.md`, all five points ruled by Shantanu on 8 September 2026.
 * This file is the part that can be wrong in a way nobody would notice, so it is pure and it is
 * tested directly rather than through a rendered screen.
 *
 * ============================================================================================
 * THE THREE RULES, AND WHY EACH IS SHAPED THE WAY IT IS
 * ============================================================================================
 *
 * **1. FIRST CONTACT, NOT FIRST SIGHT** (the direction). A player who has not touched a thing
 * has not encountered it. Selecting a Neutrophil is contact; one standing on the board is not.
 * So nothing here reacts to the view — only to `contact()`.
 *
 * **2. AT MOST TWO NEW HINTS PER TURN** (ruling 1). Measured first: a first turn on Training
 * puts seventeen things within reach of a tap, so without a cap a curious newcomer gets a hint
 * for every cell they try before doing anything, which is the narration this was ruled against.
 * A third subject contacted in the same turn is **not consumed** — it stays unseen and fires on
 * its next contact, in a later turn.
 *
 * Shantanu kept the trigger at selecting rather than acting, on the reasoning that tapping a
 * cell to find out what it is IS the moment of curiosity, and acting requires already knowing
 * enough to act, which is later than the question arises.
 *
 * **3. ONE ON SCREEN, MOST RECENT WINS, AND THE DISPLACED ONE IS NOT CONSUMED** (ruling 3). A
 * hint answers the tap that just happened; an answer to a previous tap is the wrong answer. And
 * a hint the player may never have read must not be spent:
 *
 * > **A hint is consumed when it leaves the screen for any reason EXCEPT being displaced by
 * > another hint.**
 *
 * That single sentence is the whole consumption rule, and it is what makes "once per thing,
 * ever" true rather than "at most once". Dismissed: consumed. Selection moved to something with
 * no hint: consumed, because the player looked and moved on. Pushed aside by a newer hint:
 * **not** consumed.
 */

/** A thing a hint can be about. Namespaced so a cell and an invader cannot collide. */
export type HintSubject = string;

export const cellSubject = (cell: string): HintSubject => `cell:${cell}`;
export const invaderSubject = (type: string): HintSubject => `invader:${type}`;
export const RESIDENT_SUBJECT: HintSubject = 'resident';
export const ANTIBODY_SUBJECT: HintSubject = 'antibodyClass';

/** Where a subject's hint is rendered. One hint shows at a time, so this says which surface. */
export type HintPlace = 'pieces' | 'inspect' | 'antibodies';

export function hintPlace(subject: HintSubject): HintPlace {
  if (subject.startsWith('invader:')) return 'inspect';
  if (subject === ANTIBODY_SUBJECT) return 'antibodies';
  return 'pieces';
}

/** The catalogue key holding a subject's hint. The rest of the entry is the `.rest` sibling. */
export function hintKey(subject: HintSubject): string {
  if (subject === RESIDENT_SUBJECT) return 'help.cell.resident.text.hint';
  if (subject === ANTIBODY_SUBJECT) return 'help.antibodyClass.hint';
  if (subject.startsWith('invader:'))
    return `help.invader.${subject.slice('invader:'.length)}.hint`;
  return `help.cell.${subject.slice('cell:'.length)}.hint`;
}

/** How many NEW hints may be shown in one turn. Ruling 1. */
export const PER_TURN_CAP = 2;

export interface HintState {
  /** Subjects the player has been shown and has finished with. Persisted by the shell. */
  readonly seen: readonly HintSubject[];
  /** The turn the cap is being counted within. */
  readonly turn: number;
  /** New hints already shown this turn. */
  readonly firedThisTurn: number;
  /** What is on screen, or null. */
  readonly shown: HintSubject | null;
}

export const initialHintState = (seen: readonly HintSubject[], turn: number): HintState => ({
  seen,
  turn,
  firedThisTurn: 0,
  shown: null,
});

const consume = (state: HintState): readonly HintSubject[] =>
  state.shown && !state.seen.includes(state.shown) ? [...state.seen, state.shown] : state.seen;

/**
 * The player touched something, or touched nothing (`null` — a deselection, or a subject with no
 * hint). Returns the next state; the caller persists `seen` when it grows.
 *
 * The turn is passed in rather than tracked, because the cap is per turn and the turn is the
 * view's to know. A turn change resets the count.
 */
export function contact(state: HintState, subject: HintSubject | null, turn: number): HintState {
  const turnChanged = turn !== state.turn;
  const firedBefore = turnChanged ? 0 : state.firedThisTurn;

  const canShow = subject !== null && !state.seen.includes(subject) && firedBefore < PER_TURN_CAP;

  if (canShow && subject !== state.shown) {
    // DISPLACEMENT: whatever was showing is pushed aside WITHOUT being consumed (ruling 3).
    return { seen: state.seen, turn, firedThisTurn: firedBefore + 1, shown: subject };
  }
  if (canShow) {
    // The same subject touched again while its hint is up: nothing changes, and it does not
    // count twice against the cap.
    return { ...state, turn, firedThisTurn: firedBefore };
  }
  // Nothing new to show. Anything on screen leaves for a reason that is NOT displacement, so it
  // is consumed — the player looked at it and moved on.
  return { seen: consume(state), turn, firedThisTurn: firedBefore, shown: null };
}

/** The player dismissed the hint. Consumed. */
export function dismiss(state: HintState): HintState {
  return { ...state, seen: consume(state), shown: null };
}

/** The surface holding the hint closed (a sheet dismissed, the game left). Consumed. */
export const leave = dismiss;
