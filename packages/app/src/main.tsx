/**
 * THE APP SHELL — the screen state machine of docs/APP_FLOW.md (§2 ruling 1), owning the
 * session lifecycle (ruling 3): created on New-game, restored on Continue, disposed on quit.
 * Minimum shell as ruled: Title (+Continue) → Difficulty → Play (+pause) → Result.
 *
 * The DEV SHELL (dev.html / dev.tsx) mounts the same PlayScreen with its instrumented
 * controls — ruling 6: Play is a component both shells mount, and the dev entry has a
 * build-check so it cannot rot quietly.
 *
 * Save semantics (ruling 4): ONE autosave slot (`autosave`), written by the session on every
 * accepted action, kept on quit, overwritten on new-game after confirm, deleted only when a
 * finished game reaches RESULT. A save is a browser-local IndexedDB record — device +
 * browser profile + origin, no account, nothing leaves the device.
 */
import { ORGANS } from '@immunity-wars/content';
import { LocalSession, IndexedDbStorage } from '@immunity-wars/session';
import type { ViewState } from '@immunity-wars/session';
import {
  DifficultyScreen,
  PauseSheet,
  PlayScreen,
  ResultScreen,
  TitleScreen,
  t,
  type ArtMetrics,
  type SaveSummary,
} from '@immunity-wars/ui';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

const SAVE_ID = 'autosave';
const storage = new IndexedDbStorage();

type Screen =
  | { name: 'title' }
  | { name: 'difficulty' }
  | { name: 'play' }
  | { name: 'result'; finalView: ViewState; difficulty: string };

function organDisplayName(o: string): string {
  return String((ORGANS as Record<string, { name?: unknown }>)[o]?.name ?? o);
}

function resultOf(v: ViewState): { won: boolean; lossOrgan: string | null } {
  const lost = v['lost'] as { organ?: unknown } | null | undefined;
  return {
    won: v['won'] === true,
    lossOrgan: lost && typeof lost.organ === 'string' ? organDisplayName(lost.organ) : null,
  };
}

