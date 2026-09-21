/**
 * P3.4 — HOW DO A RELAY CLIENT'S QUERIES ARRIVE? The measurement before the design
 * (docs/for-P3.md §4).
 *
 * `LocalSession` computes what the UI needs to decide what is clickable from the full `GameState`:
 * `queries` (selection-independent) and `scoped` (moveDestinations for the selected cell, the full
 * productionBreakdown for the selected family). A relay client never holds a `GameState`. So:
 *
 *   ALL   the relay sends scoped answers for EVERY cell and family with each view; taps stay local
 *   ASK   the relay sends only `queries`; a client asks for `scoped` when its selection changes,
 *         and waits a round trip for the move rings
 *
 * Both need `queries` with every authoritative view, so that is priced too. Every answer is taken
 * through LocalSession's own code path (resume the room's state, set each selection, read the view),
 * so the sizes are exact rather than modelled. Bursts carry views only, never queries, and are
 * counted at their measured P3.3 cost so the whole-game picture is complete.
 *
 * Run: pnpm --filter @immunity-wars/perf exec tsx queries-measure.ts [games-per-difficulty]
 */
import { gzipSync } from 'node:zlib';

import { encode, type ServerMessage } from '@immunity-wars/protocol';
import { createRoom, step, type Inbound, type RoomState } from '@immunity-wars/room';
import { LocalSession, MemoryStorage } from '@immunity-wars/session';

const GAMES = Number(process.argv[2] ?? '6');
const T0 = 1_000_000;
const CELLS = ['macrophage', 'neutrophil', 'bcell', 'tcell', 'helper', 'nk', 'eosinophil'];
const FAMILIES = ['ENV', 'NAK', 'EXB', 'ICB', 'TOX', 'EUK'];

const gz = (t: string): number => gzipSync(Buffer.from(t, 'utf8')).length;
const kib = (n: number): string => `${(n / 1024).toFixed(1)} KiB`;
const q = (xs: number[], p: number): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0;
};

interface ViewCost {
  view: number; // the view message as sent today, gzipped
  withQueries: number; // + queries, one message, gzipped
  withAll: number; // + scoped for every cell and family, gzipped
  askReply: number; // one scoped answer (the largest single cell), gzipped: an ASK round trip
}

/** Prices the queries for the state the room holds right now, through LocalSession. */
function priceAt(room: RoomState): ViewCost {
  const s = LocalSession.resume(JSON.parse(JSON.stringify(room.game)), {
    storage: new MemoryStorage(),
    now: () => 0,
  });
  try {
    const v = s.getView();
    const view = gz(encode({ kind: 'view', view: v.game } as ServerMessage));
    const withQueries = gz(JSON.stringify({ kind: 'view', view: v.game, queries: v.queries }));
    const moves: Record<string, unknown> = {};
    let askReply = 0;
    for (const cell of CELLS) {
      s.setSelection({ cell, family: null, resident: null });
      const md = s.getView().scoped.moveDestinations;
      moves[cell] = md;
      askReply = Math.max(askReply, gz(JSON.stringify({ kind: 'scoped', moveDestinations: md })));
    }
    const production: Record<string, unknown> = {};
    for (const family of FAMILIES) {
      s.setSelection({ cell: null, family, resident: null });
      production[family] = s.getView().scoped.productionDetail;
    }
    const withAll = gz(
      JSON.stringify({
        kind: 'view',
        view: v.game,
        queries: v.queries,
        scoped: { moves, production },
      }),
    );
    return { view, withQueries, withAll, askReply };
  } finally {
    s.dispose();
  }
}

const costs: ViewCost[] = [];
const perGame: {
  view: number;
  withQueries: number;
  withAll: number;
  bursts: number;
  turns: number;
}[] = [];
for (const d of ['training', 'normal', 'hard']) {
  for (let i = 0; i < GAMES; i += 1) {
    let room = createRoom('MEASURE', T0);
    const g = { view: 0, withQueries: 0, withAll: 0, bursts: 0, turns: 0 };
    const say = (m: Inbound): void => {
      const st = step(room, m, T0);
      room = st.room;
      for (const o of st.out) {
        if (o.message.kind === 'burst') g.bursts += gz(encode(o.message as ServerMessage));
        if (o.message.kind === 'view') {
          const c = priceAt(room);
          costs.push(c);
          g.view += c.view;
          g.withQueries += c.withQueries;
          g.withAll += c.withAll;
        }
      }
    };
    say({ kind: 'join', ref: 'p_one', name: 'One' });
    say({ kind: 'join', ref: 'p_two', name: 'Two' });
    for (const seat of ['bcell', 'tcell', 'helper', 'macrophage', 'neutrophil', 'nk', 'eosinophil'])
      say({ kind: 'claimSeat', ref: 'p_one', seat });
    say({ kind: 'start', ref: 'p_one', difficulty: d });
    for (let turn = 0; turn < 60; turn += 1) {
      say({ kind: 'action', ref: 'p_one', action: { action: 'draw' } });
      say({ kind: 'action', ref: 'p_one', action: { action: 'beginCommand' } });
      say({ kind: 'action', ref: 'p_one', action: { action: 'confirmAllocation' } });
      say({ kind: 'action', ref: 'p_one', action: { action: 'endCommand' } });
      g.turns += 1;
      if (room.phase === 'ended') break;
    }
    perGame.push(g);
  }
}

console.log(
  `P3.4 queries: ${String(costs.length)} authoritative views from ${String(perGame.length)} games`,
);
console.log('');
console.log('ONE VIEW MESSAGE, gzipped: p50 / max');
for (const [k, label] of [
  ['view', 'the view alone, as sent today'],
  ['withQueries', '+ queries (needed either way)'],
  ['withAll', '+ scoped for every cell and family (ALL)'],
  ['askReply', 'one scoped answer (an ASK reply)'],
] as const) {
  const xs = costs.map((c) => c[k]);
  console.log(
    `  ${label.padEnd(44)} ${kib(q(xs, 0.5)).padStart(9)} / ${kib(Math.max(...xs)).padStart(9)}`,
  );
}
console.log('');
console.log(
  'WHOLE GAME per client, gzipped (views + bursts), p50 / max; turns p50',
  q(
    perGame.map((g) => g.turns),
    0.5,
  ),
);
const tot = (f: (g: (typeof perGame)[number]) => number): string => {
  const xs = perGame.map(f);
  return `${kib(q(xs, 0.5)).padStart(9)} / ${kib(Math.max(...xs)).padStart(9)}`;
};
console.log(`  today (views + bursts)                       ${tot((g) => g.view + g.bursts)}`);
console.log(
  `  ASK   (views with queries + bursts)          ${tot((g) => g.withQueries + g.bursts)}`,
);
console.log(`  ALL   (views with every scoped answer)       ${tot((g) => g.withAll + g.bursts)}`);
const extra = perGame.map((g) => (g.withAll - g.view) / (g.view + g.bursts));
console.log(
  `  ALL costs +${(q(extra, 0.5) * 100).toFixed(0)}% on today's game total at p50, +${(Math.max(...extra) * 100).toFixed(0)}% at worst`,
);
