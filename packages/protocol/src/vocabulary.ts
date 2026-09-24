/**
 * THE WORDS BOTH SIDES SHARE: the versions, the seats, and the reasons a room can refuse.
 *
 * They live here, in the package both client and relay depend on, so neither owns a copy.
 */
import { RULES_VERSION } from '@immunity-wars/content';

/**
 * THE WIRE FORMAT'S VERSION. Bumped whenever a message changes shape in a way an old peer could
 * misread. A mismatch is REFUSED, never negotiated: Gate A requires that an old client "can never
 * desynchronise a newer room", and the only way a peer that cannot read a message can be kept from
 * acting on a misreading is not to let it in.
 */
export const PROTOCOL_VERSION = 2;

/*
 * VERSION HISTORY, because a bump with no record teaches nobody what changed.
 *
 *   1  P3.2 (21 September 2026): the first wire format.
 *   2  P3.4 (24 September 2026): a view carries `queries` and every scoped answer (the relay
 *      computes what LocalSession computes, docs/for-P3.md §4), an action carries an `id`, and
 *      the relay answers each action with a `result` for that id alone. A `create` message
 *      asks the relay for a new room, whose code the relay mints, and `join` is refused for a
 *      code the relay does not hold. No v1 peer ever ran
 *      against a relay; the bump is made anyway, because the rule is about shape, not audience.
 */

/**
 * THE RULES' VERSION, from the content pack (`packages/content/src/rules/pack.json`). Carried on
 * every message because a client rendering a view with a different pack would show the relay's game
 * through its own tables — a disease name, an organ's integrity — and be wrong without knowing it.
 *
 * **Compared for exact equality.** A patch release of the pack might change only text, and a looser
 * rule could say so, but "might" is the wrong word to build a desynchronisation guard on.
 */
export { RULES_VERSION };

/** The fourteen seats, as the engine keys them: seven cells and seven organ residents. */
export const CELL_SEATS = [
  'macrophage',
  'neutrophil',
  'bcell',
  'tcell',
  'helper',
  'nk',
  'eosinophil',
] as const;

export const ORGAN_SEATS = [
  'res_heart',
  'res_lungs',
  'res_liver',
  'res_brain',
  'res_spleen',
  'res_kidneys',
  'res_marrow',
] as const;

export const SEATS = [...CELL_SEATS, ...ORGAN_SEATS] as const;
export type Seat = (typeof SEATS)[number];

/**
 * WHY A ROOM SAID NO, as a code rather than a sentence.
 *
 * The UI renders every player-visible string through its catalogue (`CLAUDE.md`), and a Hindi
 * edition is a committed deliverable, so the relay never sends English. It sends one of these and
 * the client words it. The single exception is `engine`: when the ENGINE refuses an action, its own
 * error text is the detail, exactly as in single player, where the UI already renders engine text
 * through the engine catalogue.
 */
export const ERROR_CODES = [
  'notInRoom',
  'gameEnded',
  'lobbyClosed',
  'noSuchSeat',
  'seatTaken',
  'notCaptain',
  'seatHeldByPresent',
  'noSuchMember',
  'memberAway',
  'alreadyStarted',
  'nobodySeated',
  'notStarted',
  'notYourPiece',
  /** An action that is the ROOM's to send, never a player's: `handOverCaptaincy` (FINDINGS #78). */
  'roomOnly',
  /**
   * UNDO IS SINGLE-PLAYER IN v1 (P3.4, FINDINGS #79): the engine keeps one undo stack for the whole
   * game, so in a room it would unwind whichever move came last — possibly another player's.
   */
  'undoIsSinglePlayer',
  /**
   * `join` named a code the relay does not hold: mistyped, or a room discarded after its grace
   * period, which Gate A requires cannot be rejoined (P3.4).
   */
  'noSuchRoom',
  /**
   * Sent to a peer on ANOTHER version just before the relay closes it (P3.4). That peer reads only
   * the header, which carries the relay's versions, and so can tell its player which side is out of
   * date; the body exists because every frame must be a valid message on the version that sends it.
   */
  'version',
  'engine',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
