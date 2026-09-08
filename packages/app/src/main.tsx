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
  AboutScreen,
  DifficultyScreen,
  HelpScreen,
  LibraryScreen,
  PauseSheet,
  PlayScreen,
  ResultScreen,
  SettingsScreen,
  TitleScreen,
  t,
  turnLine,
  type ArtMetrics,
  type HelpSectionKey,
  type LibraryView,
  type SaveSummary,
} from '@immunity-wars/ui';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

import {
  LOCALES,
  TEXT_SIZES,
  applyTextSize,
  browserStore,
  readSettings,
  writeSettings,
  type Locale,
  type Settings,
  type TextSize,
} from './settings';

const SAVE_ID = 'autosave';
const storage = new IndexedDbStorage();
// The preference store is read once, synchronously, before the first render (settings.ts says
// why); a write that fails keeps the in-memory value for the session. The text size is applied
// to the root here, before the first paint, so the first frame is already at the chosen size.
const prefStore = browserStore();
const initialSettings = readSettings(prefStore);
applyTextSize(initialSettings.textSize);

type Screen =
  | { name: 'title' }
  | { name: 'difficulty' }
  | { name: 'play' }
  | { name: 'result'; finalView: ViewState; difficulty: string }
  /** Settings, and where Back returns to. From play, the game stays mounted underneath
   *  (hidden), so nothing about the session, the selection or a queued dialog is disturbed. */
  | { name: 'settings'; from: 'title' | 'play' }
  /** How to play: the index (section null) or one section; the same two doors as Settings. */
  | { name: 'help'; from: 'title' | 'play'; section: HelpSectionKey | null }
  /** The disease library: its index, a card over it, or the why section. Its door is the
   *  Title (APP_FLOW; ruled 8 September 2026); from play it is reached only by a Help link. */
  | { name: 'library'; from: 'title' | 'play'; view: LibraryView }
  /** About: credits, recognition, privacy, licence. The Title is its only door, and unlike the
   *  other three slots it has no reason to open over a paused game. */
  | { name: 'about' };

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
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const saveSettings = (s: Settings): void => {
    setSettings(s);
    applyTextSize(s.textSize);
    writeSettings(prefStore, s);
  };
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

  const deleteSave = (): void => {
    // The one thing that persists on the player's path (for-P2.6.md, PROPOSAL 2, "what reset
    // resets"): the autosave. Settings stay, and the confirm said so.
    void storage
      .delete(SAVE_ID)
      .catch(() => undefined)
      .then(() => {
        setSave(null);
        refreshSave();
      });
  };

  const settingsScreen = (from: 'title' | 'play'): ReactElement => (
    <SettingsScreen
      textSize={settings.textSize}
      textSizes={TEXT_SIZES}
      language={settings.language}
      languages={LOCALES}
      onChoose={(row, v) =>
        saveSettings(
          row === 'textSize'
            ? { ...settings, textSize: v as TextSize }
            : { ...settings, language: v as Locale },
        )
      }
      deleteSaveBlock={from === 'play' ? 'inPlay' : save ? null : 'none'}
      onDeleteSave={deleteSave}
      onBack={() => setScreen(from === 'play' ? { name: 'play' } : { name: 'title' })}
    />
  );

  const helpScreen = (from: 'title' | 'play', section: HelpSectionKey | null): ReactElement => (
    <HelpScreen
      section={section}
      onOpen={(s) => setScreen({ name: 'help', from, section: s })}
      onBack={() => setScreen(from === 'play' ? { name: 'play' } : { name: 'title' })}
      onWhy={(entry) => setScreen({ name: 'library', from, view: { kind: 'why', entry } })}
    />
  );

  const libraryScreen = (from: 'title' | 'play', view: LibraryView): ReactElement => (
    <LibraryScreen
      view={view}
      onView={(v) => setScreen({ name: 'library', from, view: v })}
      onBack={() => setScreen(from === 'play' ? { name: 'play' } : { name: 'title' })}
      onHelp={(section) => setScreen({ name: 'help', from, section })}
    />
  );

  if (screen.name === 'settings' && screen.from === 'title') return settingsScreen('title');
  if (screen.name === 'library' && screen.from === 'title')
    return libraryScreen('title', screen.view);
  if (screen.name === 'help' && screen.from === 'title') return helpScreen('title', screen.section);
  if (screen.name === 'about') return <AboutScreen onBack={() => setScreen({ name: 'title' })} />;

  if (screen.name === 'title') {
    return (
      <TitleScreen
        save={save}
        onContinue={continueSave}
        onNewGame={() => setScreen({ name: 'difficulty' })}
        onSettings={() => setScreen({ name: 'settings', from: 'title' })}
        onHelp={() => setScreen({ name: 'help', from: 'title', section: null })}
        onLibrary={() => setScreen({ name: 'library', from: 'title', view: { kind: 'index' } })}
        onAbout={() => setScreen({ name: 'about' })}
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
        onSettings={() => setScreen({ name: 'settings', from: 'title' })}
        onHelp={() => setScreen({ name: 'help', from: 'title', section: null })}
        onLibrary={() => setScreen({ name: 'library', from: 'title', view: { kind: 'index' } })}
        onAbout={() => setScreen({ name: 'about' })}
      />
    );
  }

  // Settings or Help over the paused game: the game stays mounted underneath, hidden.
  const overPlay =
    screen.name === 'settings' || screen.name === 'help' || screen.name === 'library';
  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {screen.name === 'settings' ? settingsScreen('play') : null}
      {screen.name === 'help' ? helpScreen('play', screen.section) : null}
      {screen.name === 'library' ? libraryScreen('play', screen.view) : null}
      <div hidden={overPlay}>
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
              <span style={{ fontSize: '0.8125rem', color: '#7C6A61' }}>
                {turnLine(ctx.game)} {t('commandBar.ap')} {String(ctx.game['ap'])} {t('play.deck')}{' '}
                {String(ctx.game['deckCount'])}
              </span>
              <button
                style={{ minHeight: 44, fontSize: '0.875rem' }}
                disabled={ctx.playing || ctx.phase !== 'infection' || Boolean(ctx.game['drawn'])}
                onClick={() => ctx.send({ action: 'draw' })}
              >
                {t('play.draw')}
              </button>
              {/* While the planning screen shows (item 12), its own bottom button begins
                command; a second copy up here would be the same button twice. */}
              {ctx.planning ? null : (
                <button
                  style={{ minHeight: 44, fontSize: '0.875rem' }}
                  disabled={ctx.playing || ctx.phase !== 'infection' || !ctx.game['drawn']}
                  onClick={() => ctx.send({ action: 'beginCommand' })}
                >
                  {t('play.beginCommand')}
                </button>
              )}
              <button
                style={{ minHeight: 44, fontSize: '0.875rem' }}
                disabled={ctx.playing || ctx.phase !== 'command'}
                onClick={() => ctx.send({ action: 'endCommand' })}
              >
                {t('play.endCommand')}
              </button>
              <button
                style={{ minHeight: 44, fontSize: '0.875rem', marginLeft: 'auto' }}
                onClick={() => setPaused(true)}
              >
                {t('play.pause')}
              </button>
              {ctx.frameInfo ? (
                <span style={{ fontSize: '0.8125rem', color: '#B03A2E' }}>
                  {ctx.frameInfo.label}
                </span>
              ) : null}
              {/* Rejections render in the command bar, through the catalogue (P2.5 selection). */}
            </div>
          )}
        />
        {paused ? (
          <PauseSheet
            onResume={() => setPaused(false)}
            onQuit={quitToTitle}
            onSettings={() => {
              setPaused(false);
              setScreen({ name: 'settings', from: 'play' });
            }}
            onHelp={() => {
              setPaused(false);
              setScreen({ name: 'help', from: 'play', section: null });
            }}
          />
        ) : null}
      </div>
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
