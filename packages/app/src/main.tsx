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
import { LESSON, ORGANS } from '@immunity-wars/content';
import {
  LocalSession,
  IndexedDbStorage,
  RelayError,
  RelayRoom,
  asPlayerRef,
  seededDice,
  type RelaySession,
} from '@immunity-wars/session';
import type { PlayerRef, ViewState } from '@immunity-wars/session';
import {
  AboutScreen,
  ConnectionLost,
  CrashScreen,
  DifficultyScreen,
  ErrorBoundary,
  HelpScreen,
  LibraryScreen,
  LobbyScreen,
  NavHost,
  logLinesOf,
  PauseSheet,
  PlayScreen,
  ResultScreen,
  SaveFailedNotice,
  SettingsScreen,
  TitleScreen,
  TogetherScreen,
  entryRefusal,
  refusalFromClose,
  t,
  MenuIcon,
  useNav,
  useNavLayerWith,
  type CrashCase,
  type HelpSectionKey,
  type LibraryView,
  type LobbyRoom,
  type SaveSummary,
} from '@immunity-wars/ui';
import { KitButton, kitAudio } from '@immunity-wars/ui/kit';
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

import {
  LOCALES,
  SOUND_SETTINGS,
  TEXT_SIZES,
  applySound,
  applyTextSize,
  browserStore,
  readSettings,
  writeSettings,
  type Locale,
  type Settings,
  type SoundSetting,
  type TextSize,
} from './settings';
import { clearRejoin, readRejoin, writeRejoin, type RejoinRecord } from './rejoin';
import { readPlayed, writePlayed } from './played';
import {
  browserUpdates,
  lookForNewer,
  startServiceWorker,
  takeWaitingVersion,
  updateNow,
  whenNewerWaits,
} from './serviceWorker';

const SAVE_ID = 'autosave';
const storage = new IndexedDbStorage();
/**
 * WHERE THE RELAY IS (P3.5): the deployed one, unless a build names another. A development relay is
 * `ws://127.0.0.1:8787`, named with `VITE_RELAY_URL` when the dev server is started.
 */
const RELAY_URL = import.meta.env.VITE_RELAY_URL ?? 'wss://immunity-wars.kartikchaudhary.com/relay';

/** Why something to do with a room was refused, as the relay's code and, for some, a name. */
interface Refusal {
  code: string;
  detail?: string;
}

/**
 * UPDATE NOW (FINDINGS #93): take the newer version this phone has downloaded, or is downloading, and
 * reload into it. Offered by the screens under a version refusal only.
 */
const update = (): void => {
  void updateNow(browserUpdates(), () => window.location.reload());
};

const refusalOfEntry = (e: unknown): Refusal => ({
  code: e instanceof RelayError ? entryRefusal(e.code, e.closeCode) : 'unreachable',
});
// The preference store is read once, synchronously, before the first render (settings.ts says
// why); a write that fails keeps the in-memory value for the session. The text size is applied
// to the root here, before the first paint, so the first frame is already at the chosen size.
const prefStore = browserStore();
const initialSettings = readSettings(prefStore);
const initialPlayed = readPlayed(prefStore).played;
applyTextSize(initialSettings.textSize);
applySound(initialSettings.sound, kitAudio);

type Screen =
  | { name: 'title' }
  | { name: 'difficulty' }
  | { name: 'play' }
  /** `together`: the game was played together, and the Result offers another game together. */
  | { name: 'result'; finalView: ViewState; difficulty: string; together: boolean }
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
  | { name: 'about' }
  /** Play together (P3.7 piece A): a name, then create a room or join one by its code. */
  | { name: 'together'; rejoin: boolean }
  /** The room before its game starts. A base, like Play, and the back gesture there does nothing:
   *  leaving a room is a decision made with its own button, never a gesture made by accident. */
  | { name: 'lobby' };

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

