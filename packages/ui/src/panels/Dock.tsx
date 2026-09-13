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
 *   rows       5.75rem  a 2 × 2 grid of half-width slots: the piece's actions, one per action
 *                       (`dockRows`), then Recall to bloodstream, then What's here (§14)
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
 * IN PLANNING (piece 4, docs/for-P2.7.md §17, ruled 13 September 2026) the same zones at the same
 * height hold planning's step: the Action Points for the turn to come in the name line, the figure's
 * hint or which cells are out in the message, Pathogens and What happened as two slots that open
 * drawers, and Command your cells as the next step.
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
import { CardIcon } from './CardIcon';

/** The zones' minimum heights, the rule of the one height. */
export const DOCK_ZONES = {
  name: '2.75rem',
  message: '2.25rem',
  rows: '5.75rem',
  next: '2.75rem',
} as const;

const BTN: CSSProperties = {
  minHeight: 44,
  // 8px, not 10: the name line holds the name, AP, Undo and Deselect in 344px at 360 CSS px, and a
  // name over 101px wrapped it onto a second row at 10px (measured, for-P2.7.md §14).
  padding: '0 8px',
  fontSize: '0.875rem',
  borderRadius: 8,
  border: '1.5px solid #8E6E53',
  background: '#FFFDF9',
  color: '#2E2A28',
  cursor: 'pointer',
};

/**
 * A HALF-WIDTH SLOT (for-P2.7.md §14): two lines, the verb (with any cost beside it) and under it
 * the target. Measured before building, in the button's own font at 360 CSS px: the slot leaves 150px
 * of text at 8px side padding, the widest action word is 146px ("Recall to bloodstream") and the
 * widest disease name alone 137px, so the padding is 6px, and nothing else shares line two.
 * The font is the button's default on purpose: `font: inherit` would change the measured face.
 */
const SLOT: CSSProperties = {
  minHeight: '2.75rem',
  minWidth: 0,
  width: '100%',
  boxSizing: 'border-box',
  padding: '3px 6px',
  borderRadius: 8,
  border: '1.5px solid #B03A2E',
  background: '#FFFDF9',
  color: '#2E2A28',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'stretch',
  gap: 1,
  textAlign: 'left',
};

const LINE1: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 4,
  fontSize: '0.875rem',
  fontWeight: 700,
};

const LINE2: CSSProperties = { fontSize: '0.75rem', color: '#6F6259' };

export interface DockUndo {
  available: boolean;
  moves: number;
  reason?: 'available' | 'not-command' | 'no-moves' | 'committed' | 'resumed';
  committedBy?: string | null;
}

/** A slot that opens something rather than acting: planning's Pathogens and What happened (§17). */
export interface DockSlot {
  id: string;
  label: string;
  /** The slot's second line, or null. */
  sub: string | null;
  onPress: () => void;
}

