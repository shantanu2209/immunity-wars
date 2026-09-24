/**
 * THE BUNDLE IS THE RELAY (P3.5): the file production runs, built by the production recipe, run as
 * its own Node process from a folder where nothing in this repository can be found, and played
 * against over real sockets. If the recipe left anything out, the process cannot start or cannot
 * play, and this goes red. `tools/ci/selftest.ts` breaks the recipe on purpose to prove it does.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { RelayRoom } from '@immunity-wars/session';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bundle } from './bundle.js';

let dir: string;
let child: ChildProcess | null = null;
let url: string;
let output = '';

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'relay-bundle-'));
  const file = join(dir, 'relay.mjs');
  await bundle(file);
  const started = spawn(process.execPath, [file], {
    cwd: tmpdir(),
    env: { ...process.env, PORT: '0', HOST: '127.0.0.1' },
  });
  child = started;
  url = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`the bundle did not start:\n${output}`));
    }, 15_000);
    const read = (chunk: Buffer): void => {
      output += chunk.toString();
      const m = /relay listening on (ws:\/\/\S+)/.exec(output);
      if (m?.[1]) {
        clearTimeout(timer);
        resolve(m[1]);
      }
    };
    started.stdout.on('data', read);
    started.stderr.on('data', read);
    started.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`the bundle exited with ${String(code)} before listening:\n${output}`));
    });
  });
}, 60_000);

afterAll(async () => {
  // Waited for, because Windows will not remove a folder a running process still holds.
  const running = child;
  if (running && running.exitCode === null) {
    await new Promise((resolve) => {
      running.once('exit', resolve);
      running.kill();
    });
  }
  await rm(dir, { recursive: true, force: true });
});

async function until(what: string, ok: () => boolean, ms = 5000): Promise<void> {
  const end = Date.now() + ms;
  while (!ok()) {
    if (Date.now() > end) throw new Error(`timed out waiting for: ${what}`);
    await new Promise((r) => setTimeout(r, 5));
  }
}

describe('the bundled relay, as production runs it', () => {
  it('starts on plain Node and plays a turn with two clients who agree', async () => {
    const a = await RelayRoom.create({ url, name: 'A' });
    const b = await RelayRoom.join({ url, code: a.code, name: 'B' });
    a.claimSeat('bcell');
    b.claimSeat('neutrophil');
    await until('both seated', () => a.room?.members.every((m) => m.seats.length > 0) === true);
    a.start('training');
    const [sa, sb] = await Promise.all([a.session(), b.session()]);
    for (const action of ['draw', 'beginCommand', 'confirmAllocation', 'endCommand']) {
      expect(await sa.sendAction({ action }), action).toEqual({ ok: true });
    }
    await until('B has the same board', () => {
      return JSON.stringify(sb.getView().game) === JSON.stringify(sa.getView().game);
    });
    expect(sa.getView().scoped.moveDestinations).toBeNull();
    a.close();
    b.close();
  });

  it('refuses a code nobody holds', async () => {
    await expect(RelayRoom.join({ url, code: 'QQQQQQ', name: 'X' })).rejects.toMatchObject({
      code: 'noSuchRoom',
    });
  });
});
