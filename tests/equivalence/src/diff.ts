/**
 * Path-level structural diff.
 *
 * "Diverged at action 4,122" is nearly useless. What makes a failure actionable is knowing
 * WHICH field differs, so a divergence reports as
 *
 *     invaders[2].hp        legacy=3  port=2
 *     organs.brain.clear    legacy=0  port=1
 *
 * rather than as two 37 KB blobs to eyeball.
 *
 * NaN-aware on purpose: the port is contracted to reproduce the NaN-accumulating stats
 * counters in docs/FINDINGS.md #3, so NaN must compare equal to NaN here, and NaN must NOT
 * compare equal to the null that JSON.stringify would have turned it into.
 */

export interface Difference {
  path: string;
  legacy: string;
  candidate: string;
}

function show(v: unknown): string {
  if (v === undefined) return '<undefined>';
  if (v === null) return 'null';
  if (typeof v === 'number' && Number.isNaN(v)) return 'NaN';
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'object') {
    const s = JSON.stringify(v);
    return s === undefined ? String(v) : s.length > 120 ? `${s.slice(0, 117)}...` : s;
  }
  return String(v);
}

function sameLeaf(a: unknown, b: unknown): boolean {
  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) return true;
    return Object.is(a, b);
  }
  return a === b;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Walk both values and collect differences, stopping at `limit`.
 *
 * Key ORDER differences are reported too, not just key sets — level 1 of the equivalence
 * contract requires matching property insertion order.
 */
export function diff(legacy: unknown, candidate: unknown, limit = 20): Difference[] {
  const out: Difference[] = [];

  const walk = (a: unknown, b: unknown, path: string): void => {
    if (out.length >= limit) return;

    if (Array.isArray(a) || Array.isArray(b)) {
      if (!Array.isArray(a) || !Array.isArray(b)) {
        out.push({ path, legacy: show(a), candidate: show(b) });
        return;
      }
      if (a.length !== b.length) {
        out.push({
          path: `${path}.length`,
          legacy: String(a.length),
          candidate: String(b.length),
        });
      }
      const n = Math.max(a.length, b.length);
      for (let i = 0; i < n && out.length < limit; i += 1) {
        walk(a[i], b[i], `${path}[${i}]`);
      }
      return;
    }

    if (isPlainObject(a) && isPlainObject(b)) {
      const ka = Object.keys(a);
      const kb = Object.keys(b);
      if (ka.join(',') !== kb.join(',')) {
        const missing = ka.filter((k) => !kb.includes(k));
        const extra = kb.filter((k) => !ka.includes(k));
        if (missing.length || extra.length) {
          out.push({
            path: `${path} <keys>`,
            legacy: missing.length ? `missing in candidate: ${missing.join(',')}` : '(same set)',
            candidate: extra.length ? `extra in candidate: ${extra.join(',')}` : '(same set)',
          });
        } else {
          // Same keys, different insertion order — a real level-1 failure.
          out.push({
            path: `${path} <key order>`,
            legacy: ka.join(','),
            candidate: kb.join(','),
          });
        }
      }
      for (const k of new Set([...ka, ...kb])) {
        if (out.length >= limit) return;
        walk(a[k], b[k], path ? `${path}.${k}` : k);
      }
      return;
    }

    if (!sameLeaf(a, b)) {
      out.push({ path: path || '<root>', legacy: show(a), candidate: show(b) });
    }
  };

  walk(legacy, candidate, '');
  return out;
}

export function formatDiff(diffs: Difference[]): string {
  if (diffs.length === 0) return '  (no structural difference found)';
  const width = Math.max(...diffs.map((d) => d.path.length));
  return diffs
    .map((d) => `  ${d.path.padEnd(width)}  legacy=${d.legacy}  candidate=${d.candidate}`)
    .join('\n');
}
