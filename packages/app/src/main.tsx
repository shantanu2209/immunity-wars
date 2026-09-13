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
  CrashScreen,
  DifficultyScreen,
  ErrorBoundary,
  HelpScreen,
  LibraryScreen,
  NavHost,
  PauseSheet,
  PlayScreen,
  ResultScreen,
  SaveFailedNotice,
  SettingsScreen,
  TitleScreen,
  t,
  turnLine,
  useNav,
  useNavLayerWith,
  type ArtMetrics,
  type CrashCase,
  type HelpSectionKey,
  type LibraryView,
  type SaveSummary,
} from '@immunity-wars/ui';
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
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
import { clearHints, readHints, writeHints } from './hints';
import { startServiceWorker } from './serviceWorker';

const SAVE_ID = 'autosave';
const storage = new IndexedDbStorage();
// The preference store is read once, synchronously, before the first render (settings.ts says
// why); a write that fails keeps the in-memory value for the session. The text size is applied
// to the root here, before the first paint, so the first frame is already at the chosen size.
const prefStore = browserStore();
const initialSettings = readSettings(prefStore);
/** FIRST-ENCOUNTER HINTS: its own key, never a field on the settings object. `hints.ts` says why
 *  (adding one would reset every player's text size). Read once, like the settings. */
const initialHintsSeen = readHints(prefStore).seen;
applyTextSize(initialSettings.textSize);

type Screen =
  | { name: 'title' }
  | { name: 'difficulty' }
  | { name: 'play' }
  | { name: 'result'; finalView: ViewState; difficulty: string }
  /** Settings. Opened over a paused game, the game stays mounted underneath (hidden), so nothing
   *  about the session, the selection or a queued dialog is disturbed. Where closing returns to is
   *  the navigation stack's, not this type's (docs/for-P2.7.md §9, ruling 9): the screen used to
   *  carry a one-hop `from`, which is why a page two levels down closed straight to the title. */
  | { name: 'settings' }
  /** How to play: the index (section null) or one section. */
  | { name: 'help'; section: HelpSectionKey | null }
  /** The disease library: its index, a card over it, or the why section. Its door is the
   *  Title (APP_FLOW; ruled 8 September 2026); from play it is reached only by a Help link. */
  | { name: 'library'; view: LibraryView }
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

/** The screens the floating close says Close on returning to, rather than Back (ruling 9). */
const isMainScreen = (s: Screen): boolean =>
  s.name === 'title' || s.name === 'play' || s.name === 'result';

