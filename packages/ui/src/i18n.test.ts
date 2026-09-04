/**
 * t()'s contract, pinned: the miss is loud, params fill placeholders, and an unfilled
 * placeholder stays visible rather than vanishing. Small on purpose — the heavy check on
 * this layer is the lint rule and its negative control, not this file.
 */
import { describe, expect, it } from 'vitest';

import { t } from './i18n.js';

describe('t()', () => {
  it('a missing key renders loudly, never silently empty', () => {
    expect(t('no.such.key.ever')).toBe('⟪no.such.key.ever⟫');
  });

  it('fills {name} placeholders from params', () => {
    // goal.arrive carries {maxTurn} — the first real parameterised string.
    expect(t('goal.arrive', { maxTurn: 15 })).toContain('15');
    expect(t('goal.arrive', { maxTurn: 15 })).not.toContain('{maxTurn}');
  });

  it('an unfilled placeholder stays visible in braces — loud, like a missing key', () => {
    expect(t('goal.arrive', {})).toContain('{maxTurn}');
    expect(t('goal.arrive')).toContain('{maxTurn}');
  });
});
