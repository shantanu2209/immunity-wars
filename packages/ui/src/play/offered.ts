/**
 * OFFERED ACTIONS — the one place the UI decides what is legal, and it only READS the view.
 *
 * The standing rule (Shantanu, 4 September 2026): offer only legal targets from the view's
 * queries, so rejections are rare because illegal options are not offered. This module is the
 * whole of that rule in code. Nothing else in `packages/ui` decides whether an action may be
 * sent; components render what this returns and dispatch what it prepared.
 *
 * TWO SOURCES, designed at CP1 so CP4 does not rebuild it (COMMAND_SURFACE_PLAN §3.3):
 *   - `cell`: the selected cell's offers — its legal moves and the attacks its queries answer.
 *   - `body`: offers that belong to the body, not a cell, shown while NOTHING is selected —
 *     the memory response on a remembered pathogen, an antivenom dose on a venom (CP4). Empty
 *     in CP1; the code path exists and the shell renders it identically.
 *
 * TWO SHAPES:
 *   - `board`: positioned targets — a MOVE at a node, or an ATTACK on an invader. Several
 *     offers may point at one invader (the Eosinophil can strike OR degranulate); the shell
 *     acts directly when one offer is on the tapped pathogen and opens the sheet's precise
 *     rows when there are more.
 *   - `buttons`: offers with no position, or where the engine picks the target itself (`net`
 *     nets the whole swarm the Neutrophil stands on).
 *
 * `reason` is the always-answers rule's other half: when a cell is selected and nothing is
 * offered, why — from the view, in the order a player most needs to hear.
 *
 * Every offer carries the exact `params` the shell sends; a spanning test in the session suite
 * (`offered.test.ts`) replays recorded games and requires the engine to ACCEPT every offer
 * this module makes, with a deliberate over-offer as its negative control.
 */
import type { SessionView, ViewState } from '@immunity-wars/session';

import type { Located } from '../board/Board';
import { t } from '../i18n';

export type OfferSource = 'cell' | 'body';

export interface BoardOffer {
  id: string;
  kind: 'move' | 'attack';
  action: string;
  /** The acting cell, or null for a body-level offer. */
  cell: string | null;
  /** MOVE: where. */
  located?: Located;
  /** ATTACK: whom. */
  invaderId?: string;
  /** Localised, e.g. "Snipe Influenza". */
  label: string;
  /** Localised cost hint, e.g. "2 AP", or null when it costs the usual. */
  cost: string | null;
  /** Exactly what `sendAction` receives. */
  params: Record<string, unknown>;
}

export interface ButtonOffer {
  id: string;
  action: string;
  cell: string | null;
  label: string;
  params: Record<string, unknown>;
}

export interface Offered {
  source: OfferSource;
  board: BoardOffer[];
  buttons: ButtonOffer[];
  /** Set only when a cell is selected and nothing is offered. */
  reason: string | null;
}

interface Invaderish {
  id?: unknown;
  disease?: unknown;
}

const EMPTY_CELL: Offered = { source: 'cell', board: [], buttons: [], reason: null };

const num = (v: unknown): number => (typeof v === 'number' ? v : 0);
const ids = (xs: unknown): { id: string; disease: string }[] =>
  Array.isArray(xs)
    ? (xs as Invaderish[]).map((iv) => ({
        id: String(iv.id ?? ''),
        disease: String(iv.disease ?? ''),
      }))
    : [];

/** The engine's generic gate before any board action: AP left, or a free action for this cell. */
function canAct(g: ViewState, cell: string): boolean {
  const free = g['free'] as Record<string, unknown> | undefined;
  return num(g['ap']) > 0 || num(free?.[cell]) > 0;
}

function isSuppressed(g: ViewState, cell: string): boolean {
  const sup = g['suppress'] as Record<string, unknown> | undefined;
  return (cell === 'neutrophil' || cell === 'tcell') && num(sup?.[cell]) > 0;
}

function isSpent(g: ViewState, cell: string): boolean {
  const cells = g['cells'] as Record<string, { alive?: unknown }> | undefined;
  return cells?.[cell]?.alive === false;
}

