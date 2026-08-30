/**
 * The Play surface — THE COMPONENT BOTH SHELLS MOUNT (docs/APP_FLOW.md ruling 6).
 *
 * The app shell mounts it inside the screen machine with player controls; the dev shell
 * mounts it with its own instrumented controls (button text unchanged, so
 * tools/perf/measure.ts's coupling holds verbatim), the checks panel and the skip toggle.
 * Ported from the P2.2 dev shell; the burst machinery keeps its exact shape:
 *
 * - The subscribe listener only queues; the animation loop drains at legacy pacing
 *   (800ms dice / 560ms otherwise — the P2.5 pacing decision pending, docs/for-P2.5.md).
 * - ⚠️ Burst frames render under `flushSync`, and that is INSTRUMENTATION, not style
 *   (FINDINGS #48): the busy-time channel's definition depends on it. Do not refactor away.
 * - The tail assertion (burst-tail-authoritative) runs in BOTH shells and reports through
 *   `onCheck` — cheap, and the invariant matters everywhere.
 * - Input is disabled during a burst; control enablement reads only the authoritative view.
 */
import type { SessionView, ViewState } from '@immunity-wars/session';
import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { flushSync } from 'react-dom';

import type { ArtMetrics, InspectInfo } from '../board/Board';
import { Board } from '../board/Board';
import { CommandBar, type EngulfTarget } from '../panels/CommandBar';
import { InspectSheet } from '../panels/InspectSheet';
import { cellDisplayName } from '../names';

/** What PlayScreen needs from a session — structural, so RelaySession fits it too. */
export interface PlaySessionLike {
  getView(): SessionView;
  sendAction(action: Record<string, unknown>): Promise<{ ok: boolean; error?: string }>;
  setSelection(selection: { cell: string | null; family: string | null }): void;
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
        setFrame({ view: f.view, label: f.label, n, of: burstSizeRef.current });
      });
      onFrameRef.current?.(frameStart, performance.now() - frameStart, f.label, Boolean(f.dice));
      // Legacy pacing, kept for measurement comparability (pacing decision: for-P2.5.md).
      setTimeout(playNext, f.dice ? 800 : 560);
    };

    return session.subscribe((ev) => {
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
  }, [session]);

  // Game end: detected on the authoritative view, after any burst has drained.
  useEffect(() => {
    const g = authView.game;
    if (!endedRef.current && (g['won'] === true || Boolean(g['lost']))) {
      endedRef.current = true;
      onGameEndRef.current?.(g);
    }
  }, [authView]);

  const send = (action: Record<string, unknown>): void => {
    setLastError(null);
    void session.sendAction(action).then((r) => {
      if (!r.ok) setLastError(r.error ?? null);
    });
  };

  const tapCell = (cell: string): void => {
    const from = performance.now();
    session.setSelection({ cell, family: null });
    onTap?.(from, cell);
  };

  const game = authView.game;
  const phase = String(game['phase']);
  const playing = frame !== null;
  const shown = frame ? frame.view : game;
  const selectedCell = authView.selection.cell;
  const moveTargets = playing
    ? []
    : ((authView.scoped.moveDestinations ?? []) as Record<string, unknown>[]);
  const engulfTargets: EngulfTarget[] =
    !playing && selectedCell === 'macrophage'
      ? (
          (authView.queries.state['macrophageEatable'] as
            { id?: unknown; disease?: unknown }[] | undefined) ?? []
        ).map((iv) => ({ id: String(iv.id ?? ''), label: String(iv.disease ?? '') }))
      : [];

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
      <Board
        view={shown}
        selectedCell={selectedCell}
        onCellClick={playing ? undefined : tapCell}
        artMetrics={artMetrics}
        onNodeInspect={setInspect}
        moveTargets={moveTargets}
        onMoveTarget={(mt) => {
          if (!selectedCell) return;
          const m = mt as Record<string, unknown>;
          send({
            action: 'move',
            cell: selectedCell,
            zone: m['zone'],
            lane: m['lane'],
            organ: m['organ'],
            step: m['step'],
          });
        }}
      />
      <CommandBar
        selectedCellName={selectedCell ? cellDisplayName(selectedCell) : null}
        ap={Number(game['ap'] ?? 0)}
        moveTargetCount={moveTargets.length}
        engulfTargets={engulfTargets}
        disabled={playing}
        onEngulf={(invaderId) => send({ action: 'engulf', cell: 'macrophage', invaderId })}
        onDeselect={() => session.setSelection({ cell: null, family: null })}
      />
      {inspect ? (
        <InspectSheet
          info={inspect}
          selectedCell={selectedCell}
          disabled={playing}
          onSelectCell={(ck) => {
            tapCell(ck);
            setInspect(null);
          }}
          onClose={() => setInspect(null)}
        />
      ) : null}
    </div>
  );
}
