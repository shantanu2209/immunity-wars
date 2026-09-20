/**
 * THE MESSAGES PANEL (piece 5 of the play screen, docs/for-P2.7.md §19; the drawer of piece 3, §15).
 *
 * Piece 3 opened four drawers over the board. Since piece 5 the Cells, Antibodies and Body views
 * open in the middle below the play area instead, so the board stays in view; what is left here is
 * the one reading surface, the messages, opened from the top bar's chat icon. It opens full height
 * and scrolls, it is one level on the navigation stack (ruling 9), so the floating close and the
 * phone's back gesture close it, and the advance button hides underneath while it is open.
 *
 * The scrim closes it too. Ruling 8 makes the floating close THE close; a scrim that swallowed a tap
 * and did nothing would be a control that does nothing, so the tap does the one thing a tap outside
 * an open panel can mean.
 */
import type { ReactElement, ReactNode } from 'react';

import { t } from '../i18n';
import { FLOAT_RESERVE } from '../nav/NavHost';

/** The middle's three views and the messages: the play screen holds one of these, or none. */
export type DrawerKind = 'pieces' | 'antibodies' | 'body' | 'log';

/** Each kind's name, for the panel's label. Only the messages open as a panel since piece 5. */
const LABEL: Record<DrawerKind, string> = {
  pieces: 'tabs.cells',
  antibodies: 'antibody.title',
  body: 'body.title',
  log: 'chat.open',
};

const MOTION =
  '@keyframes iwDrawerUp{from{transform:translateY(18px);opacity:0}to{transform:none;opacity:1}}' +
  '[data-drawer]{animation:iwDrawerUp 160ms ease-out}' +
  '@media (prefers-reduced-motion: reduce){[data-drawer]{animation:none}}';

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
        aria-label={t(LABEL[kind])}
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          margin: '0 auto',
          width: 'min(100vw, 460px)',
          boxSizing: 'border-box',
          top: '0.5rem',
          bottom: FLOAT_RESERVE,
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
