/**
 * THE SMALL PICTURES ON THE SCREENS' BUTTONS (stage L5): drawn in code, in the ink of whatever they
 * sit on, so they have no colour of their own and nothing to license. Each is decoration beside a
 * word that says the same thing, so each is hidden from a reader.
 */
import type { ReactElement } from 'react';

export type ScreenIconKind =
  'play' | 'together' | 'learn' | 'settings' | 'about' | 'library' | 'again' | 'home';

const PATH: Record<ScreenIconKind, ReactElement> = {
  play: <path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none" />,
  together: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3 19c.4-3.4 2.8-5.2 6-5.2s5.6 1.8 6 5.2" />
      <circle cx="17" cy="9.5" r="2.5" />
      <path d="M17.2 13.9c2.2.2 3.6 1.7 3.9 4.3" />
    </>
  ),
  learn: (
    <>
      <path d="M2.5 9.5 12 5l9.5 4.5L12 14z" />
      <path d="M6.5 12v4c1.5 1.4 3.3 2 5.5 2s4-.6 5.5-2v-4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3v2.6M12 18.4V21M3 12h2.6M18.4 12H21M5.6 5.6l1.9 1.9M16.5 16.5l1.9 1.9M18.4 5.6l-1.9 1.9M7.5 16.5l-1.9 1.9" />
    </>
  ),
  about: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="7.8" r="0.6" fill="currentColor" />
    </>
  ),
  library: (
    <>
      <path d="M5 4.5h11a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2z" />
      <path d="M5 16.5a2 2 0 0 1 2-2h11" />
    </>
  ),
  again: (
    <>
      <path d="M19 12a7 7 0 1 1-2.3-5.2" />
      <path d="M19.5 4.5v4.2h-4.2" />
    </>
  ),
  home: (
    <>
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M6.5 10v9h11v-9" />
    </>
  ),
};

export function ScreenIcon({
  kind,
  size = '1.25em',
}: {
  kind: ScreenIconKind;
  size?: string;
}): ReactElement {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: '0 0 auto' }}
    >
      {PATH[kind]}
    </svg>
  );
}
