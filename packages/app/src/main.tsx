/**
 * P2.2 steps 3–5 — the dev shell: the board rendered from `geometry.json` through
 * `LocalSession`, and the burst channel's first real consumer.
 *
 * The shape follows `docs/P2_2_PLAN.md` §5:
 *
 * - The listener fires SYNCHRONOUSLY inside `sendAction`, so it only queues; the animation
 *   loop drains the queue at legacy pacing — 800ms for dice frames, 560ms otherwise, kept
 *   deliberately so the P2.3 measurement is comparable (pacing preferences go to
 *   docs/for-P2.5.md, not here).
 * - Input is disabled during a burst; control enablement reads only the AUTHORITATIVE view.
 * - Dev tail assertion: when a burst drains, the last rendered frame must deep-equal the
 *   pending authoritative view's projection — the renderer-side confirmation of
 *   `burst-tail-authoritative`, logged loudly either way.
 * - The SKIP TOGGLE ignores every burst and renders authoritative views only — the ~3-line
 *   consumer-side control on the claim that bursts are skippable, and behaviourally what a
 *   reconnecting Phase 3 client does.
 *
 * All text here is developer scaffolding (its only reader is whoever is measuring the slice);
 * the board's own labels come from content data. The player-facing UI, with its i18n catalogue
 * duty, is P2.5's.
 */

import {
  LocalSession,
  IndexedDbStorage,
  type BurstFrame,
  type SessionView,
  type ViewState,
} from '@immunity-wars/session';
import { Board } from '@immunity-wars/ui';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

import { runIdbExercise } from './idb-exercise';

const session = LocalSession.createGame(
  { difficulty: 'training' },
  { storage: new IndexedDbStorage(), saveId: 'dev-shell' },
);

function App(): ReactElement {
  const [authView, setAuthView] = useState<SessionView>(() => session.getView());
  const [frame, setFrame] = useState<{
    view: ViewState;
    label: string;
    n: number;
    of: number;
  } | null>(null);
  const [skip, setSkip] = useState(false);
  const [checks, setChecks] = useState<string[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [idbLines, setIdbLines] = useState<string[]>([]);

  const skipRef = useRef(false);
  skipRef.current = skip;
  const queueRef = useRef<BurstFrame[]>([]);
  const burstSizeRef = useRef(0);
  const playingRef = useRef(false);
  const lastFrameRef = useRef<BurstFrame | null>(null);
  const pendingViewRef = useRef<SessionView | null>(null);

  const log = (line: string): void => {
    setChecks((c) => [...c, line]);
  };

  useEffect(() => {
    const playNext = (): void => {
      const f = queueRef.current.shift();
      if (!f) {
        playingRef.current = false;
        const pv = pendingViewRef.current;
        pendingViewRef.current = null;
        const last = lastFrameRef.current;
        if (pv && last) {
          // THE TAIL ASSERTION — burst-tail-authoritative, confirmed by its first real consumer.
          const ok = JSON.stringify(last.view) === JSON.stringify(pv.game);
          const line = ok
            ? `tail === authoritative view: PASS (${burstSizeRef.current} frames)`
            : 'tail !== authoritative view: FAIL — the burst is NOT safely skippable';
          log(line);
          if (!ok) console.error(`[burst] ${line}`);
          else console.log(`[burst] ${line}`);
        }
        if (pv) setAuthView(pv);
        setFrame(null);
        return;
      }
      lastFrameRef.current = f;
      const n = burstSizeRef.current - queueRef.current.length;
      setFrame({ view: f.view, label: f.label, n, of: burstSizeRef.current });
      // Legacy pacing, kept for measurement comparability. A rendering decision for P2.5.
      setTimeout(playNext, f.dice ? 800 : 560);
    };

    return session.subscribe((ev) => {
      if (ev.kind === 'burst') {
        if (skipRef.current) {
          log(`burst skipped (${ev.frames.length} frames) — rendering authoritative views only`);
          return;
        }
        queueRef.current.push(...ev.frames);
        burstSizeRef.current = queueRef.current.length;
        if (!playingRef.current) {
          playingRef.current = true;
          playNext();
        }
      } else {
        if (playingRef.current) pendingViewRef.current = ev.view;
        else setAuthView(ev.view);
      }
    });
  }, []);

  useEffect(() => {
    runIdbExercise((line) => setIdbLines((l) => [...l, line]))
      .then((summary) => setIdbLines((l) => [...l, '', summary]))
      .catch((e: unknown) => setIdbLines((l) => [...l, `THREW: ${String(e)}`]));
  }, []);

  const send = (action: Record<string, unknown>): void => {
    setLastError(null);
    void session.sendAction(action).then((r) => {
      if (!r.ok) setLastError(r.error ?? 'rejected');
    });
  };

  const game = authView.game;
  const phase = String(game['phase']);
  const playing = frame !== null;
  const shown = frame ? frame.view : game;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 700, margin: '0 auto' }}>
      <h1 style={{ fontSize: 18 }}>Immunity Wars — dev shell (P2.2 slice)</h1>
      <p style={{ fontSize: 13 }}>
        turn {String(game['turn'])}/{String(game['maxTurn'])} · phase {phase} · AP{' '}
        {String(game['ap'])} · deck {String(game['deckCount'])}
        {frame ? ` · SPREAD ${frame.n}/${frame.of}: ${frame.label}` : ''}
        {lastError ? ` · rejected: ${lastError}` : ''}
      </p>
      <p>
        <button
          disabled={playing || phase !== 'infection' || Boolean(game['drawn'])}
          onClick={() => send({ action: 'draw' })}
        >
          Draw
        </button>{' '}
        <button
          disabled={playing || phase !== 'infection' || !game['drawn']}
          onClick={() => send({ action: 'beginCommand' })}
        >
          Begin command
        </button>{' '}
        <button
          disabled={playing || phase !== 'command'}
          onClick={() => send({ action: 'endCommand' })}
        >
          End command (spread)
        </button>{' '}
        <label style={{ fontSize: 13 }}>
          <input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} /> skip
          bursts (render authoritative views only)
        </label>
      </p>
      <Board view={shown} />
      <pre style={{ fontSize: 12 }}>{checks.join('\n')}</pre>
      <details>
        <summary style={{ fontSize: 13 }}>IndexedDbStorage exercise (reruns every load)</summary>
        <pre style={{ fontSize: 12 }}>{idbLines.join('\n')}</pre>
      </details>
    </div>
  );
}

const el = document.getElementById('app');
if (el) createRoot(el).render(<App />);
