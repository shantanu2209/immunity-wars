/**
 * THE MEASURING PAGE — stage L4 of docs/LOOK_PLAN.md (§14), the fifth pull request.
 *
 * The play screen, whole and as a player has it, under one card of this page's own with a Measure
 * button. Pressed, it plays a few turns of a real game by itself, while the frame meter counts the
 * frames the phone gives the page, and then says how many were slow. The button is on a card over
 * everything, not in the screen's top bar, because a game opens on a dialog that covers the bar: put
 * there, a tap on it did nothing (found by tapping it, before the phone was asked to). It is what Shantanu opens on the S25, in the
 * place of the L2 prototype, and what `pnpm look:frames` opens on the PC.
 *
 * WHAT IT MEASURES IS THE REAL SCREEN. The same PlayScreen the app mounts, driven by the real
 * engine through a real session, with the board's motion, sound and camera as they are. It plays
 * by pressing the screen's own controls, in order, as a player would: the cards, planning, three
 * moves, End turn, and then it watches the spread at the pace that was ruled.
 *
 * THE SAME GAME EVERY TIME. The engine draws its dice and cards from `Math.random`; this page
 * replaces it with a seeded one before the game is made, so two runs play the same turns and their
 * numbers can be set side by side. Only this page does that.
 *
 *   ?turns=N   how many turns to play (3)
 *   ?slow=N    waste N ms in every frame: the meter's negative control
 *   ?auto=1    start measuring as soon as the page has drawn (the headless driver uses it)
 *
 * A developer's page, like dev.html and kit.html: no player is sent here, and the build keeps it
 * out of what a phone stores. Its own words are written here in English, as theirs are.
 */
import { IndexedDbStorage, LocalSession } from '@immunity-wars/session';
import { NavHost, PlayScreen, useNav } from '@immunity-wars/ui';
import { COLOUR, KitButton, KitCard, TYPE, kitAudio } from '@immunity-wars/ui/kit';
import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

import { refreshPace, startMeter, type MeterResult } from './frameMeter';

const params = new URLSearchParams(window.location.search);
const TURNS = Math.max(1, Math.min(8, Number(params.get('turns') ?? '3') || 3));
const BURN = Math.max(0, Number(params.get('slow') ?? '0') || 0);
const AUTO = params.get('auto') === '1';

/** A small seeded generator (mulberry32), so the game played is the same on every run. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
Math.random = seeded(20261001);

const session = LocalSession.createGame(
  { difficulty: 'training' },
  { storage: new IndexedDbStorage(), saveId: 'measure-shell' },
);

const sleep = (ms: number): Promise<void> => new Promise((r) => window.setTimeout(r, ms));
const find = (selector: string): HTMLElement | null =>
  document.querySelector<HTMLElement>(selector);
const usable = (el: HTMLElement | null): el is HTMLButtonElement =>
  el instanceof HTMLButtonElement && !el.disabled;

/**
 * PLAY SOME TURNS, by pressing what a player presses. Each press waits longer than the half second
 * the screen's own guard asks between a step changing and a tap counting for it.
 */
async function playTurns(turns: number, say: (line: string) => void): Promise<Played> {
  const played: Played = { moves: 0, spreads: 0, cameraIns: 0 };
  for (let turn = 1; turn <= turns; turn += 1) {
    say(`Turn ${String(turn)} of ${String(turns)}: the cards and the plan`);
    // Through whatever stands before the command stage: a dialog, the new cards, planning.
    for (let guard = 0; guard < 40; guard += 1) {
      const dialog = find('[data-dialog-dismiss]');
      if (usable(dialog)) {
        dialog.click();
        await sleep(700);
        continue;
      }
      const next = find('[data-dock-next]');
      const step = next?.getAttribute('data-dock-next');
      if (step === 'endTurn' && usable(next)) break;
      if (step !== 'spread' && usable(next)) next.click();
      await sleep(700);
    }
    say(`Turn ${String(turn)} of ${String(turns)}: three moves`);
    for (const cell of ['macrophage', 'neutrophil', 'nk']) {
      find(`[data-cell="${cell}"]`)?.click();
      await sleep(500);
      const move = find('[data-offer="move"]');
      const board = find('[data-clay-surface]');
      if (move && board) {
        // A tap where the legal move glows: the board reads where it landed, as it does a finger.
        const r = move.getBoundingClientRect();
        board.dispatchEvent(
          new MouseEvent('click', {
            bubbles: true,
            clientX: r.left + r.width / 2,
            clientY: r.top + r.height / 2,
          }),
        );
        played.moves += 1;
        await sleep(900);
      }
    }
    say(`Turn ${String(turn)} of ${String(turns)}: the spread`);
    const end = find('[data-dock-next="endTurn"]');
    if (usable(end)) {
      end.click();
      played.spreads += 1;
    }
    await sleep(800);
    // Watched at the ruled pace: nothing taps it on.
    for (let guard = 0; guard < 80 && find('[data-tap-advance]') !== null; guard += 1)
      await sleep(300);
    // The camera goes wide again a moment after the last beat.
    await sleep(1600);
  }
  return played;
}

/** What the run did, so that a reading says what it is a reading OF. */
interface Played {
  /** Taps on a glowing legal move. */
  moves: number;
  /** Turns ended, each followed by its spread. */
  spreads: number;
  /** Times the camera moved in. */
  cameraIns: number;
}

interface Reading {
  result: MeterResult;
  played: Played;
  refresh: number;
  turns: number;
  burn: number;
}

