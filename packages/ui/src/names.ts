/**
 * Display names, one source: the rules tables in content (the rule set at the P2.4
 * label-case fix — never two sources that can disagree on case or wording).
 *
 * IN ANOTHER LOCALE (24 November 2026) the same name is looked up in that locale's names
 * catalogue by a key built from the table and the row (`organ.lungs.name`, `disease.Cholera`),
 * and the English is what a miss falls back to. The tables stay the one source of WHICH names
 * exist; the catalogue only says them in Hindi. `i18n-hi.test.ts` in content requires the
 * catalogue to name every row of every table it covers.
 */
import {
  BEAT_BY_TYPE,
  CNAME,
  EVENTS,
  FAMILIES,
  LIBRARY_I18N_HI,
  NAMES_I18N_HI,
  ORGANS,
  RARE,
  REGION_LABEL,
  RESIDENT_NAME,
  ROUTES,
  UI_,
  UM,
} from '@immunity-wars/content';

import { currentLocale, t } from './i18n';

const NAMES: Record<string, Record<string, string> | undefined> = { hi: NAMES_I18N_HI };
const LIBRARY: Record<string, Record<string, string> | undefined> = { hi: LIBRARY_I18N_HI };

/** The locale's word for a table's row, or the English the table holds. */
export function localName(key: string, english: string): string {
  const l = currentLocale();
  if (l === 'en') return english;
  return NAMES[l]?.[key] ?? english;
}

/**
 * CNAME is the legacy table and predates the Eosinophil, so it has no entry for it; the
 * catalogue carries the missing name (`cell.eosinophil`). Any other miss renders loudly as
 * ⟪cell.<key>⟫ rather than as a raw key in a player's face (found on the S25: "eosinophil").
 */
export const cellDisplayName = (ck: string): string => {
  const known = (CNAME as Record<string, string | undefined>)[ck];
  return localName(`cell.${ck}.n`, known !== undefined ? String(known) : t(`cell.${ck}`));
};

/** A cell's one-line role under its name on its card ("roams · innate"). */
export const cellRoleText = (ck: string): string =>
  localName(`cell.${ck}.r`, String((UM as Record<string, { r?: string }>)[ck]?.r ?? ''));

export const typeDisplayName = (ty: string): string =>
  localName(`kind.${ty}`, String((UI_ as Record<string, { n?: string }>)[ty]?.n ?? ty));

/**
 * A resident macrophage's REAL name — Kupffer cell, Microglia, Alveolar macrophage — from
 * the rules pack. CP3 leans on the biology to tell a resident from the player's Monocyte
 * rather than adding labels: a monocyte is the blood-borne precursor, and the residents are
 * the tissue macrophages under their historical names. A miss renders loudly.
 */
export const residentDisplayName = (organ: string): string => {
  const known = (RESIDENT_NAME as Record<string, string | undefined>)[organ];
  return localName(
    `resident.${organ}`,
    known !== undefined ? String(known) : t(`resident.${organ}`),
  );
};

/** An engine action name as the player knows it — `action.<name>` in the catalogue, loud on a miss. */
export const actionDisplayName = (action: string): string => t(`action.${action}`);

export const organDisplayName = (organ: string): string =>
  localName(
    `organ.${organ}.name`,
    String((ORGANS as Record<string, { name?: string }>)[organ]?.name ?? organ),
  );

/** What a damaged organ costs, as its row in the rules table says it. */
export const organEffectText = (organ: string): string =>
  localName(
    `organ.${organ}.effect`,
    String((ORGANS as Record<string, { effect?: string }>)[organ]?.effect ?? ''),
  );

export const routeDisplayName = (lane: string): string =>
  localName(
    `route.${lane}`,
    String((ROUTES as Record<string, { name?: string }>)[lane]?.name ?? lane),
  );

export const regionDisplayName = (region: string): string =>
  localName(
    `region.${region}`,
    String((REGION_LABEL as Record<string, string | undefined>)[region] ?? region),
  );

/** An antigen class's full name ("Enveloped virus"); its code (ENV) is the same in every locale. */
export const familyDisplayName = (family: string): string =>
  localName(
    `family.${family}`,
    String((FAMILIES as Record<string, { name?: string }>)[family]?.name ?? family),
  );

/** A disease by its name in the content pack, which is also its key everywhere in the engine. */
export const diseaseDisplayName = (disease: string): string =>
  localName(`disease.${disease}`, disease);

/**
 * The library's text in the locale: a disease card's sentence (`library.<name>.<d|c|w|p|r>`), its
 * fact (`fact.<name>`), a cell card's field (`cellCard.<cell>.<field>`), a why essay
 * (`why.<key>`), an organ's or a class's note (`organ.<k>.bio`, `family.<k>.bio`). The English
 * the table holds is what a miss falls back to.
 */
