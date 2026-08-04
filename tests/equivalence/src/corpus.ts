/**
 * The committed corpus.
 *
 * Seeds are committed; action logs are not. A log regenerates deterministically from the
 * legacy engine given (seed, difficulty, maxTurns), so committing the seeds is enough to make
 * every run byte-identical across machines and on CI, while keeping the artefact reviewable.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SEEDS_PATH = join(HERE, '..', 'corpus', 'seeds.json');

export type Tier = 'per-push' | 'nightly';

interface Batch {
  id: string;
  generator: string;
  tier: Tier;
  seedBase: number;
  count: number;
  difficulties: string[];
  maxTurns: number;
}

interface PinnedCase {
  seed?: number;
  difficulty?: string;
  maxTurns?: number;
}

interface SeedsFile {
  version: number;
  batches: Batch[];
  pinned: PinnedCase[];
}

export interface CorpusCase {
  batchId: string;
  seed: number;
  difficulty: string;
  maxTurns: number;
}

let cached: SeedsFile | null = null;

function load(): SeedsFile {
  cached ??= JSON.parse(readFileSync(SEEDS_PATH, 'utf8')) as SeedsFile;
  return cached;
}

/** Expand a batch id into its concrete (seed, difficulty) cases. */
export function batch(id: string): CorpusCase[] {
  const found = load().batches.find((b) => b.id === id);
  if (!found) throw new Error(`no corpus batch named ${JSON.stringify(id)}`);
  const out: CorpusCase[] = [];
  for (let i = 0; i < found.count; i += 1) {
    for (const difficulty of found.difficulties) {
      out.push({
        batchId: found.id,
        seed: found.seedBase + i,
        difficulty,
        maxTurns: found.maxTurns,
      });
    }
  }
  return out;
}

/** Every case in a tier, pinned regression cases first. */
export function tier(name: Tier): CorpusCase[] {
  const file = load();
  const pinned: CorpusCase[] = file.pinned
    .filter((p): p is Required<PinnedCase> => typeof p.seed === 'number')
    .map((p) => ({
      batchId: 'pinned',
      seed: p.seed,
      difficulty: p.difficulty,
      maxTurns: p.maxTurns,
    }));
  const batches = file.batches.filter((b) => b.tier === name).flatMap((b) => batch(b.id));
  return [...pinned, ...batches];
}
