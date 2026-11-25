/**
 * WORDS FOR A SCREEN READER ONLY (screen reader support, ruled 25 November 2026; docs/LOOK_PLAN.md
 * §36). The top bar says the turn as "3/15", which the eye reads at a glance and a screen reader
 * reads as "three slash fifteen". What the eye sees is hidden from the screen reader, and beside it
 * the same thing is said in words, in an element that takes no room and is not seen.
 *
 * It is the ordinary way to do this: not `display: none`, which hides it from a screen reader too.
 */
import type { CSSProperties } from 'react';

export const SPOKEN_ONLY: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  border: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
};
