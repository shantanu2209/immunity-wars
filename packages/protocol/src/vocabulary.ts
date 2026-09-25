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
export const PROTOCOL_VERSION = 3;

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
 *   3  (25 September 2026, after the first game on the live server): the table's fixed messages.
 *      A member sends `say` with a message's id, and the relay tells everyone `said`, with who.
 *      A v2 relay would have closed a `say` as malformed, and a v2 client a `said`. Adding a
 *      message later does NOT bump the version: the id's shape is the protocol's, the list of ids
 *      is the room's, and a client that does not know an id shows nothing for it.
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

/** A resident's seat, from the organ the engine keys it by. */
export const residentSeat = (organ: string): string => `res_${organ}`;

/**
 * THE ENGINE'S NAME FOR A MEMBER, from their public id (their join order). The room tells the
 * engine who holds what and who acts in these names, and the engine's view carries them back in
 * `players`, `captain`, `owner` and `apBudget`; a client reads its own budget with it (P3.7). Here,
 * so the room and the screens do not each keep a copy of the convention.
 */
export const pidOf = (id: number): string => `m${String(id)}`;

/**
 * THE TABLE'S FIXED MESSAGES (ruled 25 September 2026, after the first game on the live server:
 * "we need to figure out a set of fixed messages because all players will not be in the same room
 * and we need coordination"). There is no free-text chat in v1 (brief §4, ruling 3): a children's
 * app with typing in it brings moderation obligations. So what travels is one of these ids and
 * nothing else; each client words it from its own catalogue (`say.<id>`), the Hindi edition's
 * included.
 *
 * More are added here and in the catalogue. The protocol admits any id of this shape; the ROOM
 * admits only the ids on this list, and a client shows only the ids it has words for.
 */
export const SAY_MESSAGES = [
  'ready',
  'wait',
  'needAp',
  'spareAp',
  'onIt',
  'danger',
  'endTurn',
  'goodMove',
  'thanks',
] as const;
export type SayMessage = (typeof SAY_MESSAGES)[number];

/** The shape any message id has on the wire: a short word, never a sentence. */
export const SAY_ID = /^[a-z][A-Za-z0-9]{0,23}$/;

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
  /** A `say` naming a message the room does not know: only the table's fixed messages travel. */
  'noSuchMessage',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