function App(): ReactElement {
  const [screen, setScreen] = useState<Screen>({ name: 'title' });
  const [save, setSave] = useState<SaveSummary | null>(null);
  const [paused, setPaused] = useState(false);
  const [artMetrics, setArtMetrics] = useState<ArtMetrics | undefined>(undefined);
  const sessionRef = useRef<LocalSession | null>(null);
  const difficultyRef = useRef<string>('training');

  const refreshSave = (): void => {
    void storage
      .get(SAVE_ID)
      .then((s) => {
        if (!s) {
          setSave(null);
          return;
        }
        const st = s.state as Record<string, unknown>;
        setSave({
          difficulty: String(st['difficulty'] ?? ''),
          turn: Number(st['turn'] ?? 0),
        });
      })
      .catch(() => setSave(null));
  };

  useEffect(refreshSave, []);
  useEffect(() => {
    void fetch('/art/manifest.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((m: { assets?: ArtMetrics } | null) => {
        if (m && typeof m === 'object' && m.assets) setArtMetrics(m.assets);
      })
      .catch(() => undefined);
  }, []);

  const startNew = (difficulty: string): void => {
    difficultyRef.current = difficulty;
    sessionRef.current = LocalSession.createGame({ difficulty }, { storage, saveId: SAVE_ID });
    setPaused(false);
    setScreen({ name: 'play' });
  };

  const continueSave = (): void => {
    void storage.get(SAVE_ID).then((s) => {
      if (!s) {
        refreshSave();
        return;
      }
      const st = s.state as Record<string, unknown>;
      difficultyRef.current = String(st['difficulty'] ?? 'training');
      sessionRef.current = LocalSession.resume(s.state, { storage, saveId: SAVE_ID });
      setPaused(false);
      setScreen({ name: 'play' });
    });
  };

  const quitToTitle = (): void => {
    // Quit KEEPS the save (APP_FLOW ruling 4) — the session is simply dropped.
    sessionRef.current = null;
    setPaused(false);
    refreshSave();
    setScreen({ name: 'title' });
  };

  const onGameEnd = (finalView: ViewState): void => {
    // RESULT is the one place the autosave is deleted: Continue never offers a finished game.
    void storage.delete(SAVE_ID).catch(() => undefined);
    sessionRef.current = null;
    setSave(null);
    setScreen({ name: 'result', finalView, difficulty: difficultyRef.current });
  };

  if (screen.name === 'title') {
    return (
      <TitleScreen
        save={save}
        onContinue={continueSave}
        onNewGame={() => setScreen({ name: 'difficulty' })}
      />
    );
  }

  if (screen.name === 'difficulty') {
    return (
      <DifficultyScreen
        hasSave={save !== null}
        onStart={startNew}
        onBack={() => setScreen({ name: 'title' })}
      />
    );
  }

  if (screen.name === 'result') {
    const r = resultOf(screen.finalView);
    const g = screen.finalView;
    return (
      <ResultScreen
        won={r.won}
        lossOrgan={r.lossOrgan}
        stats={{
          turns: Number(g['turn'] ?? 0),
          organsDamaged: countDamagedOrgans(g),
          antibodiesMade: sumMade(g),
        }}
        onPlayAgain={() => startNew(screen.difficulty)}
        onChangeDifficulty={() => setScreen({ name: 'difficulty' })}
        onTitle={quitToTitle}
      />
    );
  }

  const session = sessionRef.current;
  if (!session) {
    // A play screen with no session is unreachable by the machine; recover to title.
    return (
      <TitleScreen
        save={save}
        onContinue={continueSave}
        onNewGame={() => setScreen({ name: 'difficulty' })}
      />
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <PlayScreen
        session={session}
        artMetrics={artMetrics}
        onGameEnd={onGameEnd}
        renderControls={(ctx) => (
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
              padding: '8px 0',
            }}
          >
            <span style={{ fontSize: 13, color: '#7C6A61' }}>
              {t('play.turn')} {String(ctx.game['turn'])}
              {['/', String(ctx.game['maxTurn'])].join('')} {t('commandBar.ap')}{' '}
              {String(ctx.game['ap'])} {t('play.deck')} {String(ctx.game['deckCount'])}
            </span>
            <button
              style={{ minHeight: 44, fontSize: 14 }}
              disabled={ctx.playing || ctx.phase !== 'infection' || Boolean(ctx.game['drawn'])}
              onClick={() => ctx.send({ action: 'draw' })}
            >
              {t('play.draw')}
            </button>
            <button
              style={{ minHeight: 44, fontSize: 14 }}
              disabled={ctx.playing || ctx.phase !== 'infection' || !ctx.game['drawn']}
              onClick={() => ctx.send({ action: 'beginCommand' })}
            >
              {t('play.beginCommand')}
            </button>
            <button
              style={{ minHeight: 44, fontSize: 14 }}
              disabled={ctx.playing || ctx.phase !== 'command'}
              onClick={() => ctx.send({ action: 'endCommand' })}
            >
              {t('play.endCommand')}
            </button>
            <button
              style={{ minHeight: 44, fontSize: 14, marginLeft: 'auto' }}
              onClick={() => setPaused(true)}
            >
              {t('play.pause')}
            </button>
            {ctx.frameInfo ? (
              <span style={{ fontSize: 13, color: '#B03A2E' }}>{ctx.frameInfo.label}</span>
            ) : null}
            {/* Rejections render in the command bar, through the catalogue (P2.5 selection). */}
          </div>
        )}
      />
      {paused ? <PauseSheet onResume={() => setPaused(false)} onQuit={quitToTitle} /> : null}
    </div>
  );
}

function countDamagedOrgans(g: ViewState): number {
  const organs = (g['organs'] as Record<string, { hp?: unknown; max?: unknown }> | undefined) ?? {};
  let n = 0;
  for (const o of Object.values(organs)) {
    if (typeof o.hp === 'number' && typeof o.max === 'number' && o.hp < o.max) n += 1;
  }
  return n;
}

function sumMade(g: ViewState): number {
  const made = (g['made'] as Record<string, unknown> | undefined) ?? {};
  return Object.values(made).reduce<number>((s, v) => s + (typeof v === 'number' ? v : 0), 0);
}

const el = document.getElementById('app');
if (el) {
  createRoot(el).render(<App />);
}
