/**
 * THE HINDI EDITION IS WHOLE (24 November 2026). Four files make it: the screens' catalogue,
 * the engine's, the names the content pack holds as data, and the glossary. Each is held to its
 * English here, so that a key dropped or a placeholder lost in review is found by this test and
 * not by a player reading ⟪key⟫ or a sentence with its number missing.
 *
 * Controls (tools/ci/selftest.ts): `hi-catalogue-is-whole` drops one key from hi/ui.json and
 * requires the failure to name it; `hi-placeholders-are-kept` drops a {n} and requires the
 * failure to name the key.
 */
import { describe, expect, it } from 'vitest';

import {
  CNAME,
  DECK_MASTER,
  DZINFO,
  DZSTATS,
  ENGINE_I18N_EN,
  ENGINE_I18N_HI,
  EVENTS,
  FAMILIES,
  GLOSSARY_I18N_EN,
  GLOSSARY_I18N_HI,
  NAMES_I18N_HI,
  ORGANS,
  RARE,
  RESIDENT_NAME,
  ROUTES,
  UI_,
  UI_I18N_EN,
  UI_I18N_HI,
  BEAT_BY_TYPE,
} from './index.js';

const PLACEHOLDER = /\{(\w+)\}/g;
/** English plural suffixes the engine composes ("Action Point{pool2}"); Hindi has none. */
const PLURAL_SUFFIXES = new Set(['pool2', 'made2']);
const DASHES = ['—', '–', ' - '];

function placeholders(s: string): Set<string> {
  const out = new Set<string>();
  for (const m of s.matchAll(PLACEHOLDER))
    if (!PLURAL_SUFFIXES.has(m[1] ?? '')) out.add(m[1] ?? '');
  return out;
}

function holdWhole(name: string, en: Record<string, string>, hi: Record<string, string>): void {
  const missing = Object.keys(en).filter((k) => !(k in hi));
  expect(missing, `HINDI IS MISSING, ${name}: ${missing.join(', ')}`).toEqual([]);
  const extra = Object.keys(hi).filter((k) => !(k in en));
  expect(extra, `HINDI HAS A KEY ENGLISH LACKS, ${name}: ${extra.join(', ')}`).toEqual([]);
  const empty = Object.keys(en).filter((k) => en[k] !== '' && hi[k] === '');
  expect(empty, `HINDI IS EMPTY, ${name}: ${empty.join(', ')}`).toEqual([]);
  const lost = Object.keys(en).filter((k) => {
    const want = placeholders(en[k] ?? '');
    const got = placeholders(hi[k] ?? '');
    return want.size !== got.size || [...want].some((p) => !got.has(p));
  });
  expect(lost, `A PLACEHOLDER IS LOST, ${name}: ${lost.join(', ')}`).toEqual([]);
  const dashed = Object.keys(hi).filter((k) => DASHES.some((d) => (hi[k] ?? '').includes(d)));
  expect(dashed, `A DASH IN HINDI, ${name}: ${dashed.join(', ')}`).toEqual([]);
}

