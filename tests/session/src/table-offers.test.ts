/**
 * THE STANDING RULE, AT A TABLE (P3.7 piece B): every action a player is OFFERED, the ROOM accepts.
 *
 * `offered.test.ts` holds the rule alone: every offer the UI makes, the engine accepts. Played
 * together, two more things can refuse an offer, and this holds the screen to both:
 *
 *   - the ROOM refuses an action on a piece its sender does not hold (`notYourPiece`), so a player
 *     must be offered only their own seats' actions, read from the room (FINDINGS #81);
 *   - the ENGINE charges each player's own budget (`apBudget`), so a player must be offered only
 *     what THEIR points buy, where the view's `ap` is the table's total (the P3.7 spike).
 *
 * THE GAMES ARE PLAYED THROUGH THE ROOM, not built by hand: two members take seven seats each, the
 * captain draws, begins, hands out the points (a different split each turn, some leaving the other
 * player with none) and confirms, and both players act, each only through what the screen offers
 * them. At every state along the way, every offer to either player, for every piece and for the
 * body, is sent to a copy of the room, which must accept it.
 *
 * BOTH HALVES (CLAUDE.md). Two controls must FIRE: offers made as if every seat were this player's
 * are refused as `notYourPiece`, and offers made from the table's total are refused by the engine.
 * And the rule must PERMIT: each player is offered and has accepted moves and attacks, the captain
 * the body's actions too, and another player's piece is offered nothing at all. The body's actions
 * are the captain's alone since 26 September 2026 (ruled after the P3.6 session): the other player
 * is offered none of them, where until then both were.
 *
 * The draw is the captain's too: the rule that sends it is held here to the engine's refusal of
 * anyone else's.
 */
import { describe, expect, it } from 'vitest';

import { installRng, restoreRng } from '@immunity-wars/equivalence/rng';
import { createRoom, project, step, type Inbound, type RoomState } from '@immunity-wars/room';
import type { PrecomputedQueries, SessionView, ViewState } from '@immunity-wars/session';
import { scopeFrom, type AllScoped } from '@immunity-wars/session-core';
import {
  EVERY_SEAT,
  offeredActions,
  perspectiveOf,
  produceOffers,
  seenBy,
  shouldDraw,
  type Perspective,
} from '@immunity-wars/ui';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

const CELLS = ['macrophage', 'neutrophil', 'bcell', 'tcell', 'helper', 'nk', 'eosinophil'];
const MEMBERS = [
  {
    ref: 'ref-asha',
    id: 1,
    name: 'Asha',
    seats: [
      'macrophage',
      'neutrophil',
      'bcell',
      'res_heart',
      'res_lungs',
      'res_liver',
      'res_brain',
    ],
  },
  {
    ref: 'ref-ravi',
    id: 2,
    name: 'Ravi',
    seats: ['tcell', 'helper', 'nk', 'eosinophil', 'res_spleen', 'res_kidneys', 'res_marrow'],
  },
] as const;
const [ASHA, RAVI] = MEMBERS;

/** How the offers are made: as the screen makes them, or with one of the two rules taken out. */
type Mode = 'table' | 'everySeat' | 'tableTotal';

interface Latest {
  view: ViewState;
  queries: PrecomputedQueries;
  scoped: AllScoped;
}

interface Refusal {
  who: string;
  action: string;
  why: string;
}

interface Tally {
  states: number;
  offers: number;
  accepted: Record<string, Record<string, number>>;
  refused: Refusal[];
  /** Offers made on a piece the player does not hold: must be none. */
  theirs: number;
}

/** Counted beside the actions: an accepted offer aimed at a pathogen. */
const ON_A_PATHOGEN = '(on a pathogen)';

const tally = (): Tally => ({ states: 0, offers: 0, accepted: {}, refused: [], theirs: 0 });

class Game {
  room: RoomState;
  latest: Latest | null = null;
  private id = 0;

  constructor(difficulty: string) {
    this.room = createRoom('ACDEFG', 0);
    for (const m of MEMBERS) {
      this.send({ kind: 'join', ref: m.ref, name: m.name });
      for (const seat of m.seats) this.send({ kind: 'claimSeat', ref: m.ref, seat });
    }
    this.send({ kind: 'start', ref: ASHA.ref, difficulty });
  }