function Row({ what, value }: { what: string; value: string }): ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        padding: '5px 0',
        borderTop: `1.5px solid ${COLOUR.creamEdge}`,
        ...TYPE.body,
      }}
    >
      <span style={{ flex: '1 1 auto', minWidth: 0 }}>{what}</span>
      {/* A short figure stays on one line, so a screenshot of this card cannot be misread. */}
      <span style={{ fontWeight: 900, textAlign: 'right', flex: '0 0 auto', maxWidth: '62%' }}>
        {value}
      </span>
    </div>
  );
}

const OVER: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  background: 'rgba(4, 18, 22, 0.8)',
  display: 'flex',
  flexDirection: 'column',
  padding: 12,
  overflowY: 'auto',
  fontFamily: TYPE.family,
};
/** Centred when it fits, and scrolled from its top when it does not. */
const CARD: CSSProperties = { width: 'min(100%, 420px)', boxSizing: 'border-box', margin: 'auto' };

function Measure(): ReactElement {
  const nav = useNav<'play'>('play', () => true);
  const [running, setRunning] = useState<string | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const started = useRef(false);

  const run = async (): Promise<void> => {
    if (started.current) return;
    started.current = true;
    setReading(null);
    // Its sounds would be played by nobody's finger; a browser refuses those, and a measurement
    // should not depend on which way that falls.
    kitAudio.muted = true;
    setRunning('Reading how often this screen refreshes');
    const refresh = await refreshPace();
    // THE MARKED FRAMES: while the camera is in, or within its half second of travel either way.
    let cameraWas = 'wide';
    let cameraChanged = -Infinity;
    let cameraIns = 0;
    const meter = startMeter(() => {
      const now = performance.now();
      const camera = find('[data-clay-surface]')?.getAttribute('data-camera') ?? 'wide';
      if (camera !== cameraWas) {
        cameraWas = camera;
        cameraChanged = now;
        if (camera === 'in') cameraIns += 1;
      }
      return camera === 'in' || now - cameraChanged < 600;
    }, BURN);
    const played = await playTurns(TURNS, setRunning);
    const result = meter.stop();
    setRunning(null);
    setReading({ result, played: { ...played, cameraIns }, refresh, turns: TURNS, burn: BURN });
    started.current = false;
  };

  useEffect(() => {
    if (AUTO) void run();
    // Once, when the page has drawn.
  }, []);

  const r = reading?.result;
  return (
    <NavHost nav={nav}>
      <PlayScreen session={session} renderControls={() => null} />
      {running === null && reading === null && !AUTO ? (
        <div style={OVER}>
          <KitCard style={CARD}>
            <div style={TYPE.heading}>The play screen, measured</div>
            <p style={{ ...TYPE.body, margin: '0.3em 0 0.8em' }}>
              Press Measure and leave the phone alone. The page plays {TURNS} turns of a real game
              by itself, about {TURNS * 13} seconds, and then shows what it counted. Keep this tab
              in front until it does.
            </p>
            <KitButton data-measure-start="" onPress={() => void run()}>
              Measure
            </KitButton>
          </KitCard>
        </div>
      ) : null}
      {running !== null ? (
        <div
          data-measure-running=""
          style={{
            position: 'fixed',
            left: 8,
            right: 8,
            top: 56,
            zIndex: 1000,
            pointerEvents: 'none',
            textAlign: 'center',
            fontFamily: TYPE.family,
            ...TYPE.label,
            color: COLOUR.glow,
          }}
        >
          Measuring. {running}
        </div>
      ) : null}
      {reading && r ? (
        <div data-measure-done={JSON.stringify(reading)} style={OVER}>
          <KitCard style={CARD}>
            <div style={TYPE.heading}>The play screen, measured</div>
            <p style={{ ...TYPE.body, margin: '0.3em 0 0.6em', color: COLOUR.inkSoft }}>
              {reading.turns} turns of a real game, played by the page itself.
              {reading.burn > 0
                ? ` CONTROL: every frame was made to waste ${String(reading.burn)} ms.`
                : ''}
            </p>
            <Row
              what="Played: moves, spreads, times the camera moved in"
              value={`${String(reading.played.moves)} / ${String(reading.played.spreads)} / ${String(reading.played.cameraIns)}`}
            />
            <Row what="This screen refreshes every" value={`${String(reading.refresh)} ms`} />
            <Row
              what="Frames, and how long"
              value={`${String(r.all.frames)} in ${String(r.all.seconds)} s`}
            />
            <Row
              what="Slow frames (20 ms or more)"
              value={`${String(r.all.slow)} of ${String(r.all.frames)}`}
            />
            <Row what="Of them, 33 ms or more" value={String(r.all.verySlow)} />
            <Row
              what="A frame: middle, 95th, 99th of a hundred, worst"
              value={`${String(r.all.median)} / ${String(r.all.p95)} / ${String(r.all.p99)} / ${String(r.all.worst)} ms`}
            />
            <Row
              what="While the camera was moving or in: slow frames"
              value={`${String(r.marked.slow)} of ${String(r.marked.frames)}`}
            />
            <Row
              what="While the camera was moving or in: worst"
              value={`${String(r.marked.worst)} ms`}
            />
            <Row
              what="The slowest five, and when (c: camera)"
              value={
                r.slowest
                  .map((f) => `${String(f.ms)} at ${String(f.at)} s${f.marked ? ' c' : ''}`)
                  .join(', ') || 'none'
              }
            />
            <Row what="Tasks over 50 ms" value={String(r.longTasks)} />
            <p
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: COLOUR.inkSoft,
                overflowWrap: 'anywhere',
                margin: '0.6em 0',
              }}
            >
              {navigator.userAgent}
            </p>
            <KitButton data-measure-start="" onPress={() => void run()}>
              Measure again
            </KitButton>
          </KitCard>
        </div>
      ) : null}
    </NavHost>
  );
}

const root = document.getElementById('app');
if (root) createRoot(root).render(<Measure />);
