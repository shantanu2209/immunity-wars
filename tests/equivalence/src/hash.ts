/**
 * State hashing.
 *
 * Retention, not compute, is the bottleneck. A full game state stringifies to roughly 37.8 KB
 * — the undo stack dominates, since pushUndo clones invaders, cells, residents, organs and
 * the log on every undoable action and keeps up to 60 of them. Holding a snapshot per action
 * costs about 1 GB per 300 games, which is measured, not estimated.
 *
 * So the rig hashes during the run and re-runs to materialise full state only at a
 * divergence — which is what the shrinker needs anyway.
 */

/** FNV-1a style 64-bit digest, carried as two 32-bit halves. */
export function hash(s: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    h1 = (h1 ^ c) >>> 0;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = (h2 + c) >>> 0;
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

/**
 * Canonical serialisation of a value for hashing.
 *
 * NOT JSON.stringify alone. JSON renders NaN as null, which would hide the NaN-accumulating
 * stats counters documented in docs/FINDINGS.md #3 — the port is required to reproduce that
 * bug, so the comparison has to be able to see it. Undefined gets a distinct marker for the
 * same reason: `{a: undefined}` and `{}` are different states that JSON collapses together.
 *
 * Property order is preserved, deliberately. Level 1 of the equivalence contract requires the
 * port to build state objects in the same order as legacy, which also keeps Task E's
 * JSON.stringify(viewState(g)).length measurement a fact about the game rather than an
 * artefact of how the port was typed.
 */
export function canonical(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return '#undef';
  const t = typeof value;
  if (t === 'number') {
    const n = value as number;
    if (Number.isNaN(n)) return '#NaN';
    if (n === Infinity) return '#Inf';
    if (n === -Infinity) return '#-Inf';
    if (Object.is(n, -0)) return '#-0';
    return String(n);
  }
  if (t === 'string') return JSON.stringify(value);
  if (t === 'boolean') return String(value);
  if (t === 'function') return '#fn';
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of Object.keys(obj)) {
    parts.push(`${JSON.stringify(key)}:${canonical(obj[key])}`);
  }
  return `{${parts.join(',')}}`;
}

export function hashValue(value: unknown): string {
  return hash(canonical(value));
}
