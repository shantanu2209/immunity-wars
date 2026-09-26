/**
 * THE STEP GUARD (FINDINGS #90), at the gaps that were measured to end a turn by a double tap, and at
 * the pace of a deliberate second tap, which must still do the next step.
 */
import { describe, expect, it } from 'vitest';

import { STEP_GUARD_MS, tapCounts } from './stepGuard';

describe('a tap just after the step changes', () => {
  it('is ignored at every gap a double tap was measured to end the turn at', () => {
    for (const gap of [0, 80, 150, 250, 400])
      expect(tapCounts(1000, 1000 + gap), String(gap)).toBe(false);
  });

  it('counts once the step has been showing for half a second: a deliberate tap is never lost', () => {
    expect(STEP_GUARD_MS).toBe(500);
    expect(tapCounts(1000, 1000 + STEP_GUARD_MS)).toBe(true);
    expect(tapCounts(1000, 1000 + 2000)).toBe(true);
  });
});
