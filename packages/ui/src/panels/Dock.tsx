/**
 * THE DOCK (docs/for-P2.7.md §9 ruling 1; §12 rulings 1 to 4, 13 September 2026).
 *
 * The turn's next step at the bottom of the play screen, ONE HEIGHT IN EVERY STATE: selecting a
 * piece changes what it says and moves nothing. It replaces the command bar, whose height was
 * measured at 249 to 950px with a piece selected, so it holds less than the bar did, in four zones
 * whose minimum heights are fixed in rem (so the one height holds at every text size):
 *
 *   name line  2.75rem  the piece, the AP figure, Undo and Deselect
 *   message    2.25rem  a speed or a resident's organ, then one line of what the board offers or
 *                       why nothing is; a rejection, or a tapped greyed row's reason, in its place
 *   rows       5.75rem  two row slots, one per action (`dockRows`)
 *   next step  2.75rem  End turn, alone on its row, because ending a turn cannot be undone
 *
 * A zone may grow when its content cannot fit, rather than clip (§9 ruling 5: nothing is ever cut
 * off). At Standard text that would break the one height, which the Gate 1 audit's dock check
 * reports; at larger sizes the dock leaves the bottom of the screen instead (ruling 3).
 *
 * WHILE A SPREAD PLAYS the dock is the narration (ruling 4): the frame's headline and number in the
 * name line, "Tap to continue" in the message, the dice across the rows and the next step. It reads
 * the frame from the store, so only the dock re-renders per frame, as the banner did before it.
 *
 * WHILE THE FLOATING CLOSE SHOWS the dock is hidden but keeps its height (ruling 1): nothing moves,
 * nothing under a layer can be pressed, and the floating close sits where it always does.
 *
 * WHERE IT SITS is the play screen's to decide (`fixed`): at the bottom of the screen while the top
 * row, the board and the dock all fit, otherwise straight after the board, in a page that scrolls.
 *
 * Dumb by design: `offered.ts` decides what is legal and the play screen words it.
 */
import { useEffect, useState, type CSSProperties, type ReactElement, type Ref } from 'react';

import { engineText } from '../engineText';
import { t } from '../i18n';
import { actionDisplayName } from '../names';
import type { DockRow } from '../play/offered';
import { useFrame, type FrameStore } from '../play/frameStore';
import { diceOf } from '../play/SpreadNarration';

/** The zones' minimum heights, the rule of the one height. */
export const DOCK_ZONES = {
  name: '2.75rem',
  message: '2.25rem',
  rows: '5.75rem',
  next: '2.75rem',
} as const;

const BTN: CSSProperties = {
  minHeight: 44,
  padding: '0 10px',
  fontSize: '0.875rem',
  borderRadius: 8,
  border: '1.5px solid #8E6E53',
  background: '#FFFDF9',
  color: '#2E2A28',
  cursor: 'pointer',
};

const ROW: CSSProperties = {
  minHeight: '2.75rem',
  width: '100%',
  boxSizing: 'border-box',
  padding: '4px 12px',
  fontSize: '0.875rem',
  borderRadius: 8,
  border: '1.5px solid #B03A2E',
  background: '#FFFDF9',
  color: '#2E2A28',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 8,
  textAlign: 'left',
};

export interface DockUndo {
  available: boolean;
  moves: number;
  reason?: 'available' | 'not-command' | 'no-moves' | 'committed' | 'resumed';
  committedBy?: string | null;
}

export interface DockProps {
  store: FrameStore;
  /** The selected piece's display name, or null when nothing is selected. */
  selectedName: string | null;
  /** Leads the message line: a cell's speed, a resident's organ. */
  lead: string | null;
  /** What the board offers, or why nothing is offered, already localised. */
  message: string | null;
  messageTone: 'hint' | 'muted' | 'memory' | 'alert';
  /** The last rejection, already localised: it takes the message line, in red. */
  notice: string | null;
  ap: number;
  apTermsAvailable: boolean;
  onAp: () => void;
  undo: DockUndo;
  inCommand: boolean;
  rows: DockRow[];
  /**
   * Movement offered as a button rather than a ring: "Recall to bloodstream". The ruling's zones
   * gave it no place (it was not in the proposal), so it renders below the row slots, where it can
   * grow the dock, until its placement is ruled.
   */
  moveButtons: readonly { id: string; label: string }[];
  onMoveButton: (id: string) => void;
  /** Said in the first slot when the piece has no actions at all. */
  noRowsText: string | null;
  disabled: boolean;
  endTurnDisabled: boolean;
  onEndTurn: () => void;
  onRow: (row: DockRow) => void;
  onUndo: () => void;
  onDeselect: (() => void) | null;
  /** Clears a tapped reason when what it answered has changed: the selection, the turn, the AP. */
  resetKey: string;
  fixed: boolean;
  hidden: boolean;
  dockRef?: Ref<HTMLDivElement>;
}