export function libraryText(key: string, english: string): string {
  const l = currentLocale();
  if (l === 'en') return english;
  return LIBRARY[l]?.[key] ?? english;
}

/** A pathogen card's tier word: Common, Rare, Legendary. */
export const tierDisplayName = (tier: string): string => localName(`tier.${tier}`, tier);

/** The pathogen card's "Beat it" paragraph for a kind of invader. */
export const beatText = (type: string): string =>
  localName(
    `beat.${type}`,
    String((BEAT_BY_TYPE as Record<string, string | undefined>)[type] ?? ''),
  );

export interface EventText {
  name: string;
  why: string;
  tell: string;
}

/** A crisis event by its key in the events table: its name, its reason and its forecast line. */
export function eventDisplayText(key: string): EventText {
  const e = (EVENTS as Record<string, { name?: string; why?: string; tell?: string } | undefined>)[
    key
  ];
  return {
    name: localName(`event.${key}.name`, String(e?.name ?? key)),
    why: localName(`event.${key}.why`, String(e?.why ?? '')),
    tell: localName(`event.${key}.tell`, String(e?.tell ?? '')),
  };
}

/** A rare event by its key in the events table. */
export function rareDisplayText(key: string): { name: string; why: string } {
  const e = (RARE as Record<string, { name?: string; why?: string } | undefined>)[key];
  return {
    name: localName(`rare.${key}.name`, String(e?.name ?? key)),
    why: localName(`rare.${key}.why`, String(e?.why ?? '')),
  };
}

/**
 * THE ENGINE WRITES NAMES IN ENGLISH, composed into its sentences ("Lungs branch 2", "the
 * Lungs itself", a crisis banner's name). This turns the English names inside such a value
 * into the locale's, whole words only and the longest first, so "Hepatitis B" is not half
 * translated by "Hepatitis". In English it is the identity. The composed place phrases the
 * engine makes (`placeName` in the engine) are handled as phrases before the words.
 */
export function localiseEnglishNames(text: string): string {
  if (currentLocale() === 'en') return text;
  const pairs = englishPairs();
  let out = text;
  if (currentLocale() === 'hi') {
    out = out.replace(/^the (.+) itself$/, (_m, organ: string) => `${organ} के अंदर`);
    out = out.replace(
      /^(.+) branch (\d+)$/,
      (_m, organ: string, step: string) => `${organ} की शाखा ${step}`,
    );
    out = out.replace(/^the bloodstream$/, 'रक्तधारा');
  }
  for (const [english, local, pattern] of pairs) {
    if (out.includes(english)) out = out.replace(pattern, local);
  }
  return out;
}

const PAIRS_BY_LOCALE: Partial<Record<string, [string, string, RegExp][]>> = {};

function englishPairs(): [string, string, RegExp][] {
  const l = currentLocale();
  const cached = PAIRS_BY_LOCALE[l];
  if (cached) return cached;
  const names = NAMES[l] ?? {};
  const out: [string, string][] = [];
  const add = (key: string, english: string): void => {
    const local = names[key];
    if (local !== undefined && local !== english && english.length > 0) out.push([english, local]);
  };
  for (const [k, v] of Object.entries(ORGANS as Record<string, { name?: string }>))
    add(`organ.${k}.name`, String(v.name ?? ''));
  for (const [k, v] of Object.entries(ROUTES as Record<string, { name?: string }>))
    add(`route.${k}`, String(v.name ?? ''));
  for (const [k, v] of Object.entries(CNAME as Record<string, string>)) add(`cell.${k}.n`, v);
  add('cell.eosinophil.n', 'Eosinophil');
  for (const [k, v] of Object.entries(RESIDENT_NAME as Record<string, string>))
    add(`resident.${k}`, v);
  for (const [k, v] of Object.entries(FAMILIES as Record<string, { name?: string }>))
    add(`family.${k}`, String(v.name ?? ''));
  for (const [k, v] of Object.entries(UI_ as Record<string, { n?: string }>))
    add(`kind.${k}`, String(v.n ?? ''));
  for (const [k, v] of Object.entries(EVENTS as Record<string, { name?: string }>))
    add(`event.${k}.name`, String(v.name ?? ''));
  for (const [k, v] of Object.entries(RARE as Record<string, { name?: string }>))
    add(`rare.${k}.name`, String(v.name ?? ''));
  for (const k of Object.keys(names)) {
    if (k.startsWith('disease.')) add(k, k.slice('disease.'.length));
  }
  out.sort((a, b) => b[0].length - a[0].length);
  const built: [string, string, RegExp][] = out.map(([english, local]) => [
    english,
    local,
    new RegExp(`(?<![A-Za-z])${english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z])`, 'g'),
  ]);
  PAIRS_BY_LOCALE[l] = built;
  return built;
}
