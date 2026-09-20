/**
 * THE TOP BAR'S ICONS (piece 5 of the play screen, docs/for-P2.7.md §19): the menu's three lines
 * and the messages' speech bubble, drawn in SVG like the card icon, so no glyph depends on a font
 * and no text sits in the markup. Hidden from assistive technology: the buttons carry the words.
 */
import type { ReactElement } from 'react';

export function MenuIcon(): ReactElement {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" focusable="false">
      <path
        d="M3 5.5h16M3 11h16M3 16.5h16"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function ChatIcon(): ReactElement {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" focusable="false">
      <path
        d="M4 4.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H9l-4.5 3.5v-3.5H4A1.5 1.5 0 0 1 2.5 14V6A1.5 1.5 0 0 1 4 4.5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M6.5 8.5h9M6.5 11.5h6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
