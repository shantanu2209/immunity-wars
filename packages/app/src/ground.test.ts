/**
 * THE PAGE'S GROUND IS THE KIT'S TABLE (stage L5). The app's two pages and its installed manifest
 * each name the colour a screen stands on, as text, because they are read before any script runs;
 * the kit names it in `COLOUR.table`. Three copies of one value drift, so they are held together
 * here: change the kit's table and this says which file was left behind.
 * Control: pnpm ci:selftest page-ground-is-the-kits-table.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { COLOUR } from '@immunity-wars/ui/kit';
import { describe, expect, it } from 'vitest';

const APP = dirname(dirname(fileURLToPath(import.meta.url)));
const table = COLOUR.table.toLowerCase();

describe('the page’s ground', () => {
  for (const page of ['index.html', 'dev.html']) {
    it(`${page} paints the kit’s table before any script runs`, () => {
      const html = readFileSync(join(APP, page), 'utf8');
      const painted = /html,\s*body\s*\{\s*background:\s*(#[0-9a-fA-F]{6})/.exec(html)?.[1];
      expect(
        painted?.toLowerCase(),
        `THE PAGE’S GROUND IS NOT THE KIT’S TABLE: ${page} paints ${painted ?? 'nothing'}, the kit’s table is ${table}`,
      ).toBe(table);
    });
  }

  it('the installed app opens on the kit’s table', () => {
    const config = readFileSync(join(APP, 'vite.config.ts'), 'utf8');
    for (const key of ['background_color', 'theme_color']) {
      const named = new RegExp(`${key}: '(#[0-9a-fA-F]{6})'`).exec(config)?.[1];
      expect(
        named?.toLowerCase(),
        `THE PAGE’S GROUND IS NOT THE KIT’S TABLE: the manifest’s ${key} is ${named ?? 'missing'}, the kit’s table is ${table}`,
      ).toBe(table);
    }
  });
});
