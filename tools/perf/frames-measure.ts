/**
 * P3.3 — FRAMES OR STATE? The measurement (docs/for-P3.md §3).
 *
 * Plays real multiplayer games THROUGH THE ROOM, exactly as the relay will, and takes every message
 * the room sends as the protocol encodes it. Then prices each candidate for delivering a spread, in
 * both worlds the platform may present: uncompressed, and gzip per message (which is what
 * permessage-deflate without context takeover gives, and also what application-level
 * CompressionStream gives).
 *
 *   A  frames whole, as today
 *   C  frames as deltas: the first whole, each later one a JSON diff against the one before
 *   B  state plus the dice: the full GameState before the spread plus every random draw it made
 *      (disqualified on grounds other than size, and measured so the record says what it saved)
 *
 * ⚠️ PROTOCOL v2 (P3.4, 24 September 2026): every view the room sends now carries its queries and
 * every scoped answer, and every action gets a `result`. Run today, this prices the v2 wire, and
 * its figures are NOT comparable with the ones recorded in docs/for-P3.md §3, which were taken at
 * v1. The verdict was about how a spread's FRAMES travel, and frames carry no queries; what the
 * queries add to the authoritative view was measured separately at P3.4 (queries-measure.ts,
 * docs/for-P3.md §4).
 *
 * The criteria were written into docs/for-P3.md §3 BEFORE this ran. Run:
 *   pnpm --filter @immunity-wars/perf exec tsx frames-measure.ts [games-per-difficulty]
 */
import { gzipSync } from 'node:zlib';

import { encode, type ServerMessage } from '@immunity-wars/protocol';
import { createRoom, step, type Inbound, type Outbound, type RoomState } from '@immunity-wars/room';

const GAMES = Number(process.argv[2] ?? '6');
const T0 = 1_000_000;

/* --- a tiny JSON diff, enough to price candidate C honestly --------------------------------- */

type Json = unknown;
/** A diff as a list of [path, value] replacements, or [path] deletions. Simple and not minimal. */
function diff(a: Json, b: Json, path: (string | number)[] = [], out: unknown[] = []): unknown[] {
  if (JSON.stringify(a) === JSON.stringify(b)) return out;
  const isObj = (x: Json): x is Record<string, Json> =>
    typeof x === 'object' && x !== null && !Array.isArray(x);
  if (isObj(a) && isObj(b)) {
    for (const k of Object.keys(b)) diff(a[k], b[k], [...path, k], out);
    for (const k of Object.keys(a)) if (!(k in b)) out.push([[...path, k]]);
    return out;
  }
  out.push([path, b]);
  return out;
}

/* --- games through the room ------------------------------------------------------------------- */

interface Captured {
  messages: { kind: string; to: string; text: string }[];
  /** For B: the full state before each spread, and how many random draws the spread made. */
  stateBeforeSpread: string[];
  drawsPerSpread: number[];
  turns: number;
}

function playOne(difficulty: string): Captured {
  let room: RoomState = createRoom('MEASURE', T0);
  const cap: Captured = { messages: [], stateBeforeSpread: [], drawsPerSpread: [], turns: 0 };
  const say = (m: Inbound): Outbound[] => {
    const s = step(room, m, T0);
    room = s.room;
    for (const o of s.out) {
      const text = encode(o.message as ServerMessage);
      cap.messages.push({ kind: o.message.kind, to: o.to, text });
    }
    return [...s.out];
  };
  say({ kind: 'join', ref: 'p_one', name: 'One' });
  say({ kind: 'join', ref: 'p_two', name: 'Two' });
  for (const seat of [
    'bcell',
    'tcell',
    'helper',
    'res_liver',
    'res_heart',
    'res_lungs',
    'res_brain',
  ])
    say({ kind: 'claimSeat', ref: 'p_one', seat });
  for (const seat of [
    'neutrophil',
    'macrophage',
    'nk',
    'eosinophil',
    'res_spleen',
    'res_kidneys',
    'res_marrow',
  ])
    say({ kind: 'claimSeat', ref: 'p_two', seat });
  say({ kind: 'start', ref: 'p_one', difficulty });
  for (let turn = 0; turn < 60; turn += 1) {
    say({ kind: 'action', id: 0, ref: 'p_one', action: { action: 'draw' } });
    say({ kind: 'action', id: 0, ref: 'p_one', action: { action: 'beginCommand' } });
    say({ kind: 'action', id: 0, ref: 'p_one', action: { action: 'confirmAllocation' } });
    // B's inputs: the full state the spread starts from, and the draws it consumes.
    cap.stateBeforeSpread.push(JSON.stringify(room.game));
    const real = Math.random;
    let draws = 0;
    Math.random = () => {
      draws += 1;
      return real();
    };
    try {
      say({ kind: 'action', id: 0, ref: 'p_one', action: { action: 'endCommand' } });
    } finally {
      Math.random = real;
    }
    cap.drawsPerSpread.push(draws);
    cap.turns += 1;
    if (room.phase === 'ended') break;
  }
  return cap;
}

