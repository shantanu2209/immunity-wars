/**
 * The Play surface — THE COMPONENT BOTH SHELLS MOUNT (docs/APP_FLOW.md ruling 6).
 *
 * The app shell mounts it inside the screen machine with player controls; the dev shell
 * mounts it with its own instrumented controls (button text unchanged, so
 * tools/perf/measure.ts's coupling holds verbatim), the checks panel and the skip toggle.
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
import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { flushSync } from 'react-dom';

import type { ArtMetrics, BoardTap, BoardTarget, InspectInfo } from '../board/Board';
import {
  Board,
  inspectInfoForCell,
  inspectInfoForInvader,
  inspectInfoForResident,
} from '../board/Board';
import { engineText } from '../engineText';
import { offeredActions, type BoardOffer, type Offered } from './offered';
import { GRACE_CLEAR } from '@immunity-wars/content';

import { DialogHost, useDialogQueue } from '../dialogs/DialogQueue';
import { GoalBody } from '../dialogs/GoalBody';
import { RevealBody, type RevealArrival } from '../dialogs/RevealBody';
import { t } from '../i18n';
import { AntibodyPanel, type FamilyDetail, type FamilyRow } from '../panels/AntibodyPanel';
import { CommandBar } from '../panels/CommandBar';
import { InspectSheet } from '../panels/InspectSheet';
import { cellDisplayName, organDisplayName, residentDisplayName } from '../names';
import { SpreadNarration, diceOf } from './SpreadNarration';

// Spread pacing — RULED 30 Aug 2026 (for-P2.5.md). Dice frames carry two facts (the roll and
// its outcome), so they hold longer. A tap anywhere advances immediately.
const FRAME_MS = 900;
const DICE_FRAME_MS = 1400;

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
        | { kind: 'burst'; frames: readonly { view: ViewState; label: string; dice?: unknown }[] },
    ) => void,
  ): () => void;
}

export interface PlayControlsCtx {
  game: ViewState;
  phase: string;
  playing: boolean;
  lastError: string | null;
  frameInfo: { n: number; of: number; label: string } | null;
  send: (action: Record<string, unknown>) => void;
}

export function PlayScreen({
  session,
  artMetrics,
  skipBursts = false,
  onCheck,
  onFrame,
  onTap,
  onGameEnd,
  renderControls,
}: {
  session: PlaySessionLike;
  artMetrics?: ArtMetrics;
  /** Ignore bursts, render authoritative views only — the reconnection rehearsal. */
  skipBursts?: boolean;
  /** Tail-assertion and skip reports; both shells receive them, the dev shell displays them. */
  onCheck?: (line: string) => void;
  /** Per-redraw instrumentation hook (the dev shell wires metrics.ts here). */
  onFrame?: (start: number, busy: number, label: string, dice: boolean) => void;
  /** Tap instrumentation hook. */
  onTap?: (from: number, cell: string) => void;
  /** Fired once when the authoritative view first shows a finished game. */
  onGameEnd?: (finalView: ViewState) => void;
  /** The shell's turn controls (player buttons, or the dev shell's instrumented ones). */
  renderControls: (ctx: PlayControlsCtx) => ReactNode;
}): ReactElement {
  const [authView, setAuthView] = useState<SessionView>(() => session.getView());
  const [frame, setFrame] = useState<{
    view: ViewState;
    label: string;
    n: number;
    of: number;
    dice: unknown;
  } | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [inspect, setInspect] = useState<InspectInfo | null>(null);

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
        if (pv) setAuthView(pv);
        setFrame(null);
        return;
      }
      lastFrameRef.current = f;
      const n = burstSizeRef.current - queueRef.current.length;
      // Per-redraw main-thread work (§4 row 2). flushSync is instrumentation — FINDINGS #48.
      const frameStart = performance.now();
      flushSync(() => {
        setFrame({ view: f.view, label: f.label, n, of: burstSizeRef.current, dice: f.dice });
      });
      onFrameRef.current?.(frameStart, performance.now() - frameStart, f.label, Boolean(f.dice));
      timerRef.current = window.setTimeout(playNext, f.dice ? DICE_FRAME_MS : FRAME_MS);
    };
    playNextRef.current = playNext;

    const unsubscribe = session.subscribe((ev) => {
      if (ev.kind === 'burst') {
        if (skipRef.current) {
          onCheckRef.current?.(
            `burst skipped (${ev.frames.length} frames) — rendering authoritative views only`,
          );
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
        lane: typeof iv['lane'] === 'string' ? iv['lane'] : null,
        remembered: iv['remembered'] === true,
        novel: iv['novel'] === true,
      }));
    if (arrivals.length === 0) return;
    enqueueDialog({
      id: `reveal-t${String(g['turn'])}`,
      title: t('reveal.title'),
      body: <RevealBody arrivals={arrivals} />,
      dismissLabel: t('reveal.continue'),
    });
  }, [authView, enqueueDialog]);

  const send = (action: Record<string, unknown>): void => {
    setLastError(null);
    void session.sendAction(action).then((r) => {
      if (!r.ok) setLastError(r.error ?? null);
    });
  };

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
  const playing = frame !== null;
  const shown = frame ? frame.view : game;
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
  const barButtons = offered.buttons.filter((b) => b.place !== 'panel');
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
  const produceOffers: Record<string, { id: string; label: string }> = {};
  for (const b of panelButtons)
    if (b.family) produceOffers[b.family] = { id: b.id, label: b.label };

  /** Offers on invaders, keyed by invader id — the sheet's precise rows. */
  const sheetOffers: Record<string, { id: string; label: string }[]> = {};
  for (const [invaderId, offers] of byInvader) {
    sheetOffers[invaderId] = offers.map((o) => ({
      id: o.id,
      label: o.cost ? `${o.label} · ${o.cost}` : o.label,
    }));
  }
  const sendOffer = (id: string): void => {
    const o = offered.board.find((x) => x.id === id) ?? offered.buttons.find((x) => x.id === id);
    if (o) send(o.params);
  };

  // THE ONE TAP PATH's meaning (Board resolves WHAT was tapped; this decides what it does):
  // a move target moves; an attack target acts when one offer is on it and opens the sheet's
  // rows when several are; a cell selects, or deselects if it is the selected one
  // (tap-again); a node opens the sheet; nothing within reach is tap-away — deselect.
  const handleBoardTap = (hit: BoardTap): void => {
    setInspect(null);
    switch (hit.kind) {
      case 'target': {
        const offers = hit.target.payload as BoardOffer[];
        const first = offers[0];
        if (!first) return;
        if (offers.length === 1) send(first.params);
        else if (first.invaderId) {
          const node = inspectInfoForInvader(game, first.invaderId);
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

  const selectedNode = selectedCell
    ? inspectInfoForCell(game, selectedCell)
    : selectedResident
      ? inspectInfoForResident(game, selectedResident)
      : null;
  const canInspect =
    selectedNode !== null && (selectedNode.invaders.length > 0 || selectedNode.resident !== null);

  return (
    <div>
      {renderControls({
        game,
        phase,
        playing,
        lastError,
        frameInfo: frame ? { n: frame.n, of: frame.of, label: frame.label } : null,
        send,
      })}
      {frame ? (
        <SpreadNarration label={frame.label} n={frame.n} of={frame.of} dice={diceOf(frame.dice)} />
      ) : null}
      <Board
        view={shown}
        selectedCell={selectedCell}
        selectedResident={selectedResident}
        artMetrics={artMetrics}
        targets={boardTargets}
        onTap={playing ? undefined : handleBoardTap}
      />
      <CommandBar
        selectedCellName={
          selectedCell
            ? cellDisplayName(selectedCell)
            : selectedResident
              ? residentDisplayName(selectedResident)
              : null
        }
        qualifier={
          selectedResident ? t('resident.of', { organ: organDisplayName(selectedResident) }) : null
        }
        ap={Number(game['ap'] ?? 0)}
        hint={hint}
        buttons={barButtons.map((b) => ({ id: b.id, label: b.label }))}
        noAction={offered.reason}
        undo={authView.undo}
        notice={lastError ? engineText(lastError) : null}
        canInspect={canInspect}
        disabled={playing}
        onButton={sendOffer}
        onUndo={() => send({ action: 'undo' })}
        onInspect={() => {
          if (selectedNode) setInspect(selectedNode);
        }}
        onDeselect={deselect}
      />
      <AntibodyPanel
        rows={familyRows}
        selectedFamily={selectedFamily}
        detail={familyDetail}
        produce={produceOffers}
        disabled={playing}
        onSelectFamily={(family) =>
          session.setSelection({ cell: selectedCell, family, resident: selectedResident })
        }
        onProduce={sendOffer}
      />
      {inspect ? (
        <InspectSheet
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
          onClose={() => setInspect(null)}
        />
      ) : null}
      {playing ? (
        // The tap-to-advance surface (pacing ruling, 30 Aug 2026). Input is disabled during a
        // burst anyway (APP_FLOW, Play states), so this reuses a dead surface: every tap while
        // frames play means "next frame". Below the dialog layer (30) — a dialog never shows
        // mid-burst, but the ordering should not depend on that.
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 25, cursor: 'pointer' }}
          onPointerDown={advanceFrame}
        />
      ) : null}
      <DialogHost dialog={dialogs.current} onDismiss={dialogs.dismiss} />
    </div>
  );
}