  send(msg: Inbound): { ok: boolean; code?: string; detail?: string } | null {
    const s = step(this.room, msg, 0);
    this.room = s.room;
    let result: { ok: boolean; code?: string; detail?: string } | null = null;
    for (const o of s.out) {
      const m = o.message;
      if (m.kind === 'view')
        this.latest = { view: m.view as ViewState, queries: m.queries, scoped: m.scoped };
      if (m.kind === 'result') result = m;
    }
    return result;
  }

  act(
    ref: string,
    action: Record<string, unknown>,
  ): { ok: boolean; code?: string; detail?: string } {
    this.id += 1;
    return (
      this.send({ kind: 'action', ref, id: this.id, action }) ?? { ok: false, code: 'noAnswer' }
    );
  }

  /** The room's answer to an action, on a copy: the game itself is untouched. */
  tryOn(
    ref: string,
    action: Record<string, unknown>,
  ): { ok: boolean; code?: string; detail?: string } {
    const s = step(clone(this.room), { kind: 'action', ref, id: 1, action }, 0);
    for (const o of s.out) if (o.message.kind === 'result') return o.message;
    return { ok: false, code: 'noAnswer' };
  }

  get game(): ViewState {
    return this.latest?.view ?? {};
  }

  perspective(id: number): Perspective {
    return perspectiveOf({ room: project(this.room), me: id });
  }
}

/** What a relay client builds from the relay's view for one selection (`RelaySession.build`). */
function sessionView(latest: Latest, cell: string | null, resident: string | null): SessionView {
  const selection = { cell, family: null, resident };
  return {
    game: latest.view,
    selection,
    queries: latest.queries,
    scoped: scopeFrom(latest.scoped, selection),
    undo: { available: false, moves: 0, reason: 'multiplayer', committedBy: null },
  } as unknown as SessionView;
}

/** Every offer the screen makes this player, for every piece and for the body. */
function offersFor(
  g: Game,
  member: (typeof MEMBERS)[number],
  mode: Mode,
): { params: Record<string, unknown>; action: string; seat: string | null }[] {
  const latest = g.latest;
  if (!latest) return [];
  const real = g.perspective(member.id);
  const p = mode === 'everySeat' ? { ...real, seats: EVERY_SEAT } : real;
  const residents = Object.keys((latest.view['residents'] as Record<string, unknown>) ?? {});
  const subjects: { cell: string | null; resident: string | null; seat: string | null }[] = [
    { cell: null, resident: null, seat: null },
    ...CELLS.map((cell) => ({ cell, resident: null, seat: cell })),
    ...residents.map((o) => ({ cell: null, resident: o, seat: `res_${o}` })),
  ];
  const out: { params: Record<string, unknown>; action: string; seat: string | null }[] = [];
  for (const s of subjects) {
    const base = sessionView(latest, s.cell, s.resident);
    const v = mode === 'tableTotal' ? base : seenBy(base, p);
    const o = offeredActions(v, p.seats);
    for (const x of [...o.board, ...o.buttons])
      out.push({ params: x.params, action: x.action, seat: s.seat });
    if (s.cell === null && s.resident === null)
      for (const x of produceOffers(v, p.seats))
        out.push({ params: x.params, action: x.action, seat: 'bcell' });
  }
  return out;
}

function judge(g: Game, mode: Mode, into: Tally): void {
  into.states += 1;
  for (const m of MEMBERS) {
    const mine = new Set<string>(m.seats);
    for (const o of offersFor(g, m, mode)) {
      into.offers += 1;
      if (o.seat !== null && !mine.has(o.seat)) into.theirs += 1;
      const r = g.tryOn(m.ref, o.params);
      if (r.ok) {
        const byWho = (into.accepted[m.name] ??= {});
        byWho[o.action] = (byWho[o.action] ?? 0) + 1;
        if (typeof o.params['invaderId'] === 'string')
          byWho[ON_A_PATHOGEN] = (byWho[ON_A_PATHOGEN] ?? 0) + 1;
      } else {
        into.refused.push({
          who: m.name,
          action: o.action,
          why: `${r.code ?? ''} ${r.detail ?? ''}`.trim(),
        });
      }
    }
  }
}