/* --- pricing ----------------------------------------------------------------------------------- */

const gz = (t: string): number => gzipSync(Buffer.from(t, 'utf8')).length;
const raw = (t: string): number => Buffer.byteLength(t, 'utf8');
const q = (xs: number[], p: number): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0;
};
const kib = (n: number): string => `${(n / 1024).toFixed(1)} KiB`;

interface GameCost {
  difficulty: string;
  turns: number;
  /** Per client, whole game, per candidate and world. */
  totals: Record<string, number>;
  /** The largest single spread message, per candidate and world. */
  largestSpread: Record<string, number>;
  views: number[];
}

function price(difficulty: string, cap: Captured): GameCost {
  const totals: Record<string, number> = {
    A_raw: 0,
    A_gz: 0,
    C_raw: 0,
    C_gz: 0,
    B_raw: 0,
    B_gz: 0,
  };
  const largest: Record<string, number> = {
    A_raw: 0,
    A_gz: 0,
    C_raw: 0,
    C_gz: 0,
    B_raw: 0,
    B_gz: 0,
  };
  const views: number[] = [];
  let spread = 0;
  // PER CLIENT: what player one actually receives, which is everything to all and anything to them.
  for (const m of cap.messages.filter((x) => x.to === 'all' || x.to === 'p_one')) {
    const r = raw(m.text);
    const g = gz(m.text);
    if (m.kind === 'view') views.push(r);
    if (m.kind !== 'burst') {
      // Everything that is not a spread costs the same under every candidate.
      for (const c of ['A', 'C', 'B']) {
        totals[`${c}_raw`] = (totals[`${c}_raw`] ?? 0) + r;
        totals[`${c}_gz`] = (totals[`${c}_gz`] ?? 0) + g;
      }
      continue;
    }
    // A: the burst as sent.
    totals['A_raw'] = (totals['A_raw'] ?? 0) + r;
    totals['A_gz'] = (totals['A_gz'] ?? 0) + g;
    largest['A_raw'] = Math.max(largest['A_raw'] ?? 0, r);
    largest['A_gz'] = Math.max(largest['A_gz'] ?? 0, g);
    // C: the same burst with frames after the first as diffs.
    const msg = JSON.parse(m.text) as { frames: { label: string; dice: unknown; view: unknown }[] };
    const frames = msg.frames;
    const deltas = frames.map((f, i) =>
      i === 0 ? f : { label: f.label, dice: f.dice, patch: diff(frames[i - 1]?.view, f.view) },
    );
    const cText = JSON.stringify({ ...msg, frames: deltas });
    totals['C_raw'] = (totals['C_raw'] ?? 0) + raw(cText);
    totals['C_gz'] = (totals['C_gz'] ?? 0) + gz(cText);
    largest['C_raw'] = Math.max(largest['C_raw'] ?? 0, raw(cText));
    largest['C_gz'] = Math.max(largest['C_gz'] ?? 0, gz(cText));
    // B: the state before this spread plus its draws, as 8-byte doubles in JSON (~19 chars each).
    const state = cap.stateBeforeSpread[spread] ?? '';
    const draws = cap.drawsPerSpread[spread] ?? 0;
    const bText = JSON.stringify({
      state: JSON.parse(state || '{}'),
      draws: Array(draws).fill(0.123456789012345),
    });
    totals['B_raw'] = (totals['B_raw'] ?? 0) + raw(bText);
    totals['B_gz'] = (totals['B_gz'] ?? 0) + gz(bText);
    largest['B_raw'] = Math.max(largest['B_raw'] ?? 0, raw(bText));
    largest['B_gz'] = Math.max(largest['B_gz'] ?? 0, gz(bText));
    spread += 1;
  }
  return { difficulty, turns: cap.turns, totals, largestSpread: largest, views };
}

