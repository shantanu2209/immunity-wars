/**
 * PARITY UP TO PUNCTUATION — the re-baseline of the CONTENT prose pins, ruled by Shantanu on
 * 5 September 2026, as its own instrument change.
 *
 * Two pins were doing two different jobs. The ENGINE catalogue's pin (the i18n drift test)
 * asserts the catalogue IS the engine's text, exactly; loosening it would weaken the very
 * comparison it exists for, so it stays exact until Phase 3 emits ids. The CONTENT tables'
 * pin was a FINISHED MIGRATION: it proved the tables came across from the legacy files
 * unchanged, and it succeeded. Kartik's disease prose is the source of record now, not a copy
 * of one, and holding it byte-identical to a file nobody edits would let a legacy build govern
 * punctuation in the Hindi edition. The standing preference (no dashes in player-facing text)
 * has to be applied to that prose BEFORE the Hindi extraction, so this is the moment.
 *
 * WHAT THE LOOSENED COMPARISON STILL GUARANTEES, so nobody later reads it as a weak one:
 * every letter and every digit of every string, in order; every key and its order; every
 * number, boolean, null and array. It ignores exactly three things — punctuation, whitespace
 * and letter case — because a dash rewritten as a full stop capitalises the next word, and a
 * numeric range may read "1–3" or "1 to 3". A changed word, a dropped word, a changed number,
 * a renamed key: all still fire (`ui-content.test.ts` and `data.test.ts` each carry the
 * control pair — a word mutation must fail, a dash-only mutation must pass).
 *
 * Applied only to the tables that carry prose the ENGINE never emits into state or logs
 * (DZINFO, FACT, BEAT_BY_TYPE, ORGANS, FAMILIES). EVENTS and RARE stay exact: their `tell`
 * and `why` reach the banner, the warning and the log, so the equivalence corpus pins them
 * too, and that pin cannot move in Phase 2.
 */

/** Deep-map every string of a value to its letters-and-digits skeleton. */
export function upToPunctuation<T>(value: T): T {
  if (typeof value === 'string') return skeleton(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v: unknown) => upToPunctuation(v)) as unknown as T;
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = upToPunctuation(v);
    }
    return out as T;
  }
  return value;
}

export function skeleton(s: string): string {
  return (
    s
      .toLowerCase()
      // a numeric range: "1–3", "1-3" and "1 to 3" are one range
      .replace(/(\d)\s*(?:–|-|to)\s*(\d)/gu, '$1$2')
      .replace(/[^\p{L}\p{N}]/gu, '')
  );
}

/** The sweep's own transform, so a control can apply it to a legacy table and require parity. */
export function sweepDashes(s: string): string {
  return s
    .replace(/(\d)–(\d)/gu, '$1 to $2')
    .replace(/\s*—\s*(\p{L})/gu, (_m, c: string) => `. ${c.toUpperCase()}`)
    .replace(/\s*—\s*/gu, '. ');
}
