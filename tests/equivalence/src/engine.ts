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

import type { Engine } from './types.js';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(HERE, '..', '..', '..');
export const LEGACY_PATH = join(REPO_ROOT, 'tools', 'legacy', 'v2_engine.js');

let cachedSource: string | null = null;

export function legacySource(): string {
  cachedSource ??= readFileSync(LEGACY_PATH, 'utf8');
  return cachedSource;
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

/** A fresh, independent instance of the legacy engine. */
export function loadLegacy(): Engine {
  return evaluateCommonJs(legacySource(), 'legacy');
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