/* --- run ---------------------------------------------------------------------------------------- */

const costs: GameCost[] = [];
for (const d of ['training', 'normal', 'hard'])
  for (let i = 0; i < GAMES; i += 1) costs.push(price(d, playOne(d)));

const MB = 1024 * 1024;
console.log(
  `P3.3 frames-or-state: ${costs.length} two-player games through the room (${GAMES} per difficulty)`,
);
console.log(
  `turns per game: min ${Math.min(...costs.map((c) => c.turns))}, p50 ${q(
    costs.map((c) => c.turns),
    0.5,
  )}, max ${Math.max(...costs.map((c) => c.turns))}`,
);
const allViews = costs.flatMap((c) => c.views);
console.log(
  `a view as sent: p50 ${kib(q(allViews, 0.5))}, max ${kib(Math.max(...allViews))} (raw)`,
);
console.log('');
console.log('per client, WHOLE GAME (criterion 1: <= 2 MB as actually sent)');
for (const k of ['A_raw', 'A_gz', 'C_raw', 'C_gz', 'B_raw', 'B_gz']) {
  const xs = costs.map((c) => c.totals[k] ?? 0);
  console.log(
    `  ${k.padEnd(6)} p50 ${kib(q(xs, 0.5)).padStart(10)}  max ${kib(Math.max(...xs)).padStart(10)}  (${((Math.max(...xs) / (2 * MB)) * 100).toFixed(1)}% of 2 MB)`,
  );
}
console.log('');
console.log('LARGEST single spread message (criterion 2: <= 64 KiB as sent)');
for (const k of ['A_raw', 'A_gz', 'C_raw', 'C_gz', 'B_raw', 'B_gz']) {
  const xs = costs.map((c) => c.largestSpread[k] ?? 0);
  console.log(
    `  ${k.padEnd(6)} max ${kib(Math.max(...xs)).padStart(10)}  (${((Math.max(...xs) / (64 * 1024)) * 100).toFixed(1)}% of 64 KiB)`,
  );
}

/* --- growth: what a turn costs as the game gets older, so a 45-turn game can be judged ---------- */
// These games end early (idle play), so "a whole game" here is not a whole real game. The honest
// move is to report what one TURN costs at each age, and extrapolate in the open, labelled as such.
console.log('');
console.log(
  'PER TURN, gzipped (candidate A), by the turn it happened on — what a longer game adds',
);
const byTurn = new Map<number, number[]>();
for (const d of ['training', 'normal', 'hard']) {
  for (let i = 0; i < GAMES; i += 1) {
    const cap = playOne(d);
    let turn = 0;
    let acc = 0;
    for (const m of cap.messages.filter((x) => x.to === 'all' || x.to === 'p_one')) {
      acc += gz(m.text);
      if (m.kind === 'burst') {
        (byTurn.get(turn) ?? byTurn.set(turn, []).get(turn))?.push(acc);
        acc = 0;
        turn += 1;
      }
    }
  }
}
const turnsSeen = [...byTurn.keys()].sort((a, b) => a - b);
for (const t of turnsSeen) {
  const xs = byTurn.get(t) ?? [];
  console.log(
    `  turn ${String(t + 1).padStart(2)}: p50 ${kib(q(xs, 0.5)).padStart(9)}  max ${kib(Math.max(...xs)).padStart(9)}  (n ${xs.length})`,
  );
}
const late = turnsSeen.slice(-3).flatMap((t) => byTurn.get(t) ?? []);
const worstLate = Math.max(...late);
console.log(
  `EXTRAPOLATION, labelled as such: a 45-turn game at the WORST late-turn cost seen here, every turn:`,
);
console.log(
  `  45 x ${kib(worstLate)} = ${kib(45 * worstLate)}  (${(((45 * worstLate) / (2 * 1024 * 1024)) * 100).toFixed(1)}% of 2 MB)`,
);