const TONE: Record<DockProps['messageTone'], string> = {
  hint: '#2F6B4A',
  muted: '#78665D',
  memory: '#1F6F8B',
  alert: '#B03A2E',
};

export function Dock(props: DockProps): ReactElement {
  const frame = useFrame(props.store);
  const [said, setSaid] = useState<string | null>(null);
  useEffect(() => setSaid(null), [props.resetKey]);

  const shell: CSSProperties = {
    boxSizing: 'border-box',
    display: 'grid',
    gridTemplateRows: `minmax(${DOCK_ZONES.name}, auto) minmax(${DOCK_ZONES.message}, auto) minmax(${DOCK_ZONES.rows}, auto) minmax(${DOCK_ZONES.next}, auto)`,
    rowGap: '0.375rem',
    padding: '0.375rem 0.5rem',
    paddingBottom: 'calc(0.375rem + env(safe-area-inset-bottom, 0px))',
    background: '#FBEAE5',
    borderTop: '2px solid #C48377',
    overflowWrap: 'anywhere',
    visibility: props.hidden ? 'hidden' : 'visible',
    ...(props.fixed
      ? {
          position: 'fixed',
          left: '50%',
          bottom: 0,
          transform: 'translateX(-50%)',
          width: 'min(100%, 700px)',
          zIndex: 5,
          boxShadow: '0 -4px 12px rgba(46,42,40,0.12)',
        }
      : { position: 'relative', width: '100%', marginTop: 8 }),
  };

  return (
    <div
      ref={props.dockRef}
      data-dock={frame ? 'spread' : 'command'}
      data-dock-fixed={props.fixed ? '1' : '0'}
      aria-hidden={props.hidden ? true : undefined}
      style={shell}
    >
      {frame ? (
        <SpreadZones label={frame.label} n={frame.n} of={frame.of} dice={frame.dice} />
      ) : (
        <CommandZones {...props} said={said} onSay={setSaid} />
      )}
    </div>
  );
}

function SpreadZones({
  label,
  n,
  of,
  dice,
}: {
  label: string;
  n: number;
  of: number;
  dice: unknown;
}): ReactElement {
  const faces = diceOf(dice);
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {/* An engine string: the frame headline is a query-prose site in the engine catalogue. */}
        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#2E2A28' }}>
          {engineText(label)}
        </span>
        <span style={{ fontSize: '0.8125rem', color: '#78665D', marginLeft: 'auto' }}>
          {[String(n), String(of)].join('/')}
        </span>
      </div>
      <div style={{ fontSize: '0.8125rem', color: '#78665D', alignSelf: 'center' }}>
        {t('spread.tapToContinue')}
      </div>
      <div
        style={{
          gridRow: 'span 2',
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          alignContent: 'flex-start',
        }}
      >
        {faces.map((d, i) => (
          <span
            key={[d.label, String(i)].join('-')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.8125rem',
              color: d.hit ? '#B03A2E' : '#78665D',
              fontWeight: d.hit ? 700 : 400,
              border: `1.5px solid ${d.hit ? '#B03A2E' : '#C48377'}`,
              borderRadius: 6,
              padding: '1px 6px',
              background: '#FFFDF9',
            }}
          >
            {d.label}
            <span
              style={{
                minWidth: 16,
                textAlign: 'center',
                border: '1px solid currentcolor',
                borderRadius: 4,
                padding: '0 2px',
              }}
            >
              {d.full ? t('spread.full') : String(d.face)}
            </span>
          </span>
        ))}
      </div>
    </>
  );
}

