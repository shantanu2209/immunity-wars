/**
 * THE PLAY SCREEN'S FRAME (piece 5 of the play screen, docs/for-P2.7.md §19, ruled by Shantanu
 * 19 and 20 September 2026). Every stage of a turn has the same shape, and the shape is one screen
 * tall, so the page itself never scrolls:
 *
 *   top bar     the turn and the Action Points on the left, what is in force in the middle, the
 *               messages and the menu on the right
 *   play area   ONE height in every stage, its shape the board's own from geometry.json: the board
 *               in command, the body in planning, the arrivals' cards in piece 6
 *   middle      whatever else the stage needs: the selected piece and its actions, the Cells,
 *               Antibodies or Body view, a tapped node, the pathogens in the body. It alone scrolls,
 *               and only when what it holds is taller than the room the phone leaves it
 *   bottom      in command the Cells, Antibodies and Body buttons, and beside them the stage's one
 *               advance button, Command your cells or End turn
 *
 * DRAWN IN CLAY since stage L4 of the look (docs/LOOK_PLAN.md §14): the frame is the kit's, on the
 * table's dark ground. What each part is given and the hooks it carries are as they were; only the
 * drawing changed. Dumb by design: the play screen decides what each part shows.
 *
 * WHAT IS NOT YET REDRAWN, the new cards and planning, stands on a sheet of the old paper
 * (`OldPaper`), so that its words keep the contrast they were measured at. They are L5's.
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
import { KitButton } from '../kit/Button';
import { kitAudio } from '../kit/sound';
import { KitPips, kitCardStyle } from '../kit/Surface';
import { COLOUR, RADIUS, SHADOW, TOUCH, TYPE } from '../kit/tokens';
import { actionDisplayName } from '../names';
import { ChatIcon, TableIcon } from '../panels/BarIcons';
import { CardIcon } from '../panels/CardIcon';
import { diceOf } from './SpreadNarration';
import type { DockRow } from './offered';
import { useFrame, type FrameStore } from './frameStore';
import { tapCounts } from './stepGuard';

/**
 * THE OLD SCREENS' PAPER. A view that has not been redrawn yet (the new cards, and planning) was
 * drawn for this ground and measured on it, so until it is redrawn it stands on a sheet of it, laid
 * on the table. Both are L5's, and this goes with them.
 */
