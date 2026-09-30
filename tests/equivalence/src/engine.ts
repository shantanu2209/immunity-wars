/**
 * Loading engines under test.
 *
 * tools/legacy/v2_engine.js is read-only reference material (CLAUDE.md: "Never edit"), and it
 * is CommonJS while this repo is ESM. Rather than juggle require.cache, the rig reads the
 * source and evaluates it inside a hand-rolled CommonJS wrapper. That gives:
 *
 *   - as many independent instances as wanted, with no cache invalidation dance;
 *   - the ability to evaluate a MUTATED copy for the negative control, without ever writing
 *     a modified file to disk or touching tools/legacy;
 *   - sloppy-mode evaluation, which is how legacy actually runs today. (This matters: the
 *     `heal` branch of setKnobs assigns to an undeclared HEALV, which is a silent no-op in
 *     sloppy mode. See docs/DEVIATIONS.md #1. Nothing calls setKnobs, so it never fires, but
 *     the rig should host legacy exactly as it runs rather than subtly stricter.)
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { RULED, type RuledChange } from './ruled.js';
import type { Engine } from './types.js';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(HERE, '..', '..', '..');
export const LEGACY_PATH = join(REPO_ROOT, 'tools', 'legacy', 'v2_engine.js');

let cachedOriginal: string | null = null;
let cachedRuled: string | null = null;

/** The original engine's source exactly as it is on disk: for what must see it as it was. */
export function originalLegacySource(): string {
  cachedOriginal ??= readFileSync(LEGACY_PATH, 'utf8');
  return cachedOriginal;
}

/**
 * THE ORACLE: the original engine AS RULED (`ruled.ts`), every ruled change applied in memory. Every
 * comparison, and every negative control, runs against this; `originalLegacySource` is the past.
 */
export function legacySource(): string {
  cachedRuled ??= applyRuled(originalLegacySource(), RULED);
  return cachedRuled;
}

/** Applies ruled edits in order, each required to match exactly once. */
export function applyRuled(source: string, ruled: readonly RuledChange[]): string {
  let s = source;
  for (const r of ruled) {
    const n = s.split(r.find).length - 1;
    if (n !== 1) {
      throw new Error(
        `ruled change ${r.queue} ${JSON.stringify(r.name)} matched ${String(n)} times, expected ` +
          'exactly 1: it is stale, and the oracle would silently not be the original as ruled',
      );
    }
    s = s.replace(r.find, () => r.replace);
  }
  return s;
}

/** Evaluate CommonJS source into a module object. */
function evaluateCommonJs(source: string, label: string): Engine {
  const module = { exports: {} as Record<string, unknown> };
  const required = (id: string): never => {
    throw new Error(`${label}: unexpected require(${JSON.stringify(id)})`);
  };
  const factory = new Function('module', 'exports', 'require', source) as (
    m: typeof module,
    e: Record<string, unknown>,
    r: (id: string) => never,
  ) => void;
  factory(module, module.exports, required);
  return module.exports as unknown as Engine;
}

/** A fresh, independent instance of the legacy engine, AS RULED: the oracle. */
export function loadLegacy(): Engine {
  return evaluateCommonJs(legacySource(), 'legacy');
}

/** A fresh instance of the original engine as it is on disk, before any ruled change. */
export function loadOriginalLegacy(): Engine {
  return evaluateCommonJs(originalLegacySource(), 'original');
}

export interface Mutation {
  /** Human-readable description, used in negative-control reporting. */
  readonly name: string;
  readonly find: string;
  readonly replace: string;
}

/**
 * A deliberately broken legacy engine, for proving the rig can actually detect a difference.
 *
 * A comparison harness that has never been seen to fail is not evidence. Every mutation is
 * applied by exact string replacement and asserted to have matched exactly once, so a
 * silently-inert mutation cannot masquerade as "the rig found nothing".
 */
export function loadMutatedLegacy(mutation: Mutation): Engine {
  const source = legacySource();
  const occurrences = source.split(mutation.find).length - 1;
  if (occurrences !== 1) {
    throw new Error(
      `mutation ${JSON.stringify(mutation.name)} matched ${occurrences} times, expected exactly 1 — ` +
        'the mutation is stale and would produce a false PASS',
    );
  }
  return evaluateCommonJs(
    source.replace(mutation.find, mutation.replace),
    `mutant:${mutation.name}`,
  );
}
