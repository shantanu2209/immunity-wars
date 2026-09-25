/**
 * P3.5 — THE LIVE RELAY, MEASURED FROM THE OUTSIDE (docs/for-P3.md §5, Gate B).
 *
 * Two `RelayRoom` clients on this machine play whole games against a deployed relay, over the
 * internet, through its TLS front, exactly as phones will. For every action it records the round
 * trip a player waits for: from `sendAction` to the relay's answer, which arrives after the view
 * the action caused, so it is the time until the board has changed. And it counts every byte each
 * client receives, which is what data out costs.
 *
 * The games are scripted, not played: draw, begin command, confirm the allocation, end the turn,
 * until the game ends. So they are SHORT, like every earlier measurement here, and a real game's
 * data is extrapolated from bytes per turn, not measured.
 *
 *   pnpm --filter @immunity-wars/perf exec tsx relay-live.ts wss://<host>/relay [games]
 */
import { RelayRoom } from '@immunity-wars/session';

const url = process.argv[2];
const GAMES = Number(process.argv[3] ?? '3');
if (url === undefined || !url.startsWith('ws')) {
  console.log('usage: relay-live.ts wss://<host>/relay [games]');
  process.exit(2);
}

const TURN = ['draw', 'beginCommand', 'confirmAllocation', 'endCommand'] as const;

const q = (xs: readonly number[], p: number): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0;
};

async function until(ok: () => boolean, ms = 10_000): Promise<void> {
  const end = Date.now() + ms;
  while (!ok()) {
    if (Date.now() > end) throw new Error('timed out');
    await new Promise((r) => setTimeout(r, 5));
  }
}

/** A socket whose received bytes are counted before the client sees them. */
function counted(): { open: (u: string) => WebSocket; bytes: () => number } {
  let bytes = 0;
  return {
    open: (u) => {
      const ws = new WebSocket(u);
      ws.addEventListener('message', (e: MessageEvent) => {
        bytes += (e.data as ArrayBuffer).byteLength;
      });
      return ws;
    },
    bytes: () => bytes,
  };
}

const rtt: Record<string, number[]> = {};
const perTurn: number[] = [];
const turnsPlayed: number[] = [];
const joinMs: number[] = [];

for (let game = 0; game < GAMES; game += 1) {
  const ca = counted();
  const cb = counted();
  const t0 = performance.now();
  const a = await RelayRoom.create({ url, name: 'Measure A', open: ca.open });
  const b = await RelayRoom.join({ url, code: a.code, name: 'Measure B', open: cb.open });
  joinMs.push(performance.now() - t0);
  a.claimSeat('bcell');
  b.claimSeat('neutrophil');
  await until(() => a.room?.members.every((m) => m.seats.length > 0) === true);
  a.start((['training', 'normal', 'hard'] as const)[game % 3] ?? 'training');
  const [sa] = await Promise.all([a.session(), b.session()]);
  const before = cb.bytes();
  let turns = 0;
  for (; turns < 60 && a.room?.phase === 'playing'; turns += 1) {
    for (const action of TURN) {
      const t = performance.now();
      const outcome = await sa.sendAction({ action });
      (rtt[action] ??= []).push(performance.now() - t);
      if (!outcome.ok) throw new Error(`${action} refused: ${outcome.error ?? ''}`);
    }
  }
  turnsPlayed.push(turns);
  perTurn.push((cb.bytes() - before) / Math.max(1, turns));
  // Leaving frees the room at once, rather than holding it for the grace period.
  a.leave();
  b.leave();
  await new Promise((r) => setTimeout(r, 200));
}

const all = Object.values(rtt).flat();
console.log(`relay ${url}, ${String(GAMES)} games, turns ${turnsPlayed.join(', ')}`);
console.log(
  `create + join, both clients: p50 ${q(joinMs, 0.5).toFixed(0)} ms, max ${Math.max(...joinMs).toFixed(0)} ms`,
);
console.log(
  `every action: p50 ${q(all, 0.5).toFixed(0)} ms, p95 ${q(all, 0.95).toFixed(0)} ms, max ${Math.max(...all).toFixed(0)} ms, n ${String(all.length)}`,
);
for (const [k, v] of Object.entries(rtt))
  console.log(
    `  ${k.padEnd(18)} p50 ${q(v, 0.5).toFixed(0)} ms, p95 ${q(v, 0.95).toFixed(0)} ms, max ${Math.max(...v).toFixed(0)} ms`,
  );
console.log(
  `data to one player, gzipped as sent: p50 ${(q(perTurn, 0.5) / 1024).toFixed(1)} KiB a turn, max ${(Math.max(...perTurn) / 1024).toFixed(1)} KiB`,
);
process.exit(0);
