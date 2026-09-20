/**
 * THE COACH — piece 8 of the play screen (item 9 of 19 September 2026, docs/for-P2.7.md §20).
 *
 * "When I say scripted I don't mean hardcoded" (Shantanu, 20 September 2026). So this is not a
 * sequence of steps played back at a new player: it is a FUNCTION OF THE STATE THEY ARE IN. It
 * reads what the screen is showing and what the game will accept right now, and names the next
 * thing to do. A player who does something unexpected is not off the rails, because there are no
 * rails — the coach simply describes where they now are.
 *
 * That also makes it testable, which a scripted walkthrough is not: every rule below is a pure
 * function from one input record to one line, and `coach.test.ts` holds each rule to it.
 *
 * WHAT IT MUST NOT DO, and the reason each is a rule rather than a preference:
 *
 * - **It must never tell a player to do something the engine would refuse.** Legality lives in
 *   `offered.ts` and nowhere else (the standing rule), so the coach is given the COUNT of what is
 *   offered, never its own idea of what is legal. When nothing is offered it says so instead.
 * - **It must not speak during a spread.** Input is disabled while frames play; a line telling
 *   someone to tap something that ignores taps is worse than silence.
 * - **It stops.** It runs through the opening of a first game only (`COACH_TURNS`), and the player
 *   can end it at any point. A teacher who will not stop talking is the thing being avoided.
 *
 * The text is the catalogue's, like every other player-visible string.
 */

/** What the coach is allowed to know: the screen's state, and what the engine is offering. */
export interface CoachInput {
  /**
   * The stage showing, exactly as the frame names it, or 'waiting' for any moment the player is
   * not being asked for anything: a dialog is up, or the turn has not been drawn yet.
   */
  stage: 'arrivals' | 'planning' | 'command' | 'spread' | 'waiting';
  /** The turn number, so the coach can stop being useful and go away. */
  turn: number;
  /** Action Points left this turn. */
  ap: number;
  /** Whether a piece is selected on the board. */
  selected: boolean;
  /** How many actions `offered.ts` is offering for the selection. Never the coach's own guess. */
  offeredCount: number;
  /** Whether any antibody class can be produced right now (the offers, again, not a rule). */
  canProduce: boolean;
}

/** One line of coaching: a stable id, so a dismissed step stays dismissed, and its catalogue key. */
export interface CoachStep {
  id: string;
  key: string;
}

/** How many turns the coach stays for. The opening of a game is what a newcomer needs help with. */
export const COACH_TURNS = 3;

/**
 * The next thing to do, or null for silence. The order is the order a turn happens in, so the
 * first rule that matches is the one the player is standing in.
 */
export function coachStep(input: CoachInput): CoachStep | null {
  if (input.turn > COACH_TURNS) return null;
  switch (input.stage) {
    case 'spread':
    case 'waiting':
      // Nothing is accepted while frames play or while a dialog waits, so nothing is asked for.
      return null;
    case 'arrivals':
      return { id: 'arrivals', key: 'coach.arrivals' };
    case 'planning':
      return { id: 'planning', key: 'coach.planning' };
    case 'command':
      if (input.ap <= 0) return { id: 'noAp', key: 'coach.noAp' };
      if (!input.selected) return { id: 'select', key: 'coach.select' };
      if (input.offeredCount > 0) return { id: 'act', key: 'coach.act' };
      if (input.canProduce) return { id: 'produce', key: 'coach.produce' };
      // Selected, nothing offered, nothing to produce: the honest line is "this one cannot act
      // from here", not an instruction that would be refused.
      return { id: 'elsewhere', key: 'coach.elsewhere' };
    default:
      return null;
  }
}
