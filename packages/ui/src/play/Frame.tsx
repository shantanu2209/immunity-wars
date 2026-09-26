/**
 * THE PLAY SCREEN'S FRAME (piece 5 of the play screen, docs/for-P2.7.md §19, ruled by Shantanu
 * 19 and 20 September 2026). Every stage of a turn has the same shape, and the shape is one screen
 * tall, so the page itself never scrolls:
 *
 *   top bar     the turn ("3/15") and the Action Points on the left, what is in force in the
 *               middle, the messages and the menu on the right
 *   play area   ONE height in every stage, its shape the board's own from geometry.json: the board
 *               in command, the body in planning, the arrivals' cards in piece 6
 *   middle      whatever else the stage needs: the selected piece and its actions, the Cells,
 *               Antibodies or Body view, a tapped node, the pathogens in the body. It alone scrolls,
 *               and only when what it holds is taller than the room the phone leaves it
 *   bottom      in command the Cells, Antibodies and Body buttons; then the stage's one advance
 *               button, Command your cells or End turn
 *
 * Replaces the dock of pieces 2 to 4, whose zones are the middle's actions and the advance button
 * here. Dumb by design: the play screen decides what each part shows.
 */
import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';

import { BOARD_ASPECT } from '../board/geometry';
import { engineText } from '../engineText';
import { t } from '../i18n';
import { actionDisplayName } from '../names';
import { ChatIcon, TableIcon } from '../panels/BarIcons';
import { CardIcon } from '../panels/CardIcon';
import { diceOf } from './SpreadNarration';
import type { DockRow } from './offered';
import { useFrame, type FrameStore } from './frameStore';
import { tapCounts } from './stepGuard';

const ICON_BUTTON: CSSProperties = {
  minHeight: 44,
  minWidth: 44,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: '1.5px solid #8E6E53',
  borderRadius: 8,
  color: '#2E2A28',
  cursor: 'pointer',
  padding: 0,
};

const BANNER_COLOUR: Record<'bad' | 'good' | 'info', { border: string; text: string; bg: string }> =
  {
    bad: { border: '#B03A2E', text: '#B03A2E', bg: '#FBEAE5' },
    good: { border: '#2F6B4A', text: '#2F6B4A', bg: '#EAF3EC' },
    info: { border: '#1F6F8B', text: '#1F6F8B', bg: '#E6F2F7' },
  };

export interface Banner {
  text: string;
  kind: 'bad' | 'good' | 'info';
}

/** THE TOP BAR: the turn and the AP on the left, the banner between, the messages and menu right. */
export function TopBar({
  turnText,
  apText,
  apAvailable,
  onAp,
  banner,
  onBanner,
  onChat,
  chatLabel,
  menu,
  table = null,
}: {
  turnText: string;
  apText: string;
  /** Whether the AP figure has terms to open (it is underlined when it does). */
  apAvailable: boolean;
  onAp: () => void;
  banner: Banner | null;
  /** Opens every effect in force, in full, in the middle. */
  onBanner: () => void;
  onChat: () => void;
  chatLabel: string;
  /** The shell's menu button (the app's) or its instrumented controls (the dev shell's). */
  menu: ReactNode;
  /**
   * THE TABLE, in a game played together (P3.7 piece C): who is here and who holds what. Its badge
   * counts the pieces nobody can move right now, held by someone away or by nobody, so the table
   * can see without opening it that something waits. Null alone.
   */
  table?: { onOpen: () => void; waiting: number } | null;
}): ReactElement {
  const colour = banner ? BANNER_COLOUR[banner.kind] : null;
  return (
    <div
      data-top-bar=""
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        minHeight: 44,
        flex: '0 0 auto',
        // THE LAST RESORT at 200% page zoom (a 180px layout): the fixed parts are wider than the
        // screen by 9px there (measured, §19), so the icons wrap to a second line rather than leave
        // it. The banner's basis is 0, so on any wider screen it shrinks before anything wraps.
        flexWrap: 'wrap',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>
        <span
          data-turn=""
          style={{ fontSize: '0.875rem', fontWeight: 700, color: '#2E2A28', padding: '0 4px' }}
        >
          {turnText}
        </span>
        <button
          data-bar-ap="1"
          disabled={!apAvailable}
          onClick={onAp}
          style={{
            minHeight: 44,
            minWidth: 44,
            padding: '0 6px',
            fontSize: '0.875rem',
            color: '#2E2A28',
            background: 'transparent',
            border: 'none',
            cursor: apAvailable ? 'pointer' : 'default',
            textDecoration: apAvailable ? 'underline dotted' : 'none',
          }}
        >
          {apText}
        </button>
      </span>
      <span style={{ flex: '1 1 0', minWidth: 0, display: 'flex', justifyContent: 'center' }}>
        {banner && colour ? (
          <button
            data-banner=""
            onClick={onBanner}
            style={{
              minHeight: 44,
              maxWidth: '100%',
              padding: '2px 8px',
              fontSize: '0.75rem',
              fontWeight: 700,
              lineHeight: 1.2,
              borderRadius: 8,
              border: `1.5px solid ${colour.border}`,
              color: colour.text,
              background: colour.bg,
              cursor: 'pointer',
              overflowWrap: 'anywhere',
            }}
          >
            {banner.text}
          </button>
        ) : null}
      </span>
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flex: '0 0 auto',
          marginLeft: 'auto',
        }}
      >
        {table ? (
          <button
            data-table-open=""
            data-waiting={String(table.waiting)}
            aria-label={
              table.waiting > 0
                ? `${t('table.title')}, ${t('table.badge', { n: table.waiting })}`
                : t('table.title')
            }
            onClick={table.onOpen}
            style={{ ...ICON_BUTTON, position: 'relative' }}
          >
            <TableIcon />
            {table.waiting > 0 ? (
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  background: '#B03A2E',
                  color: '#FFFFFF',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  lineHeight: '18px',
                  textAlign: 'center',
                  padding: '0 4px',
                  boxSizing: 'border-box',
                }}
              >
                {table.waiting}
              </span>
            ) : null}
          </button>
        ) : null}
        <button data-chat="" aria-label={chatLabel} onClick={onChat} style={ICON_BUTTON}>
          <ChatIcon />
        </button>
        {menu}
      </span>
    </div>
  );
}

