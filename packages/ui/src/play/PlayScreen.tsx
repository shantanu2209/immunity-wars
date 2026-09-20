/**
 * The Play surface — THE COMPONENT BOTH SHELLS MOUNT (docs/APP_FLOW.md ruling 6).
 *
 * The app shell mounts it inside the screen machine with its top row (the turn line and Menu);
 * the dev shell mounts it with its own instrumented controls, the checks panel and the skip
 * toggle. Neither shell has a Draw button: this screen sends the draw itself (`autoDraw.ts`), and
 * the turn's next step is the dock's (docs/for-P2.7.md §12, ruled 13 September 2026).
 * Ported from the P2.2 dev shell; the burst machinery keeps its exact shape:
 *
 * - The subscribe listener only queues; the animation loop drains at the RULED pacing
 *   (Shantanu, 30 Aug 2026): 900ms standard / 1400ms dice, with tap-anywhere-to-advance.
 *   For a newcomer the frame headline is information, not confirmation — the tap is what
 *   makes the exact numbers low-stakes. None of the P2.3 budget rows depend on the
 *   inter-frame delay, so nothing was re-run (for-P2.5.md).
 * - ⚠️ Burst frames render under `flushSync`, and that is INSTRUMENTATION, not style
 *   (FINDINGS #48): the busy-time channel's definition depends on it. Do not refactor away.
 * - The tail assertion (burst-tail-authoritative) runs in BOTH shells and reports through
 *   `onCheck` — cheap, and the invariant matters everywhere.
 * - Input is disabled during a burst; control enablement reads only the authoritative view.
 */
import type { SessionView, ViewState } from '@immunity-wars/session';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';

import type { ArtMetrics, BoardTap, BoardTarget, InspectInfo } from '../board/Board';
import {
  Board,
  inspectInfoForCell,
  inspectInfoForInvader,
  inspectInfoForResident,
} from '../board/Board';
import { engineText } from '../engineText';
import {
  CLONE_TARGET,
  MOVE_LIKE,
  bodyOffers,
  diseaseLabel,
  dockRows,
  offeredActions,
  produceOffers,
  type BoardOffer,
  type DockRow,
  type Offered,
} from './offered';
import { shouldDraw } from './autoDraw';
import { EffectsStrip } from '../panels/EffectsStrip';
import { apTermLines, effectBanner, effectChips, rareLogLine, turnShort } from './effects';
import { PieceStrip, type PieceChip } from '../panels/PieceStrip';
import { buildNodeModel } from '../board/Board';
import { BodyPanel, type BodyPanelData } from '../panels/BodyPanel';
import { LogPanel, type LogLine } from '../panels/LogPanel';
import { GRACE_CLEAR, ORGANS } from '@immunity-wars/content';

import { DialogHost, useDialogQueue } from '../dialogs/DialogQueue';
import { FLOAT_RESERVE, useNavLayer, useNavState } from '../nav/NavHost';
import { GoalBody } from '../dialogs/GoalBody';
import { revealCrisis, type RevealArrival, type RevealCrisis } from '../dialogs/RevealBody';
import { t } from '../i18n';
import { AntibodyPanel, type FamilyDetail, type FamilyRow } from '../panels/AntibodyPanel';
import { ApTerms } from '../panels/ApTerms';
import { TargetList } from '../panels/DockSheet';
import { Drawer, type DrawerKind } from '../panels/Drawer';
import { ArrivalsGrid, ArrivalsNotes } from './Arrivals';
import { CoachLine } from '../panels/CoachLine';
import { coachStep } from './coach';
import {
  ActionsView,
  AdvanceButton,
  PlayArea,
  SpreadView,
  TabRow,
  Toast,
  TopBar,
  type MiddleTab,
} from './Frame';
import { InspectSheet } from '../panels/InspectSheet';
import { HintLine } from '../panels/HintLine';
import {
  ANTIBODY_SUBJECT,
  RESIDENT_SUBJECT,
  cellSubject,
  contact,
  dismiss,
  hintKey,
  hintPlace,
  initialHintState,
  invaderSubject,
  type HintState,
  type HintSubject,
} from '../hints/controller';
import { PathogenCard, type PathogenCardSubject } from '../panels/PathogenCard';
import { CellCard, type CellCardSubject } from '../panels/CellCard';
import { unavailableText } from '../panels/InspectSheet';
import { AllocationBlock, PathogenList, PlanningScreen, spentCellsLine } from './PlanningScreen';
import { planningModel } from './planning';
import { invaderNowLine } from '../panels/invaderNow';
import { cellDisplayName, residentDisplayName } from '../names';
import { createFrameStore, useFrame, type FrameStore } from './frameStore';

// Spread pacing — RULED 30 Aug 2026 (for-P2.5.md). Dice frames carry two facts (the roll and
// its outcome), so they hold longer. A tap anywhere advances immediately.
const FRAME_MS = 900;
const DICE_FRAME_MS = 1400;

/**
 * BLOCK E — the organs travel from their anatomical positions to their radial ones when the
 * player taps "Command your cells" (item 12, step 5; built to be measured, cut if the
 * measurement says so). A FLIP flight: the figure's organ icons' screen rectangles are read at
 * the tap, and once the board has committed, seven ghost <img>s are placed at those rectangles
 * and animated — transform only, so the compositor moves them — onto the board's icons, which
 * stay hidden until the ghosts land. The main-thread cost is the rectangle reads and the seven
 * `animate()` calls; the flight itself costs the main thread nothing. Reported through
 * `onTransition` (the dev shell records it into `__iwMetrics.transitions`), measured from the
 * TAP, so the number is the whole command tap's work with the flight included — comparable
 * against the same tap under reduced motion, where the flight is skipped.
 */
const FLIGHT_MS = 450;
const FLIGHT_CSS = '[data-flight] [data-organ-icon]{opacity:0}';
/** The organs that fly: the content pack's keys, the only strings that reach a ghost's src. */
const FLIGHT_ORGANS: readonly string[] = Object.keys(ORGANS);

/** What PlayScreen needs from a session — structural, so RelaySession fits it too. */
export interface PlaySessionLike {
  getView(): SessionView;
  sendAction(action: Record<string, unknown>): Promise<{ ok: boolean; error?: string }>;
  setSelection(selection: {
    cell: string | null;
    family: string | null;
    resident: string | null;
  }): void;
  subscribe(
    listener: (
      ev:
        | { kind: 'view'; view: SessionView }
        | { kind: 'burst'; frames: readonly { view: ViewState; label: string; dice?: unknown }[] }
        // The third arm (8 September 2026). This screen ignores it: the notice is the shell's to
        // show, because it outlives any one screen. Listed so the union stays assignable.
        | { kind: 'notice'; notice: string },
    ) => void,
  ): () => void;
}

export interface PlayControlsCtx {
  game: ViewState;
  phase: string;
  playing: boolean;
  /**
   * The planning screen is showing (item 12): after the draw, before command. Its own bottom
   * button begins command, so a shell may hide its duplicate; the dev shell keeps every
   * button, because tools/perf/measure.ts drives it by button text.
   */
  planning: boolean;
  lastError: string | null;
  frameInfo: { n: number; of: number; label: string } | null;
  send: (action: Record<string, unknown>) => void;
}