/** Whether a move lands where a pathogen stands. */
function onAPathogen(game: ViewState, move: Record<string, unknown>): boolean {
  const invaders = (game['invaders'] as Record<string, unknown>[] | undefined) ?? [];
  return invaders.some(
    (iv) =>
      iv['zone'] === move['zone'] &&
      (iv['zone'] === 'hub' ||
        ((iv['lane'] ?? null) === (move['lane'] ?? null) &&
          (iv['organ'] ?? null) === (move['organ'] ?? null) &&
          (iv['step'] ?? 0) === (move['step'] ?? 0))),
  );
}

/** A different split each turn, some leaving Ravi with nothing while the table has points. */
const SPLITS = [
  (_n: number) => 0,
  (n: number) => Math.floor(n / 2),
  (n: number) => n,
  (_n: number) => 1,
];

interface Played {
  table: Tally;
  everySeat: Tally;
  tableTotal: Tally;
  draws: { captain: boolean; other: boolean; otherRefused: string | null }[];
  /**
   * The captain's own steps the room refused. Recorded rather than thrown, because the games are
   * played while the suite is collected, and a throw there would fail the file without naming the
   * test that failed, which is what a control reads.
   */
  problems: string[];
}

function play(seed: number, difficulty: string, turns: number, stepsPerTurn: number): Played {
  const result: Played = {
    table: tally(),
    everySeat: tally(),
    tableTotal: tally(),
    draws: [],
    problems: [],
  };
  const must = (r: { ok: boolean; detail?: string }, what: string): boolean => {
    if (!r.ok)
      result.problems.push(
        `${difficulty} turn ${String(g.game['turn'])}: ${what}: ${r.detail ?? ''}`,
      );
    return r.ok;
  };
  let g: Game;
  installRng(seed);
  try {
    g = new Game(difficulty);
    for (let turn = 1; turn <= turns; turn += 1) {
      if (g.game['won'] === true || Boolean(g.game['lost'])) break;
      // THE DRAW: the rule sends it from the captain's device alone, and the engine refuses anyone
      // else's. Both sides of that are recorded.
      const moment = (captain: boolean) =>
        shouldDraw({
          game: g.game,
          playing: false,
          dialogPending: false,
          covered: false,
          sentForTurn: null,
          mayDraw: captain,
        });
      const other = g.tryOn(RAVI.ref, { action: 'draw' });
      result.draws.push({
        captain: moment(g.perspective(ASHA.id).captain),
        other: moment(g.perspective(RAVI.id).captain),
        otherRefused: other.ok ? null : (other.detail ?? other.code ?? ''),
      });
      if (!must(g.act(ASHA.ref, { action: 'draw' }), 'the captain draws')) break;
      if (!must(g.act(ASHA.ref, { action: 'beginCommand' }), 'the captain begins')) break;
      const budget = (g.game['apBudget'] as Record<string, number> | undefined) ?? {};
      const pool = budget['m1'] ?? 0;
      const give = Math.min(pool, (SPLITS[turn % SPLITS.length] ?? (() => 0))(pool));
      if (give > 0)
        must(
          g.act(ASHA.ref, { action: 'allocateAP', toPid: 'm2', amount: give }),
          'the captain allocates',
        );
      if (!must(g.act(ASHA.ref, { action: 'confirmAllocation' }), 'the captain confirms')) break;

      for (let k = 0; k < stepsPerTurn; k += 1) {
        judge(g, 'table', result.table);
        judge(g, 'everySeat', result.everySeat);
        judge(g, 'tableTotal', result.tableTotal);
        // Somebody acts, through what the screen offers them: an action on a pathogen when there
        // is one, else a move onto a pathogen, else whatever comes first, so that pieces meet
        // pathogens and the actions aimed at them are offered and judged.
        const mover = MEMBERS[k % 2] ?? ASHA;
        const offers = offersFor(g, mover, 'table');
        const pick =
          offers.find((o) => typeof o.params['invaderId'] === 'string') ??
          offers.find((o) => o.action === 'move' && onAPathogen(g.game, o.params)) ??
          offers[0];
        // A refused pick changes nothing; the judge above has already recorded the refusal.
        if (pick) g.act(mover.ref, pick.params);
      }
      if (!must(g.act(ASHA.ref, { action: 'endCommand' }), 'the captain ends the turn')) break;
    }
  } finally {
    restoreRng();
  }
  return result;
}