/**
 * THE PLAY AREA: the board's own shape (width over height from geometry.json), capped so that a
 * short or zoomed screen still leaves the middle some room. Its layers fill it: the board, the
 * body, a toast; each is positioned over the whole area.
 */
export function PlayArea({
  stage,
  coach = null,
  children,
}: {
  stage: 'arrivals' | 'planning' | 'command' | 'spread';
  /**
   * The coach's line, laid over the bottom of the play area rather than put in the middle
   * (§21 B): the middle is 126px in command at 360 x 641 and the coach was taking 90 of them,
   * which is exactly the space a newcomer's action rows need.
   */
  coach?: ReactNode;
  children: ReactNode;
}): ReactElement {
  return (
    <div
      data-play-area={stage}
      style={{
        position: 'relative',
        flex: '0 0 auto',
        width: '100%',
        aspectRatio: BOARD_ASPECT,
        maxHeight: '55dvh',
        overflow: 'hidden',
      }}
    >
      {children}
      {coach !== null ? (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 4 }}>{coach}</div>
      ) : null}
    </div>
  );
}

/** A passing message over the bottom of the play area: a refused action, or why a greyed button
 *  is greyed. It says, then goes; the play screen clears it. */
export function Toast({ text }: { text: string }): ReactElement {
  return (
    <div
      data-toast=""
      role="status"
      aria-live="polite"
      style={{
        position: 'absolute',
        left: 8,
        right: 8,
        bottom: 8,
        zIndex: 4,
        padding: '6px 10px',
        borderRadius: 10,
        border: '1.5px solid #B03A2E',
        background: '#FFFDF9',
        color: '#B03A2E',
        fontSize: '0.8125rem',
        lineHeight: 1.35,
        boxShadow: '0 4px 12px rgba(46,42,40,0.18)',
      }}
    >
      {text}
    </div>
  );
}

export interface ActionsUndo {
  available: boolean;
  moves: number;
  /** `multiplayer` (P3.4): the relay refuses undo in a room (FINDINGS #79), worded at P3.7. */
  reason?: 'available' | 'not-command' | 'no-moves' | 'committed' | 'resumed' | 'multiplayer';
  committedBy?: string | null;
}

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
const TONE: Record<'hint' | 'muted' | 'memory' | 'alert', string> = {
  hint: '#2F6B4A',
  muted: '#78665D',
  memory: '#1F6F8B',
  alert: '#B03A2E',
};

/**
 * THE MIDDLE IN COMMAND, AT REST: the selected piece's line (its name opens its card; Undo on the
 * right), then its actions in a 2 × 2 grid (§14): the piece's own, Recall to bloodstream, What's here.
 * With nothing selected the line prompts instead. When the piece has no slots, the grid says why, or
 * what the board offers instead: the one message the dock's message line used to carry, said only
 * where there is nothing else to show.
 */
