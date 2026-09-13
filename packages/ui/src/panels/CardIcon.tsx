/**
 * THE CARD ICON (docs/for-P2.7.md §14, ruling 5, 13 September 2026): a small card with a line of
 * text on it, beside a name, meaning "this opens its card". One convention everywhere a card opens:
 * the selected cell's name in the dock, the inspect sheet's pathogens and cells, planning's rows,
 * and the reveal's arrivals. It replaced the "Card" text buttons, which were wider than the icon
 * and, in the inspect sheet at 200% page zoom, wider than the screen (FINDINGS #72).
 *
 * Hidden from assistive technology: the button it sits in carries the words ("About Rotavirus"),
 * through the catalogue, so the icon adds no text a translation would have to chase.
 */
import type { ReactElement } from 'react';

export function CardIcon({ size = 18 }: { size?: number }): ReactElement {
  return (
    <svg
      data-card-icon=""
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
      style={{ flex: '0 0 auto', display: 'block' }}
    >
      <rect
        x="3"
        y="2"
        width="14"
        height="16"
        rx="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <line x1="6.5" y1="7" x2="13.5" y2="7" stroke="currentColor" strokeWidth="1.8" />
      <line x1="6.5" y1="10.5" x2="13.5" y2="10.5" stroke="currentColor" strokeWidth="1.8" />
      <line x1="6.5" y1="14" x2="11" y2="14" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