describe('the Hindi edition is whole', () => {
  it('the screens: every key, every placeholder, no dash', () => {
    holdWhole('ui', UI_I18N_EN, UI_I18N_HI);
  });

  it('the engine: every key, every placeholder, no dash', () => {
    holdWhole('engine', ENGINE_I18N_EN, ENGINE_I18N_HI);
  });

  it('the names: one for every row of every table the screens draw a name from', () => {
    const expected: Record<string, string> = {};
    for (const [k, v] of Object.entries(CNAME as Record<string, string>))
      expected[`cell.${k}.n`] = v;
    expected['cell.eosinophil.n'] = 'Eosinophil';
    for (const k of Object.keys(expected).map((x) => x.split('.')[1] ?? ''))
      expected[`cell.${k}.r`] = '';
    for (const k of Object.keys(UI_ as Record<string, unknown>)) expected[`kind.${k}`] = '';
    for (const k of Object.keys(ORGANS as Record<string, unknown>)) {
      expected[`organ.${k}.name`] = '';
      expected[`organ.${k}.effect`] = '';
    }
    for (const k of Object.keys(ROUTES as Record<string, unknown>)) expected[`route.${k}`] = '';
    expected['region.core'] = '';
    for (const k of Object.keys(FAMILIES as Record<string, unknown>)) expected[`family.${k}`] = '';
    for (const k of Object.keys(RESIDENT_NAME as Record<string, unknown>))
      expected[`resident.${k}`] = '';
    for (const k of Object.keys(EVENTS as Record<string, unknown>)) {
      expected[`event.${k}.name`] = '';
      expected[`event.${k}.why`] = '';
      expected[`event.${k}.tell`] = '';
    }
    for (const k of Object.keys(RARE as Record<string, unknown>)) {
      expected[`rare.${k}.name`] = '';
      expected[`rare.${k}.why`] = '';
    }
    for (const s of Object.values(
      DZSTATS as Record<string, readonly [number, number, number, number, string]>,
    ))
      expected[`tier.${s[4]}`] = '';
    for (const k of Object.keys(BEAT_BY_TYPE as Record<string, unknown>))
      expected[`beat.${k}`] = '';
    const diseases = new Set<string>(DECK_MASTER.map((c) => c.dz));
    for (const k of Object.keys(DZINFO as Record<string, unknown>)) diseases.add(k);
    for (const d of diseases) expected[`disease.${d}`] = d;

    const missing = Object.keys(expected).filter((k) => !(k in NAMES_I18N_HI));
    expect(missing, `HINDI NAMES ARE MISSING: ${missing.join(', ')}`).toEqual([]);
    const extra = Object.keys(NAMES_I18N_HI).filter((k) => !(k in expected));
    expect(extra, `HINDI NAMES NOBODY ASKS FOR: ${extra.join(', ')}`).toEqual([]);
    // A name may be empty only where the table's own row is empty (an event with no tell).
    const emptyOk = new Set(
      Object.keys(EVENTS as Record<string, { tell?: string }>)
        .filter((k) => !(EVENTS as Record<string, { tell?: string }>)[k]?.tell)
        .map((k) => `event.${k}.tell`),
    );
    const empty = Object.keys(NAMES_I18N_HI).filter(
      (k) => NAMES_I18N_HI[k] === '' && !emptyOk.has(k),
    );
    expect(empty, `A HINDI NAME IS EMPTY: ${empty.join(', ')}`).toEqual([]);
    const dashed = Object.keys(NAMES_I18N_HI).filter((k) =>
      DASHES.some((d) => (NAMES_I18N_HI[k] ?? '').includes(d)),
    );
    expect(dashed, `A DASH IN A HINDI NAME: ${dashed.join(', ')}`).toEqual([]);
  });

  it('the glossary: every term has a Hindi term and meaning, and no dash', () => {
    const terms = [
      ...new Set(Object.keys(GLOSSARY_I18N_EN).map((k) => k.replace(/\.(term|meaning)$/, ''))),
    ];
    for (const t of terms) {
      expect(GLOSSARY_I18N_EN[`${t}.term`], `glossary ${t} has no English term`).toBeTruthy();
      expect(GLOSSARY_I18N_EN[`${t}.meaning`], `glossary ${t} has no English meaning`).toBeTruthy();
    }
    const missing = terms.filter(
      (t) => !GLOSSARY_I18N_HI[`${t}.term`] || !GLOSSARY_I18N_HI[`${t}.meaning`],
    );
    expect(missing, `HINDI GLOSSARY IS MISSING: ${missing.join(', ')}`).toEqual([]);
    const extra = Object.keys(GLOSSARY_I18N_HI).filter(
      (k) =>
        !(
          k.replace(/\.(term|meaning|textbook)$/, '') in
          Object.fromEntries(terms.map((t) => [t, 1]))
        ),
    );
    expect(extra, `HINDI GLOSSARY HAS A TERM ENGLISH LACKS: ${extra.join(', ')}`).toEqual([]);
    const dashed = [...Object.entries(GLOSSARY_I18N_EN), ...Object.entries(GLOSSARY_I18N_HI)]
      .filter(([, v]) => DASHES.some((d) => v.includes(d)))
      .map(([k]) => k);
    expect(dashed, `A DASH IN THE GLOSSARY: ${dashed.join(', ')}`).toEqual([]);
  });
});