export function PlayScreen({
  session,
  artMetrics,
  coach = false,
  skipBursts = false,
  onCheck,
  onFrame,
  onTap,
  onTransition,
  onGameEnd,
  renderControls,
  hintsSeen = [],
  onHintsSeen,
}: {
  session: PlaySessionLike;
  /**
   * FIRST-ENCOUNTER HINTS. The seen set is the shell's to persist — this screen decides WHEN a
   * hint fires and never touches storage, the same division as everywhere else here.
   * Omitting both props turns hints off entirely, which is what the dev shell does.
   */
  hintsSeen?: readonly HintSubject[];
  onHintsSeen?: (seen: readonly HintSubject[]) => void;
  artMetrics?: ArtMetrics;
  /**
   * THE COACH (piece 8, §20): on for a first game only. The shell decides, because whether this
   * device has played before is a preference, and the play screen holds no preferences.
   */
  coach?: boolean;
  /** Ignore bursts, render authoritative views only — the reconnection rehearsal. */
  skipBursts?: boolean;
  /** Tail-assertion and skip reports; both shells receive them, the dev shell displays them. */
  onCheck?: (line: string) => void;
  /** Per-redraw instrumentation hook (the dev shell wires metrics.ts here). */
  onFrame?: (start: number, busy: number, label: string, dice: boolean) => void;
  /** Tap instrumentation hook. */
  onTap?: (from: number, cell: string) => void;
  /** Block e instrumentation: the command tap's main-thread work with the flight prepared, and
   *  how many organs flew (0 when the flight was skipped). */
  onTransition?: (from: number, busyMs: number, organs: number) => void;
  /** Fired once when the authoritative view first shows a finished game. */
  onGameEnd?: (finalView: ViewState) => void;
  /** The shell's turn controls (player buttons, or the dev shell's instrumented ones). */
  renderControls: (ctx: PlayControlsCtx) => ReactNode;
}): ReactElement {
  const [authView, setAuthView] = useState<SessionView>(() => session.getView());
  // THE FRAME IS NOT REACT STATE HERE (the full-UI re-measure, 6 September 2026): it lives in
  // an external store that only the board, the narration, the log and the shell's controls
  // subscribe to, so a spread's frames do not re-render the panels — see `frameStore.ts`.
  // What IS state is whether a burst is playing, which changes twice per burst.
  const [playing, setPlaying] = useState(false);
  const frameStore = useRef<FrameStore>(createFrameStore()).current;
  const [lastError, setLastError] = useState<string | null>(null);
  const [inspect, setInspect] = useState<InspectInfo | null>(null);
  // THE PATHOGEN CARD — a layer above the sheet and the dialogs, opened from either.
  const [card, setCard] = useState<PathogenCardSubject | null>(null);
  // THE CELL CARD (item 12, block c) — the same layer, opened from the planning screen.
  const [cellCard, setCellCard] = useState<CellCardSubject | null>(null);
  // THE LAYERS ON THE NAVIGATION STACK (docs/for-P2.7.md §9, rulings 8 and 9). Each registers
  // while it shows, in the order it opened, so the one floating close and the back gesture reach
  // the top one: a card opened from the inspect sheet closes back to the sheet.
  useNavLayer('inspect', inspect !== null, () => setInspect(null));
  useNavLayer('pathogen-card', card !== null, () => setCard(null));
  useNavLayer('cell-card', cellCard !== null, () => setCellCard(null));
  // THE MIDDLE'S VIEWS (piece 5 of the play screen, docs/for-P2.7.md §19): a row's several targets,
  // the AP terms, everything in force, a tapped node, and the Cells, Antibodies and Body views all
  // open in the middle below the play area, one at a time, each one level on the stack, so the
  // floating close and the back gesture return to the actions. Messages open full height over it.
  const [targetsFor, setTargetsFor] = useState<DockRow | null>(null);
  const [apSheet, setApSheet] = useState(false);
  const [effectsOpen, setEffectsOpen] = useState(false);
  useNavLayer('dock-targets', targetsFor !== null, () => setTargetsFor(null));
  useNavLayer('ap-terms', apSheet, () => setApSheet(false));
  useNavLayer('effects', effectsOpen, () => setEffectsOpen(false));
  const [drawer, setDrawer] = useState<DrawerKind | null>(null);
  useNavLayer('drawer', drawer !== null, () => setDrawer(null));
  // PLANNING'S FILTER: a tap on a place on the figure lists that place's pathogens; a tap anywhere
  // else on the body lists them all (§19).
  const [planFocus, setPlanFocus] = useState<string | null>(null);
  /** Closes whatever view the middle shows, before another opens or the board is tapped. */
  const closeMiddle = (): void => {
    setDrawer((d) => (d === 'log' ? d : null));
    setApSheet(false);
    setTargetsFor(null);
    setEffectsOpen(false);
    setInspect(null);
  };
  // Whether the floating close is showing (the advance button hides under it, §12 ruling 1) and
  // whether anything is open over the game (the draw waits for the player to come back).
  const navState = useNavState();
  // THE TOAST: a greyed button's reason, said over the play area and gone (refusals ride it too).
  const [said, setSaid] = useState<string | null>(null);
  // The coach's own state: the step the player has waved away, and whether they ended it.
  const [coachDone, setCoachDone] = useState<string | null>(null);
  const [coachOff, setCoachOff] = useState(false);

  // THE ARRIVALS STAGE (piece 6, §20): this draw's cards, the turn's event, and what the spread
  // did, shown as a stage of the frame rather than a dialog over it. Null when no draw is waiting
  // to be looked at.
  const [arrivals, setArrivals] = useState<{
    list: RevealArrival[];
    crisis: RevealCrisis | null;
  } | null>(null);
  // The burst's own narration lines, kept so the spread can be read at rest on that stage.
  const spreadLinesRef = useRef<string[]>([]);
  const [spreadLines, setSpreadLines] = useState<string[]>([]);

  const skipRef = useRef(skipBursts);
  skipRef.current = skipBursts;
  const queueRef = useRef<{ view: ViewState; label: string; dice?: unknown }[]>([]);
  const burstSizeRef = useRef(0);
  const playingRef = useRef(false);
  const lastFrameRef = useRef<{ view: ViewState } | null>(null);
  const pendingViewRef = useRef<SessionView | null>(null);
  const endedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const playNextRef = useRef<(() => void) | null>(null);

  const onCheckRef = useRef(onCheck);
  onCheckRef.current = onCheck;
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;
  const onGameEndRef = useRef(onGameEnd);
  onGameEndRef.current = onGameEnd;
  const onTransitionRef = useRef(onTransition);
  onTransitionRef.current = onTransition;
  const rootRef = useRef<HTMLDivElement | null>(null);
  /** The flight in waiting: the figure's organ rectangles, read at the command tap. */
  const flightRef = useRef<{ from: Map<string, DOMRect>; start: number } | null>(null);

  useEffect(() => {
    const playNext = (): void => {
      const f = queueRef.current.shift();
      if (!f) {
        playingRef.current = false;
        timerRef.current = null;
        const pv = pendingViewRef.current;
        pendingViewRef.current = null;
        const last = lastFrameRef.current;
        if (pv && last) {
          // THE TAIL ASSERTION — burst-tail-authoritative, checked by every real consumer.
          const ok = JSON.stringify(last.view) === JSON.stringify(pv.game);
          const line = ok
            ? `tail === authoritative view: PASS (${burstSizeRef.current} frames)`
            : 'tail !== authoritative view: FAIL — the burst is NOT safely skippable';
          onCheckRef.current?.(line);
          if (!ok) console.error(`[burst] ${line}`);
        }
        frameStore.set(null);
        if (pv) setAuthView(pv);
        setPlaying(false);
        setSpreadLines(spreadLinesRef.current);
        spreadLinesRef.current = [];
        return;
      }
      lastFrameRef.current = f;
      const n = burstSizeRef.current - queueRef.current.length;
      // Per-redraw main-thread work (§4 row 2). flushSync is instrumentation — FINDINGS #48.
      const frameStart = performance.now();
      flushSync(() => {
        frameStore.set({ view: f.view, label: f.label, n, of: burstSizeRef.current, dice: f.dice });
      });
      onFrameRef.current?.(frameStart, performance.now() - frameStart, f.label, Boolean(f.dice));
      timerRef.current = window.setTimeout(playNext, f.dice ? DICE_FRAME_MS : FRAME_MS);
    };
    playNextRef.current = playNext;

    const unsubscribe = session.subscribe((ev) => {
      if (ev.kind === 'burst') {
        if (skipRef.current) {
          setSpreadLines(ev.frames.map((fr) => fr.label).filter((l) => l !== ''));
          onCheckRef.current?.(
            `burst skipped (${ev.frames.length} frames) — rendering authoritative views only`,
          );
          return;
        }
        spreadLinesRef.current.push(...ev.frames.map((fr) => fr.label).filter((l) => l !== ''));
        queueRef.current.push(...ev.frames);
        burstSizeRef.current = queueRef.current.length;
        if (!playingRef.current) {
          playingRef.current = true;
          setPlaying(true);
          playNext();
        }
      } else if (ev.kind === 'view') {
        if (playingRef.current) pendingViewRef.current = ev.view;
        else setAuthView(ev.view);
      }
      // `notice` falls through deliberately: it is the shell's, not this screen's.
    });
    return (): void => {
      unsubscribe();
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [session]);

  /** Tap-anywhere during a burst: advance one frame now instead of waiting out the timer. */
  const advanceFrame = (): void => {
    if (!playingRef.current || timerRef.current === null) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
    playNextRef.current?.();
  };

  // Game end: detected on the authoritative view, after any burst has drained.
  useEffect(() => {
    const g = authView.game;
    if (!endedRef.current && (g['won'] === true || Boolean(g['lost']))) {
      endedRef.current = true;
      onGameEndRef.current?.(g);
    }
  }, [authView]);

  // THE CARD REVEAL — the dialog queue's first client (docs/APP_FLOW.md ruling 5).
  //
  // Detected as a TRANSITION on the authoritative view (drawn: null → card), never as state:
  // the first view on mount only sets the baseline, so a game resumed mid-turn does not
  // re-announce a draw the player already saw. Arrivals are diffed by invader id because
  // `drawn` carries only the first card and `drawnList` is one of the 13 state-only keys the
  // view drops. A `__sentinel` drawn (mop-up / every slot capped) announces nothing.
  const dialogs = useDialogQueue();
  const enqueueDialog = dialogs.enqueue;
  // A dialog is on the stack too, without the floating close: it is answered by its own button,
  // and the back gesture answers it the same way (APP_FLOW ruling 1: the dialog goes first).
  useNavLayer(
    `dialog:${dialogs.current?.id ?? ''}`,
    dialogs.current !== null,
    dialogs.dismiss,
    false,
  );
  const prevGameRef = useRef<ViewState | null>(null);
  useEffect(() => {
    const g = authView.game;
    const prev = prevGameRef.current;
    prevGameRef.current = g;
    if (!prev) {
      // THE GOAL DIALOG — shown once, at the start of a NEW game only. A fresh game's first
      // view is turn 1, nothing drawn; a resumed game can never look like this, because the
      // autosave is written on accepted actions and a turn-1-pre-draw state is never saved.
      const maxTurn = Number(g['maxTurn'] ?? 0);
      if (Number(g['turn']) === 1 && !g['drawn'] && String(g['phase']) === 'infection') {
        enqueueDialog({
          id: 'goal',
          title: t('goal.title'),
          body: <GoalBody maxTurn={maxTurn} lastTurn={maxTurn + GRACE_CLEAR} />,
          dismissLabel: t('goal.begin'),
        });
      }
      return;
    }
    const drawn = g['drawn'] as Record<string, unknown> | null;
    if (!drawn || prev['drawn'] || drawn['__sentinel']) return;
    const prevIds = new Set(
      (((prev['invaders'] as { id?: unknown }[] | undefined) ?? []) as { id?: unknown }[]).map(
        (iv) => String(iv.id ?? ''),
      ),
    );
    const arrivals: RevealArrival[] = (
      ((g['invaders'] as Record<string, unknown>[] | undefined) ?? []) as Record<string, unknown>[]
    )
      .filter((iv) => !prevIds.has(String(iv['id'] ?? '')))
      .map((iv) => ({
        disease: String(iv['disease'] ?? ''),
        type: String(iv['type'] ?? ''),
        lane: typeof iv['lane'] === 'string' ? iv['lane'] : null,
        remembered: iv['remembered'] === true,
        novel: iv['novel'] === true,
      }));
    if (arrivals.length === 0) return;
    // THE STAGE, not a dialog (piece 6, §20). The crisis section rides it exactly as it rode the
    // reveal (ruled 6 September 2026): the turn's event belongs to the one interruption the turn
    // already has.
    setArrivals({ list: arrivals, crisis: revealCrisis(g, effectChips(authView)) });
  }, [authView]);

  const send = (action: Record<string, unknown>): void => {
    setLastError(null);
    void session.sendAction(action).then((r) => {
      if (!r.ok) setLastError(r.error ?? null);
    });
  };

  // THE DRAW INSIDE END TURN (§9 ruling 2, §12): the moment the rule says so, once a turn. It runs
  // after the goal and reveal effects above, and reads the queue synchronously, so a new game's goal
  // dialog, enqueued in this same flush, is answered first.
  const sentDrawRef = useRef<number | null>(null);
  useEffect(() => {
    if (
      !shouldDraw({
        game: authView.game,
        playing,
        dialogPending: dialogs.hasPending(),
        covered: navState.depth > 0,
        sentForTurn: sentDrawRef.current,
      })
    )
      return;
    sentDrawRef.current = Number(authView.game['turn']);
    send({ action: 'draw' });
    // `send` is rebuilt every render and does not decide anything; what decides is listed.
  }, [authView, playing, dialogs.current, navState.depth]);

  const tapCell = (cell: string): void => {
    const from = performance.now();
    session.setSelection({ cell, family: null, resident: null });
    onTap?.(from, cell);
  };
  // A resident selects like a cell and excludes one (CP3): the two fields are exclusive.
  const tapResident = (organ: string): void =>
    session.setSelection({ cell: null, family: null, resident: organ });
  const deselect = (): void => session.setSelection({ cell: null, family: null, resident: null });

  const game = authView.game;
  const phase = String(game['phase']);
  const selectedCell = authView.selection.cell;
  const selectedResident = authView.selection.resident;

  // WHAT IS LEGAL comes from one place (offered.ts) and nowhere else in the UI. During a
  // burst nothing is offered — input is disabled.
  const offered: Offered = playing
    ? { source: 'cell', board: [], buttons: [], reason: null }
    : offeredActions(authView);

  // Board targets: one ring per move destination; one ring per ATTACKED INVADER carrying every
  // offer aimed at it (the Eosinophil may strike or degranulate the same worm).
  const byInvader = new Map<string, BoardOffer[]>();
  for (const o of offered.board) {
    if (o.kind === 'attack' && o.invaderId) {
      byInvader.set(o.invaderId, [...(byInvader.get(o.invaderId) ?? []), o]);
    }
  }
  const boardTargets: BoardTarget[] = [
    ...offered.board
      .filter((o) => o.kind === 'move' || o.kind === 'hop')
      .map((o) => ({ key: o.id, kind: o.kind, located: o.located, payload: [o] })),
    ...[...byInvader.entries()].map(([invaderId, offers]) => ({
      key: `attack:${invaderId}`,
      kind: 'attack' as const,
      invaderId,
      payload: offers,
    })),
  ];
  const moveCount = offered.board.filter((o) => o.kind === 'move' || o.kind === 'hop').length;
  const multiChoice = [...byInvader.values()].some((os) => os.length > 1);
  // The bar keeps only the MOVEMENT buttons (recall); every other action is a row in the
  // action list, named with its target (S25 item 1).
  const moveButtons = offered.buttons.filter((b) => b.place !== 'panel' && MOVE_LIKE.has(b.action));
  const panelButtons = offered.buttons.filter((b) => b.place === 'panel');
  let hint: string | null = null;
  if (byInvader.size > 0)
    hint = multiChoice ? t('commandBar.tapOrChoose') : t('commandBar.tapPathogen');
  else if (moveCount > 0) hint = t('commandBar.moveHint');
  else if (panelButtons.length > 0) hint = t('commandBar.producePanel');

  // THE ANTIBODY PANEL's data, all from the view: the summary per family, the store, the caps,
  // and the selection-scoped breakdown for the family the player tapped.
  const ab = (game['ab'] as Record<string, unknown> | undefined) ?? {};
  const caps = (authView.queries.perFamily['capFam'] ?? {}) as Record<string, unknown>;
  const familyRows: FamilyRow[] = Object.entries(authView.queries.production)
    // The novel antigen's family exists only once the body has met one (CP4 owns that story);
    // showing "X 0/5" from turn one would be a question with no answer yet.
    .filter(([family]) => family !== 'X' || game['novelSeen'] === true)
    .map(([family, p]) => ({
      family,
      have: Number(ab[family] ?? 0),
      cap: Number(caps[family] ?? 0),
      net: p.net,
      boosted: p.boosted,
      reduced: p.reduced,
      blocked: p.blocked,
    }));
  const selectedFamily = authView.selection.family;

  /**
   * FIRST CONTACT, derived from what is SELECTED rather than intercepted at each tap handler.
   *
   * The two are the same moment — a tap sets the selection — and deriving it means the four tap
   * paths (the strip, the board, the sheet, deselection) cannot drift apart, and a fifth added
   * later is covered without anyone remembering. `null` is a real answer: it means the player
   * moved to something with no hint, which CONSUMES whatever was showing (see the controller).
   *
   * Order matters where two are true at once. The sheet is checked first because opening it is
   * the more recent tap, and most recent wins (ruling 3).
   */
  const hintSubject: HintSubject | null = inspect?.invaders?.[0]
    ? invaderSubject(inspect.invaders[0].type)
    : selectedCell
      ? cellSubject(selectedCell)
      : selectedResident
        ? RESIDENT_SUBJECT
        : selectedFamily
          ? ANTIBODY_SUBJECT
          : null;
  const turnNow = Number(game['turn'] ?? 0);
  const hintsRef = useRef<HintState>(initialHintState(hintsSeen, turnNow));
  const [hintShown, setHintShown] = useState<HintSubject | null>(null);
  const applyHints = (next: HintState): void => {
    const grew = next.seen.length !== hintsRef.current.seen.length;
    hintsRef.current = next;
    setHintShown(next.shown);
    // Persisting is the shell's, and only when the set actually grew: a write per render would
    // be a write per frame of a spread.
    if (grew) onHintsSeen?.(next.seen);
  };
  useEffect(() => {
    applyHints(contact(hintsRef.current, hintSubject, turnNow));
    // The inputs are the subject and the turn, deliberately. `applyHints` reads the current
    // state through a ref rather than closing over it, so re-running on anything else would
    // re-contact the same subject and cost a spurious consumption.
  }, [hintSubject, turnNow]);
  const hintFor = (place: 'pieces' | 'inspect' | 'antibodies'): ReactElement | null =>
    hintShown && hintPlace(hintShown) === place ? (
      <HintLine
        text={t(hintKey(hintShown))}
        onDismiss={() => applyHints(dismiss(hintsRef.current))}
      />
    ) : null;
  const rawDetail = authView.scoped.productionDetail as Record<string, unknown> | null;
  const familyDetail: FamilyDetail | null = rawDetail
    ? {
        base: Number(rawDetail['base'] ?? 0),
        net: Number(rawDetail['net'] ?? 0),
        blocked: typeof rawDetail['blocked'] === 'string' ? rawDetail['blocked'] : null,
        effects: (
          (rawDetail['effects'] as { label?: unknown; delta?: unknown }[] | undefined) ?? []
        ).map((e) => ({ label: String(e.label ?? ''), delta: Number(e.delta ?? 0) })),
        capReasons: (
          ((rawDetail['storage'] as { capReasons?: unknown } | undefined)?.capReasons as
            unknown[] | undefined) ?? []
        ).map((c) => String(c)),
      }
    : null;
  // PRODUCTION WITHOUT THE B-CELL SELECTED (§19): the Antibodies view's offers, under the B-Cell's
  // own conditions, whatever is selected.
  const producing = playing ? [] : produceOffers(authView);
  const produceByFamily: Record<string, { id: string; label: string }> = {};
  for (const b of producing) if (b.family) produceByFamily[b.family] = { id: b.id, label: b.label };

  /** Offers on invaders, keyed by invader id — the sheet's precise rows. */
  const sheetOffers: Record<string, { id: string; label: string }[]> = {};
  for (const [invaderId, offers] of byInvader) {
    sheetOffers[invaderId] = offers.map((o) => ({
      id: o.id,
      label: o.cost ? `${o.label} · ${o.cost}` : o.label,
    }));
  }
  // THE BODY PANEL's data, all from the view, and its buttons from `bodyOffers` — computed
  // regardless of selection, because the panel is always visible and ordering a vial should
  // not need a cell deselected first. The body's BOARD rings come through `offered` (the
  // second source) only while nothing is selected.
  const body: Offered = playing
    ? { source: 'body', board: [], buttons: [], reason: null }
    : bodyOffers(authView);
  const memory = (game['memory'] as Record<string, unknown> | undefined) ?? {};
  const seen = (game['seen'] as Record<string, unknown> | undefined) ?? {};
  const vaccine = (game['vaccine'] as Record<string, unknown> | undefined) ?? {};
  const difficulty = String(game['difficulty']);
  const bodyData: BodyPanelData = {
    antivenom: Number(game['antivenom'] ?? 0),
    avOrder: Number(game['avOrder'] ?? 0),
    orderButtons: body.buttons
      .filter((b) => b.action === 'orderAntivenom')
      .map((b) => ({ id: b.id, label: b.label })),
    hard: difficulty === 'hard',
    training: difficulty === 'training',
    novelSeen: game['novelSeen'] === true,
    cloneFound: game['cloneFound'] === true,
    clone: Number(game['clone'] ?? 0),
    cloneButton: (() => {
      const b = body.buttons.find((x) => x.action === 'clonalSelection');
      return b
        ? {
            id: b.id,
            label: `${b.label} ${String(Number(game['clone'] ?? 0))}/${String(CLONE_TARGET)}`,
          }
        : null;
    })(),
    vaccines:
      difficulty === 'training'
        ? []
        : Object.keys(seen)
            .filter((dz) => seen[dz] === true && memory[dz] !== true)
            .map((dz) => ({
              disease: dz,
              name: diseaseLabel(dz),
              family: '',
              put: Number(vaccine[dz] ?? 0),
              buttons: body.buttons
                .filter((b) => b.action === 'vaccinate' && b.disease === dz)
                .map((b) => ({ id: b.id, label: b.label })),
            })),
    immune: Object.keys(memory)
      .filter((dz) => memory[dz] === true)
      .map(diseaseLabel),
  };
  const noSelectionHint =
    selectedCell || selectedResident
      ? null
      : offered.board.some((o) => o.action === 'memoryKill')
        ? t('commandBar.memoryHint')
        : offered.board.some((o) => o.action === 'antivenom')
          ? t('commandBar.antivenomHint')
          : null;

  // THE LOG — the engine's own prose, newest first (the view carries the latest 40). Read
  // from the SHOWN view so a burst's frames narrate as they land.
  // The log's lines are built in `LiveLog` below, from the SHOWN view (a frame's while a burst
  // plays, the authoritative one otherwise), so a burst narrates as it lands without the rest
  // of this screen re-rendering per frame.

  const sendOffer = (id: string): void => {
    const o =
      offered.board.find((x) => x.id === id) ??
      offered.buttons.find((x) => x.id === id) ??
      body.buttons.find((x) => x.id === id) ??
      producing.find((x) => x.id === id);
    if (o) send(o.params);
  };

  // THE ONE TAP PATH's meaning (Board resolves WHAT was tapped; this decides what it does):
  // a move target moves; an attack target acts when one offer is on it and opens the sheet's
  // rows when several are; a cell selects, or deselects if it is the selected one
  // (tap-again); a node opens the sheet; nothing within reach is tap-away — deselect.
  const handleBoardTap = (hit: BoardTap): void => {
    // A tap on the board closes whatever the middle showed (§19): the board is the game.
    closeMiddle();
    switch (hit.kind) {
      case 'target': {
        const offers = hit.target.payload as BoardOffer[];
        const first = offers[0];
        if (!first) return;
        if (offers.length === 1) send(first.params);
        else if (first.invaderId) {
          const node = inspectInfoForInvader(game, first.invaderId, authView.queries.readyTurn);
          if (node) setInspect(node);
        }
        return;
      }
      case 'cell':
        if (hit.cell === selectedCell) deselect();
        else tapCell(hit.cell);
        return;
      case 'resident':
        if (hit.organ === selectedResident) deselect();
        else tapResident(hit.organ);
        return;
      case 'node':
        setInspect(hit.node);
        return;
      default:
        if (selectedCell || selectedResident) deselect();
    }
  };

  // THE PIECE STRIP and THE ACTION LIST (S25 item 1). Pieces: the seven cells in their fixed
  // order, then the residents the view carries; a cell's spent/offline state from the same
  // model the board draws. Rows: the selected piece's full non-movement action set.
  const unavailableByCell: Record<string, PieceChip['unavailable']> = {};
  for (const node of buildNodeModel(game, authView.queries.readyTurn).values()) {
    for (const [ck, u] of Object.entries(node.inspect.unavailable)) unavailableByCell[ck] = u;
  }
  // HIV IN THE PANEL, NOT THE STRIP (ruled 6 September 2026): while HIV has destroyed the
  // helper T-cells the Helper's own chip is dimmed and says so — the engine's `hivActive`.
  const hiv = authView.queries.state['hivActive'] === true;
  const residentsNow =
    (game['residents'] as Record<string, { infectedBy?: unknown } | undefined> | undefined) ?? {};
  const pieces: PieceChip[] = [
    ...['macrophage', 'neutrophil', 'bcell', 'tcell', 'helper', 'nk', 'eosinophil']
      .filter((ck) => (game['cells'] as Record<string, unknown> | undefined)?.[ck] !== undefined)
      .map((ck) => ({
        kind: 'cell' as const,
        key: ck,
        unavailable:
          ck === 'helper' && hiv
            ? { kind: 'hiv' as const, backIn: null }
            : (unavailableByCell[ck] ?? null),
      })),
    ...Object.keys(residentsNow).map((o) => {
      const infectedBy = residentsNow[o]?.infectedBy;
      return {
        kind: 'resident' as const,
        key: o,
        unavailable:
          infectedBy !== null && infectedBy !== undefined
            ? { kind: 'infected' as const, backIn: null }
            : null,
      };
    }),
  ];
  // WHY A SPENT CELL IS BACK WHEN IT IS (6 September 2026): the engine's `regenBreakdown`,
  // worded once here for the piece strip, the planning screen's facts line and the bar.
  const why: Record<string, string> = {};
  for (const ck of ['neutrophil', 'eosinophil'] as const) {
    const r = authView.queries.regen[ck];
    if (!r) continue;
    why[ck] = r.marrowBroken
      ? t('regen.marrow')
      : r.helped
        ? t('regen.helped')
        : t('regen.wait', { n: r.wait });
  }
  const rows: DockRow[] = playing ? [] : dockRows(authView);

  // THE DOCK'S MESSAGE LINE: one thing, the most useful. What the board offers when it offers
  // something; otherwise why the piece cannot act; a note (why a spent cell is back when it is, the
  // lymph shortcut withheld) rides after it.
  const note = offered.note ?? (selectedCell ? (why[selectedCell] ?? null) : null);
  let message: string | null;
  let messageTone: 'hint' | 'muted' | 'memory' | 'alert' = 'muted';
  if (!selectedCell && !selectedResident) {
    // What the body's rings are when it has some; otherwise the prompt to pick a piece.
    message = noSelectionHint ?? t('commandBar.selectPrompt');
    messageTone = noSelectionHint !== null ? 'memory' : 'muted';
  } else if (byInvader.size > 0 || moveCount > 0) {
    message = hint;
    messageTone = 'hint';
  } else if (offered.reason !== null) {
    message = offered.reason;
    messageTone = 'alert';
  } else {
    message = hint;
  }
  if (note !== null) message = message === null ? note : `${message} ${t('inspect.sep')} ${note}`;
  // A cell's speed and the NK Cell's odds left the middle for the cell's card (§19).
  const apTerms = apTermLines(authView);
  // WHAT'S HERE, back as a slot (§14, ruling 3): offered when the selected piece stands with
  // something the inspect sheet can show.
  const selectedNode = selectedCell
    ? inspectInfoForCell(game, selectedCell, authView.queries.readyTurn)
    : selectedResident
      ? inspectInfoForResident(game, selectedResident, authView.queries.readyTurn)
      : null;
  const canInspect =
    selectedNode !== null && (selectedNode.invaders.length > 0 || selectedNode.resident !== null);

  // THE PLANNING SCREEN (item 12): between the draw's reveal and the command phase the board
  // gives way to the body seen from the outside. Never while a burst plays — the spread is
  // watched on the board — and the model, not this component, says when the moment is.
  const planning = playing ? null : planningModel(authView);
  const planningActive = planning !== null && planning.active;

  /** The command tap from the planning screen: read the organs' rectangles, then send. */
  const commandFromPlanning = (params: Record<string, unknown>): void => {
    const start = performance.now();
    const from = new Map<string, DOMRect>();
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // The organ keys come from the CONTENT PACK, never read back out of the DOM: each element
    // is looked up BY the known key, so nothing the page carries ever flows into an image
    // source (the shape CodeQL flags as DOM text reinterpreted as HTML — and rightly, in
    // general; here the keys are ours, and this keeps that provable rather than argued).
    if (!reduce && rootRef.current) {
      for (const organ of FLIGHT_ORGANS) {
        const img = rootRef.current.querySelector<SVGImageElement>(
          `[data-anatomy-place="${organ}"] image`,
        );
        if (img) from.set(organ, img.getBoundingClientRect());
      }
    }
    flightRef.current = { from, start };
    send(params);
  };

  // THE FLIGHT: runs in the commit that replaces the planning screen with the board.
  useLayoutEffect(() => {
    const f = flightRef.current;
    const root = rootRef.current;
    if (planningActive || !f || !root) return;
    flightRef.current = null;
    const ghosts: HTMLImageElement[] = [];
    if (f.from.size > 0) {
      root.setAttribute('data-flight', '1');
      for (const organ of FLIGHT_ORGANS) {
        const target = root.querySelector<SVGImageElement>(`[data-organ-icon="${organ}"]`);
        const from = f.from.get(organ);
        if (!target || !from) continue;
        const to = target.getBoundingClientRect();
        const ghost = document.createElement('img');
        ghost.src = `/art/organ-${organ}@3x.webp`;
        ghost.alt = '';
        ghost.setAttribute('data-flight-ghost', organ);
        Object.assign(ghost.style, {
          position: 'fixed',
          left: `${String(from.left)}px`,
          top: `${String(from.top)}px`,
          width: `${String(from.width)}px`,
          height: `${String(from.height)}px`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
          zIndex: '20',
          willChange: 'transform',
        });
        document.body.appendChild(ghost);
        ghosts.push(ghost);
        const dx = to.left - from.left;
        const dy = to.top - from.top;
        const sx = to.width / from.width;
        const sy = to.height / from.height;
        ghost.animate(
          [
            { transform: 'translate(0px, 0px) scale(1, 1)' },
            {
              transform: `translate(${String(dx)}px, ${String(dy)}px) scale(${String(sx)}, ${String(sy)})`,
            },
          ],
          { duration: FLIGHT_MS, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' },
        );
      }
    }
    const landed = window.setTimeout(() => {
      root.removeAttribute('data-flight');
      for (const g of ghosts) g.remove();
    }, FLIGHT_MS);
    // Main-thread work from the tap until this commit (flight prepared) yields — the same
    // 0ms-timer probe metrics.ts uses for taps.
    const n = ghosts.length;
    window.setTimeout(() => onTransitionRef.current?.(f.start, performance.now() - f.start, n), 0);
    return () => {
      window.clearTimeout(landed);
      root.removeAttribute('data-flight');
      for (const g of ghosts) g.remove();
    };
  }, [planningActive]);

  // THE TOAST CLEARS ITSELF, and a change in what it answered clears it sooner.
  useEffect(() => {
    if (said === null) return undefined;
    const id = window.setTimeout(() => setSaid(null), 4000);
    return () => window.clearTimeout(id);
  }, [said]);
  useEffect(() => {
    if (lastError === null) return undefined;
    const id = window.setTimeout(() => setLastError(null), 5000);
    return () => window.clearTimeout(id);
  }, [lastError]);
  useEffect(() => setSaid(null), [selectedCell, selectedResident, turnNow, phase]);

  const openPathogenCard = (invaderId: string): void => {
    const node = inspectInfoForInvader(game, invaderId, authView.queries.readyTurn);
    const iv = node?.invaders.find((x) => x.id === invaderId);
    if (!iv || iv.novel) return;
    const memory = (game['memory'] as Record<string, unknown> | undefined) ?? {};
    setCard({
      disease: iv.disease,
      type: iv.type,
      remembered: memory[iv.disease] === true,
      now: invaderNowLine(iv),
    });
  };

  // WHICH CELLS ARE OUT, said above planning's list (§17 choice 4; §19).
  const spentCells = spentCellsLine(
    pieces
      .filter((p) => p.kind === 'cell')
      .map((p) => ({ key: p.key, unavailable: p.unavailable })),
    why,
  );
  const chips = effectChips(authView);
  const toastText = said ?? (lastError ? engineText(lastError) : null);
  // THE ARRIVALS STAGE while a draw is waiting to be looked at (piece 6, §20). It outranks
  // planning: the cards are what planning is planned against, so they are seen first.
  const arrivalsNow = !playing && arrivals !== null && arrivals.list.length > 0 ? arrivals : null;
  // Planning's model while planning shows, or null: one name, so every use of it is narrowed.
  const plan = arrivalsNow === null && planning !== null && planningActive ? planning : null;
  const apShown = plan !== null ? plan.apNext : Number(game['ap'] ?? 0);
  /** One of command's three views, or none: a second tap on its button closes it. */
  const openTab = (kind: MiddleTab): void => {
    const again = drawer === kind;
    closeMiddle();
    if (!again) setDrawer(kind);
  };
  const tabOpen: MiddleTab | null =
    drawer === 'pieces' || drawer === 'antibodies' || drawer === 'body' ? drawer : null;

  /**
   * THE COACH'S LINE (piece 8, §20), or null. Everything it reads is already on this render: the
   * stage the frame is showing, the turn, the points left, whether a piece is selected, and how
   * many actions `offered.ts` is offering. It is never told a rule of its own.
   */
  const coachNow =
    coach && !coachOff && !playing
      ? coachStep({
          stage:
            dialogs.current !== null
              ? 'waiting'
              : arrivalsNow !== null
                ? 'arrivals'
                : plan !== null
                  ? 'planning'
                  : playing
                    ? 'spread'
                    : // Before the draw the player is not being asked for anything either: the app
                      // is about to send it (§12 ruling 2), and the board is not theirs to act on.
                      phase === 'command'
                      ? 'command'
                      : 'waiting',
          turn: Number(game['turn'] ?? 0),
          ap: Number(game['ap'] ?? 0),
          selected: selectedCell !== null || selectedResident !== null,
          offeredCount: rows.length + moveButtons.length,
          canProduce: Object.keys(produceByFamily).length > 0,
        })
      : null;
  const coachLine =
    coachNow !== null && coachNow.id !== coachDone ? (
      <CoachLine
        text={t(coachNow.key)}
        onNext={() => setCoachDone(coachNow.id)}
        onStop={() => setCoachOff(true)}
      />
    ) : null;

  /** WHAT THE MIDDLE SHOWS (§19), the first that applies: a spread, a view opened over the stage's
   *  own content, then the stage's own content. */
  const middle = (): ReactNode => {
    if (playing) return <SpreadView store={frameStore} />;
    if (apSheet)
      return (
        <div data-middle-view="ap">
          <ApTerms terms={apTerms} total={apShown} />
        </div>
      );
    if (effectsOpen)
      return (
        <div data-middle-view="effects">
          <EffectsStrip chips={chips} />
        </div>
      );
    if (arrivalsNow !== null)
      return <ArrivalsNotes crisis={arrivalsNow.crisis} spread={spreadLines} />;
    if (plan !== null)
      return (
        <div data-middle-view="planning">
          {spentCells !== null ? (
            <div
              data-planning-cell-facts="1"
              style={{ fontSize: '0.8125rem', color: '#7A5600', marginBottom: 2 }}
            >
              {spentCells}
            </div>
          ) : null}
          <PathogenList
            model={plan}
            focus={planFocus}
            disabled={playing}
            onPathogenCard={openPathogenCard}
          />
          {plan.allocation ? <AllocationBlock slot={plan.allocation} /> : null}
        </div>
      );
    if (inspect)
      return (
        <InspectSheet
          hint={hintFor('inspect')}
          info={inspect}
          selectedCell={selectedCell}
          disabled={playing}
          offers={sheetOffers}
          onOffer={(id) => {
            setInspect(null);
            sendOffer(id);
          }}
          onSelectCell={(ck) => {
            tapCell(ck);
            setInspect(null);
          }}
          selectedResident={selectedResident}
          onSelectResident={(organ) => {
            tapResident(organ);
            setInspect(null);
          }}
          // THE CELL CARD's entry point (S25 second pass): the node view is "tell me about this",
          // for cells as for pathogens.
          onCellCard={(ck) =>
            setCellCard({
              cell: ck,
              now: unavailableByCell[ck] ? unavailableText(unavailableByCell[ck]) : null,
            })
          }
          onCard={(invaderId) => {
            const iv = inspect.invaders.find((x) => x.id === invaderId);
            if (!iv || iv.novel) return;
            const memory = (game['memory'] as Record<string, unknown> | undefined) ?? {};
            setCard({
              disease: iv.disease,
              type: iv.type,
              remembered: memory[iv.disease] === true,
              now: invaderNowLine(iv),
            });
          }}
        />
      );
    if (targetsFor !== null)
      return (
        <div
          data-middle-view="targets"
          style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
        >
          <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#2E2A28' }}>
            {t(`action.${targetsFor.action}`)}
          </div>
          <TargetList
            targets={targetsFor.targets}
            disabled={playing}
            onOffer={(id) => {
              setTargetsFor(null);
              sendOffer(id);
            }}
          />
        </div>
      );
    if (drawer === 'pieces')
      return (
        <div data-middle-view="cells">
          <PieceStrip
            pieces={pieces}
            selectedCell={selectedCell}
            selectedResident={selectedResident}
            why={why}
            disabled={playing}
            // Picking a piece closes the view and selects it on the board (ruling 3).
            onSelectCell={(ck) => {
              tapCell(ck);
              setDrawer(null);
            }}
            onSelectResident={(organ) => {
              tapResident(organ);
              setDrawer(null);
            }}
            onDeselect={() => {
              deselect();
              setDrawer(null);
            }}
          />
        </div>
      );
    if (drawer === 'antibodies')
      return (
        <div data-middle-view="antibodies">
          <AntibodyPanel
            rows={familyRows}
            selectedFamily={selectedFamily}
            detail={familyDetail}
            produce={produceByFamily}
            disabled={playing}
            onSelectFamily={(family) =>
              session.setSelection({ cell: selectedCell, family, resident: selectedResident })
            }
            onProduce={sendOffer}
          />
          {hintFor('antibodies')}
        </div>
      );
    if (drawer === 'body')
      return (
        <div data-middle-view="body">
          <BodyPanel data={bodyData} disabled={playing} onOffer={sendOffer} />
        </div>
      );
    return (
      <ActionsView
        selectedName={
          selectedCell
            ? cellDisplayName(selectedCell)
            : selectedResident
              ? residentDisplayName(selectedResident)
              : null
        }
        onCard={
          selectedCell
            ? () =>
                setCellCard({
                  cell: selectedCell,
                  now: unavailableByCell[selectedCell]
                    ? unavailableText(unavailableByCell[selectedCell])
                    : null,
                })
            : null
        }
        cardLabel={selectedCell ? t('card.about', { name: cellDisplayName(selectedCell) }) : null}
        prompt={message}
        promptTone={messageTone}
        undo={authView.undo}
        inCommand={phase === 'command'}
        onUndo={() => send({ action: 'undo' })}
        rows={rows}
        moveButtons={moveButtons.map((b) => ({ id: b.id, label: b.label }))}
        onMoveButton={sendOffer}
        onWhatsHere={
          canInspect && selectedNode !== null
            ? () => {
                closeMiddle();
                setInspect(selectedNode);
              }
            : null
        }
        // A piece with nothing to press (the Helper T-Cell): why it cannot act when it cannot,
        // otherwise that it works by standing with others.
        emptyText={offered.reason ?? t('actions.none')}
        emptyTone={offered.reason !== null ? 'alert' : 'muted'}
        disabled={playing}
        onRow={(row) => {
          if (row.targets.length > 1) {
            closeMiddle();
            setTargetsFor(row);
          } else if (row.offerId !== null) sendOffer(row.offerId);
        }}
        onSay={setSaid}
      />
    );
  };

  return (
    <div
      ref={rootRef}
      data-play-frame=""
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        // ONE SCREEN TALL (§19): the page never scrolls; the middle does, when it must. The 16px is
        // the body's margin, above and below.
        height: 'calc(100dvh - 16px)',
        // While the floating close shows, NavHost appends its spacer below the page. The frame keeps
        // its size (nothing moves, §12 ruling 1) and lets the spacer overlap its own bottom, where
        // the hidden advance button keeps its slot, so the page does not scroll by the spacer.
        marginBottom: navState.floating ? `calc(-1 * ${FLOAT_RESERVE})` : undefined,
      }}
    >
      <style>{FLIGHT_CSS}</style>
      <TopBar
        turnText={turnShort(game)}
        apText={`${t('commandBar.ap')} ${String(apShown)}`}
        apAvailable={apTerms.length > 0 && !playing}
        onAp={() => {
          closeMiddle();
          setApSheet(true);
        }}
        banner={effectBanner(chips)}
        onBanner={() => {
          closeMiddle();
          setEffectsOpen(true);
        }}
        onChat={() => setDrawer('log')}
        chatLabel={t('chat.open')}
        menu={
          <LiveControls
            store={frameStore}
            render={renderControls}
            ctx={{ game, phase, playing, planning: planningActive, lastError, send }}
          />
        }
      />
      <PlayArea
        stage={
          arrivalsNow !== null
            ? 'arrivals'
            : plan !== null
              ? 'planning'
              : playing
                ? 'spread'
                : 'command'
        }
      >
        {arrivalsNow !== null ? (
          <ArrivalsGrid
            arrivals={arrivalsNow.list}
            onCard={(a) =>
              setCard({
                disease: a.disease,
                type: a.type,
                remembered:
                  a.remembered ||
                  ((game['memory'] as Record<string, unknown> | undefined) ?? {})[a.disease] ===
                    true,
                // An arrival is at its route's entry: nothing invader-specific to say yet.
                now: null,
              })
            }
          />
        ) : null}
        {plan !== null ? (
          <PlanningScreen
            model={plan}
            focus={planFocus}
            disabled={playing}
            onFigureTap={setPlanFocus}
          />
        ) : null}
        {/* THE COMMAND STAGE STAYS MOUNTED behind planning (ruled 6 September 2026, the mount fix for
            the command tap's breach): hidden, not unmounted, so the tap that ends planning is a
            visibility toggle and the board's redraw for the new turn. The flight reads its landing
            rectangles after that commit. Measured in P2_3_MEASUREMENT.md, "Added 6 September". */}
        <div
          data-command-stage="1"
          hidden={plan !== null || arrivalsNow !== null}
          style={{ position: 'absolute', inset: 0 }}
        >
          <LiveBoard
            fill
            store={frameStore}
            game={game}
            selectedCell={selectedCell}
            selectedResident={selectedResident}
            readyTurn={authView.queries.readyTurn}
            artMetrics={artMetrics}
            targets={boardTargets}
            onTap={playing ? undefined : handleBoardTap}
          />
          {hintFor('pieces') !== null ? (
            // A piece's first-encounter hint, over the top of the board (piece 3, §15).
            <div
              data-hint-over-board=""
              style={{ position: 'absolute', left: 0, right: 0, top: 0, zIndex: 3 }}
            >
              {hintFor('pieces')}
            </div>
          ) : null}
        </div>
        {toastText !== null ? <Toast text={toastText} /> : null}
      </PlayArea>
      <div
        data-middle=""
        style={{ flex: '1 1 0', minHeight: 0, overflowY: 'auto', overflowWrap: 'anywhere' }}
      >
        {coachLine}
        {middle()}
      </div>
      <div
        data-bottom=""
        style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 6 }}
      >
        {plan === null && arrivalsNow === null ? (
          <TabRow active={tabOpen} disabled={playing} onTab={openTab} />
        ) : null}
        <AdvanceButton
          keyName={
            playing
              ? 'spread'
              : arrivalsNow !== null
                ? 'planTurn'
                : plan !== null
                  ? plan.mode === 'allocate'
                    ? 'confirmAllocation'
                    : 'beginCommand'
                  : 'endTurn'
          }
          label={
            playing
              ? t('spread.tapToContinue')
              : arrivalsNow !== null
                ? t('reveal.plan')
                : plan !== null
                  ? plan.button.label
                  : t('play.endCommand')
          }
          disabled={playing || (plan === null && arrivalsNow === null && phase !== 'command')}
          hidden={navState.floating}
          onPress={() => {
            if (arrivalsNow !== null) setArrivals(null);
            else if (plan !== null) commandFromPlanning(plan.button.params);
            else send({ action: 'endCommand' });
          }}
        />
      </div>
      {drawer === 'log' ? (
        // MESSAGES (§19): full height over the game, in tabs. The system's messages, which were
        // "What happened", are the first; the players' own chat is Phase 3's.
        <Drawer kind="log" onClose={() => setDrawer(null)}>
          <div role="tablist" style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <span
              role="tab"
              aria-selected="true"
              data-chat-tab="system"
              style={{
                padding: '6px 4px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: '#2E2A28',
                borderBottom: '2px solid #B03A2E',
              }}
            >
              {t('chat.system')}
            </span>
          </div>
          <LiveLog store={frameStore} game={game} />
        </Drawer>
      ) : null}
      {playing ? (
        // The tap-to-advance surface (pacing ruling, 30 Aug 2026): every tap while frames play means
        // "next frame". Below the dialog layer (30).
        <div
          data-tap-advance="1"
          style={{ position: 'fixed', inset: 0, zIndex: 25, cursor: 'pointer' }}
          onPointerDown={advanceFrame}
        />
      ) : null}
      <DialogHost dialog={dialogs.current} onDismiss={dialogs.dismiss} />
      {card ? <PathogenCard subject={card} /> : null}
      {cellCard ? <CellCard subject={cellCard} /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ *
 * THE FRAME'S SUBSCRIBERS (the full-UI re-measure, 6 September 2026). Four small components
 * read the burst's current frame from the store and are the ONLY things that re-render per
 * frame: the shell's controls line (its frame headline), the narration banner, the board, and
 * the log. Everything else on the play screen reads the authoritative view, which does not
 * change while a burst plays. See `frameStore.ts` for the measurement that put them here.
 * ------------------------------------------------------------------------------------------ */

function LiveControls({
  store,
  render,
  ctx,
}: {
  store: FrameStore;
  render: (ctx: PlayControlsCtx) => ReactNode;
  ctx: Omit<PlayControlsCtx, 'frameInfo'>;
}): ReactElement {
  const frame = useFrame(store);
  return (
    <>
      {render({
        ...ctx,
        frameInfo: frame ? { n: frame.n, of: frame.of, label: frame.label } : null,
      })}
    </>
  );
}

type BoardProps = Parameters<typeof Board>[0];

function LiveBoard({
  store,
  game,
  ...rest
}: Omit<BoardProps, 'view'> & { store: FrameStore; game: ViewState }): ReactElement {
  const frame = useFrame(store);
  return <Board view={frame ? frame.view : game} {...rest} />;
}

function LiveLog({ store, game }: { store: FrameStore; game: ViewState }): ReactElement {
  const frame = useFrame(store);
  const shown = frame ? frame.view : game;
  const engineLines: LogLine[] = (
    (shown['log'] as { t?: unknown; msg?: unknown; kind?: unknown }[] | undefined) ?? []
  ).map((l) => ({ t: Number(l.t ?? 0), msg: String(l.msg ?? ''), kind: String(l.kind ?? '') }));
  // THE RARE EVENT'S LINE (6 September 2026): the engine banners a rare event and never logs
  // it, so the UI authors one entry from the content's own words, dated to the turn it fired,
  // and files it among the engine's lines by turn (newest first, stable within a turn).
  const rare = rareLogLine(shown);
  const lines: LogLine[] = rare
    ? [...engineLines, { t: rare.t, msg: '', kind: rare.kind, text: rare.text }].sort(
        (a, b) => b.t - a.t,
      )
    : engineLines;
  return <LogPanel lines={lines} titled={false} />;
}