const merge = (a: Tally, b: Tally): Tally => {
  const accepted: Tally['accepted'] = clone(a.accepted);
  for (const [who, byAction] of Object.entries(b.accepted))
    for (const [action, n] of Object.entries(byAction)) {
      const w = (accepted[who] ??= {});
      w[action] = (w[action] ?? 0) + n;
    }
  return {
    states: a.states + b.states,
    offers: a.offers + b.offers,
    accepted,
    refused: [...a.refused, ...b.refused],
    theirs: a.theirs + b.theirs,
  };
};

describe('offered ⊆ accepted, at a table of two', () => {
  const runs = [
    play(0x51de, 'training', 5, 5),
    play(0x7f2a, 'normal', 5, 5),
    play(0x1234, 'hard', 5, 5),
  ];
  const all = (mode: Mode): Tally =>
    runs.map((r) => r[mode]).reduce((x, y) => merge(x, y), tally());
  const table = all('table');

  it('every offer to either player, for every piece and for the body, the room accepts', () => {
    expect(table.states, 'too few states judged').toBeGreaterThanOrEqual(30);
    const refused = table.refused.map((r) => `${r.who} ${r.action}: ${r.why}`);
    expect(refused, `offered, and refused:\n  ${refused.slice(0, 12).join('\n  ')}`).toEqual([]);
  });

  it('the games went where the captain took them: every step of the captain was accepted', () => {
    const problems = runs.flatMap((r) => r.problems);
    expect(problems).toEqual([]);
  });

  it("offers nothing on another player's piece", () => {
    expect(table.theirs).toBe(0);
  });

  it('PERMITS: each player was offered, and had accepted, moves and attacks; the captain the body', () => {
    for (const m of MEMBERS) {
      const got = table.accepted[m.name] ?? {};
      expect(got['move'] ?? 0, `${m.name} moves: ${JSON.stringify(got)}`).toBeGreaterThan(0);
      expect(
        got[ON_A_PATHOGEN] ?? 0,
        `${m.name} acted on a pathogen: ${JSON.stringify(got)}`,
      ).toBeGreaterThan(0);
      // The captain (Asha, who started the game) is offered the body's actions and uses them; the
      // other player is offered none, so accepts none: every offer is sent to the room.
      const body = (got['orderAntivenom'] ?? 0) + (got['vaccinate'] ?? 0);
      if (m === ASHA)
        expect(body, `${m.name} used the body's actions: ${JSON.stringify(got)}`).toBeGreaterThan(
          0,
        );
      else expect(body, `${m.name} was offered the body's actions: ${JSON.stringify(got)}`).toBe(0);
    }
  });

  it("CONTROL: offers made as if every seat were this player's are refused as notYourPiece", () => {
    const every = all('everySeat');
    expect(every.refused.filter((r) => r.why.startsWith('notYourPiece')).length).toBeGreaterThan(0);
  });

  it("CONTROL: offers made from the table's total are refused by the engine", () => {
    const total = all('tableTotal');
    expect(total.refused.filter((r) => r.why.startsWith('engine')).length).toBeGreaterThan(0);
  });

  it("the draw is the captain's device's alone, and the engine refuses anyone else's", () => {
    const draws = runs.flatMap((r) => r.draws);
    expect(draws.length).toBeGreaterThan(10);
    for (const d of draws) {
      expect(d.captain, 'the captain draws').toBe(true);
      expect(d.other, "another player's device does not").toBe(false);
      expect(d.otherRefused, 'and the engine would refuse it if it did').not.toBeNull();
    }
  });
});
