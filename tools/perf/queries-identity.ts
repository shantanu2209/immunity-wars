/**
 * P3.4 — THE QUERY BUILDER MOVES, AND NOTHING IT PRODUCES MAY CHANGE (docs/for-P3.md §4, ruled
 * 24 September 2026: "LocalSession's behaviour untouched; its query builder shared, byte-identical
 * output proven").
 *
 * Two modes, run on either side of the refactor:
 *
 *   capture  generate real states (single-player through LocalSession, multiplayer through the
 *            room), write them to a file, and hash every view LocalSession gives for each state
 *            under every selection: nothing selected, each of the seven cells, each of the six
 *            families
 *   check    read the same states back and hash again
 *
 * The states are saved rather than regenerated because the engine is unseeded: a second run would
 * play different games, and a comparison between different games proves nothing. Saving them is
 * what makes "before" and "after" the same inputs.
 *
 * Run: pnpm --filter @immunity-wars/perf exec tsx queries-identity.ts capture|check <file>
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

import { createRoom, step, type Inbound, type RoomState } from '@immunity-wars/room';
import { LocalSession, MemoryStorage } from '@immunity-wars/session';

const [mode, file] = process.argv.slice(2);
if ((mode !== 'capture' && mode !== 'check') || !file) {
  console.log('usage: queries-identity.ts capture|check <file>');
  process.exit(2);
}

const CELLS = ['macrophage', 'neutrophil', 'bcell', 'tcell', 'helper', 'nk', 'eosinophil'];
const FAMILIES = ['ENV', 'NAK', 'EXB', 'ICB', 'TOX', 'EUK'];

async function capture(): Promise<unknown[]> {
  const states: unknown[] = [];
  // Single player, through LocalSession itself, saved at every phase boundary.
  for (const difficulty of ['training', 'normal', 'hard']) {
    for (let game = 0; game < 4; game += 1) {
      const storage = new MemoryStorage();
      const s = LocalSession.createGame({ difficulty }, { storage, saveId: 'x', now: () => 0 });
      for (let turn = 0; turn < 40; turn += 1) {
        for (const action of ['draw', 'beginCommand', 'endCommand']) {
          await s.sendAction({ action });
          await s.save();
          const saved = await storage.get('x');
          if (saved) states.push(JSON.parse(JSON.stringify(saved.state)));
        }
        const g = s.getView().game;
        if (g['won'] === true || Boolean(g['lost'])) break;
      }
      s.dispose();
    }
  }
  // Multiplayer, through the room, which is where the relay's states will come from.
  for (const difficulty of ['training', 'normal', 'hard']) {
    for (let game = 0; game < 3; game += 1) {
      let room: RoomState = createRoom('ID', 0);
      const say = (m: Inbound): void => {
        room = step(room, m, 0).room;
        if (room.game !== null) states.push(JSON.parse(JSON.stringify(room.game)));
      };
      say({ kind: 'join', ref: 'a', name: 'A' });
      say({ kind: 'join', ref: 'b', name: 'B' });
      say({ kind: 'claimSeat', ref: 'a', seat: 'bcell' });
      say({ kind: 'claimSeat', ref: 'b', seat: 'neutrophil' });
      say({ kind: 'start', ref: 'a', difficulty });
      for (let turn = 0; turn < 40; turn += 1) {
        for (const action of ['draw', 'beginCommand', 'confirmAllocation', 'endCommand'])
          say({ kind: 'action', id: 0, ref: 'a', action: { action } });
        if (room.phase === 'ended') break;
      }
    }
  }
  return states;
}

/** Every view LocalSession gives for one state, under every selection, as one string. */
function viewsOf(state: unknown): string {
  const s = LocalSession.resume(JSON.parse(JSON.stringify(state)), {
    storage: new MemoryStorage(),
    now: () => 0,
  });
  try {
    const out: unknown[] = [s.getView()];
    for (const cell of CELLS) {
      s.setSelection({ cell, family: null, resident: null });
      out.push(s.getView());
    }
    for (const family of FAMILIES) {
      s.setSelection({ cell: null, family, resident: null });
      out.push(s.getView());
    }
    return JSON.stringify(out);
  } finally {
    s.dispose();
  }
}

const states =
  mode === 'capture' ? await capture() : (JSON.parse(readFileSync(file, 'utf8')) as unknown[]);
if (mode === 'capture') writeFileSync(file, JSON.stringify(states));

const all = createHash('sha256');
let views = 0;
for (const st of states) {
  const v = viewsOf(st);
  all.update(v);
  views += 14;
}
console.log(`${mode}: ${String(states.length)} states, ${String(views)} views`);
console.log(`sha256 of every view, in order: ${all.digest('hex')}`);
