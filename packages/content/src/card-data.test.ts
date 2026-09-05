/**
 * THE CARD'S DATA IS COMPLETE — every disease a player can meet has every field the pathogen
 * card renders, and every pathogen type has its "Beat it" line (P2.5, the card piece,
 * 4 September 2026).
 *
 * The card looks these up by disease name and by type and renders nothing for a miss, so a
 * missing row would be a silently blank card — which is exactly the kind of gap a schema
 * cannot see (each table validates on its own) and a cross-check can. `FACT` is deliberately
 * absent for most diseases and is not required.
 */
import { describe, expect, it } from 'vitest';

import {
  BEAT_BY_TYPE,
  DECK_MASTER,
  DZINFO,
  DZSTATS,
  FAMILY,
  NOVEL_ANTIGENS,
  TROPISM,
  UI_,
} from './index.js';

describe('the pathogen card has data for every disease it can be opened on', () => {
  const playable = [...new Set(DECK_MASTER.filter((c) => !c.novel).map((c) => c.dz))];

  it('is a real list', () => {
    expect(playable.length).toBeGreaterThan(50);
  });

  for (const table of ['DZINFO', 'DZSTATS', 'TROPISM', 'FAMILY'] as const) {
    it(`${table} has a row for every playable disease`, () => {
      const t = { DZINFO, DZSTATS, TROPISM, FAMILY }[table] as Record<string, unknown>;
      const missing = playable.filter((dz) => !(dz in t) && !NOVEL_ANTIGENS.has(dz));
      expect(missing, `${table} is missing: ${missing.join(', ')}`).toEqual([]);
    });
  }

  it('BEAT_BY_TYPE covers every pathogen type UI_ names', () => {
    const types = Object.keys(UI_);
    const missing = types.filter((ty) => !(ty in BEAT_BY_TYPE));
    expect(types.length).toBeGreaterThan(5);
    expect(missing).toEqual([]);
  });
});
