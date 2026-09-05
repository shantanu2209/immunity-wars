/**
 * NO DASHES IN PLAYER-FACING TEXT (Shantanu's standing preference, 5 September 2026): no em
 * dash, no en dash, no hyphen used as punctuation. Commas, full stops, or a restructured
 * sentence. Cheap now and expensive after the Hindi extraction, since a dash in an English
 * string becomes a dash in every translation derived from it.
 *
 * Swept here: the surfaces the UI authors — the catalogue and the cell cards. NOT swept, and
 * listed rather than hidden: the tables held byte-identical to the legacy files or to the
 * engine's own strings (DZINFO/FACT/BEAT_BY_TYPE against v2_ui.html, ORGANS/EVENTS/FAMILIES
 * against v2_engine.js, engine.json against the engine source). Sweeping those means
 * re-baselining their pins, which is a ruling (for-P2.5.md, "the dash sweep"); when it lands,
 * add the table here.
 *
 * The hyphen rule allows the compound word (T-Cell, B-cell, blood-stage, anti-parasite,
 * X-linked, +1) and forbids the spaced hyphen used as a dash.
 */
import { describe, expect, it } from 'vitest';

import { BEAT_BY_TYPE, CELL_CARDS, DZINFO, FACT, FAMILIES, ORGANS, UI_I18N_EN } from './index.js';

const DASH = /[—–]| - /;

export function dashed(strings: Record<string, string>): string[] {
  return Object.entries(strings)
    .filter(([, v]) => DASH.test(v))
    .map(([k, v]) => `${k}: ${v.slice(0, 60)}`);
}

describe('no dashes in player-facing text', () => {
  it('the UI catalogue', () => {
    expect(dashed(UI_I18N_EN)).toEqual([]);
  });

  it('the cell cards', () => {
    const flat: Record<string, string> = {};
    for (const [cell, card] of Object.entries(CELL_CARDS)) {
      for (const [field, text] of Object.entries(card as Record<string, string | undefined>)) {
        if (typeof text === 'string') flat[`${cell}.${field}`] = text;
      }
    }
    expect(Object.keys(flat).length).toBeGreaterThan(30);
    expect(dashed(flat)).toEqual([]);
  });

  it('the content prose the UI renders (re-baselined from legacy parity, 5 September 2026)', () => {
    const flat: Record<string, string> = {};
    for (const [dz, info] of Object.entries(DZINFO)) {
      for (const [k, v] of Object.entries(info as unknown as Record<string, string>))
        flat[`DZINFO.${dz}.${k}`] = v;
    }
    for (const [dz, v] of Object.entries(FACT)) flat[`FACT.${dz}`] = v;
    for (const [ty, v] of Object.entries(BEAT_BY_TYPE)) flat[`BEAT.${ty}`] = v;
    for (const [o, def] of Object.entries(ORGANS)) {
      flat[`ORGANS.${o}.effect`] = def.effect;
      flat[`ORGANS.${o}.bio`] = def.bio;
    }
    for (const [f, def] of Object.entries(FAMILIES))
      flat[`FAMILIES.${f}.bio`] = String(def.bio ?? '');
    expect(Object.keys(flat).length).toBeGreaterThan(500);
    expect(dashed(flat)).toEqual([]);
  });

  it('control: an em dash, an en dash and a spaced hyphen are each caught; a compound word is not', () => {
    expect(dashed({ a: 'Fever — pathogens do not march' })).toHaveLength(1);
    expect(dashed({ a: 'turns 1–3' })).toHaveLength(1);
    expect(dashed({ a: 'antivenom - 3 AP' })).toHaveLength(1);
    expect(dashed({ a: 'the Killer T-Cell, blood-stage malaria, +1 range' })).toEqual([]);
  });
});