export interface DockProps {
  store: FrameStore;
  /** The step the dock is showing; a spread playing overrides both. */
  mode: 'command' | 'planning';
  /** The selected piece's display name, or null when nothing is selected. */
  selectedName: string | null;
  /** Leads the message line: a cell's speed, a resident's organ. */
  lead: string | null;
  /** What the board offers, or why nothing is offered, already localised. */
  message: string | null;
  messageTone: 'hint' | 'muted' | 'memory' | 'alert' | 'fact';
  /** The last rejection, already localised: it takes the message line, in red. */
  notice: string | null;
  ap: number;
  /** The AP figure's words when they are not "AP n": planning's "You will have n Action Points to
   *  spend" (§17). */
  apLabel?: string;
  apTermsAvailable: boolean;
  onAp: () => void;
  undo: DockUndo;
  inCommand: boolean;
  rows: DockRow[];
  /**
   * Movement offered as a button rather than a ring: "Recall to bloodstream", a slot of its own in
   * the 2 × 2 action area (for-P2.7.md §14, ruling 2).
   */
  moveButtons: readonly { id: string; label: string }[];
  onMoveButton: (id: string) => void;
  /** Said across the action area's first row when the piece has no actions of its own. */
  noRowsText: string | null;
  /** Slots after the piece's own: planning's two drawers (§17). */
  slots?: readonly DockSlot[];
  disabled: boolean;
  /** The next step, End turn unless given: planning's is Command your cells (§17). */
  next?: { key: string; label: string };
  nextDisabled: boolean;
  onNext: () => void;
  onRow: (row: DockRow) => void;
  onUndo: () => void;
  onDeselect: (() => void) | null;
  /** Opens the selected cell's card from its name (§14, ruling 5); null for a resident, which has
   *  none. */
  onCard: (() => void) | null;
  /** The card button's words, "About Monocyte", through the catalogue. */
  cardLabel: string | null;
  /** What's here, back as a slot (§14, ruling 3): the selected piece stands with something. */
  onWhatsHere: (() => void) | null;
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
  // Which cells are out, in planning: the amber the planning screen said it in before piece 4.
  fact: '#7A5600',
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
      data-dock={frame ? 'spread' : props.mode}
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

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {/* Nothing selected, the line holds the AP figure and Undo alone: the prompt is the message
            line's. Found by the audit's one-height check on its first run: in the name line, the
            prompt wrapped Undo onto a second row, and the dock was 300px there and 248 elsewhere. */}
        {props.selectedName !== null && props.onCard !== null ? (
          // A CARD BEHIND EVERY NAME (§14, ruling 5): the name and its card icon are one button.
          <button
            data-dock-card="1"
            aria-label={props.cardLabel ?? undefined}
            disabled={props.disabled}
            onClick={props.onCard}
            style={{
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 4px',
              background: 'transparent',
              border: 'none',
              color: '#2E2A28',
              fontSize: '0.9375rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {props.selectedName}
            <span style={{ color: '#8E6E53' }}>
              <CardIcon />
            </span>
          </button>
        ) : props.selectedName !== null ? (
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
          {props.apLabel ?? (
            <>
              {t('commandBar.ap')} {props.ap}
            </>
          )}
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
              {undo.available ? `${t('dock.undo')} ${String(undo.moves)}` : t('dock.undo')}
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
      {/* THE ACTION AREA, 2 × 2 (§14, rulings 1 to 3): the piece's actions, then Recall, then
          What's here; in planning, its two drawers (§17). Four slots hold every piece at its
          fullest; the two explicit grid rows keep the zone's height when fewer are showing. */}
      <div
        data-dock-rows="1"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gridTemplateRows: `repeat(2, minmax(${DOCK_ZONES.next}, auto))`,
          gap: '0.25rem 0.375rem',
        }}
      >
        {props.rows.length === 0 && props.noRowsText !== null ? (
          <div
            style={{
              gridColumn: '1 / -1',
              fontSize: '0.8125rem',
              color: '#78665D',
              alignSelf: 'center',
            }}
          >
            {props.noRowsText}
          </div>
        ) : null}
        {props.rows.map((row) => (
          <button
            key={row.action}
            data-dock-row={row.action}
            data-available={row.available ? '1' : '0'}
            data-dock-targets={row.targets.length > 1 ? String(row.targets.length) : undefined}
            aria-label={row.label}
            disabled={props.disabled}
            onClick={() => (row.available ? props.onRow(row) : props.onSay(row.reason))}
            style={{
              ...SLOT,
              borderColor: row.available ? '#B03A2E' : '#94847A',
              color: row.available ? '#2E2A28' : '#6F6259',
              background: row.available ? '#FFFDF9' : '#F6F1EC',
            }}
          >
            <span style={LINE1}>
              <span>{row.verb}</span>
              {row.cost !== null ? (
                <span
                  data-action-detail="1"
                  style={{ fontSize: '0.75rem', fontWeight: 400, whiteSpace: 'nowrap' }}
                >
                  {row.cost}
                </span>
              ) : null}
            </span>
            {row.target !== null ? <span style={LINE2}>{row.target}</span> : null}
          </button>
        ))}
        {props.moveButtons.map((b) => (
          <button
            key={b.id}
            data-dock-move={b.id}
            disabled={props.disabled}
            onClick={() => props.onMoveButton(b.id)}
            style={{ ...SLOT, borderColor: '#2F6B4A' }}
          >
            <span style={LINE1}>{b.label}</span>
          </button>
        ))}
        {props.onWhatsHere !== null ? (
          <button
            data-dock-here="1"
            disabled={props.disabled}
            onClick={props.onWhatsHere}
            style={{ ...SLOT, borderColor: '#8E6E53' }}
          >
            <span style={LINE1}>{t('dock.whatsHere')}</span>
          </button>
        ) : null}
        {(props.slots ?? []).map((s) => (
          // A slot that opens something, bordered like What's here, which opens the inspect sheet.
          <button
            key={s.id}
            data-dock-slot={s.id}
            disabled={props.disabled}
            onClick={s.onPress}
            style={{ ...SLOT, borderColor: '#8E6E53' }}
          >
            <span style={LINE1}>{s.label}</span>
            {s.sub !== null ? <span style={LINE2}>{s.sub}</span> : null}
          </button>
        ))}
      </div>
      <button
        data-dock-next={props.next?.key ?? 'endTurn'}
        disabled={props.nextDisabled}
        onClick={props.onNext}
        style={{
          minHeight: DOCK_ZONES.next,
          width: '100%',
          fontSize: '1rem',
          fontWeight: 700,
          borderRadius: 10,
          border: '2px solid #B03A2E',
          background: '#FFFDF9',
          color: '#2E2A28',
          cursor: props.nextDisabled ? 'default' : 'pointer',
        }}
      >
        {props.next?.label ?? t('play.endCommand')}
      </button>
    </>
  );
}