export function ActionsView(props: {
  selectedName: string | null;
  /**
   * Who plays the selected piece, when it is another player's (P3.7, ruling 5): said beside its
   * name, because its rows are all greyed and would otherwise say why only when tapped.
   */
  owner?: string | null;
  onCard: (() => void) | null;
  cardLabel: string | null;
  /** Said on the name line when nothing is selected. */
  prompt: string | null;
  promptTone: 'hint' | 'muted' | 'memory' | 'alert';
  undo: ActionsUndo;
  inCommand: boolean;
  onUndo: () => void;
  rows: DockRow[];
  moveButtons: readonly { id: string; label: string }[];
  onMoveButton: (id: string) => void;
  onWhatsHere: (() => void) | null;
  /** Said across the action area when the selected piece has no slots to show. */
  emptyText: string | null;
  emptyTone: 'hint' | 'muted' | 'memory' | 'alert';
  disabled: boolean;
  onRow: (row: DockRow) => void;
  /** A greyed row's reason, or the greyed Undo's: said in the toast (null says nothing). */
  onSay: (text: string | null) => void;
}): ReactElement {
  const { undo } = props;
  const undoReason =
    undo.reason === 'committed'
      ? t('undo.committed', { action: actionDisplayName(undo.committedBy ?? '') })
      : undo.reason === 'resumed'
        ? t('undo.resumed')
        : undo.reason === 'multiplayer'
          ? t('undo.multiplayer')
          : t('undo.noMoves');
  const slots = props.rows.length + props.moveButtons.length + (props.onWhatsHere ? 1 : 0);
  return (
    <div data-actions="" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
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
        ) : props.prompt !== null ? (
          <span
            data-prompt=""
            style={{ fontSize: '0.8125rem', lineHeight: 1.35, color: TONE[props.promptTone] }}
          >
            {props.prompt}
          </span>
        ) : null}
        {props.selectedName !== null && props.owner ? (
          <span
            data-owner=""
            style={{ fontSize: '0.8125rem', lineHeight: 1.35, color: TONE.muted, flex: '1 1 auto' }}
          >
            {props.owner}
          </span>
        ) : null}
        {props.inCommand ? (
          // Undo stays in place in command: live when a move can be undone, greyed otherwise, and a
          // tap on the greyed one says why.
          <button
            data-dock-undo={undo.available ? 'available' : (undo.reason ?? 'unavailable')}
            disabled={props.disabled}
            onClick={() => (undo.available ? props.onUndo() : props.onSay(undoReason))}
            style={{
              minHeight: 44,
              marginLeft: 'auto',
              padding: '0 10px',
              fontSize: '0.875rem',
              borderRadius: 8,
              border: `1.5px solid ${undo.available ? '#B03A2E' : '#94847A'}`,
              color: undo.available ? '#2E2A28' : '#6F6259',
              background: undo.available ? '#FFFDF9' : '#F6F1EC',
              cursor: 'pointer',
              flex: '0 0 auto',
            }}
          >
            {undo.available ? `${t('dock.undo')} ${String(undo.moves)}` : t('dock.undo')}
          </button>
        ) : null}
      </div>
      {props.selectedName !== null ? (
        <div
          data-dock-rows="1"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gridAutoRows: 'minmax(2.75rem, auto)',
            gap: '0.25rem 0.375rem',
          }}
        >
          {slots === 0 && props.emptyText !== null ? (
            <div
              data-actions-empty=""
              style={{
                gridColumn: '1 / -1',
                fontSize: '0.8125rem',
                lineHeight: 1.35,
                color: TONE[props.emptyTone],
                alignSelf: 'center',
              }}
            >
              {props.emptyText}
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
        </div>
      ) : null}
    </div>
  );
}

/**
 * THE MIDDLE WHILE A SPREAD PLAYS (§12 ruling 4, kept): the frame's headline and number, then its
 * dice. It reads the frame from the store, so only this re-renders per frame.
 */
export function SpreadView({ store }: { store: FrameStore }): ReactElement | null {
  const frame = useFrame(store);
  if (!frame) return null;
  const faces = diceOf(frame.dice);
  return (
    <div data-middle-view="spread" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        {/* An engine string: the frame headline is a query-prose site in the engine catalogue. */}
        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#2E2A28' }}>
          {engineText(frame.label)}
        </span>
        <span style={{ fontSize: '0.8125rem', color: '#78665D', marginLeft: 'auto' }}>
          {[String(frame.n), String(frame.of)].join('/')}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
    </div>
  );
}

