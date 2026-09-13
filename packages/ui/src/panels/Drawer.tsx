/**
 * THE DRAWERS (docs/for-P2.7.md §9 rulings 3, 4 and 7; piece 3, built 13 September 2026).
 *
 * The main play screen holds only what a turn needs to be played: the turn line, the effects, the
 * board, this row of drawer buttons and the dock. Everything else opens as a drawer over the board:
 *
 *   Pieces, Antibodies, The body  QUICK PICKS: slide up from the bottom, part of the board still
 *                                 visible above, closed by the floating close or a tap on the board
 *                                 around them. Picking a piece closes the Pieces drawer (ruling 3).
 *   What happened                 A READING SURFACE: opens full height and scrolls, like a card.
 *
 * Each drawer is one level on the navigation stack (ruling 9), so the floating close and the phone's
 * back gesture close it, and the dock hides underneath while it is open (§12, ruling 1).
 *
 * The scrim closes the drawer too. Ruling 8 makes the floating close THE close; a scrim that
 * swallowed a tap and did nothing would be a control that does nothing, so the tap does the one
 * thing a tap outside an open drawer can mean.
 */
import type { CSSProperties, ReactElement, ReactNode } from 'react';

import { t } from '../i18n';
import { FLOAT_RESERVE } from '../nav/NavHost';

export type DrawerKind = 'pieces' | 'antibodies' | 'body' | 'log';

/** The row's order, and each drawer's button words (the panels' own titles where they are short). */
export const DRAWERS: readonly { kind: DrawerKind; label: string }[] = [
  { kind: 'pieces', label: 'drawer.pieces' },
  { kind: 'antibodies', label: 'antibody.title' },
  { kind: 'body', label: 'body.title' },
  { kind: 'log', label: 'log.title' },
];

/** What happened is read, not picked from: it opens full height. */
const READING: ReadonlySet<DrawerKind> = new Set(['log']);

const MOTION =
  '@keyframes iwDrawerUp{from{transform:translateY(18px);opacity:0}to{transform:none;opacity:1}}' +
  '[data-drawer]{animation:iwDrawerUp 160ms ease-out}' +
  '@media (prefers-reduced-motion: reduce){[data-drawer]{animation:none}}';

const BUTTON: CSSProperties = {
  minHeight: 48,
  minWidth: 0,
  padding: '2px 4px',
  fontSize: '0.8125rem',
  fontWeight: 700,
  lineHeight: 1.15,
  borderRadius: 8,
  border: '1.5px solid #8E6E53',
  background: '#FFFDF9',
  color: '#2E2A28',
  cursor: 'pointer',
  overflowWrap: 'anywhere',
};

/** The row of drawer buttons under the board: four equal buttons, words wrapping, never clipped. */
export function DrawerRow({
  disabled,
  onOpen,
}: {
  disabled: boolean;
  onOpen: (kind: DrawerKind) => void;
}): ReactElement {
  return (
    <div
      data-drawer-row=""
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${String(DRAWERS.length)}, minmax(0, 1fr))`,
        gap: 4,
        marginTop: 4,
      }}
    >
      {DRAWERS.map((d) => (
        <button
          key={d.kind}
          data-drawer-button={d.kind}
          disabled={disabled}
          onClick={() => onOpen(d.kind)}
          style={BUTTON}
        >
          {t(d.label)}
        </button>
      ))}
    </div>
  );
}

export function Drawer({
  kind,
  onClose,
  children,
}: {
  kind: DrawerKind;
  /** The scrim's tap: the same close the floating button makes. */
  onClose: () => void;
  children: ReactNode;
}): ReactElement {
  const reading = READING.has(kind);
  return (
    <>
      <style>{MOTION}</style>
      <div
        aria-hidden="true"
        data-drawer-scrim=""
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(46,42,40,0.28)',
          zIndex: 11,
        }}
      />
      <div
        data-drawer={kind}
        role="dialog"
        aria-label={t(DRAWERS.find((d) => d.kind === kind)?.label ?? kind)}
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          margin: '0 auto',
          // Full width below 460px, with 4px side padding and a 1.5px border: the piece grid's names
          // are one line by design (equal boxes), and at a 180px layout (200% page zoom) a 96vw drawer
          // with 10px padding left a resident's name 109px of the 122 it needs (for-P2.7.md §15).
          width: 'min(100vw, 460px)',
          boxSizing: 'border-box',
          bottom: FLOAT_RESERVE,
          ...(reading ? { top: '0.5rem' } : { maxHeight: '62vh' }),
          overflowY: 'auto',
          overflowWrap: 'anywhere',
          background: '#FFFDF9',
          border: '1.5px solid #8E6E53',
          borderRadius: 14,
          boxShadow: '0 -6px 24px rgba(46,42,40,0.25)',
          padding: '6px 4px 10px',
          zIndex: 12,
        }}
      >
        {children}
      </div>
    </>
  );
}