const OLD_PAPER = '#FFFDF9';
export function OldPaper({ children }: { children: ReactNode }): ReactElement {
  return (
    <div
      data-old-paper=""
      style={{
        background: OLD_PAPER,
        color: '#2E2A28',
        borderRadius: RADIUS.control,
        padding: 8,
        minHeight: '100%',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  );
}

/**
 * A VIEW IN THE MIDDLE, on a card of the kit's cream: the Cells, Antibodies and Body views, a tapped
 * step, the Action Points' terms, what is in force, a row's several targets. The same flat card the
 * selected piece's actions are on, so that whatever the middle shows, it shows on one kind of thing.
 */
export function MiddleCard({ children }: { children: ReactNode }): ReactElement {
  return (
    <div
      data-middle-card=""
      style={{
        ...kitCardStyle,
        borderRadius: RADIUS.primary,
        boxShadow: `0 4px 0 ${COLOUR.creamEdge}`,
        padding: '10px 10px 12px',
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  );
}

/** A square control in the top bar: the kit's resting button, at Gate 1's 44 px. */
const ICON: CSSProperties = {
  width: TOUCH.min,
  minHeight: TOUCH.min,
  padding: 0,
  flex: '0 0 auto',
};

/** What is in force, in one chip: bad on coral, good on mint, anything else on cream. */
const BANNER_FACE: Record<'bad' | 'good' | 'info', { bg: string; ink: string }> = {
  bad: { bg: COLOUR.coral, ink: COLOUR.ink },
  good: { bg: COLOUR.mintSoft, ink: COLOUR.mintInk },
  info: { bg: COLOUR.cream, ink: COLOUR.ink },
};

export interface Banner {
  text: string;
  kind: 'bad' | 'good' | 'info';
}

const PILL: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.45em',
  minHeight: TOUCH.min,
  padding: '0 0.8em',
  borderRadius: RADIUS.pill,
  background: 'rgba(0, 0, 0, 0.28)',
  boxShadow: SHADOW.sunk,
  color: COLOUR.onDark,
  fontFamily: TYPE.family,
  border: 0,
  whiteSpace: 'nowrap',
};

/** More Action Points than this are said as a number: a row of pips that long is not counted at a glance. */
const PIPS_MAX = 8;

/** THE TOP BAR: the turn and the AP on the left, the banner between, the messages and menu right. */
export function TopBar({
  turnText,
  apText,
  ap,
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
  /** The Action Points in words ("AP 4"): what a reader is told. The pips show the same. */
  apText: string;
  /** The points left, and how many this turn began with. */
  ap: { have: number; of: number };
  /** Whether the AP figure has terms to open. */
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
  const face = banner ? BANNER_FACE[banner.kind] : null;
  const of = Math.max(ap.of, ap.have);
  return (
    <div
      data-top-bar=""
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        minHeight: TOUCH.min,
        flex: '0 0 auto',
        fontFamily: TYPE.family,
        // THE LAST RESORT at 200% page zoom (a 180px layout): the fixed parts are wider than the
        // screen there, so the icons wrap to a second line rather than leave it. The banner's basis
        // is 0, so on any wider screen it shrinks before anything wraps.
        flexWrap: 'wrap',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
        <span data-turn="" style={{ ...PILL, fontSize: '0.9375rem', fontWeight: 900 }}>
          {turnText}
        </span>
        <button
          data-bar-ap="1"
          aria-label={apText}
          disabled={!apAvailable}
          onClick={onAp}
          style={{ ...PILL, cursor: apAvailable ? 'pointer' : 'default' }}
        >
          <span style={{ ...TYPE.label, color: COLOUR.onDarkSoft }}>{t('commandBar.ap')}</span>
          {of <= PIPS_MAX ? (
            <KitPips have={ap.have} of={of} label="" />
          ) : (
            <span style={{ fontSize: '0.9375rem', fontWeight: 900 }}>{ap.have}</span>
          )}
        </button>
      </span>
      <span style={{ flex: '1 1 0', minWidth: 0, display: 'flex', justifyContent: 'center' }}>
        {banner && face ? (
          <button
            data-banner=""
            onClick={onBanner}
            style={{
              minHeight: TOUCH.min,
              maxWidth: '100%',
              padding: '2px 10px',
              fontFamily: TYPE.family,
              fontSize: '0.75rem',
              fontWeight: 800,
              lineHeight: 1.2,
              borderRadius: RADIUS.control,
              border: 0,
              color: face.ink,
              background: face.bg,
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
          <KitButton
            data-table-open=""
            data-waiting={String(table.waiting)}
            aria-label={
              table.waiting > 0
                ? `${t('table.title')}, ${t('table.badge', { n: table.waiting })}`
                : t('table.title')
            }
            onPress={table.onOpen}
            style={{ ...ICON, position: 'relative' }}
          >
            <TableIcon />
            {table.waiting > 0 ? (
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  minWidth: '1.5em',
                  height: '1.5em',
                  borderRadius: 999,
                  background: COLOUR.coral,
                  color: COLOUR.ink,
                  fontSize: '0.75rem',
                  fontWeight: 900,
                  lineHeight: '1.5em',
                  textAlign: 'center',
                  padding: '0 0.3em',
                  boxSizing: 'border-box',
                }}
              >
                {table.waiting}
              </span>
            ) : null}
          </KitButton>
        ) : null}
        <KitButton data-chat="" aria-label={chatLabel} onPress={onChat} style={ICON}>
          <ChatIcon />
        </KitButton>
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
  // The new cards and the body in planning are not redrawn until L5: they keep their paper.
  const old = stage === 'arrivals' || stage === 'planning';
  return (
    <div
      data-play-area={stage}
      style={{
        position: 'relative',
        // It gives way before the middle does. With the phone's text at 200% the bars above and
        // below it grow, and the middle was left 25 px of a screen (measured); the board keeps its
        // shape inside whatever height is left to it, so it is the part that can afford to shrink.
        flex: '0 1 auto',
        // In px, not rem: it is the board's floor, and the board does not grow with the text.
        minHeight: 150,
        width: '100%',
        aspectRatio: BOARD_ASPECT,
        maxHeight: '55dvh',
        overflow: 'hidden',
        borderRadius: RADIUS.control,
        background: old ? OLD_PAPER : undefined,
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
        padding: '8px 12px',
        borderRadius: RADIUS.control,
        borderLeft: `6px solid ${COLOUR.coral}`,
        background: COLOUR.cream,
        color: COLOUR.ink,
        fontFamily: TYPE.family,
        ...TYPE.body,
        boxShadow: SHADOW.cast,
      }}
    >
      {text}
    </div>
  );
}

export interface ActionsUndo {
  available: boolean;
  moves: number;
  /** `multiplayer`: played together, no moves of this player's own to take back (v4; until then the
   *  relay refused every undo, FINDINGS #79). */
  reason?: 'available' | 'not-command' | 'no-moves' | 'committed' | 'resumed' | 'multiplayer';
  committedBy?: string | null;
}

/**
 * AN ACTION'S FACE: two lines, the verb (with any cost beside it) and under it the target. Laid over
 * the kit's button, which is one line by default.
 */
const TWO_LINES: CSSProperties = {
  flexDirection: 'column',
  alignItems: 'stretch',
  justifyContent: 'center',
  gap: 1,
  textAlign: 'left',
  padding: '0.3em 0.7em',
  minWidth: 0,
};
const LINE1: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 4,
};
const LINE2: CSSProperties = { fontSize: '0.75rem', fontWeight: 700, opacity: 0.85 };
/** What a line on the card is said in. Each is held to 4.5:1 on the card by the kit's own test. */
const TONE: Record<'hint' | 'muted' | 'memory' | 'alert', string> = {
  hint: COLOUR.mintInk,
  muted: COLOUR.inkSoft,
  memory: COLOUR.ink,
  alert: COLOUR.coralInk,
};

/**
 * THE MIDDLE IN COMMAND, AT REST: a card. The selected piece's line (its picture, and its name,
 * which opens its card; Undo on the right), then its actions two abreast (§14): the piece's own,
 * Recall to bloodstream, What's here. With nothing selected the line prompts instead. When the
 * piece has nothing to press, the card says why, or what the board offers instead.
 *
 * WHAT A BUTTON'S COLOUR SAYS: mint is what the piece in hand can do now; flat and grey is what it
 * cannot, and a press on it says why; cream is everything else.
 */
export function ActionsView(props: {
  selectedName: string | null;
  /** The selected piece's picture: the art's address for it, and whether it stands on a base. */
  piece?: { src: string; base: string | null } | null;
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
  const { undo, piece } = props;
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
    <div
      data-actions=""
      style={{
        ...kitCardStyle,
        // A flatter card than the kit's own: the middle is short, and every px of it is wanted.
        borderRadius: RADIUS.primary,
        boxShadow: `0 4px 0 ${COLOUR.creamEdge}`,
        padding: '6px 10px 10px',
        marginBottom: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: TOUCH.min }}>
        {props.selectedName !== null && piece ? (
          <span
            aria-hidden="true"
            style={{ position: 'relative', width: 44, height: 44, flex: '0 0 auto' }}
          >
            {piece.base !== null ? (
              <img
                alt=""
                src={piece.base}
                style={{ position: 'absolute', inset: 0, width: '100%' }}
              />
            ) : null}
            <img alt="" src={piece.src} style={{ position: 'absolute', inset: 0, width: '100%' }} />
          </span>
        ) : null}
        {props.selectedName !== null && props.onCard !== null ? (
          // A CARD BEHIND EVERY NAME (§14, ruling 5): the name and its card icon are one button.
          <button
            data-dock-card="1"
            aria-label={props.cardLabel ?? undefined}
            disabled={props.disabled}
            onClick={props.onCard}
            style={{
              minHeight: TOUCH.min,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 2px',
              background: 'transparent',
              border: 'none',
              color: COLOUR.ink,
              fontFamily: TYPE.family,
              ...TYPE.action,
              fontWeight: 900,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {props.selectedName}
            <span style={{ color: COLOUR.inkSoft }}>
              <CardIcon />
            </span>
          </button>
        ) : props.selectedName !== null ? (
          <span style={{ ...TYPE.action, fontWeight: 900, color: COLOUR.ink }}>
            {props.selectedName}
          </span>
        ) : props.prompt !== null ? (
          <span data-prompt="" style={{ ...TYPE.body, color: TONE[props.promptTone] }}>
            {props.prompt}
          </span>
        ) : null}
        {props.selectedName !== null && props.owner ? (
          <span data-owner="" style={{ ...TYPE.body, color: TONE.muted, flex: '1 1 auto' }}>
            {props.owner}
          </span>
        ) : null}
        {props.inCommand ? (
          // Undo stays in place in command: live when a move can be undone, flat otherwise, and a
          // press on the flat one says why.
          <KitButton
            data-dock-undo={undo.available ? 'available' : (undo.reason ?? 'unavailable')}
            disabled={props.disabled}
            unavailable={!undo.available}
            explains
            onPress={() => (undo.available ? props.onUndo() : props.onSay(undoReason))}
            style={{ width: 'auto', minHeight: TOUCH.min, marginLeft: 'auto', flex: '0 0 auto' }}
          >
            {undo.available ? `${t('dock.undo')} ${String(undo.moves)}` : t('dock.undo')}
          </KitButton>
        ) : null}
      </div>
      {props.selectedName !== null ? (
        <div
          data-dock-rows="1"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '0.625rem 0.5rem',
          }}
        >
          {slots === 0 && props.emptyText !== null ? (
            <div
              data-actions-empty=""
              style={{
                gridColumn: '1 / -1',
                ...TYPE.body,
                color: TONE[props.emptyTone],
                alignSelf: 'center',
              }}
            >
              {props.emptyText}
            </div>
          ) : null}
          {props.rows.map((row) => (
            <KitButton
              key={row.action}
              kind="go"
              data-dock-row={row.action}
              data-available={row.available ? '1' : '0'}
              data-dock-targets={row.targets.length > 1 ? String(row.targets.length) : undefined}
              aria-label={row.label}
              disabled={props.disabled}
              unavailable={!row.available}
              explains
              onPress={() => (row.available ? props.onRow(row) : props.onSay(row.reason))}
              style={TWO_LINES}
            >
              <span style={LINE1}>
                <span>{row.verb}</span>
                {row.cost !== null ? (
                  <span
                    data-action-detail="1"
                    style={{ fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}
                  >
                    {row.cost}
                  </span>
                ) : null}
              </span>
              {row.target !== null ? <span style={LINE2}>{row.target}</span> : null}
            </KitButton>
          ))}
          {props.moveButtons.map((b) => (
            <KitButton
              key={b.id}
              kind="go"
              data-dock-move={b.id}
              disabled={props.disabled}
              onPress={() => props.onMoveButton(b.id)}
              style={TWO_LINES}
            >
              <span style={LINE1}>{b.label}</span>
            </KitButton>
          ))}
          {props.onWhatsHere !== null ? (
            <KitButton
              data-dock-here="1"
              disabled={props.disabled}
              onPress={props.onWhatsHere}
              style={TWO_LINES}
            >
              <span style={LINE1}>{t('dock.whatsHere')}</span>
            </KitButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * THE MIDDLE WHILE A SPREAD PLAYS (§12 ruling 4, kept): the frame's headline and number, then its
 * dice. It reads the frame from the store, so only this re-renders per frame. Said straight onto
 * the table: the board above it is what is being watched.
 */
export function SpreadView({ store }: { store: FrameStore }): ReactElement | null {
  const frame = useFrame(store);
  if (!frame) return null;
  const faces = diceOf(frame.dice);
  return (
    <div
      data-middle-view="spread"
      style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: TYPE.family }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        {/* An engine string: the frame headline is a query-prose site in the engine catalogue. */}
        <span style={{ ...TYPE.action, fontWeight: 900, color: COLOUR.onDark }}>
          {engineText(frame.label)}
        </span>
        <span style={{ ...TYPE.body, color: COLOUR.onDarkSoft, marginLeft: 'auto' }}>
          {[String(frame.n), String(frame.of)].join('/')}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {faces.map((d, i) => (
          <span
            key={[d.label, String(i)].join('-')}
            data-die={d.hit ? 'hit' : 'miss'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: '0.8125rem',
              fontWeight: d.hit ? 900 : 700,
              // A die that hit is coral with dark words; one that missed is a dark pill.
              color: d.hit ? COLOUR.ink : COLOUR.onDark,
              background: d.hit ? COLOUR.coral : COLOUR.well,
              boxShadow: d.hit ? undefined : `inset 0 0 0 1.5px ${COLOUR.onDarkSoft}`,
              borderRadius: RADIUS.pill,
              padding: '2px 8px',
            }}
          >
            {d.label}
            <span
              style={{
                minWidth: '1.2em',
                textAlign: 'center',
                border: '1.5px solid currentcolor',
                borderRadius: 5,
                padding: '0 3px',
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

/** The three views' pictures, drawn here so no glyph depends on a font. The button carries the word. */
function TabIcon({ kind }: { kind: MiddleTab }): ReactElement {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 22 22',
    'aria-hidden': true,
    focusable: false,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;
  if (kind === 'pieces')
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="8" />
        <circle cx="11" cy="11" r="3" fill="currentColor" stroke="none" />
      </svg>
    );
  if (kind === 'antibodies')
    return (
      <svg {...common}>
        <path d="M4.5 3.5 11 10l6.5-6.5M11 10v8.5" strokeWidth="2.4" />
      </svg>
    );
  return (
    <svg {...common}>
      <path
        d="M11 18.5C3.5 13.5 3 8.5 5.5 6c2-2 4.6-1 5.5 1 .9-2 3.5-3 5.5-1 2.5 2.5 2 7.5-5.5 12.5z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

const TABS: readonly { kind: MiddleTab; label: string }[] = [
  { kind: 'pieces', label: 'tabs.cells' },
  { kind: 'antibodies', label: 'antibody.title' },
  { kind: 'body', label: 'body.title' },
];

/** COMMAND'S THREE BUTTONS: each opens its view in the middle, and a second tap closes it. Played
 *  together a player has only the drawers that are theirs (`drawersFor`), and the row shows those.
 *  A dark tile each, its picture over its word; the open one is lit and ringed. */
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
    <div data-tab-row="" style={{ display: 'flex', gap: 6, flex: '0 1 auto', minWidth: 0 }}>
      {tabs.map((tab) => {
        const on = active === tab.kind;
        return (
          <button
            key={tab.kind}
            data-tab={tab.kind}
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onTab(tab.kind)}
            style={{
              minHeight: TOUCH.primary,
              minWidth: TOUCH.primary,
              flex: '1 1 auto',
              padding: '4px 6px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              fontFamily: TYPE.family,
              fontSize: '0.75rem',
              fontWeight: 800,
              lineHeight: 1.1,
              borderRadius: RADIUS.control,
              border: 0,
              background: on ? COLOUR.tableLit : COLOUR.well,
              boxShadow: on ? `inset 0 0 0 2px ${COLOUR.glow}` : SHADOW.sunk,
              color: COLOUR.onDark,
              cursor: 'pointer',
              overflowWrap: 'anywhere',
            }}
          >
            <TabIcon kind={tab.kind} />
            {t(tab.label)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * THE CLOSE, IN THE STAGE'S ONE BUTTON'S PLACE (stage L4). A view opened in the middle is closed
 * from here: the one close of ruling 8, with the same word, drawn where the stage's button was, so
 * the three tiles beside it stay in reach. A cream button, not the coral one: it is a way back.
 */
export function SlotClose({
  label,
  onClose,
}: {
  label: 'back' | 'close';
  onClose: () => void;
}): ReactElement {
  return (
    <KitButton
      data-nav-close={label}
      onPress={onClose}
      style={{
        flex: '1 1 7rem',
        width: 'auto',
        minHeight: TOUCH.primary,
        borderRadius: RADIUS.primary,
      }}
    >
      {t(label === 'back' ? 'nav.back' : 'nav.close')}
    </KitButton>
  );
}

/**
 * THE STAGE'S ONE ADVANCE BUTTON, at the bottom of every stage (§19): what moves the turn on. The
 * kit's main button, the one coral thing on the screen. While the floating close shows it is
 * hidden but keeps its height (§12 ruling 1, kept), so nothing moves and the close sits where it is.
 */
export function AdvanceButton({
  keyName,
  label,
  disabled,
  hidden,
  gone = false,
  waiting = false,
  onPress,
}: {
  /** A view's close has this button's place (`SlotClose`): it is not drawn at all. */
  gone?: boolean;
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
  const step = `${keyName}|${String(disabled)}|${String(gone)}`;
  const changedAt = useRef(0);
  useLayoutEffect(() => {
    changedAt.current = performance.now();
  }, [step]);
  if (gone) return <></>;
  return (
    <KitButton
      kind="main"
      data-dock-next={keyName}
      data-waiting={waiting ? '1' : undefined}
      aria-hidden={hidden ? true : undefined}
      disabled={disabled}
      // Waiting on someone else, it is drawn flat: a status, not something to press.
      unavailable={waiting}
      // It answers only a press that counts: one the step guard drops makes no sound either. The
      // end of a turn has a sound of its own; every other step is a tap.
      sound={null}
      onPress={() => {
        if (!tapCounts(changedAt.current, performance.now())) return;
        kitAudio.answer(keyName === 'endTurn' ? 'endTurn' : 'tap');
        onPress();
      }}
      style={{
        // Narrow enough to sit beside the three tiles on a 360 px phone; it takes the row's spare
        // width, and a row of its own when the words are too wide.
        flex: '1 1 7rem',
        width: 'auto',
        visibility: hidden ? 'hidden' : 'visible',
        ...(waiting ? { fontSize: '0.9375rem', fontWeight: 700 } : {}),
      }}
    >
      {label}
    </KitButton>
  );
}
