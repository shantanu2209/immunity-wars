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
 *
 * WHAT THE SENTENCE TALKS ABOUT IS SHOWN (ruled 16 October 2026, `docs/LOOK_PLAN.md` §29): the new
 * cards, the body, the bacterium on the board. Each is left out of the dimming with a thinner ring
 * that does not breathe, and stays as unpressable as everything else: only the lit control's own
 * button takes a press. Whatever of it is on the page is shown; what is not is not looked for.
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

import {
  RING,
  RING_GAP,
  SHOW_RING,
  cutBy,
  edgeBelow,
  holeShape,
  litBox,
  ringBox,
  type Box,
  type Hole,
} from './box';

/** The dimming: dark enough that the lit thing is the bright thing, light enough to read through. */
const DIM = 'rgba(4, 18, 22, 0.6)';
const Z = 18;

/** The first of the beat's stops that is on the page and has a size, and which stop it is. */
function findLit(stops: readonly string[]): { el: HTMLElement; stop: string } | null {
  for (const s of stops) {
    const el = document.querySelector<HTMLElement>(s);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return { el, stop: s };
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

/** A ring round a thing on the page: tight round it and its lip, in its own corner (`box.ts`). */
function ringOf(el: HTMLElement, own: DOMRect, clipRects: readonly DOMRect[]): Hole {
  const cs = getComputedStyle(el);
  const corner = cs.borderTopLeftRadius;
  // A piece on the board is round, whatever its box says; anything else takes its own corner.
  const radius =
    corner.endsWith('%') || el.closest('[data-clay-board]') !== null
      ? Math.min(own.width, own.height) / 2
      : parseFloat(corner) || 0;
  return { box: ringBox(own, clipRects, edgeBelow(cs.boxShadow)), radius: radius + RING_GAP };
}

/** A hole in the dimming round a ring: its outer edge. */
const grown = (h: Hole, by: number): Hole => ({
  box: {
    left: h.box.left - by,
    top: h.box.top - by,
    width: h.box.width + by * 2,
    height: h.box.height + by * 2,
  },
  radius: h.radius + by,
});

const keyOf = (holes: readonly Hole[]): string =>
  holes
    .map((h) => [h.box.left, h.box.top, h.box.width, h.box.height].map(Math.round).join(','))
    .join(';');

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

export function Spotlight({
  beatId,
  text,
  stops,
  thens = [],
  shows = [],
  tell,
  last,
  chapterEnd = false,
  watch = false,
  count,
  onNext,
  onLeave,
}: {
  /** The beat's id, on the page for a walk to read. */
  beatId: string;
  text: string;
  stops: readonly string[];
  /**
   * Beside each stop, the few words said when it is lit after another of the same beat was (step
   * 3: "Now tap Coat."); empty for none. The beat's whole sentence is said first, always.
   */
  thens?: readonly string[];
  /** What the sentence talks about, by the page's hooks: shown, not pressable. */
  shows?: readonly string[];
  /** Said, not done: the card's own button moves on. */
  tell: boolean;
  /** The lesson's last word: its button hands the game over. */
  last: boolean;
  /** The end of a chapter: its buttons go on to the next, or stop for now. */
  chapterEnd?: boolean;
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
  /** The ring, drawn tight round the control and its lip, and the corner it takes (`box.ts`). */
  const [ringAt, setRingAt] = useState<{ box: Box; radius: number } | null>(null);
  /** What is shown, each ringed where it can be seen. */
  const [shownAt, setShownAt] = useState<readonly Hole[]>([]);
  /** How many of what is shown are on the page, the lit control among them: for a walk to read. */
  const [found, setFound] = useState(0);
  const [name, setName] = useState('');
  /** Which stop is lit, and which was lit first in this beat: a later one says its few words. */
  const [litStop, setLitStop] = useState('');
  const firstLit = useRef<{ beat: string; stop: string } | null>(null);
  /** What is lit is on the board: the card then keeps off the board where it can. */
  const [onBoard, setOnBoard] = useState(false);
  const lit = useRef<HTMLElement | null>(null);
  const ring = useRef<HTMLDivElement | null>(null);
  const key = stops.join('|');
  const showKey = shows.join('|');

  // Where the lit control is, read every frame while the guide is up (see the header).
  useLayoutEffect(() => {
    let frame = 0;
    // Unknown until the first look, so that the first look always says what it found: a beat whose
    // control is not on the page yet must put the last beat's ring out, not leave it standing.
    let now: Box | null | undefined;
    /** The control last brought into view, so that it is brought once and not held there. */
    let brought: HTMLElement | null = null;
    let clippers: Clipper[] = [];
    let stopNow: string | undefined;
    let ringNow: { box: Box; radius: number } | null = null;
    // Unknown until the first look, for the same reason: a beat that shows nothing must take down
    // what the last beat showed. Started at "nothing", it left Malaria's ring standing on the
    // lesson's last card, after Malaria was gone (16 October 2026).
    let shownNow: string | undefined;
    let foundNow = -1;
    /** What cuts each shown thing off, found once for it. */
    const shownClips = new Map<HTMLElement, Clipper[]>();
    const read = (): void => {
      const found = last || watch ? null : findLit(stops);
      const el = found?.el ?? null;
      if (found !== null && firstLit.current?.beat !== beatId) {
        firstLit.current = { beat: beatId, stop: found.stop };
      }
      if ((found?.stop ?? '') !== stopNow) {
        stopNow = found?.stop ?? '';
        setLitStop(stopNow);
      }
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
      const own = el ? el.getBoundingClientRect() : null;
      const clipRects = clippers.map((c) => c.el.getBoundingClientRect());
      const next =
        el && own
          ? litBox(own, clipRects, { width: window.innerWidth, height: window.innerHeight })
          : null;
      const tight = el && own ? ringOf(el, own, clipRects) : null;
      // What is shown: every one on the page with a size, but the lit control itself, or what holds
      // it or is held by it, which its own ring already shows.
      const shown: Hole[] = [];
      let on = 0;
      if (!watch && !last) {
        for (const sel of shows) {
          for (const s of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
            const r = s.getBoundingClientRect();
            if (r.width <= 0 || r.height <= 0) continue;
            on += 1;
            if (el !== null && (s === el || s.contains(el) || el.contains(s))) continue;
            let clips = shownClips.get(s);
            if (clips === undefined) {
              clips = clippersOf(s);
              shownClips.set(s, clips);
            }
            shown.push(
              ringOf(
                s,
                r,
                clips.map((c) => c.el.getBoundingClientRect()),
              ),
            );
          }
        }
      }
      if (on !== foundNow) {
        foundNow = on;
        setFound(on);
      }
      const shownKey = keyOf(shown);
      if (shownKey !== shownNow) {
        shownNow = shownKey;
        setShownAt(shown);
      }
      if (
        now === undefined ||
        !same(now, next) ||
        !same(ringNow?.box ?? null, tight?.box ?? null)
      ) {
        now = next;
        ringNow = tight;
        setBox(next);
        setRingAt(tight);
        setName(el ? (el.getAttribute('aria-label') ?? el.textContent ?? '').trim() : '');
        setOnBoard(el !== null && el.closest('[data-clay-board]') !== null);
      }
      frame = window.requestAnimationFrame(read);
    };
    read();
    return (): void => window.cancelAnimationFrame(frame);
    // `key` and `showKey` stand for `stops` and `shows`: the same hooks are the same search.
  }, [key, showKey, last, watch, beatId]);

  // The words for what is lit: the beat's whole sentence, until a later control of it is lit.
  const thenText =
    firstLit.current?.beat === beatId && litStop !== '' && litStop !== firstLit.current.stop
      ? (thens[stops.indexOf(litStop)] ?? '')
      : '';
  const said = thenText !== '' ? thenText : text;

  // The ring breathes, so that the eye finds it; not on a phone that asks for less motion. It is a
  // glow that grows out of the ring and fades, so the control looks lit, not set into the table.
  useEffect(() => {
    const el = ring.current;
    if (!el || prefersReducedMotion() || typeof el.animate !== 'function') return;
    const a = el.animate(
      [
        {
          boxShadow: `0 0 0 ${String(RING)}px ${COLOUR.glow}, 0 0 0 ${String(RING)}px rgba(255, 224, 138, 0.7)`,
        },
        {
          boxShadow: `0 0 0 ${String(RING)}px ${COLOUR.glow}, 0 0 0 ${String(RING + 9)}px rgba(255, 224, 138, 0)`,
        },
      ],
      { duration: 1200, iterations: Infinity },
    );
    return (): void => a.cancel();
  }, [ringAt === null, beatId]);
  // The dimming stops where each ring does: a hole is a ring's outer edge.
  const holes: Hole[] = [
    ...(box && ringAt ? [grown(ringAt, RING)] : []),
    ...shownAt.map((h) => grown(h, SHOW_RING)),
  ];

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
      data-guide-shows={shows.length}
      data-guide-showing={found}
      style={{ position: 'fixed', inset: 0, zIndex: Z, pointerEvents: 'none' }}
    >
      {watch ? null : (
        <>
          {/* Every touch outside the light is swallowed. The light's own button lies over this. */}
          <div data-guide-block="" style={{ position: 'fixed', inset: 0, pointerEvents: 'auto' }} />
          <svg
            aria-hidden="true"
            width={W}
            height={H}
            style={{ position: 'fixed', left: 0, top: 0, pointerEvents: 'none' }}
          >
            <defs>
              <mask id="iw-guide-dim" maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
                <rect x={0} y={0} width={W} height={H} fill="white" />
                {holes.map((h, i) => {
                  const r = holeShape(h);
                  return <rect key={i} {...r} ry={r.rx} fill="black" />;
                })}
              </mask>
            </defs>
            <rect
              data-guide-dim=""
              x={0}
              y={0}
              width={W}
              height={H}
              fill={DIM}
              mask="url(#iw-guide-dim)"
            />
          </svg>
          {shownAt.map((h, i) => (
            // What the sentence is about: ringed, still, and not pressable.
            <div
              key={i}
              data-guide-shown=""
              aria-hidden="true"
              style={{
                position: 'fixed',
                left: h.box.left,
                top: h.box.top,
                width: h.box.width,
                height: h.box.height,
                borderRadius: h.radius,
                boxShadow: `0 0 0 ${String(SHOW_RING)}px ${COLOUR.glow}`,
                pointerEvents: 'none',
              }}
            />
          ))}
        </>
      )}
      {box && ringAt ? (
        <>
          <div
            ref={ring}
            data-guide-ring=""
            aria-hidden="true"
            style={{
              position: 'fixed',
              left: ringAt.box.left,
              top: ringAt.box.top,
              width: ringAt.box.width,
              height: ringAt.box.height,
              borderRadius: ringAt.radius,
              boxShadow: `0 0 0 ${String(RING)}px ${COLOUR.glow}`,
              pointerEvents: 'none',
            }}
          />
          <button
            type="button"
            data-guide-press=""
            aria-label={name || text}
            disabled={!pressable}
            onClick={() => {
              if (pressable && lit.current) press(lit.current);
            }}
            style={{
              // The finger's target: the control, grown to a finger's size. It draws nothing; the
              // ring above is what is seen.
              position: 'fixed',
              left: box.left,
              top: box.top,
              width: box.width,
              height: box.height,
              boxSizing: 'border-box',
              padding: 0,
              background: 'transparent',
              border: 0,
              borderRadius: RADIUS.control,
              pointerEvents: 'auto',
              cursor: pressable ? 'pointer' : 'default',
            }}
          />
        </>
      ) : null}
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
          {said}
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
            // At a chapter's end it is the choice to stop for now, and the chapter is kept.
            <button
              type="button"
              data-guide-leave={chapterEnd ? 'stop' : ''}
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
              {t(chapterEnd ? 'guide.stop' : 'guide.leave')}
            </button>
          )}
          {tell || last ? (
            <KitButton kind="main" data-guide-next="" onPress={onNext}>
              {t(last ? 'guide.playOn' : chapterEnd ? 'guide.nextChapter' : 'guide.next')}
            </KitButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
