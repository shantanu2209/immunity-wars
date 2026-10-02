/**
 * THE LIGHT THAT LEADS THE PLAYER (stage L6, `docs/LOOK_PLAN.md` §6): one thing lit at a time,
 * everything else dimmed and unable to be tapped, and a sentence beside it.
 *
 * WHAT IS LIT IS THE REAL CONTROL. `model.ts` names it by the hook the page already carries. This
 * finds it on the page, dims everything round it with four panes that swallow a tap, rings it, and
 * lays a button of its own over it. A press on that button is handed to the control underneath: a
 * click, or, for a place on the board, a click at that place, which is how the board reads a
 * finger. So the player's tap does what tapping the control does, and nothing else can be tapped.
 *
 * WHY A BUTTON OVER IT AND NOT A HOLE. A hole would let the finger through to whatever is nearest,
 * and in the bloodstream seven cells stand within a finger's width. The button is at least 44 px
 * each way whatever is under it, and it presses exactly the thing that is lit.
 *
 * IT FOLLOWS THE CONTROL. The board moves under the camera and the middle's views open and close,
 * so where the control is is read again on every frame while the guide is up. That is one lookup
 * and a few rectangles a frame, for the minutes a lesson lasts; a game that is not guided never
 * mounts this.
 *
 * WHAT IS RINGED IS WHAT CAN BE SEEN OF IT (`box.ts`): a control cut off by a part of the screen
 * that scrolls is ringed where it shows, and is first scrolled to where the most of it does.
 */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from 'react';

import { t } from '../i18n';
import { KitButton } from '../kit/Button';
import { kitCardStyle } from '../kit/Surface';
import { prefersReducedMotion } from '../kit/motion';
import { COLOUR, RADIUS, TOUCH, TYPE } from '../kit/tokens';

import { cutBy, litBox, type Box } from './box';

/** The dimming: dark enough that the lit thing is the bright thing, light enough to read through. */
const DIM = 'rgba(4, 18, 22, 0.6)';
const Z = 18;

/** The first of the beat's stops that is on the page and has a size. */
function findLit(stops: readonly string[]): HTMLElement | null {
  for (const s of stops) {
    const el = document.querySelector<HTMLElement>(s);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/** Something that cuts a control off, and whether a finger can scroll it. */
interface Clipper {
  el: HTMLElement;
  scrolls: boolean;
}

/**
 * What cuts a control off: each part of the page it stands in that does not show what runs past its
 * edge. Found once for a control, when it becomes the lit one; only their rectangles are read on
 * each frame. A control fixed to the screen is cut off by nothing above it.
 */
function clippersOf(el: HTMLElement): Clipper[] {
  const out: Clipper[] = [];
  if (getComputedStyle(el).position === 'fixed') return out;
  for (let p = el.parentElement; p !== null && p !== document.body; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
      const scrolls = /auto|scroll/.test(`${cs.overflowX} ${cs.overflowY}`);
      out.push({ el: p, scrolls });
    }
    if (cs.position === 'fixed') break;
  }
  return out;
}

const same = (a: Box | null, b: Box | null): boolean =>
  a === b ||
  (a !== null &&
    b !== null &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5);

/** Hand the press to the control: a place on the board is pressed where it is, as a finger would. */
function press(el: HTMLElement): void {
  // The spread is moved on by a finger going down anywhere, not by a click.
  if (el.hasAttribute('data-tap-advance')) {
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    return;
  }
  const board = el.closest<HTMLElement>('[data-clay-surface]');
  if (board && el.hasAttribute('data-at')) {
    const r = el.getBoundingClientRect();
    board.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: r.left + r.width / 2,
        clientY: r.top + r.height / 2,
      }),
    );
    return;
  }
  el.click();
}

const pane = (style: CSSProperties): CSSProperties => ({
  position: 'fixed',
  background: DIM,
  pointerEvents: 'auto',
  ...style,
});

