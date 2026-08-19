/**
 * SEAM 3 — `PlayerRef`, built for the TYPE and not for the identity.
 *
 * `applyAction` already reads `a.pid` and sets `g._actingPid`, so `sendAction` has to carry a
 * player reference from the first line of code. The question is only what that reference is
 * allowed to be.
 *
 * MAKING IT AN OPAQUE BRANDED STRING TURNS A RULE INTO A COMPILER ERROR. `CLAUDE.md`: no accounts,
 * no emails, no persistent user identifiers. Users are under 18 and India's DPDP Act treats them
 * as children, so "no PII in a player reference" is a design constraint rather than a preference —
 * and a constraint someone has to remember is one that survives exactly as long as the person
 * remembering it. A type that cannot hold an email address is cheap and permanent.
 *
 * Device-local generation. No accounts, no server-side record, nothing that survives a reinstall.
 * That is a feature: there is nothing to leak, nothing to subject-access-request, and nothing to
 * delete.
 */

import type { PlayerRef } from './types.js';

/**
 * Mint a device-local reference.
 *
 * `crypto.getRandomValues` where it exists. The fallback is `Math.random`, which is NOT
 * cryptographically random — and that is fine HERE and nowhere else: this value authenticates
 * nothing, authorises nothing and is never checked against a server. It only has to not collide
 * inside one device's saved games. Said explicitly because "we used Math.random for an identifier"
 * is a sentence that reads badly out of context, and the context is the whole justification.
 */
export function newPlayerRef(): PlayerRef {
  const bytes = new Uint8Array(8);
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => void } }).crypto;
  if (c?.getRandomValues) {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = '';
  for (const b of bytes) out += (b ?? 0).toString(16).padStart(2, '0');
  return `p_${out}` as PlayerRef;
}

/**
 * Re-brand a string that is already known to be a `PlayerRef` — reading one back off disk, say.
 *
 * This is the ONLY sanctioned way to produce a `PlayerRef` from an arbitrary string, and it is
 * deliberately ugly to type and easy to grep for. It validates the shape, so a value that came
 * from somewhere it should not have cannot quietly become a reference.
 */
export function asPlayerRef(value: string): PlayerRef {
  if (!/^p_[0-9a-f]{16}$/.test(value)) {
    throw new Error(
      `not a PlayerRef: ${JSON.stringify(value.slice(0, 32))}. References are device-local and ` +
        'minted by newPlayerRef(). If this came from user input or a network message, that is ' +
        'the bug — a PlayerRef is not a name and must never carry personal data.',
    );
  }
  return value as PlayerRef;
}