function App({
  onPlayingChange,
}: {
  onPlayingChange: (playing: boolean, together: boolean) => void;
}): ReactElement {
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
    applySound(s.sound, kitAudio);
    writeSettings(prefStore, s);
  };
  // Whether a game is under way, reported up so the crash screen can tell case A from case B.
  // A ref in the parent rather than state here: this must survive the tree that threw.
  useEffect(() => {
    onPlayingChange(sessionRef.current !== null, roomRef.current !== null);
  });
  /** The session said an autosave failed. Shown once and dismissable; see SaveFailedNotice. */
  const [saveFailed, setSaveFailed] = useState(false);
  // Whether this device has ever finished a game or the guided game's lesson: the title's offer of
  // the guided game and the difficulty screen's recommendation both ask it.
  const [played, setPlayed] = useState(initialPlayed);
  /**
   * One id per game, so a new game is a new play screen. Without it the screen is reused and its
   * per-game memory — the view it last saw, where a guided game's player had got to — carries into
   * the next game (§21).
   */
  const [gameId, setGameId] = useState(0);
  const sessionRef = useRef<LocalSession | RelaySession | null>(null);
  const difficultyRef = useRef<string>('training');

  /**
   * PLAYING TOGETHER (P3.7 piece A). The room, and what is needed to come back to it, live in
   * memory only: the name is typed every time (ruling 2), so nothing about a room outlives the page.
   * `roomRef` is the room this shell is listening to; a room it has let go of is ignored, so its
   * closing is never shown as a lost connection.
   */
  const roomRef = useRef<RelayRoom | null>(null);
  const entryRef = useRef<{ name: string; code: string; self: PlayerRef } | null>(null);
  const [entering, setEntering] = useState<{ busy: boolean; refusal: Refusal | null }>({
    busy: false,
    refusal: null,
  });
  /** Each attempt to enter a room is numbered, so one that finishes after the player gave up on it
   *  (closed the screen, or tried again) is closed rather than taking them into a room. */
  const attemptRef = useRef(0);
  const screenRef = useRef<Screen>(nav.screen);
  screenRef.current = nav.screen;
  const [lobby, setLobby] = useState<{ room: LobbyRoom; me: number } | null>(null);
  const [lobbyRefusal, setLobbyRefusal] = useState<Refusal | null>(null);
  const [connectionLost, setConnectionLost] = useState(false);
  /**
   * THE TABLE'S FIXED MESSAGES said in this room so far (protocol v3), kept here and not by the play
   * screen so a reconnect, which gives the game a new screen, does not lose them. In memory only,
   * and gone with the room.
   */
  const [tableSaid, setTableSaid] = useState<{ at: number; from: number; message: string }[]>([]);
  const reconnectingRef = useRef(false);
  const [reconnecting, setReconnecting] = useState(false);
  /** THE ROOM THIS DEVICE WAS IN (piece C, ruling (a)): offered on the Title after the app closed. */
  const [rejoin, setRejoin] = useState<RejoinRecord | null>(() =>
    readRejoin(prefStore, Date.now()),
  );
  const forgetRoom = (): void => {
    clearRejoin(prefStore);
    setRejoin(null);
  };

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

  // THE TITLE TAKES A NEWER VERSION (FINDINGS #93, ruled 30 September 2026): whenever one has finished
  // downloading, whether before the title appeared or while it shows. On the title ONLY: a reload in a
  // game would drop a game played together, so a newer version waits for the player to come back here.
  const onTitle = screen.name === 'title';
  useEffect(() => {
    if (!onTitle) return undefined;
    const container = browserUpdates();
    const take = (): void => {
      void takeWaitingVersion(container, () => window.location.reload());
    };
    take();
    return whenNewerWaits(container, take);
  }, [onTitle]);

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
    setGameId((n) => n + 1);
    sessionRef.current = watchForSaveFailure(
      LocalSession.createGame({ difficulty }, { storage, saveId: SAVE_ID }),
    );
    setPaused(false);
    nav.reset({ name: 'play' });
  };

  /**
   * THE GUIDED GAME (stage L6, `docs/LOOK_PLAN.md` §18 and §19): an Easy game handed the lesson's
   * turns and its dice. While the rails last nothing is saved, so a lesson that is left starts
   * again; when they end, the game is the player's own and is saved like any other.
   */
  const [guided, setGuided] = useState(false);
  const startGuided = (): void => {
    difficultyRef.current = LESSON.difficulty;
    setGameId((n) => n + 1);
    sessionRef.current = watchForSaveFailure(
      LocalSession.createGame(
        { difficulty: LESSON.difficulty, written: LESSON.turns.map((turn) => turn.arrive) },
        { storage, saveId: SAVE_ID, rails: { dice: seededDice(LESSON.seed) } },
      ),
    );
    setGuided(true);
    setPaused(false);
    nav.reset({ name: 'play' });
  };
  const endGuide = (how: 'finished' | 'left' | 'parted'): void => {
    setGuided(false);
    if (how === 'left') {
      // Nothing of a lesson is saved, so leaving it is dropping it.
      quitToTitle();
      return;
    }
    // Finished, or the game went its own way: either way it is the player's own from here.
    const s = sessionRef.current;
    if (s instanceof LocalSession) void s.endRails().then(refreshSave);
    if (how === 'finished') {
      // The lesson has been played to its end on this phone: the title offers a new game first.
      writePlayed(prefStore);
      setPlayed(true);
    }
  };

  const continueSave = (): void => {
    setGameId((n) => n + 1);
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

  /** Lets go of the room: the connection closes and the member is AWAY, not gone (ruling 4). */
  const dropRoom = (): void => {
    const room = roomRef.current;
    roomRef.current = null;
    room?.close();
    setLobby(null);
    setLobbyRefusal(null);
    setConnectionLost(false);
    setTableSaid([]);
  };

  /** In a room: its lobby now, and its game the moment the captain starts it. */
  const attach = (room: RelayRoom, name: string): void => {
    // Back in the same room (a reconnect or a rejoin) keeps what was said; another room starts afresh.
    if (entryRef.current?.code !== room.code) setTableSaid([]);
    roomRef.current = room;
    entryRef.current = { name, code: room.code, self: room.self };
    // Kept on the device while the player is in the room, so a phone that closes the app does not
    // cost them their place (ruling (a)); `rejoin.ts` says what is kept and for how long.
    writeRejoin(prefStore, room.code, room.self, Date.now());
    setRejoin(readRejoin(prefStore, Date.now()));
    setEntering({ busy: false, refusal: null });
    setLobbyRefusal(null);
    setConnectionLost(false);
    if (room.room) setLobby({ room: room.room, me: room.id });
    room.subscribe((e) => {
      if (roomRef.current !== room) return;
      if (e.kind === 'room') {
        setLobby({ room: e.room, me: room.id });
        // ANOTHER GAME IN THE SAME ROOM (v5): the captain has taken the room back to its lobby, so
        // everyone still on the Result goes there, and the next game will follow as the first did.
        if (e.room.phase === 'lobby' && screenRef.current.name === 'result') {
          awaitGame(room);
          nav.reset({ name: 'lobby' });
        }
      } else if (e.kind === 'said')
        setTableSaid((l) => [...l, { at: Date.now(), from: e.from, message: e.message }]);
      else if (e.kind === 'refused')
        setLobbyRefusal(
          e.detail === undefined ? { code: e.code } : { code: e.code, detail: e.detail },
        );
      else {
        // The lobby says the connection was lost; a close with a reason of its own (another
        // screen took this place, or the versions differ) says that reason as well.
        setConnectionLost(true);
        const why = refusalFromClose(e.code);
        setLobbyRefusal(why === 'closed' ? null : { code: why });
      }
    });
    awaitGame(room);
    // A game under way is the play screen's, which follows as soon as the board arrives; showing
    // the lobby first would flash a room that has already started.
    if (room.room?.phase !== 'playing') nav.reset({ name: 'lobby' });
  };

  /** The room's game, the moment its first view arrives; after a rematch (v5), the next one's. */
  const awaitGame = (room: RelayRoom): void => {
    void room.session().then((s) => {
      if (roomRef.current !== room) return;
      difficultyRef.current = String(s.getView().game['difficulty'] ?? 'training');
      setGameId((n) => n + 1);
      sessionRef.current = s;
      setPaused(false);
      nav.reset({ name: 'play' });
    });
  };

  /** Refusals that mean the room is gone, or has no place for this player: forget it. */
  const goneFor = (refusal: Refusal): boolean =>
    refusal.code === 'noSuchRoom' || refusal.code === 'gameEnded' || refusal.code === 'lobbyClosed';

  const enter = (name: string, attempt: () => Promise<RelayRoom>, rejoining = false): void => {
    const n = (attemptRef.current += 1);
    setEntering({ busy: true, refusal: null });
    attempt().then(
      (room) => {
        if (n !== attemptRef.current || screenRef.current.name !== 'together') {
          room.close();
          return;
        }
        attach(room, name);
      },
      (e: unknown) => {
        const refusal = refusalOfEntry(e);
        if (rejoining && goneFor(refusal)) forgetRoom();
        if (n === attemptRef.current) setEntering({ busy: false, refusal });
      },
    );
  };

  /** RECONNECT IS A CHOICE (ruling 4): nothing rejoins by itself. The same code and the same
   *  `self` bring the member back, with any seats still theirs. */
  const reconnect = (): void => {
    const e = entryRef.current;
    if (!e || reconnectingRef.current) return;
    reconnectingRef.current = true;
    setReconnecting(true);
    setLobbyRefusal(null);
    RelayRoom.join({ url: RELAY_URL, code: e.code, name: e.name, self: e.self })
      .then(
        (room) => attach(room, e.name),
        (err: unknown) => {
          const refusal = refusalOfEntry(err);
          if (goneFor(refusal)) forgetRoom();
          setLobbyRefusal(refusal);
        },
      )
      .finally(() => {
        reconnectingRef.current = false;
        setReconnecting(false);
      });
  };

  /** LEAVING GIVES THE SEATS BACK: the message goes first, then the connection closes. */
  const leaveRoom = (): void => {
    const room = roomRef.current;
    roomRef.current = null;
    entryRef.current = null;
    forgetRoom();
    if (room) void room.leave().then(() => room.close());
    dropRoom();
    nav.reset({ name: 'title' });
  };

  /** From the Result of a game played together: leaves the room, then goes to Play together. */
  const leaveThenTogether = (): void => {
    const room = roomRef.current;
    roomRef.current = null;
    entryRef.current = null;
    if (room) void room.leave().then(() => room.close());
    dropRoom();
    openTogether();
  };

  /** Does something to the room, clearing the last refusal, which was about something else. */
  const inRoom = (f: (room: RelayRoom) => void): void => {
    setLobbyRefusal(null);
    if (roomRef.current) f(roomRef.current);
  };

  const quitToTitle = (): void => {
    // Quit KEEPS the save (APP_FLOW ruling 4) — the session is simply dropped. A game played
    // together is closed, not left: the player is away and their seats wait for them.
    sessionRef.current = null;
    dropRoom();
    setPaused(false);
    refreshSave();
    nav.reset({ name: 'title' });
  };

  const onGameEnd = (finalView: ViewState): void => {
    // A FIRST GAME IS ONE YOU HAVE FINISHED (§21). Written here rather than at the start, so a
    // player who quits mid-game and comes back is still offered the guided game on the title.
    // Losing counts: Gate 1 says a loss is finishing.
    writePlayed(prefStore);
    setPlayed(true);
    // RESULT is the one place the autosave is deleted: Continue never offers a finished game. A game
    // played together never wrote it, so its end must not delete the single-player game it holds.
    const together = roomRef.current !== null;
    if (!together) {
      void storage.delete(SAVE_ID).catch(() => undefined);
      setSave(null);
    } else {
      // The game is over, so there is nothing to come back to after the app closes. The room itself
      // stays open while the player is on the Result, so the captain can start another game in it
      // (v5); Back to the title or Play together again leaves it.
      forgetRoom();
    }
    if (!together) dropRoom();
    sessionRef.current = null;
    nav.reset({ name: 'result', finalView, difficulty: difficultyRef.current, together });
  };

  /**
   * LEAVING A GAME PLAYED TOGETHER (piece D), from the pause menu: the seats go back to the table and
   * the room is forgotten on this device. Not the same as Back to the title, which closes the game
   * and keeps the player's place (piece C).
   */
  const leaveGame = (): void => {
    sessionRef.current = null;
    setPaused(false);
    leaveRoom();
    refreshSave();
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
      sound={settings.sound}
      sounds={SOUND_SETTINGS}
      onChoose={(row, v) =>
        saveSettings(
          row === 'textSize'
            ? { ...settings, textSize: v as TextSize }
            : row === 'sound'
              ? { ...settings, sound: v as SoundSetting }
              : { ...settings, language: v as Locale },
        )
      }
      deleteSaveBlock={overPlay ? 'inPlay' : save ? null : 'none'}
      // THE GUIDED GAME, to be played again: not from inside a game.
      guide={{
        block: overPlay ? 'inPlay' : null,
        replacesSave: save !== null,
        onStart: startGuided,
      }}
      onDeleteSave={deleteSave}
    />
  );

  const helpScreen = (section: HelpSectionKey | null): ReactElement => (
    <HelpScreen
      section={section}
      onOpen={(s) => nav.push({ name: 'help', section: s })}
      onNext={(s) => nav.replace({ name: 'help', section: s })}
      onWhy={(entry) => nav.push({ name: 'library', view: { kind: 'why', entry } })}
      onLibrary={() => nav.push({ name: 'library', view: { kind: 'index' } })}
    />
  );

  const libraryScreen = (view: LibraryView): ReactElement => (
    <LibraryScreen
      view={view}
      onView={(v) => nav.push({ name: 'library', view: v })}
      onHelp={(section) => nav.push({ name: 'help', section })}
    />
  );

  /** Play together, fresh: no refusal left over from an earlier try. */
  const openTogether = (): void => {
    attemptRef.current += 1;
    setEntering({ busy: false, refusal: null });
    nav.push({ name: 'together', rejoin: false });
  };

  /** Back to the room this device was in, the name typed again (piece C, rulings (a) and 2). */
  const openRejoin = (): void => {
    attemptRef.current += 1;
    setEntering({ busy: false, refusal: null });
    nav.push({ name: 'together', rejoin: true });
  };

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
            onLearn={played ? null : startGuided}
            onTogether={openTogether}
            rejoin={roomRef.current === null && rejoin !== null ? { code: rejoin.code } : null}
            onRejoin={openRejoin}
            onSettings={() => nav.push({ name: 'settings' })}
            onHelp={() => nav.push({ name: 'help', section: null })}
            onAbout={() => nav.push({ name: 'about' })}
          />
        </>
      );
    }

    if (screen.name === 'difficulty') {
      return <DifficultyScreen hasSave={save !== null} firstGame={!played} onStart={startNew} />;
    }

    if (screen.name === 'together') {
      return (
        <TogetherScreen
          busy={entering.busy}
          refusal={entering.refusal}
          onCreate={(name) => enter(name, () => RelayRoom.create({ url: RELAY_URL, name }))}
          rejoinCode={screen.rejoin && rejoin !== null ? rejoin.code : null}
          onUpdate={update}
          onJoin={(name, code) => {
            if (screen.rejoin && rejoin !== null) {
              const self = asPlayerRef(rejoin.self);
              enter(name, () => RelayRoom.join({ url: RELAY_URL, code, name, self }), true);
            } else enter(name, () => RelayRoom.join({ url: RELAY_URL, code, name }));
          }}
        />
      );
    }

    if (screen.name === 'lobby' && lobby) {
      const code = lobby.room.code;
      return (
        <LobbyScreen
          room={lobby.room}
          me={lobby.me}
          refusal={lobbyRefusal}
          connectionLost={connectionLost}
          onUpdate={update}
          canShare={typeof navigator.share === 'function'}
          onShare={() => {
            navigator.share({ text: t('lobby.shareText', { code }) }).catch(() => undefined);
          }}
          // The clipboard exists only on a secure page. The installed app always is one; a build
          // opened over the home network by address is not, and Copy then says nothing rather
          // than failing.
          onCopy={() =>
            window.isSecureContext
              ? navigator.clipboard.writeText(code).then(
                  () => true,
                  () => false,
                )
              : Promise.resolve(false)
          }
          onClaim={(seat) => inRoom((r) => r.claimSeat(seat))}
          onRelease={(seat) => inRoom((r) => r.releaseSeat(seat))}
          onStart={(difficulty) => inRoom((r) => r.start(difficulty))}
          onLeave={leaveRoom}
          onReconnect={reconnect}
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
          difficulty={screen.difficulty}
          log={logLinesOf(g)}
          onPlayAgain={() => startNew(screen.difficulty)}
          onChangeDifficulty={() => nav.push({ name: 'difficulty' })}
          onTogether={screen.together ? leaveThenTogether : null}
          // After a game together, the title LEAVES the room, seats and all (ruled 30 September
          // 2026), so a player who has gone is not carried into another game holding pieces.
          onTitle={screen.together ? leaveRoom : quitToTitle}
          rematch={
            screen.together && lobby !== null && !connectionLost && lobby.room.phase === 'ended'
              ? {
                  mine: lobby.room.captain === lobby.me,
                  onRematch: () => inRoom((room) => room.rematch()),
                }
              : null
          }
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
            onTogether={openTogether}
            rejoin={roomRef.current === null && rejoin !== null ? { code: rejoin.code } : null}
            onRejoin={openRejoin}
            onSettings={() => nav.push({ name: 'settings' })}
            onHelp={() => nav.push({ name: 'help', section: null })}
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
            key={gameId}
            session={session}
            // THE GUIDED GAME: the lesson this game is. Not while the menu is up: the menu is the
            // player's, and the light would stand between them and it.
            guide={guided && !paused ? { lesson: LESSON, onEnd: endGuide } : null}
            // A GAME PLAYED TOGETHER: the room as the relay last described it, and who this is.
            table={roomRef.current !== null && lobby !== null ? lobby : null}
            // THE CAPTAIN HANDS A WAITING PIECE ON (piece C, ruling 4); the room says no if it may not.
            onAssignSeat={(seat, to) => inRoom((r) => r.assignSeat(seat, to))}
            tableRefusal={connectionLost ? null : lobbyRefusal}
            // THE TABLE'S FIXED MESSAGES (protocol v3): what has been said, and saying one.
            tableSaid={tableSaid}
            onSay={roomRef.current !== null ? (m) => roomRef.current?.say(m) : null}
            onGameEnd={onGameEnd}
            renderControls={() => (
              // THE MENU, an icon at the right of the play screen's top bar (piece 5 of the play
              // screen, for-P2.7.md §19): the turn and the AP are the bar's own now, and the deck's
              // count left it.
              // Drawn in Clay since stage L4, like the bar it sits in: the kit's resting button.
              <KitButton
                data-menu=""
                aria-label={t('play.pause')}
                onPress={() => setPaused(true)}
                style={{ width: 44, minHeight: 44, padding: 0, flex: '0 0 auto' }}
              >
                <MenuIcon />
              </KitButton>
            )}
          />
          {paused ? (
            <PauseSheet
              onResume={() => setPaused(false)}
              onQuit={quitToTitle}
              onLeave={roomRef.current !== null ? leaveGame : null}
              // The menu stays open under what it opens, so closing that returns to the menu
              // (ruling 9). It used to close itself first, which is why Back landed on the game.
              onSettings={() => nav.push({ name: 'settings' })}
              onHelp={() => nav.push({ name: 'help', section: null })}
            />
          ) : null}
        </div>
        {connectionLost && roomRef.current !== null ? (
          // THIS PLAYER'S CONNECTION IS LOST (piece C): shown at once, and nothing rejoins by itself
          // (ruling 4). Back to the title closes the game without leaving it; the title offers it again.
          <ConnectionLost
            reconnecting={reconnecting}
            refusal={lobbyRefusal}
            onReconnect={reconnect}
            onTitle={quitToTitle}
            onUpdate={update}
          />
        ) : null}
      </div>
    );
  };

  return (
    <NavHost
      nav={nav}
      baseGuard={(s) => s.name === 'play' || s.name === 'lobby'}
      onBaseBack={() => {
        if (screen.name === 'play') setPaused(true);
      }}
    >
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
  const togetherRef = useRef(false);

  const onCrash = (): void => {
    // A GAME PLAYED TOGETHER has no save on this device: the relay holds it and it goes on. The
    // single-player autosave is not the player's concern here, so it is not read (piece D).
    if (togetherRef.current) {
      setWhich('together');
      return;
    }
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
      <App
        onPlayingChange={(p, together) => {
          playingRef.current = p;
          togetherRef.current = together;
        }}
      />
    </ErrorBoundary>
  );
}

const el = document.getElementById('app');
if (el) {
  createRoot(el).render(<AppRoot />);
}
// Offline capability, registered after load; a refusal is caught inside and leaves the app
// running online (FINDINGS #69). Never under the dev server.
//
// AND NEVER IN THE ANDROID SHELL (`vite build --mode android`): every file is in the app there, so
// there is nothing for a worker to store, and that build writes none to register. Written as a
// comparison the build can decide, so that in the shell's build the call is not there at all:
// src/shell-build.test.ts reads the built scripts for it.
if (import.meta.env.MODE !== 'android') {
  startServiceWorker(import.meta.env.PROD);
  // AND IT LOOKS FOR A NEWER VERSION ITSELF (FINDINGS #126): when it starts, when it comes back to
  // the screen, and every half hour. The title takes what it finds; nothing here reloads.
  if (import.meta.env.PROD) lookForNewer(browserUpdates(), document);
}