export type MiddleTab = 'pieces' | 'antibodies' | 'body';

const TABS: readonly { kind: MiddleTab; label: string }[] = [
  { kind: 'pieces', label: 'tabs.cells' },
  { kind: 'antibodies', label: 'antibody.title' },
  { kind: 'body', label: 'body.title' },
];

/** COMMAND'S THREE BUTTONS: each opens its view in the middle, and a second tap closes it. Played
 *  together a player has only the drawers that are theirs (`drawersFor`), and the row shows those. */
export function TabRow({
  active,
  disabled,
  shown,
  onTab,
}: {
  active: MiddleTab | null;
  disabled: boolean;
  shown: readonly MiddleTab[];
  onTab: (kind: MiddleTab) => void;
}): ReactElement {
  const tabs = TABS.filter((tab) => shown.includes(tab.kind));
  return (
    <div
      data-tab-row=""
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${String(tabs.length)}, minmax(0, 1fr))`,
        gap: 4,
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.kind}
          data-tab={tab.kind}
          aria-pressed={active === tab.kind}
          disabled={disabled}
          onClick={() => onTab(tab.kind)}
          style={{
            minHeight: 44,
            minWidth: 0,
            padding: '2px 4px',
            fontSize: '0.8125rem',
            fontWeight: 700,
            lineHeight: 1.15,
            borderRadius: 8,
            border: `1.5px solid ${active === tab.kind ? '#DE7800' : '#8E6E53'}`,
            boxShadow: active === tab.kind ? 'inset 0 0 0 1.5px #DE7800' : undefined,
            background: active === tab.kind ? '#FBEAE5' : '#FFFDF9',
            color: '#2E2A28',
            cursor: 'pointer',
            overflowWrap: 'anywhere',
          }}
        >
          {t(tab.label)}
        </button>
      ))}
    </div>
  );
}

/**
 * THE STAGE'S ONE ADVANCE BUTTON, at the bottom of every stage (§19): what moves the turn on.
 * While the floating close shows it is hidden but keeps its height (§12 ruling 1, kept), so
 * nothing moves and the close sits where it is.
 */
export function AdvanceButton({
  keyName,
  label,
  disabled,
  hidden,
  waiting = false,
  onPress,
}: {
  keyName: string;
  label: string;
  disabled: boolean;
  hidden: boolean;
  /**
   * THE NEXT STEP IS SOMEONE ELSE'S (P3.7): the captain's, in a game played together. The label says
   * who, and the button is drawn as a status rather than a control, since it can stay that way for a
   * whole turn and a child will otherwise tap it. Alone this never happens.
   */
  waiting?: boolean;
  onPress: () => void;
}): ReactElement {
  // THE STEP GUARD (FINDINGS #90, `stepGuard.ts`): a tap within half a second of the step changing,
  // or of the button becoming tappable, is not for the new step. Timed in a layout effect, which
  // runs before the new step is painted, so no tap can reach it first.
  const step = `${keyName}|${String(disabled)}`;
  const changedAt = useRef(0);
  useLayoutEffect(() => {
    changedAt.current = performance.now();
  }, [step]);
  return (
    <button
      data-dock-next={keyName}
      data-waiting={waiting ? '1' : undefined}
      aria-hidden={hidden ? true : undefined}
      disabled={disabled}
      onClick={() => {
        if (tapCounts(changedAt.current, performance.now())) onPress();
      }}
      style={{
        // 3rem, not 2.75: the floating close takes this slot's place, and at 2.75 it overlapped the
        // tab row above by 2px at 360 x 680 (measured, §19).
        minHeight: '3rem',
        width: '100%',
        fontSize: '1rem',
        borderRadius: 10,
        // The waiting border is the greyed controls' own (#94847A, 3.6:1 on the page, 3.1:1 on the
        // waiting ground): Gate 1's 3:1 for a control's boundary holds for a greyed one here too.
        border: waiting ? '2px dashed #94847A' : '2px solid #B03A2E',
        background: waiting ? '#F3EDE6' : '#FFFDF9',
        color: '#2E2A28',
        fontWeight: waiting ? 400 : 700,
        cursor: disabled ? 'default' : 'pointer',
        visibility: hidden ? 'hidden' : 'visible',
      }}
    >
      {label}
    </button>
  );
}
