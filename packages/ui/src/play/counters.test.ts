/**
 * EACH KIND'S SENTENCE SAYS WHAT ITS ROW SAYS (docs/FINDINGS.md #129). The engine test
 * (tests/session/src/counters.test.ts) holds the table to the engine; this holds the words to the
 * table, so that a sentence cannot say "neutralise" for a kind that is coated. Control: pnpm
 * ci:selftest card-counter-words-are-the-tables.
 */
import { describe, expect, it } from 'vitest';

import { t } from '../i18n';
import { ANTIBODIES_DO, antibodiesDo, counterSentence } from './counters';

const words = (type: string, variant = false): string => {
  const key = counterSentence(type, variant);
  if (key === null) throw new Error(`no sentence for ${type}`);
  const text = t(key, { family: 'EXB' });
  expect(text, `${key} is in the catalogue`).not.toBe(key);
  return text.toLowerCase();
};

describe('what a card says antibodies do, in words', () => {
  for (const [kind, does] of Object.entries(ANTIBODIES_DO)) {
    it(`${kind} (${does})`, () => {
      const text = words(kind);
      const coats = /\bcoat/.test(text);
      const neutralises = /\bneutralise/.test(text) && !/cannot coat or neutralise/.test(text);
      const message = `THE SENTENCE FOR ${kind.toUpperCase()} DOES NOT SAY WHAT ITS ROW SAYS: "${text}"`;
      if (does === 'coat') expect(coats && !neutralises, message).toBe(true);
      if (does === 'neutralise') expect(neutralises && !coats, message).toBe(true);
      if (does === 'neither') expect(/cannot|too slowly/.test(text), message).toBe(true);
    });
  }

  it('a parasite that changes its coat: coat, and may neutralise', () => {
    expect(antibodiesDo('parasite', true)).toBe('coat or neutralise');
    const text = words('parasite', true);
    expect(/\bcoat it/.test(text) && /\bmay neutralise/.test(text)).toBe(true);
  });
});
