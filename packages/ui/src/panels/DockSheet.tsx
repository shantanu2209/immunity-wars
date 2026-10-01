/**
 * WHAT THE DOCK OPENS OVER THE BOARD (docs/for-P2.7.md §12, rulings 1 and 2, 13 September 2026).
 *
 * The dock keeps one height, so the two things that used to grow the command bar open here
 * instead, in the inspect sheet's shape: a row's several targets, and the AP figure's terms. Each
 * is a layer on the navigation stack, closed by the floating close, and while it shows the dock is
 * hidden underneath (ruling 1). Part of the board stays visible above it, the quick-pick shape of
 * §9 ruling 7, which piece 3's drawers will share.
 */
import type { CSSProperties, ReactElement, ReactNode } from 'react';

import { t } from '../i18n';
import { KitButton } from '../kit/Button';
import { kitCardStyle } from '../kit/Surface';
import { COLOUR, TYPE } from '../kit/tokens';
import { FLOAT_RESERVE } from '../nav/NavHost';
import type { ActionRow } from '../play/offered';

const SHEET: CSSProperties = {
  position: 'fixed',
  left: '50%',
  bottom: FLOAT_RESERVE,
  transform: 'translateX(-50%)',
  width: 'min(92vw, 420px)',
  boxSizing: 'border-box',
  maxHeight: '46vh',
  overflowY: 'auto',
  overflowWrap: 'anywhere',
  ...kitCardStyle,
  padding: 10,
  zIndex: 10,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const ROW: CSSProperties = {
  minHeight: 44,
  padding: '4px 12px',
  fontSize: '0.875rem',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 8,
  textAlign: 'left',
  marginBottom: 6,
};

export function DockSheet({
  kind,
  title,
  children,
}: {
  kind: 'targets' | 'ap';
  title: string | null;
  children: ReactNode;
}): ReactElement {
  return (
    <div data-dock-sheet={kind} style={SHEET}>
      {title !== null ? (
        <div style={{ ...TYPE.action, fontWeight: 900, color: COLOUR.ink, padding: '2px 4px' }}>
          {title}
        </div>
      ) : null}
      {children}
    </div>
  );
}

/** A row's targets, each sending exactly the offer its own row in the action list would. */
export function TargetList({
  targets,
  disabled,
  onOffer,
}: {
  targets: readonly ActionRow[];
  disabled: boolean;
  onOffer: (offerId: string) => void;
}): ReactElement {
  return (
    <>
      {targets.map((r) => (
        <KitButton
          key={r.id}
          kind="go"
          data-dock-target={r.id}
          disabled={disabled || r.offerId === null}
          onPress={() => {
            if (r.offerId !== null) onOffer(r.offerId);
          }}
          style={ROW}
        >
          <span>{r.label}</span>
          {r.detail !== null || r.cost !== null ? (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.85 }}>
              {[r.detail, r.cost].filter((x) => x !== null).join(` ${t('inspect.sep')} `)}
            </span>
          ) : null}
        </KitButton>
      ))}
    </>
  );
}
