/**
 * THE DEV SHELL — the instrumented entry, preserved as load-bearing (docs/APP_FLOW.md
 * ruling 6). It mounts the SAME PlayScreen as the app shell, with:
 *
 * - its own turn buttons, TEXT UNCHANGED ("Draw", "Begin command", "End command (spread)"),
 *   because tools/perf/measure.ts drives this page by button text and [data-cell];
 * - the metrics wiring (markInitialRender / recordFrame / recordTap → __iwMetrics);
 * - the tail-assertion checks panel, the skip toggle, and the IndexedDbStorage exercise
 *   (which must rerun on every load — indexeddb.ts's header promises it);
 * - its own save id ('dev-shell'), so instrumented games never clobber a player's autosave.
 *
 * The perf driver targets THIS page: point it at <origin>/dev.html.
 */
import { LocalSession, IndexedDbStorage } from '@immunity-wars/session';
import { PlayScreen, type ArtMetrics } from '@immunity-wars/ui';
import { useEffect, useState, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

import { runIdbExercise } from './idb-exercise';
import { markInitialRender, recordFrame, recordTap, recordTransition } from './metrics';

const session = LocalSession.createGame(
  { difficulty: 'training' },
  { storage: new IndexedDbStorage(), saveId: 'dev-shell' },
);

function DevApp(): ReactElement {
  const [skip, setSkip] = useState(false);
  const [checks, setChecks] = useState<string[]>([]);
  const [idbLines, setIdbLines] = useState<string[]>([]);
  const [artMetrics, setArtMetrics] = useState<ArtMetrics | undefined>(undefined);

  useEffect(() => {
    runIdbExercise((line) => setIdbLines((l) => [...l, line]))
      .then((summary) => setIdbLines((l) => [...l, '', summary]))
      .catch((e: unknown) => setIdbLines((l) => [...l, `THREW: ${String(e)}`]));
  }, []);
  useEffect(() => {
    void fetch('/art/manifest.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((m: { assets?: ArtMetrics } | null) => {
        if (m && typeof m === 'object' && m.assets) setArtMetrics(m.assets);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 700, margin: '0 auto' }}>
      <h1 style={{ fontSize: 18 }}>Immunity Wars — dev shell (instrumented)</h1>
      <PlayScreen
        session={session}
        artMetrics={artMetrics}
        skipBursts={skip}
        onCheck={(line) => setChecks((c) => [...c, line])}
        onFrame={recordFrame}
        onTap={recordTap}
        onTransition={recordTransition}
        renderControls={(ctx) => (
          <p>
            <span style={{ fontSize: 13 }}>
              turn {String(ctx.game['turn'])}/{String(ctx.game['maxTurn'])} · phase {ctx.phase} · AP{' '}
              {String(ctx.game['ap'])} · deck {String(ctx.game['deckCount'])}
              {ctx.frameInfo
                ? ` · SPREAD ${ctx.frameInfo.n}/${ctx.frameInfo.of}: ${ctx.frameInfo.label}`
                : ''}
              {ctx.lastError ? ` · rejected: ${ctx.lastError}` : ''}
            </span>
            <br />
            <button
              disabled={ctx.playing || ctx.phase !== 'infection' || Boolean(ctx.game['drawn'])}
              onClick={() => ctx.send({ action: 'draw' })}
            >
              Draw
            </button>{' '}
            <button
              disabled={ctx.playing || ctx.phase !== 'infection' || !ctx.game['drawn']}
              onClick={() => ctx.send({ action: 'beginCommand' })}
            >
              Begin command
            </button>{' '}
            <button
              disabled={ctx.playing || ctx.phase !== 'command'}
              onClick={() => ctx.send({ action: 'endCommand' })}
            >
              End command (spread)
            </button>{' '}
            <label style={{ fontSize: 13 }}>
              <input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} />{' '}
              skip bursts (render authoritative views only)
            </label>
          </p>
        )}
      />
      <pre style={{ fontSize: 12 }}>{checks.join('\n')}</pre>
      <details>
        <summary style={{ fontSize: 13 }}>IndexedDbStorage exercise (reruns every load)</summary>
        <pre style={{ fontSize: 12 }}>{idbLines.join('\n')}</pre>
      </details>
    </div>
  );
}

const el = document.getElementById('app');
if (el) {
  createRoot(el).render(<DevApp />);
  markInitialRender();
}
