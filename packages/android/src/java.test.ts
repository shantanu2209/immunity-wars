/**
 * The Java check that runs before the Android build. Both ways: the Java the build was refused on
 * must be refused by name, and the one it needs must be let through.
 * Control: pnpm ci:selftest android-java-is-checked-first.
 */
import { describe, expect, it } from 'vitest';

import { javaMajor, javaVerdict } from './java.js';

const JBR_25 = 'openjdk version "25.0.3" 2026-04-21\nOpenJDK Runtime Environment (build 25.0.3+-1)';
const TEMURIN_21 =
  'openjdk version "21.0.8" 2025-07-15 LTS\nOpenJDK Runtime Environment Temurin-21.0.8+9';

describe('the Java the Android build runs on', () => {
  it('reads the major version out of what java prints', () => {
    expect(javaMajor(JBR_25)).toBe(25);
    expect(javaMajor(TEMURIN_21)).toBe(21);
    expect(javaMajor('java version "1.8.0_402"')).toBe(8);
    expect(javaMajor('not a java')).toBeNull();
  });

  it('refuses the Java that Android Studio 2026.2 brings, and says which is needed', () => {
    const verdict = javaVerdict(JBR_25);
    expect(verdict.usable, 'A JAVA THE BUILD CANNOT RUN ON WAS LET THROUGH').toBe(false);
    expect(verdict.why).toContain('Java 25');
    expect(verdict.why).toContain('needs Java 21 to 24');
  });

  it('lets through the Java the build needs', () => {
    expect(javaVerdict(TEMURIN_21).usable).toBe(true);
    expect(javaVerdict('openjdk version "24.0.2"').usable).toBe(true);
  });

  it('refuses one too old, and nothing at all', () => {
    expect(javaVerdict('openjdk version "17.0.12"').usable).toBe(false);
    expect(javaVerdict('').usable).toBe(false);
  });
});
