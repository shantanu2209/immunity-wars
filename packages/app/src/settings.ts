/**
 * THE DEVICE-LOCAL PREFERENCE STORE (docs/for-P2.6.md, PROPOSAL 2 piece B; ruled 6 September
 * 2026).
 *
 * What it holds: a text size and a locale code. No personal data — the DPDP constraint in
 * CLAUDE.md is a design constraint, and a preference store is the easiest place to grow past
 * it, so this file's schema is the whole list and anything else needs a new ruling.
 *
 * Why `localStorage` and not the IndexedDB the autosave uses: the text size must be applied
 * BEFORE the first paint, or the first frame renders at the wrong size and jumps. IndexedDB is
 * asynchronous and cannot be read before render; `localStorage` can. It is device-local,
 * survives a build update, and works in the Capacitor WebView.
 *
 * Why it is not the `Storage` seam: that seam serialises `GameState` and is Session's. Settings
 * are the shell's, and putting a preference inside the save's trust boundary would let a
 * malformed preference break a resume.
 *
 * The stored value is a TRUST BOUNDARY (CLAUDE.md: Zod at every one). Anything that is not a
 * versioned object of exactly this shape reads as the defaults — a control in `settings.test.ts`
 * proves that a malformed value falls back and a valid one round-trips.
 */
import { z } from 'zod';

export const TEXT_SIZES = ['100', '125', '150', '200'] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

/** The locales the catalogue offers. One today; the Hindi edition adds to this list. */
export const LOCALES = ['en'] as const;
export type Locale = (typeof LOCALES)[number];

const SettingsSchema = z.object({
  v: z.literal(1),
  textSize: z.enum(TEXT_SIZES),
  language: z.enum(LOCALES),
});

export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = { v: 1, textSize: '100', language: 'en' };

export const SETTINGS_KEY = 'immunity-wars.settings';

/** The two calls of `localStorage` this store uses, so tests need no DOM. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Reads the settings, synchronously. Anything malformed, missing or of another version is
 *  the defaults: a preference is never worth a broken first paint. */
export function readSettings(store: KeyValueStore | null | undefined): Settings {
  if (!store) return DEFAULT_SETTINGS;
  let raw: string | null;
  try {
    raw = store.getItem(SETTINGS_KEY);
  } catch {
    return DEFAULT_SETTINGS;
  }
  if (raw === null) return DEFAULT_SETTINGS;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_SETTINGS;
  }
  const r = SettingsSchema.safeParse(parsed);
  return r.success ? r.data : DEFAULT_SETTINGS;
}

/** Writes the settings. A store that throws (private mode, quota) loses the preference and
 *  nothing else; the app keeps the in-memory value for the session. Returns whether it stuck. */
export function writeSettings(store: KeyValueStore | null | undefined, s: Settings): boolean {
  if (!store) return false;
  try {
    store.setItem(SETTINGS_KEY, JSON.stringify(SettingsSchema.parse(s)));
    return true;
  } catch {
    return false;
  }
}

/** The browser's store, or null where it is unavailable or throws on access (some privacy
 *  modes throw on the accessor itself). */
export function browserStore(): KeyValueStore | null {
  try {
    const g = globalThis as { localStorage?: KeyValueStore };
    return g.localStorage ?? null;
  } catch {
    return null;
  }
}