function CommandZones(
  props: DockProps & { said: string | null; onSay: (s: string | null) => void },
): ReactElement {
  const { undo } = props;
  const undoReason =
    undo.reason === 'committed'
      ? t('undo.committed', { action: actionDisplayName(undo.committedBy ?? '') })
      : undo.reason === 'resumed'
        ? t('undo.resumed')
        : t('undo.noMoves');
  const text = props.notice ?? props.said ?? props.message;
  const color =
    props.notice !== null ? TONE.alert : props.said !== null ? TONE.muted : TONE[props.messageTone];
  const slots = [props.rows[0] ?? null, props.rows[1] ?? null];

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {/* Nothing selected, the line holds the AP figure and Undo alone: the prompt is the message
            line's. Found by the audit's one-height check on its first run: in the name line, the
            prompt wrapped Undo onto a second row, and the dock was 300px there and 248 elsewhere. */}
        {props.selectedName !== null ? (
          <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#2E2A28' }}>
            {props.selectedName}
          </span>
        ) : null}
        {/* THE AP FIGURE IS A TAP: its terms open over the board, so the dock keeps its height. */}
        <button
          data-bar-ap="1"
          disabled={!props.apTermsAvailable}
          onClick={props.onAp}
          style={{
            minHeight: 44,
            padding: '0 6px',
            fontSize: '0.8125rem',
            color: '#78665D',
            background: 'transparent',
            border: 'none',
            cursor: props.apTermsAvailable ? 'pointer' : 'default',
            font: 'inherit',
            textDecoration: props.apTermsAvailable ? 'underline dotted' : 'none',
          }}
        >
          {t('commandBar.ap')} {props.ap}
        </button>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {props.inCommand ? (
            // Undo stays in place in command: live when a move can be undone, greyed otherwise,
            // and a tap on the greyed one says why, where the always-on undo line used to.
            <button
              data-dock-undo={undo.available ? 'available' : (undo.reason ?? 'unavailable')}
              disabled={props.disabled}
              onClick={() => (undo.available ? props.onUndo() : props.onSay(undoReason))}
              style={{
                ...BTN,
                borderColor: undo.available ? '#B03A2E' : '#94847A',
                color: undo.available ? '#2E2A28' : '#6F6259',
                background: undo.available ? '#FFFDF9' : '#F6F1EC',
              }}
            >
              {undo.available
                ? `${t('commandBar.undo')} ${String(undo.moves)}`
                : t('commandBar.undo')}
            </button>
          ) : null}
          {props.onDeselect ? (
            <button style={BTN} disabled={props.disabled} onClick={props.onDeselect}>
              {t('commandBar.deselect')}
            </button>
          ) : null}
        </span>
      </div>
      <div
        data-dock-message="1"
        style={{ fontSize: '0.8125rem', lineHeight: 1.35, alignSelf: 'center', color }}
      >
        {props.lead !== null ? (
          <span style={{ color: '#78665D' }}>
            {props.lead}
            {text !== null ? ` ${t('inspect.sep')} ` : ''}
          </span>
        ) : null}
        {text}
      </div>
      <div
        data-dock-rows="1"
        style={{
          display: 'grid',
          gridTemplateRows: `repeat(2, minmax(${DOCK_ZONES.next}, auto))`,
          rowGap: '0.25rem',
        }}
      >
        {props.rows.length === 0 && props.noRowsText !== null ? (
          <div style={{ fontSize: '0.8125rem', color: '#78665D', alignSelf: 'center' }}>
            {props.noRowsText}
          </div>
        ) : null}
        {slots.map((row, i) =>
          row === null ? (
            props.rows.length === 0 && props.noRowsText !== null && i === 0 ? null : (
              <div key={`slot-${String(i)}`} aria-hidden="true" />
            )
          ) : (
            <button
              key={row.action}
              data-dock-row={row.action}
              data-available={row.available ? '1' : '0'}
              data-dock-targets={row.targets.length > 1 ? String(row.targets.length) : undefined}
              disabled={props.disabled}
              onClick={() => (row.available ? props.onRow(row) : props.onSay(row.reason))}
              style={{
                ...ROW,
                borderColor: row.available ? '#B03A2E' : '#94847A',
                color: row.available ? '#2E2A28' : '#6F6259',
                background: row.available ? '#FFFDF9' : '#F6F1EC',
              }}
            >
              <span>{row.label}</span>
              {row.detail !== null || row.cost !== null ? (
                <span data-action-detail="1" style={{ fontSize: '0.75rem', color: '#78665D' }}>
                  {[row.detail, row.cost].filter((x) => x !== null).join(` ${t('inspect.sep')} `)}
                </span>
              ) : null}
            </button>
          ),
        )}
        {props.moveButtons.map((b) => (
          <button
            key={b.id}
            data-dock-move={b.id}
            disabled={props.disabled}
            onClick={() => props.onMoveButton(b.id)}
            style={{ ...ROW, borderColor: '#2F6B4A' }}
          >
            <span>{b.label}</span>
          </button>
        ))}
      </div>
      <button
        data-dock-next="endTurn"
        disabled={props.endTurnDisabled}
        onClick={props.onEndTurn}
        style={{
          minHeight: DOCK_ZONES.next,
          width: '100%',
          fontSize: '1rem',
          fontWeight: 700,
          borderRadius: 10,
          border: '2px solid #B03A2E',
          background: '#FFFDF9',
          color: '#2E2A28',
          cursor: props.endTurnDisabled ? 'default' : 'pointer',
        }}
      >
        {t('play.endCommand')}
      </button>
    </>
  );
}
