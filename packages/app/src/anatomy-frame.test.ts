/**
 * THE FRAME'S SIZE IS MEASURED, NOT JUDGED (P2.5 item 12, step 2).
 *
 * `board/anatomy.json` authors the organ positions in the keyed frame's 1× pixel space and
 * records that space as `FRAME.w × FRAME.h`. The number that is TRUE is the one the art
 * pipeline emitted and wrote to the manifest. If the frame is ever regenerated at another
 * size, every organ position silently moves — unless the two numbers are held equal here.
 * This is the join between two files neither of which can see the other: content cannot read
 * the app's manifest, and the pipeline does not read content. The app package sees both.
 *
 * The check is a pure function so its control can be run on a mutated pair without touching
 * the shipped files: a size one pixel off must be reported.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ANATOMY_ENTRY, ANATOMY_POS, FRAME, ORGANS } from '@immunity-wars/content';
import { describe, expect, it } from 'vitest';

const APP = dirname(dirname(fileURLToPath(import.meta.url)));

interface Manifest {
  assets: Record<string, { cls?: string; size?: { w?: number; h?: number } } | undefined>;
}

/** Null when the content pack's frame matches the manifest's emitted frame; otherwise why not. */
export function frameMismatch(
  frame: { asset: string; w: number; h: number },
  manifest: Manifest,
): string | null {
  const a = manifest.assets[frame.asset];
  if (!a) return `the manifest has no asset "${frame.asset}"`;
  if (a.cls !== 'frame') return `"${frame.asset}" is a ${String(a.cls)}, not a frame`;
  if (a.size?.w !== frame.w || a.size?.h !== frame.h) {
    return (
      `anatomy.json says ${frame.w}x${frame.h} but the pipeline emitted ` +
      `${String(a.size?.w)}x${String(a.size?.h)} — the frame was regenerated; re-measure the positions`
    );
  }
  return null;
}

const manifest = JSON.parse(
  readFileSync(join(APP, 'public/art/manifest.json'), 'utf8'),
) as Manifest;

describe('the anatomical frame agrees with the art manifest', () => {
  it("the content pack's FRAME is the keyed frame's measured 1x size", () => {
    expect(frameMismatch(FRAME, manifest)).toBeNull();
  });

  it('control: a frame one pixel off is reported', () => {
    expect(frameMismatch({ ...FRAME, h: FRAME.h + 1 }, manifest)).toMatch(/regenerated/);
  });

  it('control: an asset the manifest does not carry is reported', () => {
    expect(frameMismatch({ ...FRAME, asset: 'frame/nobody' }, manifest)).toMatch(/no asset/);
  });

  it('every placed organ and entry has its art emitted, so the planning screen can draw it', () => {
    for (const organ of Object.keys(ANATOMY_POS)) {
      expect(manifest.assets[`organ-${organ}`], organ).toBeDefined();
    }
    for (const route of Object.keys(ANATOMY_ENTRY)) {
      expect(manifest.assets[`entry-${route}`], route).toBeDefined();
    }
    expect(Object.keys(ANATOMY_POS).sort()).toEqual(Object.keys(ORGANS).sort());
  });
});