/** Body-level offers while nothing is selected. CP1: none. CP4 adds memoryKill and antivenom. */
export function bodyOffers(_view: SessionView): Offered {
  return { source: 'body', board: [], buttons: [], reason: null };
}

export function offeredActions(view: SessionView): Offered {
  const g = view.game;
  const cell = view.selection.cell;
  if (!cell) return bodyOffers(view);
  if (String(g['phase']) !== 'command') return { ...EMPTY_CELL, reason: t('selection.notCommand') };
  if (isSpent(g, cell)) return { ...EMPTY_CELL, reason: t('selection.spent') };
  if (isSuppressed(g, cell)) return { ...EMPTY_CELL, reason: t('selection.offline') };

  const board: BoardOffer[] = [];
  const buttons: ButtonOffer[] = [];
  const state = view.queries.state;
  const perCell = view.queries.perCell;
  const ap = num(g['ap']);
  const act = canAct(g, cell);

  // MOVES — selection-scoped, already computed for exactly this cell.
  if (act) {
    for (const d of (view.scoped.moveDestinations ?? []) as Located[]) {
      board.push({
        id: `move:${String(d.zone)}:${String(d.lane ?? d.organ ?? '')}:${String(d.step ?? '')}`,
        kind: 'move',
        action: 'move',
        cell,
        located: d,
        label: t('action.move'),
        cost: null,
        params: {
          action: 'move',
          cell,
          zone: d.zone,
          lane: d.lane,
          organ: d.organ,
          step: d.step,
        },
      });
    }
  }

  const attack = (
    action: string,
    targets: { id: string; disease: string }[],
    cost: string | null,
  ): void => {
    for (const iv of targets) {
      board.push({
        id: `${action}:${iv.id}`,
        kind: 'attack',
        action,
        cell,
        invaderId: iv.id,
        label: `${t(`action.${action}`)} ${iv.disease}`,
        cost,
        params: { action, cell, invaderId: iv.id },
      });
    }
  };

  if (act) {
    switch (cell) {
      case 'macrophage':
        attack('engulf', ids(state['macrophageEatable']), null);
        attack('strike', ids(perCell['wormStrikeable']?.[cell]), null);
        break;
      case 'neutrophil':
        if (ids(state['netTargets']).length > 0) {
          buttons.push({
            id: 'net',
            action: 'net',
            cell,
            label: t('action.net'),
            params: { action: 'net', cell },
          });
        }
        break;
      case 'tcell':
        attack('snipe', ids(state['snipeTargets']), null);
        break;
      case 'nk': {
        const flags = g['flags'] as Record<string, unknown> | undefined;
        if (flags?.['nkCell'] === true) attack('nkkill', ids(state['nkTargets']), null);
        break;
      }
      case 'eosinophil': {
        const targets = ids(perCell['wormStrikeable']?.[cell]);
        attack('strike', targets, null);
        // Degranulate is gated on AP alone — the engine checks apNow < 2 before free actions.
        if (ap >= 2) attack('degranulate', targets, `2 ${t('commandBar.ap')}`);
        break;
      }
      default:
        break;
    }
  }

  // The reason names what the cell CANNOT do here even when it can still move: a Helper T at
  // the hub is offered moves and is still told it works by contact. The shell shows it muted
  // beside the move hint and red when nothing at all is offered.
  const canAttack = buttons.length > 0 || board.some((o) => o.kind === 'attack');
  return {
    source: 'cell',
    board,
    buttons,
    reason: canAttack ? null : noActionReason(g, cell, act),
  };
}

/** Why no attack is offered — per-cell first, after the generic gates. */
function noActionReason(g: ViewState, cell: string, act: boolean): string {
  if (!act) return t('selection.noAp');
  switch (cell) {
    case 'neutrophil':
      return t('selection.notOnSwarm');
    case 'tcell':
      return t('selection.noHiddenInRange');
    case 'nk':
      return t('selection.noInfectedCellInRange');
    case 'eosinophil':
      return t('selection.nothingCoatedHere');
    case 'macrophage':
      return t('selection.nothingToEngulfHere');
    case 'helper':
      return t('selection.helperContact');
    case 'bcell':
      return t('selection.stationary');
    default:
      return t('selection.nothing');
  }
}
