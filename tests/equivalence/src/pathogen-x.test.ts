/**
 * FINDING #13 — what `noUncheckedIndexedAccess` does NOT force you to confront.
 *
 * Pathogen X is the only card missing from both TROPISM and FAMILY. The FAMILY miss is the
 * dangerous one, and the point of this file is that **the compiler is silent about it**.
 *
 * `famOf` reads:
 *
 *     return iv.novel ? 'X' : (FAMILY[iv.disease] ?? 'EXB');
 *
 * That `?? 'EXB'` is not optional — legacy has `|| "EXB"` and the port must match. So the
 * fallback that makes the port CORRECT is the same fallback that makes the flag SILENT.
 * Removing it produces `TS2322: Type 'FamilyKey | undefined' is not assignable to type
 * 'AbPoolKey'`, which is the only way to see the lookup at all.
 *
 * So: enabling the flag confronted me with ten lookups and this was not one of them. The danger
 * here is not an unhandled miss. It is a HANDLED miss whose handling is wrong for exactly one
 * card, and no type system will ever say so.
 *
 * These tests pin the consequence instead.
 */

import { describe, expect, it } from 'vitest';

import * as port from '@immunity-wars/engine';

import { loadLegacy } from './engine.js';
import { installRng, restoreRng } from './rng.js';
import type { GameState, Invader } from './types.js';

const legacy = loadLegacy();

describe('#13: the novel flag is the ONLY thing keeping Pathogen X out of the EXB pool', () => {
  it('with the flag, it uses the X pool; without it, it silently becomes an ordinary EXB bacterium', () => {
    expect(port.famOf({ disease: 'Pathogen X', novel: true })).toBe('X');
    expect(port.famOf({ disease: 'Pathogen X' })).toBe('EXB');
    // Legacy agrees, which is why this is preserved rather than fixed.
    expect(legacy.famOf({ disease: 'Pathogen X', novel: true } as never)).toBe('X');
    expect(legacy.famOf({ disease: 'Pathogen X' } as never)).toBe('EXB');
  });

  it('and the CONSEQUENCE is that the whole teaching arc is bypassed', () => {
    // This is the part that matters. Pathogen X exists to teach clonal selection: no antibody
    // you own fits a brand-new antigen, so you must spend AP searching for the matching B-cell
    // clone before you can make anything. Lose the novel flag and an EXB antibody — which you
    // may already be holding for an unrelated bacterium — just works on it.
    const setup = (novel: boolean): { blocked: string | undefined; killed: boolean } => {
      installRng(31337);
      try {
        const g = port.newGame({ difficulty: 'hard', science: false }) as unknown as GameState;
        g.phase = 'command';
        g.ap = 9;
        g.novelSeen = true;
        g.cloneFound = false; // the player has NOT done clonal selection
        g.ab.EXB = 3; // ...but is holding EXB antibodies for something else
        g.invaders = [
          {
            id: 'px',
            type: 'virus',
            disease: 'Pathogen X',
            novel,
            zone: 'hub',
            step: 0,
            tagged: false,
            hp: 1,
            maxhp: 1,
            lane: 'nose',
            organ: null,
            stage: null,
            age: 0,
            embed: 0,
          } as Invader,
        ];
        const r = port.applyAction(
          g as never,
          {
            action: 'neutralise',
            invaderId: 'px',
          } as never,
        ) as { ok: boolean; error?: string };
        return { blocked: r.error, killed: !g.invaders.some((iv) => iv.id === 'px') };
      } finally {
        restoreRng();
      }
    };

    const withFlag = setup(true);
    expect(withFlag.killed, 'novel: the pathogen survives — you must find the clone first').toBe(
      false,
    );
    expect(withFlag.blocked).toBe(
      'This antigen is BRAND NEW — no antibody you own fits it. Run CLONAL SELECTION to find the matching B-cell clone.',
    );

    const withoutFlag = setup(false);
    expect(
      withoutFlag.killed,
      'flag lost: an unrelated EXB antibody destroys it outright, and clonal selection never happens',
    ).toBe(true);
    expect(withoutFlag.blocked).toBeUndefined();
  });

  it('nothing in the type system or the flag can catch this — it is a HANDLED miss', () => {
    // Stated as an executable assertion so it is not just a comment: the FAMILY table has no
    // entry, the lookup silently falls back, and the fallback is legally required.
    expect('Pathogen X' in port.FAMILY, 'Pathogen X is absent from FAMILY').toBe(false);
    expect(port.FAMILY['Pathogen X']).toBeUndefined();
    // The fallback is what legacy does, so it cannot be changed inside Task B.
    expect(port.famOf({ disease: 'a disease that does not exist' })).toBe('EXB');
  });

  it('the TROPISM miss is the same shape, and is what makes Pathogen X a generalist', () => {
    expect('Pathogen X' in port.TROPISM).toBe(false);
    expect(port.TROPISM['Pathogen X']).toBeUndefined();
    // rollOrgan hits `if (declared === 'any' || !declared) list = g.organList.slice()`, so the
    // novel pathogen can target any organ in play. Almost certainly intended — but achieved by
    // omission rather than by writing `"Pathogen X": "any"`, so nothing states the intent and
    // nothing would notice if the fallback were ever tightened.
    const declared = Object.keys(port.TROPISM).length;
    expect(declared, 'every other disease declares its tropism explicitly').toBeGreaterThan(100);
  });
});