function App({ onPlayingChange }: { onPlayingChange: (playing: boolean) => void }): ReactElement {
  // THE NAVIGATION STACK (docs/for-P2.7.md §9 ruling 9, §10 piece 1): every close returns to the
  // level it came from. The shell pushes and resets screens; layers register themselves.
  const nav = useNav<Screen>({ name: 'title' }, isMainScreen);
  const screen = nav.screen;
  const navLayers = useMemo(
    () => ({ openLayer: nav.openLayer, closeLayer: nav.closeLayer }),
    [nav.openLayer, nav.closeLayer],
  );
  const [save, setSave] = useState<SaveSummary | null>(null);
  const [paused, setPaused] = useState(false);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const saveSettings = (s: Settings): void => {
    setSettings(s);
    applyTextSize(s.textSize);
    writeSettings(prefStore, s);
  };
  const [artMetrics, setArtMetrics] = useState<ArtMetrics | undefined>(undefined);
  // Whether a game is under way, reported up so the crash screen can tell case A from case B.
  // A ref in the parent rather than state here: this must survive the tree that threw.
  useEffect(() => {
    onPlayingChange(sessionRef.current !== null);
  });
  /** The session said an autosave failed. Shown once and dismissable; see SaveFailedNotice. */
  const [saveFailed, setSaveFailed] = useState(false);
  const [hintsSeen, setHintsSeen] = useState<readonly string[]>(initialHintsSeen);
  const rememberHints = (seen: readonly string[]): void => {
    setHintsSeen(seen);
    writeHints(prefStore, seen);
  };
  const resetHints = (): void => {
    clearHints(prefStore);
    setHintsSeen([]);
  };
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

  /**
   * THE SHELL LISTENS FOR THE NOTICE, not PlayScreen, because the warning outlives any one
   * screen: a player who opens Settings after it appears has not stopped being unable to save.
   * The subscription is never unsubscribed by hand — `dispose()` clears every listener.
   */
  const watchForSaveFailure = (session: LocalSession): LocalSession => {
    session.subscribe((e) => {
      if (e.kind === 'notice' && e.notice === 'save-failed') setSaveFailed(true);
    });
    return session;
  };

  const startNew = (difficulty: string): void => {
    difficultyRef.current = difficulty;
    sessionRef.current = watchForSaveFailure(
      LocalSession.createGame({ difficulty }, { storage, saveId: SAVE_ID }),
    );
    setPaused(false);
    nav.reset({ name: 'play' });
  };

  const continueSave = (): void => {
    void storage.get(SAVE_ID).then((s) => {
      if (!s) {
        refreshSave();
        return;
      }
      const st = s.state as Record<string, unknown>;
      difficultyRef.current = String(st['difficulty'] ?? 'training');
      sessionRef.current = watchForSaveFailure(
        LocalSession.resume(s.state, { storage, saveId: SAVE_ID }),
      );
      setPaused(false);
      nav.reset({ name: 'play' });
    });
  };

  const quitToTitle = (): void => {
    // Quit KEEPS the save (APP_FLOW ruling 4) — the session is simply dropped.
    sessionRef.current = null;
    setPaused(false);
    refreshSave();
    nav.reset({ name: 'title' });
  };

  const onGameEnd = (finalView: ViewState): void => {
    // RESULT is the one place the autosave is deleted: Continue never offers a finished game.
    void storage.delete(SAVE_ID).catch(() => undefined);
    sessionRef.current = null;
    setSave(null);
    nav.reset({ name: 'result', finalView, difficulty: difficultyRef.current });
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

  const settingsScreen = (overPlay: boolean): ReactElement => (
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
      deleteSaveBlock={overPlay ? 'inPlay' : save ? null : 'none'}
      hintsSeenAny={hintsSeen.length > 0}
      onResetHints={resetHints}
      onDeleteSave={deleteSave}
    />
  );

  const helpScreen = (section: HelpSectionKey | null): ReactElement => (
    <HelpScreen
      section={section}
      onOpen={(s) => nav.push({ name: 'help', section: s })}
      onNext={(s) => nav.replace({ name: 'help', section: s })}
      onWhy={(entry) => nav.push({ name: 'library', view: { kind: 'why', entry } })}
    />
  );

  const libraryScreen = (view: LibraryView): ReactElement => (
    <LibraryScreen
      view={view}
      onView={(v) => nav.push({ name: 'library', view: v })}
      onHelp={(section) => nav.push({ name: 'help', section })}
    />
  );

  /** A game sits under the current screen: Settings, Help or the library opened over it. */
  const underPlay = nav.stack.entries.some((e) => e.kind === 'screen' && e.screen.name === 'play');

  // THE PAUSE MENU is a layer on the stack. The back gesture at the bottom of Play opens it
  // (APP_FLOW ruling 1), and Settings or How to play opened from it close back to it (ruling 9).
  useNavLayerWith(navLayers, 'pause', paused, () => setPaused(false));

  const renderScreen = (): ReactElement => {
    if (!underPlay && screen.name === 'settings') return settingsScreen(false);
    if (!underPlay && screen.name === 'library') return libraryScreen(screen.view);
    if (!underPlay && screen.name === 'help') return helpScreen(screen.section);
    if (screen.name === 'about') return <AboutScreen />;

    if (screen.name === 'title') {
      return (
        <>
          {saveFailed ? <SaveFailedNotice onDismiss={() => setSaveFailed(false)} /> : null}
          <TitleScreen
            save={save}
            onContinue={continueSave}
            onNewGame={() => nav.push({ name: 'difficulty' })}
            onSettings={() => nav.push({ name: 'settings' })}
            onHelp={() => nav.push({ name: 'help', section: null })}
            onLibrary={() => nav.push({ name: 'library', view: { kind: 'index' } })}
            onAbout={() => nav.push({ name: 'about' })}
          />
        </>
      );
    }

    if (screen.name === 'difficulty') {
      return <DifficultyScreen hasSave={save !== null} onStart={startNew} />;
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
          onChangeDifficulty={() => nav.push({ name: 'difficulty' })}
          onTitle={quitToTitle}
        />
      );
    }

    const session = sessionRef.current;
    if (!session) {
      // A play screen with no session is unreachable by the machine; recover to title.
      return (
        <>
          {saveFailed ? <SaveFailedNotice onDismiss={() => setSaveFailed(false)} /> : null}
          <TitleScreen
            save={save}
            onContinue={continueSave}
            onNewGame={() => nav.push({ name: 'difficulty' })}
            onSettings={() => nav.push({ name: 'settings' })}
            onHelp={() => nav.push({ name: 'help', section: null })}
            onLibrary={() => nav.push({ name: 'library', view: { kind: 'index' } })}
            onAbout={() => nav.push({ name: 'about' })}
          />
        </>
      );
    }

    // Settings or Help over the paused game: the game stays mounted underneath, hidden.
    const overPlay =
      screen.name === 'settings' || screen.name === 'help' || screen.name === 'library';
    return (
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        {saveFailed ? <SaveFailedNotice onDismiss={() => setSaveFailed(false)} /> : null}
        {screen.name === 'settings' ? settingsScreen(true) : null}
        {screen.name === 'help' ? helpScreen(screen.section) : null}
        {screen.name === 'library' ? libraryScreen(screen.view) : null}
        <div hidden={overPlay}>
          <PlayScreen
            session={session}
            artMetrics={artMetrics}
            hintsSeen={hintsSeen}
            onHintsSeen={rememberHints}
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
                  {turnLine(ctx.game)} {t('commandBar.ap')} {String(ctx.game['ap'])}{' '}
                  {t('play.deck')} {String(ctx.game['deckCount'])}
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
              onQuit={quitToTitle}
              // The menu stays open under what it opens, so closing that returns to the menu
              // (ruling 9). It used to close itself first, which is why Back landed on the game.
              onSettings={() => nav.push({ name: 'settings' })}
              onHelp={() => nav.push({ name: 'help', section: null })}
            />
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <NavHost nav={nav} baseGuard={(s) => s.name === 'play'} onBaseBack={() => setPaused(true)}>
      {renderScreen()}
    </NavHost>
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

/**
 * THE ROOT, WRAPPED (docs/for-P2.6-errors.md, ruled 8 September 2026).
 *
 * `AppRoot` exists only to hold the crash state, because `App` is what may have thrown and its
 * state is not to be trusted afterwards.
 *
 * **It reads the autosave and never writes it** (ruling 2). The read decides which of the four
 * cases the player is in; the write that a "helpful" crash screen would do is what turns a
 * recoverable crash into lost progress, so no code path from here reaches `storage.put`.
 *
 * **Every exit reloads** (ruling 1). `location.reload()` for Continue, because a reload resumes
 * from the autosave, which is current; `location.href` with a fresh load for the others. A tree
 * that threw is undefined and there is nothing here worth preserving.
 */
function AppRoot(): ReactElement {
  const [which, setWhich] = useState<CrashCase | null>(null);
  const [turn, setTurn] = useState<number | null>(null);
  const playingRef = useRef(false);

  const onCrash = (): void => {
    // A READ, never a write. If it throws or the record is unreadable, say so rather than
    // guessing: an unreadable save is its own case and gets its own wording.
    storage
      .get(SAVE_ID)
      .then((s) => {
        if (!s) {
          setWhich('none');
          return;
        }
        const st = s.state as Record<string, unknown>;
        const t = Number(st['turn'] ?? 0);
        if (!Number.isFinite(t)) {
          setWhich('unreadable');
          return;
        }
        setTurn(t);
        setWhich(playingRef.current ? 'playing' : 'safe');
      })
      .catch(() => setWhich('unreadable'));
  };

  return (
    <ErrorBoundary
      onCrash={onCrash}
      render={(detail) => (
        <CrashScreen
          which={which ?? 'safe'}
          turn={turn}
          detail={`${detail.source}: ${detail.message}
${detail.stack}`}
          onContinue={() => window.location.reload()}
          onTitle={() => window.location.reload()}
          onNewGame={() => window.location.reload()}
        />
      )}
    >
      <App onPlayingChange={(p) => (playingRef.current = p)} />
    </ErrorBoundary>
  );
}

const el = document.getElementById('app');
if (el) {
  createRoot(el).render(<AppRoot />);
}
// Offline capability, registered after load; a refusal is caught inside and leaves the app
// running online (FINDINGS #69). Never under the dev server.
startServiceWorker(import.meta.env.PROD);