export function Spotlight({
  beatId,
  text,
  stops,
  tell,
  last,
  watch = false,
  count,
  onNext,
  onLeave,
}: {
  /** The beat's id, on the page for a walk to read. */
  beatId: string;
  text: string;
  stops: readonly string[];
  /** Said, not done: the card's own button moves on. */
  tell: boolean;
  /** The lesson's last word: its button hands the game over. */
  last: boolean;
  /**
   * The spread is playing: it is watched, so nothing is dimmed and nothing is ringed. The sentence
   * stands alone, and a finger anywhere moves the spread on, as it always does.
   */
  watch?: boolean;
  /** "12 of 40", already worded. */
  count: string;
  onNext: () => void;
  /** Leave the lesson. Always one tap away: a teacher who cannot be left is not a teacher. */
  onLeave: () => void;
}): ReactElement {
  const [box, setBox] = useState<Box | null>(null);
  const [name, setName] = useState('');
  /** What is lit is on the board: the card then keeps off the board where it can. */
  const [onBoard, setOnBoard] = useState(false);
  const lit = useRef<HTMLElement | null>(null);
  const ring = useRef<HTMLButtonElement | null>(null);
  const key = stops.join('|');

  // Where the lit control is, read every frame while the guide is up (see the header).
  useLayoutEffect(() => {
    let frame = 0;
    // Unknown until the first look, so that the first look always says what it found: a beat whose
    // control is not on the page yet must put the last beat's ring out, not leave it standing.
    let now: Box | null | undefined;
    /** The control last brought into view, so that it is brought once and not held there. */
    let brought: HTMLElement | null = null;
    let clippers: Clipper[] = [];
    const read = (): void => {
      const el = last || watch ? null : findLit(stops);
      // WHAT IS LIT MUST BE ON THE SCREEN. With the page zoomed, or the text at its largest, the
      // screen is taller than the phone and the lit control may be below it, or part of it may be
      // below the edge of the middle, which scrolls. The player cannot scroll to it: every touch
      // outside the light is swallowed. So the guide brings it into view, once, when it becomes
      // the lit one. Only a part a finger could scroll is scrolled for it: the board is cut off by
      // its own frame, and moves by its camera.
      if (el !== null && el !== brought) {
        brought = el;
        clippers = clippersOf(el);
        const r = el.getBoundingClientRect();
        const offScreen =
          r.top < 0 || r.bottom > window.innerHeight || r.left < 0 || r.right > window.innerWidth;
        const cut = clippers.some((c) => c.scrolls && cutBy(r, c.el.getBoundingClientRect()));
        if (offScreen || cut) {
          el.scrollIntoView({ block: offScreen ? 'center' : 'nearest', inline: 'nearest' });
        }
      }
      if (el === null) clippers = [];
      lit.current = el;
      const next = el
        ? litBox(
            el.getBoundingClientRect(),
            clippers.map((c) => c.el.getBoundingClientRect()),
            { width: window.innerWidth, height: window.innerHeight },
          )
        : null;
      if (now === undefined || !same(now, next)) {
        now = next;
        setBox(next);
        setName(el ? (el.getAttribute('aria-label') ?? el.textContent ?? '').trim() : '');
        setOnBoard(el !== null && el.closest('[data-clay-board]') !== null);
      }
      frame = window.requestAnimationFrame(read);
    };
    read();
    return (): void => window.cancelAnimationFrame(frame);
    // `key` stands for `stops`: the same hooks are the same search.
  }, [key, last, watch]);

  // The ring breathes, so that the eye finds it; not on a phone that asks for less motion.
  useEffect(() => {
    const el = ring.current;
    if (!el || prefersReducedMotion() || typeof el.animate !== 'function') return;
    const a = el.animate(
      [{ boxShadow: `0 0 0 0 ${COLOUR.glow}` }, { boxShadow: `0 0 0 8px rgba(255, 224, 138, 0)` }],
      { duration: 1200, iterations: Infinity },
    );
    return (): void => a.cancel();
  }, [box === null, beatId]);

  const W = typeof window === 'undefined' ? 0 : window.innerWidth;
  const H = typeof window === 'undefined' ? 0 : window.innerHeight;
  // THE CARD STANDS BESIDE WHAT IS LIT, on the side with more room. Beside it, so the eye has
  // one place to look; and so that what is far from the lit control stays in view: with the lit
  // control in the bottom row, the Action Points at the top are not under the card that is
  // talking about them. With nothing lit it stands at the foot.
  //
  // WHEN WHAT IS LIT IS ON THE BOARD, THE CARD STANDS AT THE FOOT, over the piece's actions, which
  // are not wanted while a place on the board is. The board is what the sentence is about, and a
  // card laid across the bloodstream would hide the pieces it names. Only when the lit place is
  // too low for that does it stand beside it.
  const GAP = 12;
  const below = box === null ? 0 : H - (box.top + box.height) - GAP;
  const atFoot = box !== null && onBoard && below >= 150;
  const above = box !== null && !atFoot && box.top >= H - (box.top + box.height);
  const room = box === null ? H : atFoot ? below : above ? box.top - GAP : below;
  const cardPlace: CSSProperties =
    box === null || atFoot
      ? { bottom: 8 }
      : above
        ? { bottom: H - box.top + GAP }
        : { top: box.top + box.height + GAP };
  // A tell points and is not pressed: its ring is drawn, and nothing under it can be tapped.
  const pressable = !tell && !last;

  return (
    <div
      data-guide={beatId}
      data-guide-lit={box ? '1' : '0'}
      style={{ position: 'fixed', inset: 0, zIndex: Z, pointerEvents: 'none' }}
    >
      {box ? (
        <>
          <div style={pane({ left: 0, top: 0, width: W, height: box.top })} />
          <div
            style={pane({
              left: 0,
              top: box.top + box.height,
              width: W,
              height: Math.max(0, H - box.top - box.height),
            })}
          />
          <div style={pane({ left: 0, top: box.top, width: box.left, height: box.height })} />
          <div
            style={pane({
              left: box.left + box.width,
              top: box.top,
              width: Math.max(0, W - box.left - box.width),
              height: box.height,
            })}
          />
          <button
            ref={ring}
            type="button"
            data-guide-press=""
            aria-label={name || text}
            disabled={!pressable}
            onClick={() => {
              if (pressable && lit.current) press(lit.current);
            }}
            style={{
              position: 'fixed',
              left: box.left,
              top: box.top,
              width: box.width,
              height: box.height,
              boxSizing: 'border-box',
              padding: 0,
              background: 'transparent',
              border: `3px solid ${COLOUR.glow}`,
              borderRadius: RADIUS.control,
              pointerEvents: 'auto',
              cursor: pressable ? 'pointer' : 'default',
            }}
          />
        </>
      ) : watch ? null : (
        <div style={pane({ inset: 0 })} />
      )}
      <div
        data-guide-card=""
        role="note"
        style={{
          ...kitCardStyle,
          position: 'fixed',
          left: 8,
          right: 8,
          ...cardPlace,
          maxHeight: Math.max(96, room - 8),
          overflowY: 'auto',
          boxSizing: 'border-box',
          padding: '0.75em 0.875em',
          pointerEvents: watch ? 'none' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <p data-guide-text="" style={{ ...TYPE.body, margin: 0, color: COLOUR.ink }}>
          {text}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <span
            data-guide-count=""
            style={{ ...TYPE.label, color: COLOUR.inkSoft, flex: '1 1 auto' }}
          >
            {count}
          </span>
          {last || watch ? null : (
            // A way out, always there and never loud: a quiet word, and still a full touch target.
            <button
              type="button"
              data-guide-leave=""
              onClick={onLeave}
              style={{
                minHeight: TOUCH.min,
                minWidth: TOUCH.min,
                padding: '0 0.5em',
                border: 0,
                background: 'transparent',
                color: COLOUR.inkSoft,
                fontFamily: TYPE.family,
                ...TYPE.body,
                fontWeight: 800,
                textDecoration: 'underline',
                cursor: 'pointer',
              }}
            >
              {t('guide.leave')}
            </button>
          )}
          {tell || last ? (
            <KitButton kind="main" data-guide-next="" onPress={onNext}>
              {t(last ? 'guide.playOn' : 'guide.next')}
            </KitButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
